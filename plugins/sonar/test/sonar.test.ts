import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { checkDefinition, harness } from "@flexdeck/plugin-sdk/testing";

import plugin, { useTransport } from "../src/index.ts";
import { isLoopback, readMix } from "../src/sonar-client.ts";
import { FakeSonar } from "./fake-sonar.ts";

afterEach(() => useTransport(undefined));

async function connected(fake = new FakeSonar()) {
  useTransport(fake.transport);
  const host = await harness(plugin, { start: true });
  return { fake, host };
}

test("the definition is one the agent will accept", async () => {
  await checkDefinition(plugin, new URL("../plugin.json", import.meta.url), { run: false });
  const manifest = plugin.manifest(4);
  assert.equal(manifest.actions.find((action) => action.action === "set_volume")?.slider?.feedback, "sonar.{{channel}}.volume");
});

test("only loopback addresses count as this computer", () => {
  assert.equal(isLoopback("127.0.0.1:6327"), true);
  assert.equal(isLoopback("http://localhost:1"), true);
  assert.equal(isLoopback("192.168.1.4:6327"), false);
  assert.equal(isLoopback("https://example.com"), false);
});

test("a mix is read out of Sonar's volume settings", () => {
  const json = JSON.stringify({
    masters: { classic: { volume: 0.5, muted: true }, stream: {} },
    devices: { chatCapture: { classic: { volume: 0.25, muted: false } } },
  });
  const mix = readMix(json, "classic");
  assert.deepEqual(mix.master, { volume: 0.5, muted: true });
  assert.deepEqual(mix.mic, { volume: 0.25, muted: false });
  assert.deepEqual(mix.game, { volume: 0, muted: false });
});

test("sampling publishes every level, as percent", async () => {
  const { host } = await connected();
  await host.sample(["sonar.game.volume"]);
  const values = (name: string) => host.variable(name);
  assert.equal(values("sonar.connected"), true);
  assert.equal(values("sonar.game.volume"), 100);
  assert.equal(values("sonar.streamer_mode"), false);
  assert.equal(values("sonar.chat_mix"), 0);
  assert.equal(host.events().at(-1)?.event, "connected");
});

test("setting a level and muting reach Sonar's classic routes", async () => {
  const { fake, host } = await connected();
  await host.invoke("set_volume", { channel: "chat", percent: "40" });
  assert.equal(fake.classic.chatRender!.volume, 0.4);
  assert.equal(host.variable("sonar.chat.volume"), 40);
  assert.equal(await host.invoke("toggle_mute", { channel: "mic" }), "muted");
  assert.equal(fake.classic.chatCapture!.muted, true);
  assert.equal(await host.invoke("toggle_mute", { channel: "mic" }), "unmuted");
  await host.invoke("change_volume", { channel: "game", step: "-15" });
  assert.equal(fake.classic.game!.volume, 0.85);
  assert.ok(fake.puts.includes("/volumeSettings/classic/chatRender/Volume/0.4"));
});

test("in streamer mode the personal and stream mixes are separate", async () => {
  const { fake, host } = await connected();
  await host.invoke("toggle_streamer_mode");
  assert.equal(fake.mode, "stream");
  assert.equal(host.variable("sonar.streamer_mode"), true);
  await host.invoke("set_volume", { channel: "media", percent: "30" });
  await host.invoke("set_stream_volume", { channel: "media", percent: "70" });
  assert.equal(fake.monitoring.media!.volume, 0.3);
  assert.equal(fake.streaming.media!.volume, 0.7);
  await host.invoke("toggle_stream_mute", { channel: "master" });
  assert.equal(fake.streaming.master!.muted, true);
  await host.sample(["sonar.media.stream.volume"]);
  const values = (name: string) => host.variable(name);
  assert.equal(values("sonar.media.stream.volume"), 70);
  assert.equal(values("sonar.master.stream.muted"), true);
});

test("the stream mix is refused outside streamer mode", async () => {
  const { host } = await connected();
  await assert.rejects(host.invoke("set_stream_volume", { channel: "game", percent: "10" }), /streamer mode/);
});

test("the chat mix falls back to game and chat levels without its route", async () => {
  const fake = new FakeSonar();
  const { host } = await connected(fake);
  await host.invoke("set_chat_mix", { balance: "-50" });
  assert.equal(fake.chatMix, -0.5);
  fake.chatMixRoute = false;
  await host.invoke("set_chat_mix", { balance: "40" });
  assert.equal(fake.classic.game!.volume, 1);
  assert.equal(fake.classic.chatRender!.volume, 0.6);
});

test("an unknown channel is refused before anything runs", async () => {
  const { host } = await connected();
  assert.match((await host.check("toggle_mute", { channel: "voice" })) ?? "", /no channel/);
});

test("Sonar going away is reported, and found again on its new port", async () => {
  const fake = new FakeSonar();
  const { host } = await connected(fake);
  await host.sample(["sonar.game.volume"]);
  fake.running = false;
  assert.equal((await host.sample(["sonar.game.volume"]), host.variable("sonar.connected")), false);
  assert.equal(host.events().at(-1)?.event, "disconnected");
  fake.running = true;
  fake.sonarAddress = "http://127.0.0.1:61000";
  await new Promise((resolve) => setTimeout(resolve, 3100));
  assert.equal((await host.sample(["sonar.game.volume"]), host.variable("sonar.connected")), true);
});

test("a Sonar address off this computer is never used", async () => {
  const fake = new FakeSonar();
  fake.sonarAddress = "http://10.0.0.5:60758";
  const { host } = await connected(fake);
  assert.equal((await host.sample(["sonar.game.volume"]), host.variable("sonar.connected")), false);
  await assert.rejects(host.invoke("set_volume", { channel: "game", percent: "10" }), /not on this computer|trying again/);
});
