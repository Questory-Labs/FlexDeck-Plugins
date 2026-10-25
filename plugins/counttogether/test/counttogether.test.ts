import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { checkDefinition, harness, type Host } from "@flexdeck/plugin-sdk/testing";

import { RateLimiter } from "../src/ct-client.ts";
import plugin, { describe, reset, slug, useNetwork } from "../src/index.ts";
import { FakeCountTogether } from "./fake-counttogether.ts";

const COFFEE = "11111111-1111-1111-1111-111111111111";
const HOLIDAY = "33333333-3333-3333-3333-333333333333";

afterEach(() => {
  reset();
  useNetwork(undefined);
});

async function until(condition: () => boolean, what: string): Promise<void> {
  const deadline = Date.now() + 3000;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

async function connected(fake = new FakeCountTogether(), token = "good-token"): Promise<{ fake: FakeCountTogether; host: Host }> {
  useNetwork({ fetch: fake.fetch, connect: fake.connect, timeZone: "Europe/Berlin" });
  const host = await harness(plugin, { settings: { token }, start: true });
  await until(() => host.variable("counttogether.connected") === true, "the connection");
  return { fake, host };
}

test("the definition is one the agent will accept", async () => {
  await checkDefinition(plugin, new URL("../plugin.json", import.meta.url), { run: false });
});

test("names become variable-safe, umlauts spelled out", () => {
  assert.equal(slug("Tägliche Übung"), "taegliche_uebung");
  assert.equal(slug("Café crème!"), "cafe_creme");
  assert.equal(slug("ß"), "ss");
});

test("date counters read as words", () => {
  assert.equal(describe({ id: "a", name: "x", type: "ToDate", value: 3 }), "3 days left");
  assert.equal(describe({ id: "a", name: "x", type: "ToDate", value: 0 }), "today");
  assert.equal(describe({ id: "a", name: "x", type: "ToDate", value: -1 }), "1 day overdue");
  assert.equal(describe({ id: "a", name: "x", type: "FromDate", value: 40 }), "40 days ago");
});

test("connecting publishes every counter and opens the live socket with the token", async () => {
  const { fake, host } = await connected();
  assert.equal(host.variable("counttogether.counter.coffee.value"), 3);
  assert.equal(host.variable("counttogether.counter.taegliche_uebung.value"), 10);
  assert.equal(host.variable("counttogether.counter.holiday.date"), "2026-11-06");
  assert.equal(host.variable("counttogether.counter.holiday.label"), "12 days left");
  assert.match(fake.requests[0]!.url, /\/v2\/counters\?timezone=Europe%2FBerlin$/);
  assert.equal(fake.socket.token, "good-token");
  assert.match(fake.socket.url, /^wss:\/\/developers\.counttogether\.app\/v2\/ws\?timezone=/);
});

test("counting up and down uses the counter's step or an amount", async () => {
  const { fake, host } = await connected();
  await host.invoke("increment", { counter: COFFEE });
  assert.equal(host.variable("counttogether.counter.coffee.value"), 4);
  await host.invoke("decrement", { counter: "coffee", amount: "3" });
  assert.equal(host.variable("counttogether.counter.coffee.value"), 1);
  assert.ok(fake.requests.some((request) => request.method === "POST" && request.url.endsWith(`/counters/${COFFEE}/decrement/3`)));
  const change = host.events().filter((event) => event.event === "changed").at(-1);
  assert.deepEqual(change?.payload, { counter: "Coffee", id: COFFEE, value: "1", previous: "4", change: "-3" });
});

test("setting a value sends the difference", async () => {
  const { fake, host } = await connected();
  await host.invoke("set_value", { counter: "Coffee", value: "10" });
  assert.equal(fake.counters[0]!.value, 10);
  assert.ok(fake.requests.some((request) => request.url.endsWith(`/counters/${COFFEE}/increment/7`)));
});

test("a date counter cannot be counted, but its date can be moved", async () => {
  const { fake, host } = await connected();
  await assert.rejects(host.invoke("increment", { counter: HOLIDAY }), /counts days by itself/);
  await host.invoke("set_date", { counter: "Holiday", date: "2026-12-24" });
  assert.equal(fake.counters[2]!.endDate, "2026-12-24");
  assert.equal(await host.check("set_date", { counter: "Holiday", date: "24.12.2026" }), "the date must be written YYYY-MM-DD");
});

test("changes pushed over the socket reach the deck at once", async () => {
  const { fake, host } = await connected();
  fake.socket.push("counterUpdated", { counterId: COFFEE, value: 42 });
  assert.equal(host.variable("counttogether.counter.coffee.value"), 42);
  fake.socket.push("counterUpdated", { counterId: COFFEE, name: "Espresso" });
  assert.equal(host.variable("counttogether.counter.espresso.value"), 42);
  fake.socket.push("counterDeleted", { counterId: COFFEE });
  assert.deepEqual(host.events().at(-1), { event: "deleted", payload: { counter: "Espresso", id: COFFEE } });
  assert.match((await host.check("increment", { counter: COFFEE })) ?? "", /no counter/);
});

test("a key's feed follows its counter", async () => {
  const { fake, host } = await connected();
  await host.watch("k1", "counter", { counter: HOLIDAY });
  assert.equal(host.feed("k1").label, "12 days left");
  fake.socket.push("counterUpdated", { counterId: HOLIDAY, value: -2 });
  assert.equal(host.feed("k1").label, "2 days overdue");
  await host.watch("k2", "counter", { counter: "nothing" });
  assert.equal(host.feed("k2").found, false);
});

test("a lost socket reconnects", async () => {
  const { fake, host } = await connected();
  fake.socket.drop();
  assert.equal(host.variable("counttogether.connected"), false);
  await until(() => fake.sockets.length === 2 && host.variable("counttogether.connected") === true, "the reconnect");
});

test("a refused token stops and says so", async () => {
  const fake = new FakeCountTogether();
  useNetwork({ fetch: fake.fetch, connect: fake.connect });
  const host = await harness(plugin, { settings: { token: "stale" }, start: true });
  await until(() => String(host.variable("counttogether.error")).includes("refused"), "the refusal");
  assert.equal(fake.sockets.length, 0);
  await assert.rejects(host.invoke("increment", { counter: "Coffee" }), /refused the API token/);
});

test("no token asks for one", async () => {
  useNetwork({ fetch: new FakeCountTogether().fetch });
  const host = await harness(plugin, { settings: {}, start: true });
  assert.match(String(host.variable("counttogether.error")), /API token/);
});

test("the rate limiter spaces requests and refuses a flood", async () => {
  const limiter = new RateLimiter(3, 2);
  const started = Date.now();
  await Promise.all([limiter.take(), limiter.take(), limiter.take()]);
  assert.ok(Date.now() - started < 100);
  const waiting = [limiter.take(), limiter.take()];
  await assert.rejects(limiter.take(), /too many/);
  await Promise.all(waiting);
  assert.ok(Date.now() - started >= 900);
});
