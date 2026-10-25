import { definePlugin, type Context, type Value, type VariableSpec } from "@flexdeck/plugin-sdk";

import { android, type Battery, bluetooth, defaultRunner, type Runner } from "./sources.ts";

const ID = "batteries";

let runner: Runner = defaultRunner;

export function useRunner(next: Runner | undefined): void {
  runner = next ?? defaultRunner;
  reset();
}

export function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "device";
}

interface State {
  devices: Battery[];
  names: Map<string, string>;
  at: number;
  inFlight: Promise<void> | null;
  low: Set<string>;
  charging: Map<string, boolean>;
  feeds: Map<string, string>;
  timer: ReturnType<typeof setInterval> | null;
  errors: Map<string, string>;
}

const state: State = {
  devices: [],
  names: new Map(),
  at: 0,
  inFlight: null,
  low: new Set(),
  charging: new Map(),
  feeds: new Map(),
  timer: null,
  errors: new Map(),
};

export function reset(): void {
  if (state.timer) clearInterval(state.timer);
  state.devices = [];
  state.names = new Map();
  state.at = 0;
  state.inFlight = null;
  state.low = new Set();
  state.charging = new Map();
  state.feeds = new Map();
  state.timer = null;
  state.errors = new Map();
}

function interval(ctx: Context): number {
  const seconds = Number(ctx.settings.every);
  return Number.isFinite(seconds) && seconds >= 10 ? seconds * 1000 : 60_000;
}

function threshold(ctx: Context): number {
  const value = Number(ctx.settings.low);
  return Number.isFinite(value) && value > 0 && value <= 100 ? value : 20;
}

function variableName(battery: Battery): string {
  let name = state.names.get(battery.key);
  if (name) return name;
  const taken = new Set(state.names.values());
  const base = slug(battery.name);
  name = base;
  for (let n = 2; taken.has(name); n += 1) name = `${base}_${n}`;
  state.names.set(battery.key, name);
  return name;
}

export function find(devices: readonly Battery[], wanted: string): Battery | undefined {
  const text = wanted.trim().toLowerCase();
  return (
    devices.find((device) => device.key === text) ??
    devices.find((device) => device.name.toLowerCase() === text) ??
    devices.find((device) => state.names.get(device.key) === slug(text))
  );
}

function sourceFailed(ctx: Context, source: string, error: unknown): void {
  const reason = error instanceof Error ? error.message : String(error);
  if (state.errors.get(source) !== reason) ctx.log.warn(`${source}: ${reason}`);
  state.errors.set(source, reason);
}

async function gather(ctx: Context): Promise<Battery[]> {
  const found: Battery[] = [];
  if (ctx.settings.bluetooth !== "false") {
    try {
      found.push(...(await bluetooth(runner)));
      state.errors.delete("bluetooth");
    } catch (error) {
      sourceFailed(ctx, "bluetooth", error);
    }
  }
  const adb = ctx.settings.adb?.trim();
  if (adb) {
    try {
      found.push(...(await android(runner, adb)));
      state.errors.delete("android");
    } catch (error) {
      sourceFailed(ctx, "android", error);
    }
  }
  return found;
}

function announce(ctx: Context, battery: Battery): void {
  const low = battery.level <= threshold(ctx);
  if (low && !state.low.has(battery.key)) {
    ctx.emit("low", { device: battery.name, level: String(battery.level) });
    if (ctx.settings.notify === "true") ctx.notify(`${battery.name} is low`, `${battery.level}% left`);
  }
  if (low) state.low.add(battery.key);
  else if (battery.level > threshold(ctx) + 2) state.low.delete(battery.key);
  if (battery.charging === null) return;
  const was = state.charging.get(battery.key);
  if (was !== undefined && was !== battery.charging) {
    ctx.emit(battery.charging ? "charging_started" : "charging_stopped", { device: battery.name, level: String(battery.level) });
  }
  state.charging.set(battery.key, battery.charging);
}

function publish(ctx: Context): void {
  const declared: Record<string, VariableSpec> = {};
  const values: Record<string, Value> = { "batteries.count": state.devices.length };
  for (const battery of state.devices) {
    const name = `batteries.${variableName(battery)}`;
    declared[`${name}.level`] = { kind: "number", unit: "%", description: `${battery.name}'s charge` };
    declared[`${name}.online`] = { kind: "bool", description: `Whether ${battery.name} is connected` };
    declared[`${name}.name`] = { kind: "text", description: `${battery.name}'s name` };
    values[`${name}.level`] = battery.level;
    values[`${name}.online`] = battery.online;
    values[`${name}.name`] = battery.name;
    if (battery.charging !== null) {
      declared[`${name}.charging`] = { kind: "bool", description: `Whether ${battery.name} is charging` };
      values[`${name}.charging`] = battery.charging;
    }
  }
  const lowest = state.devices.filter((device) => device.online).sort((a, b) => a.level - b.level)[0];
  if (lowest) {
    values["batteries.lowest.level"] = lowest.level;
    values["batteries.lowest.name"] = lowest.name;
  }
  ctx.vars.declare(declared);
  ctx.vars.set(values);
  for (const [instance, wanted] of state.feeds) publishFeed(ctx, instance, wanted);
}

function publishFeed(ctx: Context, instance: string, wanted: string): void {
  const battery = find(state.devices, wanted);
  if (!battery) {
    ctx.feed(instance).set({ found: false, name: wanted, level: 0, online: false, charging: false });
    return;
  }
  ctx.feed(instance).set({
    found: true,
    name: battery.name,
    level: battery.level,
    online: battery.online,
    charging: battery.charging === true,
  });
}

async function refresh(ctx: Context): Promise<void> {
  state.inFlight ??= (async () => {
    state.devices = await gather(ctx);
    state.at = Date.now();
    for (const battery of state.devices) announce(ctx, battery);
    publish(ctx);
  })().finally(() => {
    state.inFlight = null;
  });
  await state.inFlight;
}

function refreshInBackground(ctx: Context): void {
  void refresh(ctx).catch((error) => ctx.log.error(`could not read batteries: ${String(error)}`));
}

function keepFeedsFresh(ctx: Context): void {
  if (state.feeds.size === 0) {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
    return;
  }
  if (state.timer) return;
  state.timer = setInterval(() => refreshInBackground(ctx), interval(ctx));
}

const deviceChoices = async (_args: Record<string, string>, ctx: Context) => {
  if (state.at === 0) await Promise.race([refresh(ctx).catch(() => {}), new Promise((resolve) => setTimeout(resolve, 2500))]);
  return state.devices.map((device) => ({ value: device.name, label: `${device.name} · ${device.level}%` }));
};

const plugin = definePlugin({
  id: ID,
  name: "Device batteries",
  version: "0.1.0",
  description:
    "The charge of your Bluetooth headset, mouse, keyboard and controller, and of Android phones over adb, on the deck, with a warning when one runs low.",
  author: "flexdeck",
  permissions: ["processes"],

  settings: {
    bluetooth: { kind: "bool", description: "Read Bluetooth devices (Windows)", default: "true" },
    adb: {
      kind: "text",
      description: "To read Android phones too, the adb program: adb, or its full path",
      default: "",
      help: "Needs Android's platform tools and USB debugging (or wireless debugging) on the phone. Leave empty to skip phones.",
    },
    every: { kind: "number", description: "Seconds between readings, while a key shows one (at least 10)", default: "60" },
    low: { kind: "number", description: "Below this charge a device counts as low", default: "20" },
    notify: { kind: "bool", description: "Show a notification when a device runs low", default: "false" },
  },

  variables: {
    "batteries.count": { kind: "number", description: "How many devices report a charge" },
    "batteries.lowest.level": { kind: "number", unit: "%", description: "The emptiest connected device's charge" },
    "batteries.lowest.name": { kind: "text", description: "The emptiest connected device" },
  },

  events: {
    low: { description: "A device ran low", fields: ["device", "level"] },
    charging_started: { description: "A phone started charging", fields: ["device", "level"] },
    charging_stopped: { description: "A phone stopped charging", fields: ["device", "level"] },
  },

  feeds: {
    device: {
      description: "One device's battery, for one key",
      arguments: {
        device: { kind: "text", description: "The device, as it is named", example: "WH-1000XM5", suggest: deviceChoices },
      },
      fields: {
        found: { kind: "bool", description: "Whether the device reports a charge" },
        name: { kind: "text", description: "Its name" },
        level: { kind: "number", description: "Its charge, in percent" },
        online: { kind: "bool", description: "Whether it is connected" },
        charging: { kind: "bool", description: "Whether it is charging (phones)" },
      },
      watch: (instance, { device }, ctx) => {
        state.feeds.set(instance, device ?? "");
        keepFeedsFresh(ctx);
        if (state.at === 0) refreshInBackground(ctx);
        else publishFeed(ctx, instance, device ?? "");
      },
      unwatch: (instance, ctx) => {
        state.feeds.delete(instance);
        keepFeedsFresh(ctx);
      },
    },
  },

  presets: [
    {
      id: "device",
      name: "Battery",
      category: "System",
      description: "One device's charge, red when it runs low. Pick the device in Its own data.",
      widget: {
        sources: [{ source: "batteries/device" }],
        face: {
          layout: "FACE_LAYOUT_VALUE",
          rules: [{ when: "this.found and this.level <= 20", color: "#7f1d1d" }],
          elements: [
            { slot: "SLOT_TOP", template: "{{ this.name | truncate(14) }}" },
            { slot: "SLOT_VALUE", template: "{{ if(this.found, this.level + \"%\", \"—\") }}", text: { font: "FONT_MONO" } },
            { slot: "SLOT_CAPTION", template: "{{ if(this.charging, \"charging\", if(this.online, \"\", \"away\")) }}" },
          ],
        },
      },
    },
    {
      id: "lowest",
      name: "Lowest battery",
      category: "System",
      description: "Whichever connected device is emptiest, and its charge.",
      widget: {
        face: {
          layout: "FACE_LAYOUT_VALUE",
          rules: [{ when: "batteries.lowest.level <= 20", color: "#7f1d1d" }],
          elements: [
            { slot: "SLOT_TOP", template: "{{ batteries.lowest.name | default(\"Batteries\") | truncate(14) }}" },
            { slot: "SLOT_VALUE", template: "{{ batteries.lowest.level | default(\"—\") }}%", text: { font: "FONT_MONO" } },
          ],
        },
      },
    },
  ],

  actions: {
    refresh: {
      description: "Read every battery now",
      run: async (_args, ctx) => {
        await refresh(ctx);
        const errors = [...state.errors.values()];
        if (state.devices.length === 0 && errors.length > 0) throw new Error(errors.join("; "));
      },
    },
  },

  sample: async (wanted, ctx) => {
    if (!wanted.some((name) => name.startsWith("batteries."))) return;
    if (!state.inFlight && (state.at === 0 || Date.now() - state.at >= interval(ctx))) refreshInBackground(ctx);
  },

  settingsChanged: (ctx) => {
    const feeds = state.feeds;
    reset();
    state.feeds = feeds;
    keepFeedsFresh(ctx);
    refreshInBackground(ctx);
  },

  stop: () => {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
  },
});

export default plugin;
