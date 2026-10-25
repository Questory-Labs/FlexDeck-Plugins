import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { definePlugin, type Context, type Value, type VariableSpec } from "@flexdeck/plugin-sdk";

const ID = "gpu";

const FIELDS = [
  "index",
  "name",
  "memory.used",
  "memory.total",
  "utilization.gpu",
  "temperature.gpu",
  "power.draw",
  "power.limit",
  "fan.speed",
  "clocks.gr",
  "clocks.mem",
] as const;

export interface Reading {
  index: number;
  name: string;
  memoryUsed: number | null;
  memoryTotal: number | null;
  usage: number | null;
  temperature: number | null;
  power: number | null;
  powerLimit: number | null;
  fan: number | null;
  coreClock: number | null;
  memoryClock: number | null;
}

export type Runner = (file: string, args: string[]) => Promise<string>;

const TIMEOUT_MS = 2000;
const HISTORY = 120;

const defaultRunner: Runner = (file, args) =>
  new Promise((resolve, reject) => {
    execFile(file, args, { timeout: TIMEOUT_MS, windowsHide: true, maxBuffer: 256 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(String(stderr || error.message).trim().split(/\r?\n/)[0]));
      else resolve(stdout);
    });
  });

let runner: Runner = defaultRunner;

export function useRunner(next: Runner | undefined): void {
  runner = next ?? defaultRunner;
  reset();
}

const number = (text: string | undefined): number | null => {
  const value = Number((text ?? "").trim());
  return (text ?? "").trim() !== "" && Number.isFinite(value) ? value : null;
};

export function parse(csv: string): Reading[] {
  const readings: Reading[] = [];
  for (const line of csv.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = line.split(",").map((cell) => cell.trim());
    if (cells.length < FIELDS.length) continue;
    const index = number(cells[0]);
    if (index === null) continue;
    readings.push({
      index,
      name: cells[1] ?? "",
      memoryUsed: number(cells[2]),
      memoryTotal: number(cells[3]),
      usage: number(cells[4]),
      temperature: number(cells[5]),
      power: number(cells[6]),
      powerLimit: number(cells[7]),
      fan: number(cells[8]),
      coreClock: number(cells[9]),
      memoryClock: number(cells[10]),
    });
  }
  return readings;
}

export function candidates(setting: string | undefined): string[] {
  if (setting?.trim()) return [setting.trim()];
  const found = ["nvidia-smi"];
  if (process.platform === "win32") {
    const root = process.env.SYSTEMROOT || process.env.SystemRoot || "C:\\Windows";
    const programs = process.env.PROGRAMFILES || process.env.ProgramFiles || "C:\\Program Files";
    for (const path of [join(root, "System32", "nvidia-smi.exe"), join(programs, "NVIDIA Corporation", "NVSMI", "nvidia-smi.exe")]) {
      if (existsSync(path)) found.unshift(path);
    }
  }
  return found;
}

interface State {
  readings: Reading[];
  at: number;
  error: string | null;
  inFlight: Promise<void> | null;
  history: Record<string, number[]>;
  working: string | null;
}

const state: State = { readings: [], at: 0, error: null, inFlight: null, history: {}, working: null };

export function reset(): void {
  state.readings = [];
  state.at = 0;
  state.error = null;
  state.inFlight = null;
  state.history = {};
  state.working = null;
}

async function query(ctx: Context): Promise<Reading[]> {
  const args = [`--query-gpu=${FIELDS.join(",")}`, "--format=csv,noheader,nounits"];
  const tried = state.working ? [state.working] : candidates(ctx.settings.path);
  let last: unknown = null;
  for (const file of tried) {
    try {
      const readings = parse(await runner(file, args));
      state.working = file;
      return readings;
    } catch (error) {
      last = error;
    }
  }
  state.working = null;
  const reason = last instanceof Error ? last.message : String(last);
  throw new Error(/ENOENT|not recognized|not found/i.test(reason) ? "nvidia-smi was not found; is an NVIDIA driver installed?" : reason);
}

function interval(ctx: Context): number {
  const seconds = Number(ctx.settings.every);
  return Number.isFinite(seconds) && seconds >= 1 ? seconds * 1000 : 2000;
}

function selected(ctx: Context): Reading | undefined {
  const wanted = Number(ctx.settings.gpu || "0");
  return state.readings.find((reading) => reading.index === wanted);
}

const round = (value: number, places = 0) => Math.round(value * 10 ** places) / 10 ** places;

export function values(reading: Reading | undefined, error: string | null): Record<string, Value> {
  if (!reading) return { "gpu.available": false, "gpu.error": error ?? "no such graphics card" };
  const out: Record<string, Value> = { "gpu.available": true, "gpu.error": "", "gpu.name": reading.name };
  const put = (name: string, value: number | null, places = 0) => {
    if (value !== null) out[name] = round(value, places);
  };
  put("gpu.memory.used", reading.memoryUsed);
  put("gpu.memory.total", reading.memoryTotal);
  put("gpu.memory.free", reading.memoryUsed !== null && reading.memoryTotal !== null ? reading.memoryTotal - reading.memoryUsed : null);
  put("gpu.memory.used_gb", reading.memoryUsed !== null ? reading.memoryUsed / 1024 : null, 1);
  put("gpu.memory.total_gb", reading.memoryTotal !== null ? reading.memoryTotal / 1024 : null, 1);
  put(
    "gpu.memory.used_percent",
    reading.memoryUsed !== null && reading.memoryTotal ? (reading.memoryUsed / reading.memoryTotal) * 100 : null,
    1,
  );
  put("gpu.usage", reading.usage);
  put("gpu.temperature", reading.temperature);
  put("gpu.power", reading.power, 1);
  put("gpu.power_limit", reading.powerLimit, 1);
  put("gpu.fan", reading.fan);
  put("gpu.clock.core", reading.coreClock);
  put("gpu.clock.memory", reading.memoryClock);
  return out;
}

const GRAPHED = ["gpu.usage", "gpu.memory.used_percent", "gpu.temperature", "gpu.power"];

function record(ctx: Context, published: Record<string, Value>): void {
  for (const name of GRAPHED) {
    const value = published[name];
    if (typeof value !== "number") continue;
    const points = (state.history[name] ??= []);
    points.push(value);
    if (points.length > HISTORY) points.splice(0, points.length - HISTORY);
    ctx.series.set(name, points);
  }
}

async function refresh(ctx: Context): Promise<void> {
  state.inFlight ??= (async () => {
    try {
      state.readings = await query(ctx);
      state.error = null;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      if (reason !== state.error) ctx.log.warn(reason);
      state.readings = [];
      state.error = reason;
    } finally {
      state.at = Date.now();
    }
    const published = values(selected(ctx), state.error);
    ctx.vars.set(published);
    record(ctx, published);
  })().finally(() => {
    state.inFlight = null;
  });
  await state.inFlight;
}

const variables: Record<string, VariableSpec> = {
  "gpu.available": { kind: "bool", description: "Whether the graphics card could be read" },
  "gpu.error": { kind: "text", description: "Why it could not, if it could not" },
  "gpu.name": { kind: "text", description: "The graphics card's name" },
  "gpu.memory.used": { kind: "number", unit: "MiB", description: "Video memory in use" },
  "gpu.memory.free": { kind: "number", unit: "MiB", description: "Video memory free" },
  "gpu.memory.total": { kind: "number", unit: "MiB", description: "Video memory in all" },
  "gpu.memory.used_gb": { kind: "number", unit: "GB", description: "Video memory in use" },
  "gpu.memory.total_gb": { kind: "number", unit: "GB", description: "Video memory in all" },
  "gpu.memory.used_percent": { kind: "number", unit: "%", description: "Video memory in use" },
  "gpu.usage": { kind: "number", unit: "%", description: "How busy the graphics card is" },
  "gpu.temperature": { kind: "number", unit: "°C", description: "The graphics card's temperature" },
  "gpu.power": { kind: "number", unit: "W", description: "Power the graphics card draws" },
  "gpu.power_limit": { kind: "number", unit: "W", description: "Its power limit" },
  "gpu.fan": { kind: "number", unit: "%", description: "Fan speed" },
  "gpu.clock.core": { kind: "number", unit: "MHz", description: "Graphics clock" },
  "gpu.clock.memory": { kind: "number", unit: "MHz", description: "Memory clock" },
};

const plugin = definePlugin({
  id: ID,
  name: "NVIDIA GPU",
  version: "0.1.0",
  description:
    "Your NVIDIA graphics card on the deck: video memory in use, load, temperature, power, fan and clocks, with a recent history for graphs.",
  author: "flexdeck",
  permissions: ["processes"],

  settings: {
    gpu: { kind: "number", description: "Which graphics card, counting from 0", default: "0" },
    every: { kind: "number", description: "Seconds between readings, while a key shows one", default: "2" },
    path: {
      kind: "text",
      description: "Where nvidia-smi is, if FlexDeck cannot find it",
      default: "",
      help: "Leave empty: it is looked for on PATH and where the NVIDIA driver puts it.",
    },
  },

  variables,

  presets: [
    {
      id: "vram",
      name: "Video memory",
      category: "System",
      description: "Video memory in use, with the last few minutes drawn behind.",
      widget: {
        face: {
          layout: "FACE_LAYOUT_VALUE",
          background: { graph: "gpu.memory.used_percent", graphColor: "#76b900" },
          elements: [
            { slot: "SLOT_TOP", template: "VRAM" },
            { slot: "SLOT_VALUE", template: "{{ gpu.memory.used_gb | number }} GB", text: { font: "FONT_MONO" } },
            { slot: "SLOT_CAPTION", template: "of {{ gpu.memory.total_gb | number }} GB" },
          ],
        },
      },
    },
    {
      id: "load",
      name: "GPU load",
      category: "System",
      description: "How busy the graphics card is and how hot it runs; red above 85 °C.",
      widget: {
        face: {
          layout: "FACE_LAYOUT_VALUE",
          background: { graph: "gpu.usage", graphColor: "#76b900" },
          rules: [{ when: "gpu.temperature > 85", color: "#7f1d1d" }],
          elements: [
            { slot: "SLOT_TOP", template: "GPU" },
            { slot: "SLOT_VALUE", template: "{{ gpu.usage | round }}%", text: { font: "FONT_MONO" } },
            { slot: "SLOT_CAPTION", template: "{{ gpu.temperature | temp }} · {{ gpu.power | round }} W" },
          ],
        },
      },
    },
  ],

  actions: {
    refresh: {
      description: "Read the graphics card now",
      run: async (_args, ctx) => {
        await refresh(ctx);
        if (state.error) throw new Error(state.error);
      },
    },
  },

  sample: async (wanted, ctx) => {
    if (!wanted.some((name) => name.startsWith("gpu."))) return;
    if (Date.now() - state.at >= interval(ctx)) await refresh(ctx);
  },

  settingsChanged: (ctx) => {
    reset();
    void refresh(ctx);
  },
});

export default plugin;
