/**
 * OBS Studio for flexdeck.
 *
 * Switch scenes, start and stop recording and streaming, mute inputs, toggle
 * sources — and show what OBS is doing on the deck: the live scene, whether it
 * is recording, for how long, and which microphones are muted.
 *
 * Needs OBS 28 or later with its WebSocket server enabled (Tools → WebSocket
 * Server Settings). The connection is kept open and re-established on its own
 * when OBS restarts, so a deck never has to be told OBS came back.
 *
 * State arrives as OBS *events*, not by polling: a scene change shows up on the
 * deck the moment it happens, and an idle OBS costs nothing. The two timecodes
 * are the exception — OBS does not announce a second ticking by — so they are
 * read only while something on the deck is showing them.
 */

import { definePlugin, type Context, type VariableSpec } from "@flexdeck/plugin-sdk";

import { type Connect, EVENT_SUBSCRIPTIONS, INPUT_VOLUME_METERS, ObsClient } from "./obs-client.ts";

const ID = "obs";

/** A variable-safe spelling of an OBS input name: "Mic/Aux" -> "mic_aux". */
export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "input";
}

interface State {
  client: ObsClient | null;
  /** Why we are not connected, for the person reading the plugin's status. */
  reason: string;
  scenes: string[];
  inputs: Map<string, string>; // slug -> OBS name, audio inputs only
  texts: Set<string>;
  /** Each scene's items, by id: what `SceneItemEnableStateChanged` names. */
  items: Map<string, Map<number, string>>;
  /** The variables declared at run time, kept so one refresh does not drop the other's. */
  inputVars: Record<string, VariableSpec>;
  sourceVars: Record<string, VariableSpec>;
  meters: boolean;
  meterUntil: number;
  meterTimer: ReturnType<typeof setTimeout> | null;
  levels: Record<string, number>;
  levelsPushed: number;
  levelsTimer: ReturnType<typeof setTimeout> | null;
  streamBytes: { bytes: number; at: number } | null;
  retry: ReturnType<typeof setTimeout> | null;
  attempt: number;
  stopping: boolean;
  connection: number;
}

const state: State = {
  client: null,
  reason: "not started",
  scenes: [],
  inputs: new Map(),
  texts: new Set(),
  items: new Map(),
  inputVars: {},
  sourceVars: {},
  meters: false,
  meterUntil: 0,
  meterTimer: null,
  levels: {},
  levelsPushed: 0,
  levelsTimer: null,
  streamBytes: null,
  retry: null,
  attempt: 0,
  stopping: false,
  connection: 0,
};

/** Injected by the tests; the real WebSocket otherwise. */
let connectOverride: Connect | undefined;
export function useConnection(connect: Connect | undefined): void {
  connectOverride = connect;
}

function client(): ObsClient {
  if (!state.client?.connected) {
    throw new Error(`OBS is not connected (${state.reason})`);
  }
  return state.client;
}

/** Run a request, turning OBS's refusals into sentences. */
async function request<T = Record<string, unknown>>(type: string, data?: Record<string, unknown>): Promise<T> {
  try {
    return await client().request<T>(type, data);
  } catch (error) {
    // The message alone: "Error: …" in front of it reads as noise to a person.
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}

function timecode(raw: unknown): string {
  // OBS sends "HH:MM:SS.mmm"; a deck has no room for milliseconds.
  return typeof raw === "string" ? raw.split(".")[0] ?? raw : "00:00:00";
}

/** Read everything once after connecting; events keep it current after. */
async function refreshAll(ctx: Context): Promise<void> {
  const scenes = await request<{ currentProgramSceneName: string; scenes: { sceneName: string }[] }>("GetSceneList");
  state.scenes = scenes.scenes.map((scene) => scene.sceneName).reverse();
  const record = await request<{ outputActive: boolean; outputPaused: boolean; outputTimecode: string }>("GetRecordStatus");
  const stream = await request<{ outputActive: boolean; outputTimecode: string }>("GetStreamStatus");
  const studio = await request<{ studioModeEnabled: boolean }>("GetStudioModeEnabled");
  const virtualcam = await request<{ outputActive: boolean }>("GetVirtualCamStatus").catch(() => ({ outputActive: false }));
  // OBS refuses this outside studio mode, where there is no preview.
  const preview = studio.studioModeEnabled
    ? await request<{ currentPreviewSceneName: string }>("GetCurrentPreviewScene").catch(() => ({ currentPreviewSceneName: "" }))
    : { currentPreviewSceneName: "" };
  ctx.vars.set({
    "obs.connected": true,
    "obs.scene": scenes.currentProgramSceneName,
    "obs.recording": record.outputActive,
    "obs.record_paused": record.outputPaused,
    "obs.record_time": timecode(record.outputTimecode),
    "obs.streaming": stream.outputActive,
    "obs.stream_time": timecode(stream.outputTimecode),
    "obs.studio_mode": studio.studioModeEnabled,
    "obs.preview_scene": preview.currentPreviewSceneName,
    "obs.virtualcam": virtualcam.outputActive,
  });
  await refreshInputs(ctx);
  await refreshSources(ctx);
}

/**
 * The volume variable of an input, by OBS's own name for it — not the slug —
 * because a slider's feedback template is filled with the argument as chosen,
 * which is OBS's name: `obs.input.{{input}}.volume` → `obs.input.Mic/Aux.volume`.
 */
export const volumeVariable = (name: string) => `obs.input.${name}.volume`;

/** Whether an input is muted, by OBS's own name, for the same reason as its volume. */
export const mutedVariable = (name: string) => `obs.input.${name}.muted`;

export const levelVariable = (name: string) => `obs.input.${name}.level`;

export const levelDbVariable = (name: string) => `obs.input.${name}.level_db`;

export const volumeDbVariable = (name: string) => `obs.input.${name}.volume_db`;

export const textVariable = (name: string) => `obs.input.${name}.text`;

const METER_LEASE_MS = 3000;
const LEVEL_PUSH_MS = 100;
const FLOOR_DB = -60;

export const decibels = (multiplier: number) => (multiplier > 0 ? Math.max(FLOOR_DB, 20 * Math.log10(multiplier)) : FLOOR_DB);

export const meterPercent = (db: number) => Math.round(((Math.max(FLOOR_DB, Math.min(0, db)) - FLOOR_DB) / -FLOOR_DB) * 100);

const dbOf = (multiplier: unknown) => Math.round(decibels(Number(multiplier) || 0) * 10) / 10;

/** Whether a source shows in a scene, by OBS's names: what a `toggle_source` key fills in. */
export const visibleVariable = (scene: string, source: string) => `obs.source.${scene}.${source}.visible`;

function redeclare(ctx: Context): void {
  ctx.vars.declare({ ...state.inputVars, ...state.sourceVars }, { replace: true });
}

/** OBS's linear multiplier as the percentage a slider shows. */
const percentOf = (multiplier: unknown) => Math.round(Math.max(0, Math.min(1, Number(multiplier) || 0)) * 100);

/**
 * `obs.input.<slug>.muted`, `obs.input.<name>.muted` and
 * `obs.input.<name>.volume` per audio input, declared as OBS has them.
 */
async function refreshInputs(ctx: Context): Promise<void> {
  const { inputs } = await request<{ inputs: { inputName: string; inputKind?: string }[] }>("GetInputList");
  const audio = new Map<string, string>();
  const texts = new Set<string>();
  const values: Record<string, boolean | number | string> = {};
  for (const input of inputs) {
    if (input.inputKind?.startsWith("text_")) {
      try {
        const { inputSettings } = await request<{ inputSettings: Record<string, unknown> }>("GetInputSettings", { inputName: input.inputName });
        texts.add(input.inputName);
        values[textVariable(input.inputName)] = String(inputSettings.text ?? "");
      } catch {
        continue;
      }
    }
    try {
      const answer = await request<{ inputMuted: boolean }>("GetInputMute", { inputName: input.inputName });
      audio.set(slug(input.inputName), input.inputName);
      values[`obs.input.${slug(input.inputName)}.muted`] = answer.inputMuted;
      values[mutedVariable(input.inputName)] = answer.inputMuted;
    } catch {
      // Not an audio input; OBS refuses GetInputMute for those.
      continue;
    }
    try {
      const volume = await request<{ inputVolumeMul: number }>("GetInputVolume", { inputName: input.inputName });
      values[volumeVariable(input.inputName)] = percentOf(volume.inputVolumeMul);
      values[volumeDbVariable(input.inputName)] = dbOf(volume.inputVolumeMul);
    } catch {
      // An older OBS: the slider still works, it just will not follow.
    }
  }
  state.inputs = audio;
  const names = new Set(audio.values());
  state.levels = Object.fromEntries(Object.entries(state.levels).filter(([name]) => names.has(name)));
  state.texts = texts;
  const declared: Record<string, VariableSpec> = {};
  for (const [key, name] of audio) {
    declared[`obs.input.${key}.muted`] = { kind: "bool", description: `Whether "${name}" is muted` };
    declared[mutedVariable(name)] = { kind: "bool", description: `Whether "${name}" is muted` };
    declared[volumeVariable(name)] = { kind: "number", unit: "%", description: `The volume of "${name}"` };
    declared[volumeDbVariable(name)] = { kind: "number", unit: "dB", description: `The volume of "${name}" in decibels` };
    declared[levelVariable(name)] = { kind: "number", unit: "%", description: `How loud "${name}" is right now, as its meter shows it` };
    declared[levelDbVariable(name)] = { kind: "number", unit: "dB", description: `How loud "${name}" is right now, in decibels (${FLOOR_DB} is silence)` };
  }
  for (const name of texts) {
    declared[textVariable(name)] = { kind: "text", description: `What the text source "${name}" says` };
  }
  state.inputVars = declared;
  redeclare(ctx);
  ctx.vars.set(values);
}

/** One `obs.source.<scene>.<source>.visible` per item in every scene. */
async function refreshSources(ctx: Context): Promise<void> {
  const items = new Map<string, Map<number, string>>();
  const declared: Record<string, VariableSpec> = {};
  const values: Record<string, boolean> = {};
  for (const scene of state.scenes) {
    let list: { sourceName: string; sceneItemId: number; sceneItemEnabled?: boolean }[];
    try {
      ({ sceneItems: list } = await request<{ sceneItems: typeof list }>("GetSceneItemList", { sceneName: scene }));
    } catch {
      continue;
    }
    const byId = new Map<number, string>();
    for (const item of list) {
      byId.set(item.sceneItemId, item.sourceName);
      const name = visibleVariable(scene, item.sourceName);
      declared[name] = { kind: "bool", description: `Whether "${item.sourceName}" shows in "${scene}"` };
      values[name] = item.sceneItemEnabled !== false;
    }
    items.set(scene, byId);
  }
  state.items = items;
  state.sourceVars = declared;
  redeclare(ctx);
  ctx.vars.set(values);
}

function onEvent(ctx: Context, type: string, data: Record<string, unknown>): void {
  switch (type) {
    case "CurrentProgramSceneChanged": {
      const scene = String(data.sceneName);
      ctx.vars.set({ "obs.scene": scene });
      ctx.emit("scene_changed", { scene });
      break;
    }
    case "SceneListChanged":
      state.scenes = ((data.scenes as { sceneName: string }[]) ?? []).map((scene) => scene.sceneName).reverse();
      void refreshSources(ctx).catch(() => {});
      break;
    case "CurrentPreviewSceneChanged":
      ctx.vars.set({ "obs.preview_scene": String(data.sceneName) });
      break;
    case "VirtualcamStateChanged":
      ctx.vars.set({ "obs.virtualcam": Boolean(data.outputActive) });
      break;
    case "SceneItemEnableStateChanged": {
      const scene = String(data.sceneName);
      const source = state.items.get(scene)?.get(Number(data.sceneItemId));
      if (source) ctx.vars.set({ [visibleVariable(scene, source)]: Boolean(data.sceneItemEnabled) });
      break;
    }
    case "SceneItemCreated":
    case "SceneItemRemoved":
    case "SceneNameChanged":
      void refreshSources(ctx).catch(() => {});
      break;
    case "RecordStateChanged": {
      const active = Boolean(data.outputActive);
      const outputState = String(data.outputState);
      const paused = outputState === "OBS_WEBSOCKET_OUTPUT_PAUSED";
      ctx.vars.set({ "obs.recording": active, "obs.record_paused": paused });
      if (!active) ctx.vars.set({ "obs.record_time": "00:00:00" });
      const word = outputStateWord(outputState);
      if (word) ctx.emit("record_state_changed", { state: word });
      break;
    }
    case "StreamStateChanged": {
      const active = Boolean(data.outputActive);
      ctx.vars.set({ "obs.streaming": active });
      if (!active) ctx.vars.set({ "obs.stream_time": "00:00:00" });
      const word = outputStateWord(String(data.outputState));
      if (word) ctx.emit("stream_state_changed", { state: word });
      break;
    }
    case "StudioModeStateChanged":
      ctx.vars.set({ "obs.studio_mode": Boolean(data.studioModeEnabled) });
      if (!data.studioModeEnabled) ctx.vars.set({ "obs.preview_scene": "" });
      // Turning studio mode on puts a scene in preview without announcing it.
      else
        void request<{ currentPreviewSceneName: string }>("GetCurrentPreviewScene")
          .then((preview) => ctx.vars.set({ "obs.preview_scene": preview.currentPreviewSceneName }))
          .catch(() => {});
      break;
    case "InputMuteStateChanged": {
      const name = String(data.inputName);
      const muted = Boolean(data.inputMuted);
      ctx.vars.set({ [`obs.input.${slug(name)}.muted`]: muted, [mutedVariable(name)]: muted });
      ctx.emit("input_mute_changed", { input: name, muted: String(muted) });
      break;
    }
    case "InputVolumeChanged": {
      const name = String(data.inputName);
      if ([...state.inputs.values()].includes(name)) {
        ctx.vars.set({ [volumeVariable(name)]: percentOf(data.inputVolumeMul), [volumeDbVariable(name)]: dbOf(data.inputVolumeMul) });
      }
      break;
    }
    case "InputVolumeMeters":
      if (state.meters) onMeters(ctx, (data.inputs as { inputName?: string; inputLevelsMul?: number[][] }[]) ?? []);
      break;
    case "InputSettingsChanged": {
      const name = String(data.inputName);
      const settings = (data.inputSettings as Record<string, unknown>) ?? {};
      if (state.texts.has(name) && "text" in settings) ctx.vars.set({ [textVariable(name)]: String(settings.text ?? "") });
      break;
    }
    case "InputCreated":
    case "InputRemoved":
    case "InputNameChanged":
      void refreshInputs(ctx).catch(() => {});
      void refreshSources(ctx).catch(() => {});
      break;
    case "ConnectionClosed":
      disconnected(ctx, "OBS closed the connection");
      break;
  }
}

function onMeters(ctx: Context, inputs: { inputName?: string; inputLevelsMul?: number[][] }[]): void {
  const audio = new Set(state.inputs.values());
  for (const input of inputs) {
    const name = String(input.inputName ?? "");
    if (!audio.has(name)) continue;
    const peak = Math.max(0, ...(input.inputLevelsMul ?? []).map((channel) => Number(channel[1]) || 0));
    state.levels[name] = Math.round(decibels(peak));
  }
  if (state.levelsTimer) return;
  const wait = Math.max(0, state.levelsPushed + LEVEL_PUSH_MS - Date.now());
  state.levelsTimer = setTimeout(() => {
    state.levelsTimer = null;
    state.levelsPushed = Date.now();
    pushLevels(ctx);
  }, wait);
}

function pushLevels(ctx: Context): void {
  const values: Record<string, number> = {};
  for (const [name, db] of Object.entries(state.levels)) {
    values[levelDbVariable(name)] = db;
    values[levelVariable(name)] = meterPercent(db);
  }
  ctx.vars.set(values);
}

function setMeters(ctx: Context, on: boolean): void {
  if (state.meters === on) return;
  state.meters = on;
  state.client?.subscribe(on ? EVENT_SUBSCRIPTIONS | INPUT_VOLUME_METERS : EVENT_SUBSCRIPTIONS);
  if (!on) {
    if (state.levelsTimer) clearTimeout(state.levelsTimer);
    state.levelsTimer = null;
    for (const name of Object.keys(state.levels)) state.levels[name] = FLOOR_DB;
    pushLevels(ctx);
  }
}

function watchMeters(ctx: Context): void {
  state.meterUntil = Date.now() + METER_LEASE_MS;
  setMeters(ctx, true);
  if (state.meterTimer) return;
  const check = () => {
    const left = state.meterUntil - Date.now();
    if (left > 0) {
      state.meterTimer = setTimeout(check, left);
      return;
    }
    state.meterTimer = null;
    setMeters(ctx, false);
  };
  state.meterTimer = setTimeout(check, METER_LEASE_MS);
}

function stopMeters(): void {
  if (state.meterTimer) clearTimeout(state.meterTimer);
  if (state.levelsTimer) clearTimeout(state.levelsTimer);
  state.meterTimer = null;
  state.levelsTimer = null;
  state.meters = false;
  state.meterUntil = 0;
}

const isLevel = (name: string) => name.startsWith("obs.input.") && (name.endsWith(".level") || name.endsWith(".level_db"));

async function sampleStats(wanted: string[]): Promise<Record<string, number>> {
  const values: Record<string, number> = {};
  if (wanted.some((name) => name.startsWith("obs.stats."))) {
    const stats = await request<{
      cpuUsage: number;
      memoryUsage: number;
      availableDiskSpace: number;
      activeFps: number;
      renderSkippedFrames: number;
      outputSkippedFrames: number;
    }>("GetStats");
    values["obs.stats.cpu"] = Math.round(stats.cpuUsage * 10) / 10;
    values["obs.stats.memory"] = Math.round(stats.memoryUsage);
    values["obs.stats.disk_space"] = Math.round(stats.availableDiskSpace / 102.4) / 10;
    values["obs.stats.fps"] = Math.round(stats.activeFps * 10) / 10;
    values["obs.stats.render_skipped"] = stats.renderSkippedFrames;
    values["obs.stats.output_skipped"] = stats.outputSkippedFrames;
  }
  if (wanted.some((name) => name.startsWith("obs.stream."))) {
    const stream = await request<{ outputActive: boolean; outputCongestion: number; outputBytes: number; outputSkippedFrames: number }>("GetStreamStatus");
    const now = Date.now();
    const last = state.streamBytes;
    const bitrate = stream.outputActive && last && now > last.at && stream.outputBytes >= last.bytes ? ((stream.outputBytes - last.bytes) * 8) / (now - last.at) : 0;
    state.streamBytes = stream.outputActive ? { bytes: stream.outputBytes, at: now } : null;
    values["obs.stream.bitrate"] = Math.round(bitrate);
    values["obs.stream.congestion"] = Math.round((stream.outputCongestion || 0) * 100);
    values["obs.stream.skipped"] = stream.outputSkippedFrames || 0;
  }
  return values;
}

/** Only the settled states: OBS also reports "starting" and "stopping". */
function outputStateWord(outputState: string): string | undefined {
  switch (outputState) {
    case "OBS_WEBSOCKET_OUTPUT_STARTED":
      return "started";
    case "OBS_WEBSOCKET_OUTPUT_STOPPED":
      return "stopped";
    case "OBS_WEBSOCKET_OUTPUT_PAUSED":
      return "paused";
    case "OBS_WEBSOCKET_OUTPUT_RESUMED":
      return "resumed";
    default:
      return undefined;
  }
}

function disconnected(ctx: Context, reason: string): void {
  // `state.client` is set only once a connection succeeded, so its presence
  // — not `connected`, which the socket has already cleared — says "we were".
  const was = state.client !== null;
  stopMeters();
  state.client?.close();
  state.client = null;
  state.reason = reason;
  ctx.vars.set({ "obs.connected": false });
  if (was) ctx.emit("disconnected", { reason });
  schedule(ctx);
}

/** Try again in 1, 2, 4 … 30 seconds. OBS restarting is normal, not an error. */
function schedule(ctx: Context): void {
  if (state.stopping || state.retry) return;
  const delay = Math.min(30_000, 1000 * 2 ** Math.min(state.attempt, 5));
  state.attempt += 1;
  state.retry = setTimeout(() => {
    state.retry = null;
    void connect(ctx);
  }, delay);
}

export async function connect(ctx: Context): Promise<void> {
  if (state.stopping) return;
  const connection = ++state.connection;
  const host = ctx.settings.host || "127.0.0.1";
  const port = ctx.settings.port || "4455";
  const obs = new ObsClient({ url: `ws://${host}:${port}`, password: ctx.settings.password, connect: connectOverride });
  try {
    await obs.open();
  } catch (error) {
    if (connection !== state.connection) return;
    state.reason = error instanceof Error ? error.message : String(error);
    ctx.vars.set({ "obs.connected": false });
    ctx.log.warn(state.reason);
    schedule(ctx);
    return;
  }
  if (connection !== state.connection) {
    obs.close();
    return;
  }
  state.client = obs;
  state.attempt = 0;
  state.reason = "connected";
  obs.on((type, data) => onEvent(ctx, type, data));
  try {
    await refreshAll(ctx);
  } catch (error) {
    ctx.log.error(`connected, but could not read OBS's state: ${String(error)}`);
  }
  ctx.emit("connected", {});
  ctx.log.info(`connected to OBS at ${host}:${port}`);
}

export function disconnect(): void {
  state.stopping = true;
  state.connection += 1;
  if (state.retry) clearTimeout(state.retry);
  state.retry = null;
  stopMeters();
  state.client?.close();
  state.client = null;
}

/** For the tests: forget everything between cases. */
export function reset(): void {
  disconnect();
  state.stopping = false;
  state.attempt = 0;
  state.reason = "not started";
  state.scenes = [];
  state.inputs = new Map();
  state.texts = new Set();
  state.items = new Map();
  state.inputVars = {};
  state.sourceVars = {};
  state.levels = {};
  state.levelsPushed = 0;
  state.streamBytes = null;
}

function input(name: string): string {
  // Accept either OBS's own name or the slug the variables use.
  return state.inputs.get(slug(name)) ?? name;
}

async function sceneItem(scene: string, source: string): Promise<number> {
  const { sceneItemId } = await request<{ sceneItemId: number }>("GetSceneItemId", { sceneName: scene, sourceName: source });
  return sceneItemId;
}

/*
 * What the editor offers while someone sets up a button. Asked fresh each
 * time, not read from what was cached at connect, so a scene added a minute
 * ago is there. When OBS is not connected these throw, and the editor shows
 * why and lets the person type a name instead.
 */

/** The scenes, top to bottom as OBS's Scenes panel lists them. */
async function sceneChoices(): Promise<string[]> {
  const { scenes } = await request<{ scenes: { sceneName: string }[] }>("GetSceneList");
  // OBS lists them bottom-up; its panel shows them the other way round.
  return scenes.map((scene) => scene.sceneName).reverse();
}

async function textChoices(): Promise<string[]> {
  client();
  return [...state.texts].sort((a, b) => a.localeCompare(b));
}

async function allInputChoices(): Promise<string[]> {
  const { inputs } = await request<{ inputs: { inputName: string }[] }>("GetInputList");
  return inputs.map((input) => input.inputName).sort((a, b) => a.localeCompare(b));
}

async function settingChoices(name: string | undefined): Promise<string[] | null> {
  if (!name?.trim()) return null;
  return Object.keys(await currentSettings(name)).sort((a, b) => a.localeCompare(b));
}

async function currentSettings(name: string): Promise<Record<string, unknown>> {
  const { inputSettings, inputKind } = await request<{ inputSettings: Record<string, unknown>; inputKind: string }>("GetInputSettings", { inputName: name });
  const { defaultInputSettings } = await request<{ defaultInputSettings: Record<string, unknown> }>("GetInputDefaultSettings", { inputKind }).catch(() => ({
    defaultInputSettings: {},
  }));
  return { ...defaultInputSettings, ...inputSettings };
}

export function settingValue(current: unknown, typed: string): unknown {
  if (typeof current === "number") {
    const number = Number(typed);
    if (typed.trim() === "" || !Number.isFinite(number)) throw new Error(`'${typed}' is not a number`);
    return number;
  }
  if (typeof current === "boolean") {
    if (typed !== "true" && typed !== "false") throw new Error(`'${typed}' is not true or false`);
    return typed === "true";
  }
  if (current !== undefined && typeof current !== "string") throw new Error("that setting is not a text, number or switch");
  return typed;
}

/** The inputs that have audio — the only ones that can be muted. */
async function inputChoices(): Promise<string[]> {
  client(); // says "not connected" rather than offering a stale list
  return [...state.inputs.values()].sort((a, b) => a.localeCompare(b));
}

/**
 * The sources in `scene`, top to bottom as OBS's Sources panel lists them —
 * or `null` before a scene is chosen: there is nothing to list *yet*, which
 * is not the same as a scene with no sources.
 */
async function sourceChoices(scene: string | undefined): Promise<string[] | null> {
  if (!scene?.trim()) return null;
  const { sceneItems } = await request<{ sceneItems: { sourceName: string }[] }>("GetSceneItemList", {
    sceneName: scene,
  });
  return sceneItems.map((item) => item.sourceName).reverse();
}

const unknownScene = (scene: string): string | undefined =>
  state.client?.connected && state.scenes.length > 0 && !state.scenes.includes(scene)
    ? `OBS has no scene called '${scene}' (it has: ${state.scenes.join(", ")})`
    : undefined;

export default definePlugin({
  id: ID,
  name: "OBS Studio",
  version: "0.5.1",
  description: "Switch scenes, record, stream, and mute inputs in OBS Studio — and show its state on the deck.",
  author: "flexdeck",
  permissions: ["network"],

  settings: {
    host: { kind: "text", description: "The computer OBS runs on", default: "127.0.0.1" },
    port: { kind: "number", description: "OBS's WebSocket port (Tools → WebSocket Server Settings)", default: "4455" },
    password: { kind: "text", description: "The WebSocket server password, if it has one", secret: true },
  },

  variables: {
    "obs.connected": { kind: "bool", description: "Whether OBS is connected" },
    "obs.scene": { kind: "text", description: "The live (program) scene" },
    "obs.recording": { kind: "bool", description: "Whether OBS is recording" },
    "obs.record_paused": { kind: "bool", description: "Whether the recording is paused" },
    "obs.record_time": { kind: "text", description: "How long it has been recording (HH:MM:SS)" },
    "obs.streaming": { kind: "bool", description: "Whether OBS is streaming" },
    "obs.stream_time": { kind: "text", description: "How long it has been live (HH:MM:SS)" },
    "obs.studio_mode": { kind: "bool", description: "Whether studio mode is on" },
    "obs.preview_scene": { kind: "text", description: "The scene in preview (studio mode); blank outside it" },
    "obs.virtualcam": { kind: "bool", description: "Whether the virtual camera is on" },
    "obs.stats.cpu": { kind: "number", unit: "%", description: "How much CPU OBS uses" },
    "obs.stats.memory": { kind: "number", unit: "MB", description: "How much memory OBS uses" },
    "obs.stats.disk_space": { kind: "number", unit: "GB", description: "Free space where OBS records" },
    "obs.stats.fps": { kind: "number", unit: "fps", description: "The frames per second OBS is rendering" },
    "obs.stats.render_skipped": { kind: "number", description: "Frames OBS skipped rendering (the computer is too busy)" },
    "obs.stats.output_skipped": { kind: "number", description: "Frames OBS skipped encoding (the encoder is too slow)" },
    "obs.stream.bitrate": { kind: "number", unit: "kb/s", description: "How fast the stream is sending" },
    "obs.stream.congestion": { kind: "number", unit: "%", description: "How congested the stream's connection is" },
    "obs.stream.skipped": { kind: "number", description: "Frames the stream dropped" },
  },

  events: {
    connected: { description: "OBS connected" },
    disconnected: { description: "OBS went away", fields: ["reason"] },
    scene_changed: { description: "The live scene changed", fields: ["scene"] },
    record_state_changed: { description: "Recording started, stopped, paused or resumed", fields: ["state"] },
    stream_state_changed: { description: "Streaming started or stopped", fields: ["state"] },
    input_mute_changed: { description: "An input was muted or unmuted", fields: ["input", "muted"] },
  },

  // Keys that come with both halves: a look that follows OBS, and a press.
  presets: [
    {
      id: "scene",
      name: "Scene",
      description: "Switches OBS to a scene, and lights while that scene is live. Pick the scene under Does.",
      widget: {
        props: { label: "Scene", icon: "monitor" },
        flows: [{ trigger: { gesture: "GESTURE_SHORT_PRESS" }, blocks: [{ block: "doAction", plugin: "obs", action: "set_scene", args: { scene: { text: "" } } }] }],
      },
    },
    {
      id: "record",
      name: "Record",
      description: "Starts or stops recording; red with the time while it records.",
      widget: {
        flows: [{ trigger: { gesture: "GESTURE_SHORT_PRESS" }, blocks: [{ block: "doAction", plugin: "obs", action: "toggle_recording", args: {} }] }],
        face: {
          layout: "FACE_LAYOUT_VALUE",
          rules: [{ when: "obs.recording", color: "#7f1d1d" }],
          elements: [
            { slot: "SLOT_TOP", template: "{{ if(obs.recording, \"● REC\", \"Record\") }}" },
            { slot: "SLOT_VALUE", template: "{{ if(obs.recording, obs.record_time, \"—\") }}", text: { font: "FONT_MONO" } },
          ],
        },
      },
    },
    {
      id: "stream",
      name: "Go live",
      description: "Starts or ends the stream; red with the time while live.",
      widget: {
        flows: [{ trigger: { gesture: "GESTURE_SHORT_PRESS" }, blocks: [{ block: "doAction", plugin: "obs", action: "toggle_streaming", args: {} }] }],
        face: {
          layout: "FACE_LAYOUT_VALUE",
          rules: [{ when: "obs.streaming", color: "#7f1d1d", pulse: true }],
          elements: [
            { slot: "SLOT_TOP", template: "{{ if(obs.streaming, \"● LIVE\", \"Go live\") }}" },
            { slot: "SLOT_VALUE", template: "{{ if(obs.streaming, obs.stream_time, \"—\") }}", text: { font: "FONT_MONO" } },
          ],
        },
      },
    },
  ],

  actions: {
    set_scene: {
      description: "Switch the live scene",
      arguments: {
        scene: {
          kind: "text",
          description: "The scene's name in OBS",
          example: "Scene",
          suggest: () => sceneChoices(),
        },
      },
      active: { variable: "obs.scene", equals: "scene" },
      check: ({ scene }) => unknownScene(scene),
      run: async ({ scene }, ctx) => {
        await request("SetCurrentProgramScene", { sceneName: scene });
        // OBS has taken it, but says so only once the transition has played —
        // a second or more of a deck showing the old scene lit. Its event
        // still comes, and settles it either way.
        ctx.vars.set({ "obs.scene": scene });
      },
    },
    set_preview_scene: {
      description: "Put a scene in preview (studio mode)",
      arguments: {
        scene: {
          kind: "text",
          description: "The scene's name in OBS",
          example: "Scene",
          suggest: () => sceneChoices(),
        },
      },
      active: { variable: "obs.preview_scene", equals: "scene" },
      check: ({ scene }) => unknownScene(scene),
      run: async ({ scene }) => {
        await request("SetCurrentPreviewScene", { sceneName: scene });
      },
    },
    transition: {
      description: "Send the preview scene live (studio mode)",
      run: async () => {
        await request("TriggerStudioModeTransition");
      },
    },
    toggle_studio_mode: {
      description: "Turn studio mode on or off",
      active: { variable: "obs.studio_mode" },
      run: async () => {
        const { studioModeEnabled } = await request<{ studioModeEnabled: boolean }>("GetStudioModeEnabled");
        await request("SetStudioModeEnabled", { studioModeEnabled: !studioModeEnabled });
      },
    },
    start_recording: { description: "Start recording", run: async () => void (await request("StartRecord")) },
    stop_recording: { description: "Stop recording", run: async () => void (await request("StopRecord")) },
    toggle_recording: { description: "Start or stop recording", active: { variable: "obs.recording" }, run: async () => void (await request("ToggleRecord")) },
    toggle_recording_pause: {
      description: "Pause or resume the recording",
      active: { variable: "obs.record_paused" },
      run: async () => void (await request("ToggleRecordPause")),
    },
    start_streaming: { description: "Go live", run: async () => void (await request("StartStream")) },
    stop_streaming: { description: "End the stream", run: async () => void (await request("StopStream")) },
    toggle_streaming: { description: "Go live, or end the stream", active: { variable: "obs.streaming" }, run: async () => void (await request("ToggleStream")) },
    save_replay: {
      description: "Save the replay buffer",
      run: async () => void (await request("SaveReplayBuffer")),
    },
    toggle_virtual_camera: {
      description: "Start or stop the virtual camera",
      active: { variable: "obs.virtualcam" },
      run: async () => void (await request("ToggleVirtualCam")),
    },
    toggle_mute: {
      description: "Toggle an input's mute",
      arguments: { input: { kind: "text", description: "The input's name in OBS", example: "Mic/Aux", suggest: () => inputChoices() } },
      active: { variable: "obs.input.{{input}}.muted" },
      run: async ({ input: name }) => void (await request("ToggleInputMute", { inputName: input(name) })),
    },
    set_mute: {
      description: "Set an input to muted or unmuted",
      arguments: {
        input: { kind: "text", description: "The input's name in OBS", example: "Mic/Aux", suggest: () => inputChoices() },
        muted: { kind: "choice", description: "Muted or not", example: "true", choices: ["true", "false"] },
      },
      active: { variable: "obs.input.{{input}}.muted", equals: "muted" },
      run: async ({ input: name, muted }) =>
        void (await request("SetInputMute", { inputName: input(name), inputMuted: muted === "true" })),
    },
    set_volume: {
      description: "Set an input's volume",
      arguments: {
        input: { kind: "text", description: "The input's name in OBS", example: "Mic/Aux", suggest: () => inputChoices() },
        percent: { kind: "number", description: "0 to 100", example: "80" },
      },
      slider: {
        argument: "percent",
        feedback: "obs.input.{{input}}.volume",
        mute: { action: "toggle_mute", feedback: "obs.input.{{input}}.muted" },
      },
      check: ({ percent }) => {
        const value = Number(percent);
        return Number.isFinite(value) && value >= 0 && value <= 100 ? undefined : "the volume must be 0 to 100";
      },
      run: async ({ input: name, percent }) =>
        void (await request("SetInputVolume", { inputName: input(name), inputVolumeMul: Number(percent) / 100 })),
    },
    set_text: {
      description: "Change what a text source says",
      arguments: {
        input: { kind: "text", description: "The text source's name in OBS", example: "Title", suggest: () => textChoices() },
        text: { kind: "text", description: "The new text; a live value in double braces works too", example: "Back in 5" },
      },
      run: async ({ input: name, text }, ctx) => {
        await request("SetInputSettings", { inputName: name, inputSettings: { text }, overlay: true });
        if (state.texts.has(name)) ctx.vars.set({ [textVariable(name)]: text });
      },
    },
    set_input_setting: {
      description: "Change one setting of a source",
      arguments: {
        input: { kind: "text", description: "The source's name in OBS", example: "Webcam", suggest: () => allInputChoices() },
        setting: { kind: "text", description: "The setting, as OBS names it", example: "url", suggest: ({ input: name }) => settingChoices(name) },
        value: { kind: "text", description: "Its new value: text, a number, or true/false", example: "https://example.com" },
      },
      run: async ({ input: name, setting, value }) => {
        const current = (await currentSettings(name))[setting];
        await request("SetInputSettings", { inputName: name, inputSettings: { [setting]: settingValue(current, value) }, overlay: true });
      },
    },
    toggle_source: {
      description: "Show or hide a source in a scene",
      arguments: {
        scene: { kind: "text", description: "The scene", example: "Scene", suggest: () => sceneChoices() },
        source: {
          kind: "text",
          description: "The source in that scene",
          example: "Webcam",
          suggest: ({ scene }) => sourceChoices(scene),
        },
      },
      active: { variable: "obs.source.{{scene}}.{{source}}.visible" },
      check: ({ scene }) => unknownScene(scene),
      run: async ({ scene, source }, ctx) => {
        const id = await sceneItem(scene, source);
        const { sceneItemEnabled } = await request<{ sceneItemEnabled: boolean }>("GetSceneItemEnabled", {
          sceneName: scene,
          sceneItemId: id,
        });
        await request("SetSceneItemEnabled", { sceneName: scene, sceneItemId: id, sceneItemEnabled: !sceneItemEnabled });
        if (state.items.get(scene)?.has(id)) ctx.vars.set({ [visibleVariable(scene, source)]: !sceneItemEnabled });
      },
    },
  },

  // Timecodes, stats and stream health are polled only while the deck shows them; a shown level keeps the meters on.
  sample: async (wanted, ctx) => {
    if (!state.client?.connected) return { "obs.connected": false };
    if (wanted.some(isLevel)) watchMeters(ctx);
    const values: Record<string, string | boolean | number> = await sampleStats(wanted);
    if (wanted.includes("obs.record_time")) {
      const record = await request<{ outputTimecode: string }>("GetRecordStatus");
      values["obs.record_time"] = timecode(record.outputTimecode);
    }
    if (wanted.includes("obs.stream_time")) {
      const stream = await request<{ outputTimecode: string }>("GetStreamStatus");
      values["obs.stream_time"] = timecode(stream.outputTimecode);
    }
    return values;
  },

  start: (ctx) => {
    state.stopping = false;
    ctx.vars.set({ "obs.connected": false });
    void connect(ctx);
  },

  // New host, port or password: drop the connection and use the new ones.
  settingsChanged: (ctx) => {
    reset();
    void connect(ctx);
  },

  stop: () => disconnect(),
});
