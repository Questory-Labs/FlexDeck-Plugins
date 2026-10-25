import { definePlugin, type ArgumentSpec, type Context, type Value, type VariableSpec } from "@flexdeck/plugin-sdk";

import { ApiError, type Connect, type Counter, CountTogetherClient, type Fetch, type Notification } from "./ct-client.ts";

const ID = "counttogether";
const REFRESH_MS = 5 * 60_000;
const MAX_CHANGE = 1_000_000;

export function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "counter"
  );
}

interface State {
  client: CountTogetherClient | null;
  close: (() => void) | null;
  counters: Map<string, Counter>;
  names: Map<string, string>;
  feeds: Map<string, string>;
  loadedAt: number;
  rejected: boolean;
  retry: ReturnType<typeof setTimeout> | null;
  attempt: number;
  stopping: boolean;
}

const state: State = {
  client: null,
  close: null,
  counters: new Map(),
  names: new Map(),
  feeds: new Map(),
  loadedAt: 0,
  rejected: false,
  retry: null,
  attempt: 0,
  stopping: false,
};

let overrides: { fetch?: Fetch; connect?: Connect; timeZone?: string } = {};

export function useNetwork(next: { fetch?: Fetch; connect?: Connect; timeZone?: string } | undefined): void {
  overrides = next ?? {};
}

export function reset(): void {
  disconnect();
  state.stopping = false;
  state.counters = new Map();
  state.names = new Map();
  state.feeds = new Map();
  state.loadedAt = 0;
  state.rejected = false;
  state.attempt = 0;
}

function disconnect(): void {
  state.stopping = true;
  if (state.retry) clearTimeout(state.retry);
  state.retry = null;
  state.close?.();
  state.close = null;
  state.client = null;
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

function variableName(counter: Counter): string {
  const known = state.names.get(counter.id);
  if (known && known === slug(counter.name)) return known;
  if (known && known.startsWith(`${slug(counter.name)}_`)) return known;
  const taken = new Set([...state.names].filter(([id]) => id !== counter.id).map(([, name]) => name));
  const base = slug(counter.name);
  let name = base;
  for (let n = 2; taken.has(name); n += 1) name = `${base}_${n}`;
  state.names.set(counter.id, name);
  return name;
}

export function describe(counter: Counter): string {
  if (counter.value === null) return "";
  if (counter.type === "UpDown") return String(counter.value);
  const days = counter.value;
  if (counter.type === "FromDate") return days === 1 ? "1 day ago" : `${days} days ago`;
  if (days === 0) return "today";
  if (days < 0) return Math.abs(days) === 1 ? "1 day overdue" : `${Math.abs(days)} days overdue`;
  return days === 1 ? "1 day left" : `${days} days left`;
}

const dateOf = (counter: Counter) => (counter.type === "FromDate" ? counter.startDate : counter.type === "ToDate" ? counter.endDate : null) ?? "";

function publish(ctx: Context, replace = false): void {
  const declared: Record<string, VariableSpec> = {
    "counttogether.connected": { kind: "bool", description: "Whether CountTogether is connected" },
    "counttogether.error": { kind: "text", description: "Why it is not, if it is not" },
  };
  const values: Record<string, Value> = {};
  for (const counter of state.counters.values()) {
    const base = `counttogether.counter.${variableName(counter)}`;
    declared[`${base}.value`] = {
      kind: "number",
      description: counter.type === "UpDown" ? `"${counter.name}"` : `"${counter.name}" in days (${counter.type === "ToDate" ? "left" : "since"})`,
    };
    declared[`${base}.name`] = { kind: "text", description: `"${counter.name}"'s name` };
    declared[`${base}.label`] = { kind: "text", description: `"${counter.name}" as words: 3 days left` };
    if (counter.value !== null) values[`${base}.value`] = counter.value;
    values[`${base}.name`] = counter.name;
    values[`${base}.label`] = describe(counter);
    if (counter.type !== "UpDown") {
      declared[`${base}.date`] = { kind: "text", description: `"${counter.name}"'s date, YYYY-MM-DD` };
      values[`${base}.date`] = dateOf(counter);
    }
  }
  ctx.vars.declare(declared, { replace });
  ctx.vars.set(values);
  for (const [instance, wanted] of state.feeds) publishFeed(ctx, instance, wanted);
}

function publishFeed(ctx: Context, instance: string, wanted: string): void {
  const counter = find(wanted);
  if (!counter) {
    ctx.feed(instance).set({ found: false, name: wanted, value: 0, label: "", kind: "", date: "" });
    return;
  }
  ctx.feed(instance).set({
    found: true,
    name: counter.name,
    value: counter.value ?? 0,
    label: describe(counter),
    kind: counter.type,
    date: dateOf(counter),
  });
}

export function find(wanted: string): Counter | undefined {
  const text = wanted.trim();
  if (!text) return undefined;
  const all = [...state.counters.values()];
  return (
    state.counters.get(text) ??
    all.find((counter) => counter.name === text) ??
    all.find((counter) => counter.name.toLowerCase() === text.toLowerCase()) ??
    all.find((counter) => state.names.get(counter.id) === slug(text))
  );
}

function setStatus(ctx: Context, connected: boolean, error: string): void {
  ctx.vars.set({ "counttogether.connected": connected, "counttogether.error": error });
}

async function load(ctx: Context): Promise<void> {
  const client = state.client;
  if (!client) return;
  const counters = await client.counters();
  const before = state.counters;
  state.counters = new Map(counters.map((counter) => [counter.id, counter]));
  state.loadedAt = Date.now();
  for (const [id, counter] of before) {
    if (!state.counters.has(id)) ctx.emit("deleted", { counter: counter.name, id });
  }
  for (const counter of state.counters.values()) {
    const previous = before.get(counter.id);
    if (previous && previous.value !== counter.value) changed(ctx, counter, previous.value);
  }
  publish(ctx, true);
}

function changed(ctx: Context, counter: Counter, previous: number | null): void {
  ctx.emit("changed", {
    counter: counter.name,
    id: counter.id,
    value: String(counter.value ?? ""),
    previous: String(previous ?? ""),
    change: counter.value !== null && previous !== null ? String(counter.value - previous) : "",
  });
}

function onNotification(ctx: Context, note: Notification): void {
  const id = String(note.params.counterId ?? "");
  if (note.method === "counterUpdated" && id) {
    const known = state.counters.get(id);
    if (!known) {
      void load(ctx).catch((error) => ctx.log.warn(`could not read the counters: ${message(error)}`));
      return;
    }
    const previous = known.value;
    const params = note.params as Partial<Counter>;
    const updated: Counter = {
      ...known,
      name: typeof params.name === "string" && params.name ? params.name : known.name,
      type: params.type === "UpDown" || params.type === "FromDate" || params.type === "ToDate" ? params.type : known.type,
      value: typeof params.value === "number" ? params.value : known.value,
      startDate: params.startDate ?? known.startDate,
      endDate: params.endDate ?? known.endDate,
    };
    state.counters.set(id, updated);
    if (updated.name !== known.name) state.names.delete(id);
    if (updated.value !== previous) changed(ctx, updated, previous);
    publish(ctx, updated.name !== known.name);
  } else if (note.method === "counterDeleted" && id) {
    const gone = state.counters.get(id);
    if (!gone) return;
    state.counters.delete(id);
    state.names.delete(id);
    ctx.emit("deleted", { counter: gone.name, id });
    publish(ctx, true);
  } else if (note.method === "counterMemberlistChanged") {
    void load(ctx).catch((error) => ctx.log.warn(`could not read the counters: ${message(error)}`));
  }
}

function schedule(ctx: Context): void {
  if (state.stopping || state.retry || state.rejected) return;
  const delay = Math.min(120_000, 2000 * 2 ** Math.min(state.attempt, 6));
  state.attempt += 1;
  state.retry = setTimeout(() => {
    state.retry = null;
    void connect(ctx);
  }, delay);
}

export async function connect(ctx: Context): Promise<void> {
  if (state.stopping) return;
  const token = ctx.settings.token?.trim();
  if (!token) {
    setStatus(ctx, false, "add your API token in the plugin's settings");
    return;
  }
  const client = new CountTogetherClient(token, overrides);
  state.client = client;
  try {
    await load(ctx);
  } catch (error) {
    state.client = null;
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      state.rejected = true;
      ctx.log.warn("CountTogether refused the API token");
    }
    setStatus(ctx, false, message(error));
    schedule(ctx);
    return;
  }
  state.close = client.listen(
    (note) => onNotification(ctx, note),
    () => {
      state.attempt = 0;
      setStatus(ctx, true, "");
      ctx.log.info("connected to CountTogether");
    },
    () => {
      state.close = null;
      state.client = null;
      if (state.stopping) return;
      setStatus(ctx, false, "lost the connection to CountTogether; reconnecting");
      schedule(ctx);
    },
  );
}

function client(): CountTogetherClient {
  if (state.rejected) throw new Error("CountTogether refused the API token; copy a new one from the app");
  if (!state.client) throw new Error("CountTogether is not connected");
  return state.client;
}

function counterFor(wanted: string): Counter {
  const counter = find(wanted);
  if (!counter) throw new Error(`you have no counter called '${wanted}'`);
  return counter;
}

async function change(ctx: Context, wanted: string, up: boolean, amountText: string | undefined): Promise<void> {
  const api = client();
  const counter = counterFor(wanted);
  if (counter.type !== "UpDown") throw new Error(`"${counter.name}" counts days by itself; change its date instead`);
  let amount: number | undefined;
  if (amountText?.trim()) {
    amount = Number(amountText);
    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_CHANGE) throw new Error(`the amount must be a whole number from 1 to ${MAX_CHANGE}`);
  }
  const previous = counter.value;
  let value: number;
  try {
    value = await api.change(counter.id, up, amount);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) void load(ctx).catch(() => {});
    throw new Error(message(error));
  }
  if (!Number.isFinite(value)) return;
  const updated = { ...counter, value };
  state.counters.set(counter.id, updated);
  if (value !== previous) changed(ctx, updated, previous);
  publish(ctx);
}

const unknownCounter = (wanted: string | undefined): string | undefined =>
  state.client && state.loadedAt > 0 && !find(wanted ?? "") ? `you have no counter called '${wanted}'` : undefined;

const suggestCounters = (kinds: Counter["type"][]) => async () => {
  if (!state.client) throw new Error(state.rejected ? "CountTogether refused the API token" : "CountTogether is not connected");
  return [...state.counters.values()]
    .filter((counter) => kinds.includes(counter.type))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((counter) => ({ value: counter.id, label: counter.name }));
};

const COUNTER: ArgumentSpec = {
  kind: "text",
  description: "The counter",
  example: "Coffee",
  suggest: suggestCounters(["UpDown"]),
};

const AMOUNT: ArgumentSpec = {
  kind: "number",
  description: "By how much; empty uses the counter's own step",
  example: "1",
  optional: true,
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const plugin = definePlugin({
  id: ID,
  name: "CountTogether",
  version: "0.1.0",
  description:
    "Count up and down from the deck and show your CountTogether counters and countdowns, updated the moment anyone you share them with changes them.",
  author: "flexdeck",
  permissions: ["network"],
  guide: "https://github.com/Questory-Labs/FlexDeck-Plugins/tree/main/plugins/counttogether#set-up",

  settings: {
    token: {
      kind: "text",
      description: "Your CountTogether API token",
      secret: true,
      help: "In the CountTogether app: Settings → API Token → Show API token.",
    },
  },

  variables: {
    "counttogether.connected": { kind: "bool", description: "Whether CountTogether is connected" },
    "counttogether.error": { kind: "text", description: "Why it is not, if it is not" },
  },

  events: {
    changed: { description: "A counter changed", fields: ["counter", "id", "value", "previous", "change"] },
    deleted: { description: "A counter was deleted, or is no longer shared with you", fields: ["counter", "id"] },
  },

  feeds: {
    counter: {
      description: "One counter, for one key",
      arguments: {
        counter: { kind: "text", description: "The counter", example: "Coffee", suggest: suggestCounters(["UpDown", "FromDate", "ToDate"]) },
      },
      fields: {
        found: { kind: "bool", description: "Whether you have that counter" },
        name: { kind: "text", description: "Its name" },
        value: { kind: "number", description: "Its count, or its days for a date counter" },
        label: { kind: "text", description: "Its value as words: 3 days left" },
        kind: { kind: "text", description: "UpDown, FromDate or ToDate" },
        date: { kind: "text", description: "A date counter's date, YYYY-MM-DD" },
      },
      watch: (instance, { counter }, ctx) => {
        state.feeds.set(instance, counter ?? "");
        publishFeed(ctx, instance, counter ?? "");
      },
      unwatch: (instance) => {
        state.feeds.delete(instance);
      },
    },
  },

  presets: [
    {
      id: "counter",
      name: "Counter",
      category: "Web",
      description: "Shows a counter and counts it up on a press. Pick the counter in Its own data and under Does.",
      widget: {
        sources: [{ source: "counttogether/counter" }],
        flows: [{ trigger: { gesture: "GESTURE_SHORT_PRESS" }, blocks: [{ block: "doAction", plugin: ID, action: "increment", args: { counter: { text: "" } } }] }],
        face: {
          layout: "FACE_LAYOUT_VALUE",
          elements: [
            { slot: "SLOT_TOP", template: "{{ this.name | truncate(14) }}" },
            { slot: "SLOT_VALUE", template: "{{ if(this.found, this.value, \"—\") }}", text: { font: "FONT_MONO" } },
          ],
        },
      },
    },
    {
      id: "countdown",
      name: "Countdown",
      category: "Web",
      description: "Days left to a CountTogether countdown; red once it is overdue. Pick the countdown in Its own data.",
      widget: {
        sources: [{ source: "counttogether/counter" }],
        face: {
          layout: "FACE_LAYOUT_VALUE",
          rules: [{ when: "this.kind == \"ToDate\" and this.value < 0", color: "#7f1d1d" }],
          elements: [
            { slot: "SLOT_TOP", template: "{{ this.name | truncate(14) }}" },
            { slot: "SLOT_VALUE", template: "{{ if(this.found, this.value | abs, \"—\") }}", text: { font: "FONT_MONO" } },
            { slot: "SLOT_CAPTION", template: "{{ this.label }}" },
          ],
        },
      },
    },
  ],

  actions: {
    increment: {
      description: "Count a counter up",
      arguments: { counter: COUNTER, amount: AMOUNT },
      check: ({ counter }) => unknownCounter(counter),
      run: ({ counter, amount }, ctx) => change(ctx, counter, true, amount),
    },
    decrement: {
      description: "Count a counter down",
      arguments: { counter: COUNTER, amount: AMOUNT },
      check: ({ counter }) => unknownCounter(counter),
      run: ({ counter, amount }, ctx) => change(ctx, counter, false, amount),
    },
    set_value: {
      description: "Set a counter to a number",
      arguments: { counter: COUNTER, value: { kind: "number", description: "The new count", example: "0" } },
      check: ({ counter, value }) => (Number.isInteger(Number(value)) ? unknownCounter(counter) : "the count must be a whole number"),
      run: async ({ counter, value }, ctx) => {
        const target = counterFor(counter);
        const wanted = Number(value);
        if (!Number.isInteger(wanted)) throw new Error("the count must be a whole number");
        const difference = wanted - (target.value ?? 0);
        if (difference === 0) return;
        if (Math.abs(difference) > MAX_CHANGE) throw new Error(`a counter can change by at most ${MAX_CHANGE} at once`);
        await change(ctx, counter, difference > 0, String(Math.abs(difference)));
      },
    },
    set_date: {
      description: "Move a date counter's date: the start it counts from, or the day it counts down to",
      arguments: {
        counter: { ...COUNTER, description: "The date counter", example: "Holiday", suggest: suggestCounters(["FromDate", "ToDate"]) },
        date: { kind: "text", description: "The date, YYYY-MM-DD", example: "2026-12-24" },
      },
      check: ({ counter, date }) => (DATE.test(date?.trim() ?? "") ? unknownCounter(counter) : "the date must be written YYYY-MM-DD"),
      run: async ({ counter, date }, ctx) => {
        const target = counterFor(counter);
        if (target.type === "UpDown") throw new Error(`"${target.name}" is not a date counter`);
        if (!DATE.test(date.trim())) throw new Error("the date must be written YYYY-MM-DD");
        const updated = await client()
          .setDate(target.id, target.type === "FromDate" ? "startDate" : "endDate", date.trim())
          .catch((error: unknown) => {
            throw new Error(message(error));
          });
        state.counters.set(target.id, { ...target, ...updated, id: target.id });
        publish(ctx);
      },
    },
  },

  sample: async (wanted, ctx) => {
    if (!wanted.some((name) => name.startsWith("counttogether."))) return;
    if (state.client && Date.now() - state.loadedAt >= REFRESH_MS) {
      state.loadedAt = Date.now();
      void load(ctx).catch((error) => ctx.log.warn(`could not read the counters: ${message(error)}`));
    }
  },

  start: (ctx) => {
    state.stopping = false;
    setStatus(ctx, false, "connecting");
    void connect(ctx);
  },

  settingsChanged: (ctx) => {
    const feeds = state.feeds;
    reset();
    state.feeds = feeds;
    void connect(ctx);
  },

  stop: () => disconnect(),
});

export default plugin;
