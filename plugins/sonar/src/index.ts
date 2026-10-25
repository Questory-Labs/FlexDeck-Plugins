import { definePlugin, type ArgumentSpec, type Context, type Value, type VariableSpec } from "@flexdeck/plugin-sdk";

import { CHANNELS, type Channel, type SonarState, SonarClient, type Transport } from "./sonar-client.ts";

const ID = "sonar";

const LABEL: Record<Channel, string> = {
  master: "the master level",
  game: "game",
  chat: "chat",
  mic: "the microphone",
  media: "media",
  aux: "aux",
};

let sonar = new SonarClient();

export function useTransport(transport: Transport | undefined): void {
  sonar = new SonarClient(transport);
  lastState = null;
  reading = null;
}

let lastState: SonarState | null = null;
let reading: Promise<SonarState> | null = null;

const pct = (value: number) => Math.round(value * 100);

export function values(state: SonarState | null): Record<string, Value> {
  if (!state) return { "sonar.connected": false };
  const out: Record<string, Value> = { "sonar.connected": true, "sonar.streamer_mode": state.streamer };
  if (state.chatMix !== null) out["sonar.chat_mix"] = Math.round(state.chatMix * 100);
  for (const channel of CHANNELS) {
    out[`sonar.${channel}.volume`] = pct(state.personal[channel].volume);
    out[`sonar.${channel}.muted`] = state.personal[channel].muted;
    if (state.stream) {
      out[`sonar.${channel}.stream.volume`] = pct(state.stream[channel].volume);
      out[`sonar.${channel}.stream.muted`] = state.stream[channel].muted;
    }
  }
  return out;
}

async function read(ctx: Context): Promise<SonarState | null> {
  reading ??= sonar.state().finally(() => {
    reading = null;
  });
  try {
    lastState = await reading;
  } catch (error) {
    if (lastState) ctx.log.warn(`lost Sonar: ${error instanceof Error ? error.message : String(error)}`);
    lastState = null;
  }
  return lastState;
}

async function refresh(ctx: Context): Promise<void> {
  ctx.vars.set(values(await read(ctx)));
}

function parseChannel(text: string): Channel {
  const wanted = text.trim().toLowerCase();
  const channel = CHANNELS.find((name) => name === wanted);
  if (!channel) throw new Error(`Sonar has no channel called '${text}' (try ${CHANNELS.join(", ")})`);
  return channel;
}

function percent(text: string, min: number, max: number): number {
  const value = Number(text);
  if (!Number.isFinite(value)) throw new Error("the level must be a number");
  return Math.min(max, Math.max(min, value));
}

async function run<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}

const CHANNEL: ArgumentSpec = {
  kind: "choice",
  description: "The Sonar channel",
  example: "game",
  choices: [...CHANNELS],
};

const LEVEL: ArgumentSpec = { kind: "number", description: "The level, 0 to 100", example: "50" };

const checkChannel = ({ channel }: Record<string, string>) =>
  CHANNELS.includes(channel?.trim().toLowerCase() as Channel) ? undefined : `Sonar has no channel called '${channel}'`;

function variables(): Record<string, VariableSpec> {
  const out: Record<string, VariableSpec> = {
    "sonar.connected": { kind: "bool", description: "Whether Sonar is running and reachable" },
    "sonar.streamer_mode": { kind: "bool", description: "Whether Sonar is in streamer mode" },
    "sonar.chat_mix": { kind: "number", description: "The chat mix, -100 (all chat) to 100 (all game)" },
  };
  for (const channel of CHANNELS) {
    out[`sonar.${channel}.volume`] = { kind: "number", unit: "%", description: `The level of ${LABEL[channel]} you hear` };
    out[`sonar.${channel}.muted`] = { kind: "bool", description: `Whether ${LABEL[channel]} is muted for you` };
    out[`sonar.${channel}.stream.volume`] = { kind: "number", unit: "%", description: `The level of ${LABEL[channel]} in the stream mix (streamer mode)` };
    out[`sonar.${channel}.stream.muted`] = { kind: "bool", description: `Whether ${LABEL[channel]} is muted in the stream mix (streamer mode)` };
  }
  return out;
}

async function setLevel(ctx: Context, channel: Channel, level: number, stream: boolean): Promise<void> {
  await run(() => sonar.setVolume(channel, level / 100, stream));
  ctx.vars.set({ [`sonar.${channel}.${stream ? "stream." : ""}volume`]: Math.round(level) });
}

async function setMuted(ctx: Context, channel: Channel, muted: boolean | "toggle", stream: boolean): Promise<{ state: string }> {
  const name = `sonar.${channel}.${stream ? "stream." : ""}muted`;
  let next = muted;
  if (next === "toggle") {
    const state = await read(ctx);
    if (!state) throw new Error("Sonar is not running");
    const mix = stream ? state.stream : state.personal;
    if (!mix) throw new Error("the stream mix needs Sonar's streamer mode on");
    next = !mix[channel].muted;
  }
  await run(() => sonar.setMuted(channel, next as boolean, stream));
  ctx.vars.set({ [name]: next });
  return { state: next ? "muted" : "unmuted" };
}

const plugin = definePlugin({
  id: ID,
  name: "SteelSeries Sonar",
  version: "0.1.0",
  description:
    "Ride Sonar's game, chat, mic, media and aux levels, mute them, set the chat mix and switch streamer mode, with Sonar's levels on the keys.",
  author: "flexdeck",
  permissions: ["network", "filesystem"],

  variables: variables(),

  events: {
    connected: { description: "Sonar became reachable" },
    disconnected: { description: "Sonar went away" },
  },

  presets: [
    {
      id: "mic_mute",
      name: "Mic mute",
      description: "Mutes or unmutes your microphone in Sonar; red while muted.",
      widget: {
        flows: [{ trigger: { gesture: "GESTURE_SHORT_PRESS" }, blocks: [{ block: "doAction", plugin: ID, action: "toggle_mute", args: { channel: { text: "mic" } } }] }],
        face: {
          layout: "FACE_LAYOUT_VALUE",
          rules: [{ when: "sonar.mic.muted", color: "#7f1d1d" }],
          elements: [
            { slot: "SLOT_TOP", template: "Mic" },
            { slot: "SLOT_VALUE", template: "{{ if(sonar.mic.muted, \"MUTED\", \"LIVE\") }}", text: { font: "FONT_MONO" } },
          ],
        },
      },
    },
    {
      id: "chat_mix",
      name: "Chat mix",
      description: "Shows Sonar's chat mix; a press puts it back in the middle.",
      widget: {
        flows: [{ trigger: { gesture: "GESTURE_SHORT_PRESS" }, blocks: [{ block: "doAction", plugin: ID, action: "set_chat_mix", args: { balance: { text: "0" } } }] }],
        face: {
          layout: "FACE_LAYOUT_VALUE",
          elements: [
            { slot: "SLOT_TOP", template: "Chat mix" },
            { slot: "SLOT_VALUE", template: "{{ sonar.chat_mix | default(\"—\") }}", text: { font: "FONT_MONO" } },
          ],
        },
      },
    },
  ],

  actions: {
    set_volume: {
      description: "Set a channel's level",
      arguments: { channel: CHANNEL, percent: LEVEL },
      slider: {
        argument: "percent",
        min: 0,
        max: 100,
        step: 1,
        feedback: "sonar.{{channel}}.volume",
        mute: { action: "toggle_mute", feedback: "sonar.{{channel}}.muted" },
      },
      check: checkChannel,
      run: ({ channel, percent: level }, ctx) => setLevel(ctx, parseChannel(channel), percent(level, 0, 100), false),
    },
    change_volume: {
      description: "Turn a channel up or down by a step",
      arguments: {
        channel: CHANNEL,
        step: { kind: "number", description: "How much, -100 to 100; below 0 turns it down", example: "5" },
      },
      check: checkChannel,
      run: async ({ channel, step }, ctx) => {
        const target = parseChannel(channel);
        const state = await read(ctx);
        if (!state) throw new Error("Sonar is not running");
        const level = pct(state.personal[target].volume) + percent(step, -100, 100);
        await setLevel(ctx, target, Math.min(100, Math.max(0, level)), false);
      },
    },
    toggle_mute: {
      description: "Mute a channel, or unmute it",
      arguments: { channel: CHANNEL },
      active: { variable: "sonar.{{channel}}.muted" },
      check: checkChannel,
      run: ({ channel }, ctx) => setMuted(ctx, parseChannel(channel), "toggle", false),
    },
    mute: {
      description: "Mute a channel",
      arguments: { channel: CHANNEL },
      active: { variable: "sonar.{{channel}}.muted" },
      check: checkChannel,
      run: ({ channel }, ctx) => setMuted(ctx, parseChannel(channel), true, false),
    },
    unmute: {
      description: "Unmute a channel",
      arguments: { channel: CHANNEL },
      active: { variable: "sonar.{{channel}}.muted", is: "false" },
      check: checkChannel,
      run: ({ channel }, ctx) => setMuted(ctx, parseChannel(channel), false, false),
    },
    set_stream_volume: {
      description: "Set a channel's level in the stream mix (streamer mode)",
      arguments: { channel: CHANNEL, percent: LEVEL },
      slider: {
        argument: "percent",
        min: 0,
        max: 100,
        step: 1,
        feedback: "sonar.{{channel}}.stream.volume",
        mute: { action: "toggle_stream_mute", feedback: "sonar.{{channel}}.stream.muted" },
      },
      check: checkChannel,
      run: ({ channel, percent: level }, ctx) => setLevel(ctx, parseChannel(channel), percent(level, 0, 100), true),
    },
    toggle_stream_mute: {
      description: "Mute a channel in the stream mix, or unmute it (streamer mode)",
      arguments: { channel: CHANNEL },
      active: { variable: "sonar.{{channel}}.stream.muted" },
      check: checkChannel,
      run: ({ channel }, ctx) => setMuted(ctx, parseChannel(channel), "toggle", true),
    },
    set_chat_mix: {
      description: "Set the chat mix: -100 is all chat, 100 all game",
      arguments: { balance: { kind: "number", description: "-100 to 100", example: "0" } },
      slider: { argument: "balance", min: -100, max: 100, step: 1, feedback: "sonar.chat_mix" },
      check: ({ balance }) => (Number.isFinite(Number(balance)) ? undefined : "the balance must be a number"),
      run: async ({ balance }, ctx) => {
        const value = percent(balance, -100, 100);
        await run(() => sonar.setChatMix(value / 100));
        ctx.vars.set({ "sonar.chat_mix": Math.round(value) });
      },
    },
    toggle_streamer_mode: {
      description: "Switch streamer mode on, or off",
      active: { variable: "sonar.streamer_mode" },
      run: async (_args, ctx) => {
        const on = !(await run(() => sonar.streamerMode()));
        await run(() => sonar.setStreamerMode(on));
        await refresh(ctx);
        return { state: on ? "on" : "off" };
      },
    },
    set_streamer_mode: {
      description: "Switch streamer mode on or off",
      arguments: { mode: { kind: "choice", description: "On or off", example: "on", choices: ["on", "off"] } },
      check: ({ mode }) => (mode === "on" || mode === "off" ? undefined : "the mode must be on or off"),
      run: async ({ mode }, ctx) => {
        await run(() => sonar.setStreamerMode(mode === "on"));
        await refresh(ctx);
      },
    },
  },

  sample: async (wanted, ctx) => {
    if (!wanted.some((name) => name.startsWith("sonar."))) return;
    const was = ctx.vars.get("sonar.connected") === true;
    const state = await read(ctx);
    if (state && !was) ctx.emit("connected", {});
    if (!state && was) ctx.emit("disconnected", {});
    return values(state);
  },

  start: (ctx) => {
    ctx.vars.set({ "sonar.connected": false });
  },

  stop: () => {
    sonar.forget();
  },
});

export default plugin;
