import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { checkDefinition, harness, type Host } from "@flexdeck/plugin-sdk/testing";

import plugin, { reset, slug, useConnection } from "../src/index.ts";
import { authResponse } from "../src/obs-client.ts";
import { FakeObs } from "./fake-obs.ts";

afterEach(() => {
  reset();
  useConnection(undefined);
});

/** Start the plugin against `obs` and wait until it has read OBS's state. */
async function connected(obs: FakeObs, settings: Record<string, string> = {}): Promise<Host> {
  useConnection(obs.connect);
  const host = await harness(plugin, { settings, start: true });
  await until(() => host.variable("obs.connected") === true && host.variable("obs.scene") !== undefined);
  return host;
}

async function until(condition: () => boolean, what = "the condition", ms = 3000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

test("the definition is one the agent will accept", async () => {
  // Actions are not run with their examples here: they need an OBS.
  await checkDefinition(plugin, new URL("../plugin.json", import.meta.url), { run: false });
});

test("the auth response is the one the obs-websocket spec defines", () => {
  // Worked example from the obs-websocket 5 protocol documentation.
  assert.equal(
    authResponse("supersecretpassword", "lM1GncleQOaCu9lT1yeUZhFYnqhsLLP1G5lAGo3ixaI=", "+IxH4CnCiqpX1rM9scsNynZzbOe4KhDeYcTNS3PDaeY="),
    "1Ct943GAT+6YQUUX47Ia/ncufilbe6+oD6lY+5kaCu4=",
  );
});

test("connecting publishes OBS's state, including one variable per audio input", async () => {
  const obs = new FakeObs({ inputs: { "Mic/Aux": false, "Desktop Audio": true } });
  const host = await connected(obs);

  assert.equal(host.variable("obs.scene"), "Scene");
  assert.equal(host.variable("obs.recording"), false);
  await until(() => host.variable("obs.input.desktop_audio.muted") === true, "the inputs");
  assert.equal(host.variable("obs.input.mic_aux.muted"), false);
  assert.ok(
    plugin.variables().some((variable) => variable.name === "obs.input.mic_aux.muted"),
    "inputs are declared at run time",
  );
  assert.ok(
    !plugin.variables().some((variable) => variable.name.includes("browser_source")),
    "a source without audio is not given a mute variable",
  );
  await until(() => host.events().length > 0, "the connected event");
  assert.deepEqual(host.events().at(-1), { event: "connected", payload: {} });
});

test("switching scene changes OBS, and the change comes back as an event", async () => {
  const obs = new FakeObs();
  const host = await connected(obs);

  await host.invoke("set_scene", { scene: "Live" });

  assert.equal(obs.scene, "Live");
  await until(() => host.variable("obs.scene") === "Live", "the scene variable");
  assert.deepEqual(host.events().at(-1), { event: "scene_changed", payload: { scene: "Live" } });
});

test("a scene the deck switches to shows at once, not after OBS's transition", async () => {
  const obs = new FakeObs({ transitionMs: 2000 });
  const host = await connected(obs);

  await host.invoke("set_scene", { scene: "Live" });

  // OBS has not announced it yet — its transition is still playing.
  assert.equal(host.variable("obs.scene"), "Live");
  assert.notDeepEqual(host.events().at(-1), { event: "scene_changed", payload: { scene: "Live" } });
});

test("a scene OBS does not have is refused before anything is sent", async () => {
  const obs = new FakeObs();
  const host = await connected(obs);
  const sent = obs.requests.length;

  const problem = await host.check("set_scene", { scene: "Nope" });

  assert.match(problem ?? "", /no scene called 'Nope'.*Scene, Live, BRB/);
  assert.equal(obs.requests.length, sent, "check never talks to OBS");
});

test("recording and streaming follow OBS's own events", async () => {
  const obs = new FakeObs();
  const host = await connected(obs);

  await host.invoke("toggle_recording");
  await until(() => host.variable("obs.recording") === true, "recording");
  assert.deepEqual(host.events().at(-1), { event: "record_state_changed", payload: { state: "started" } });

  await host.invoke("toggle_streaming");
  await until(() => host.variable("obs.streaming") === true, "streaming");

  // OBS changed on its own — someone clicked in OBS itself.
  obs.event("RecordStateChanged", { outputActive: false, outputState: "OBS_WEBSOCKET_OUTPUT_STOPPED" });
  await until(() => host.variable("obs.recording") === false, "the outside change");
  assert.equal(host.variable("obs.record_time"), "00:00:00");
});

test("the timecodes are read only when asked, and drop the milliseconds", async () => {
  const obs = new FakeObs();
  const host = await connected(obs);
  await host.invoke("start_recording");
  const before = obs.requests.filter((r) => r === "GetRecordStatus").length;

  const values = await host.sample(["obs.record_time"]);

  assert.deepEqual(values, { "obs.record_time": "00:01:05" });
  assert.equal(obs.requests.filter((r) => r === "GetRecordStatus").length, before + 1);
  assert.ok(!obs.requests.slice(-1).includes("GetStreamStatus"), "an unwatched timecode is not read");
});

test("mute accepts OBS's name or the variable's spelling", async () => {
  const obs = new FakeObs({ inputs: { "Mic/Aux": false } });
  const host = await connected(obs);
  await until(() => host.variable("obs.input.mic_aux.muted") === false, "the inputs");

  await host.invoke("toggle_mute", { input: "Mic/Aux" });
  await until(() => host.variable("obs.input.mic_aux.muted") === true, "muted");
  await host.invoke("set_mute", { input: "mic_aux", muted: "false" });
  await until(() => host.variable("obs.input.mic_aux.muted") === false, "unmuted");
  assert.deepEqual(host.events().at(-1), { event: "input_mute_changed", payload: { input: "Mic/Aux", muted: "false" } });

  await until(() => host.variable("obs.input.Mic/Aux.volume") === 100, "the starting volume");
  await host.invoke("set_volume", { input: "Mic/Aux", percent: "40" });
  assert.equal(obs.inputs.get("Mic/Aux")?.volume, 0.4);
  await until(() => host.variable("obs.input.Mic/Aux.volume") === 40, "the slider's feedback");
  const slider = plugin.manifest(3).actions.find((action) => action.action === "set_volume")?.slider;
  assert.equal(slider?.feedback, "obs.input.{{input}}.volume", "named the way the editor fills it");
  assert.equal(await host.check("set_volume", { input: "Mic/Aux", percent: "140" }), "the volume must be 0 to 100");
});

test("a source can be shown and hidden", async () => {
  const obs = new FakeObs();
  const host = await connected(obs);
  await host.invoke("toggle_source", { scene: "Scene", source: "Webcam" });
  assert.equal(obs.sources.get("Scene/Webcam"), false);
  await assert.rejects(host.invoke("toggle_source", { scene: "Scene", source: "Nope" }), /No scene items/);
});

test("what a key toggles is published by the names the editor fills in, so the key can light", async () => {
  const obs = new FakeObs({ inputs: { "Mic/Aux": false } });
  const host = await connected(obs);
  const active = Object.fromEntries(plugin.manifest().actions.map((action) => [action.action, action.active]));

  await until(() => host.variable("obs.input.Mic/Aux.muted") === false, "the input by OBS's name");
  assert.deepEqual(active.toggle_mute, { variable: "obs.input.{{input}}.muted" });
  await host.invoke("toggle_mute", { input: "Mic/Aux" });
  await until(() => host.variable("obs.input.Mic/Aux.muted") === true, "muted, by OBS's name");

  await until(() => host.variable("obs.source.Scene.Webcam.visible") === true, "the source");
  assert.deepEqual(active.toggle_source, { variable: "obs.source.{{scene}}.{{source}}.visible" });
  await host.invoke("toggle_source", { scene: "Scene", source: "Webcam" });
  assert.equal(host.variable("obs.source.Scene.Webcam.visible"), false, "at once");
  obs.handle("SetSceneItemEnabled", { sceneName: "Scene", sceneItemId: 1, sceneItemEnabled: true });
  await until(() => host.variable("obs.source.Scene.Webcam.visible") === true, "a change made in OBS");

  assert.deepEqual(active.toggle_virtual_camera, { variable: "obs.virtualcam" });
  await host.invoke("toggle_virtual_camera");
  await until(() => host.variable("obs.virtualcam") === true, "the virtual camera");

  assert.deepEqual(active.set_preview_scene, { variable: "obs.preview_scene", equals: "scene" });
  await host.invoke("toggle_studio_mode");
  await until(() => host.variable("obs.preview_scene") === "Scene", "the scene studio mode starts previewing");
  await host.invoke("set_preview_scene", { scene: "BRB" });
  await until(() => host.variable("obs.preview_scene") === "BRB", "the preview scene");
  await host.invoke("toggle_studio_mode");
  await until(() => host.variable("obs.preview_scene") === "", "no preview outside studio mode");
});

test("OBS's own refusal reaches the person", async () => {
  const obs = new FakeObs();
  const host = await connected(obs);
  // Bypass the check, as an automation built while OBS was closed would.
  await assert.rejects(host.invoke("set_scene", { scene: "Deleted" }), /No source was found by the name of `Deleted`/);
});

test("a password is used when OBS asks, and a wrong one is said so", async () => {
  const good = new FakeObs({ password: "hunter2" });
  const host = await connected(good, { password: "hunter2" });
  assert.equal(host.variable("obs.connected"), true);
  reset();

  const bad = new FakeObs({ password: "hunter2" });
  useConnection(bad.connect);
  const refused = await harness(plugin, { settings: { password: "wrong" }, start: true });
  await until(() => refused.logs().some((line) => /refused the password/.test(line.message)), "the refusal");
  assert.equal(refused.variable("obs.connected"), false);
});

test("with OBS closed, actions say why instead of doing nothing", async () => {
  const obs = new FakeObs({ offline: true });
  useConnection(obs.connect);
  const host = await harness(plugin, { start: true });
  await until(() => host.logs().some((line) => /is OBS running/.test(line.message)), "the failed connect");

  await assert.rejects(host.invoke("toggle_recording"), /OBS is not connected \(could not reach OBS/);
});

test("when OBS quits, the deck is told, and it reconnects when OBS is back", async () => {
  const obs = new FakeObs();
  const host = await connected(obs);

  obs.quit();
  await until(() => host.variable("obs.connected") === false, "the disconnect");
  assert.ok(host.events().some((event) => event.event === "disconnected"));

  obs.offline = false;
  await until(() => host.variable("obs.connected") === true, "the reconnect");
  await host.invoke("set_scene", { scene: "BRB" });
  assert.equal(obs.scene, "BRB");
});

test("input names become safe variable names", () => {
  assert.equal(slug("Mic/Aux"), "mic_aux");
  assert.equal(slug("  Desktop Audio 2 "), "desktop_audio_2");
  assert.equal(slug("🎤"), "input");
});

test("the editor is offered OBS's own scenes, inputs and the sources in a scene", async () => {
  const obs = new FakeObs({ scenes: ["Starting", "Live", "BRB"], inputs: { "Mic/Aux": false, "Desktop Audio": true } });
  obs.sources = new Map([
    ["Live/Webcam", true],
    ["Live/Overlay", true],
    ["BRB/Card", true],
  ]);
  const host = await connected(obs);
  await until(() => host.variable("obs.input.desktop_audio.muted") !== undefined, "the inputs");

  const scenes = await host.choices("set_scene");
  assert.deepEqual(scenes.arguments.scene?.map((c) => c.value), ["Starting", "Live", "BRB"], "in OBS's order");
  assert.equal(scenes.error, undefined);

  const inputs = await host.choices("set_mute");
  assert.deepEqual(inputs.arguments.input?.map((c) => c.value), ["Desktop Audio", "Mic/Aux"]);
  assert.equal(inputs.arguments.muted, undefined, "a fixed choice needs no suggestions");

  const noScene = await host.choices("toggle_source");
  assert.equal(noScene.arguments.source, undefined, "no scene chosen yet: typed until there is one");
  const live = await host.choices("toggle_source", { scene: "Live" });
  assert.deepEqual(live.arguments.source?.map((c) => c.value).sort(), ["Overlay", "Webcam"]);

  // A scene added in OBS just now is offered without reconnecting.
  obs.scenes.push("Ending");
  assert.ok((await host.choices("set_scene")).arguments.scene?.some((c) => c.value === "Ending"));
});

test("with OBS closed the editor is told why there is nothing to pick", async () => {
  const obs = new FakeObs({ offline: true });
  useConnection(obs.connect);
  const host = await harness(plugin, { start: true });
  // Let the first attempt fail before the test ends; otherwise it fails after
  // the cleanup and leaves a retry timer holding the process open.
  await until(() => host.logs().some((line) => line.level === "warn"), "the failed connection");
  const answer = await host.choices("set_scene");
  assert.equal(answer.arguments.scene, undefined);
  assert.match(answer.error ?? "", /^OBS is not connected/, "the reason itself, no 'Error:' in front");
});

test("an input's level streams only while the deck shows it, and stops after", async () => {
  const obs = new FakeObs({ inputs: { "Mic/Aux": false, "Desktop Audio": false } });
  const host = await connected(obs);
  await until(() => host.variable("obs.input.Mic/Aux.volume_db") === 0, "the inputs");
  assert.equal(obs.sockets[0]?.subscriptions, 0x7ff, "no meters until someone looks");

  await host.sample(["obs.input.Mic/Aux.level"]);
  await until(() => obs.sockets[0]?.subscriptions === (0x7ff | (1 << 16)), "the meter subscription");
  obs.meters({ "Mic/Aux": 0.5, "Desktop Audio": 0 });
  await until(() => host.variable("obs.input.Mic/Aux.level_db") === -6, "the level");
  assert.equal(host.variable("obs.input.Mic/Aux.level"), 90);
  assert.equal(host.variable("obs.input.Desktop Audio.level_db"), -60);
  assert.equal(host.variable("obs.input.Desktop Audio.level"), 0);

  await until(() => obs.sockets[0]?.subscriptions === 0x7ff, "the meters stopping");
  assert.equal(host.variable("obs.input.Mic/Aux.level"), 0, "a meter nobody reads rests at silence");
});

test("a renamed input's old level is no longer written", async () => {
  const obs = new FakeObs({ inputs: { "Mic/Aux": false } });
  const host = await connected(obs);
  await until(() => host.variable("obs.input.Mic/Aux.volume_db") === 0, "the inputs");
  await host.sample(["obs.input.Mic/Aux.level"]);
  await until(() => obs.sockets[0]?.subscriptions === (0x7ff | (1 << 16)), "the meter subscription");
  obs.meters({ "Mic/Aux": 0.5 });
  await until(() => host.variable("obs.input.Mic/Aux.level_db") === -6, "the level");

  const settings = obs.inputs.get("Mic/Aux")!;
  obs.inputs.delete("Mic/Aux");
  obs.inputs.set("Mic", settings);
  obs.event("InputNameChanged", { oldInputName: "Mic/Aux", inputName: "Mic" });
  await until(() => host.variable("obs.input.Mic.volume_db") === 0, "the new name");
  await host.sample(["obs.input.Mic.level"]);
  obs.meters({ Mic: 0.1 });
  await until(() => host.variable("obs.input.Mic.level_db") === -20, "the new name's level");

  await until(() => obs.sockets[0]?.subscriptions === 0x7ff, "the meters stopping", 5000);
  assert.equal(host.variable("obs.input.Mic.level_db"), -60);
  assert.deepEqual(
    host.logs().filter((line) => line.message.includes("Mic/Aux") && line.message.includes("never declared")),
    [],
    "the old name is not written after the rename",
  );
});

test("the volume is published in decibels as well as percent", async () => {
  const obs = new FakeObs();
  const host = await connected(obs);
  await host.invoke("set_volume", { input: "Mic/Aux", percent: "50" });
  await until(() => host.variable("obs.input.Mic/Aux.volume_db") === -6, "the volume in dB");
  assert.equal(host.variable("obs.input.Mic/Aux.volume"), 50);
});

test("OBS's performance and the stream's health are read only when asked", async () => {
  const obs = new FakeObs();
  const host = await connected(obs);
  const before = obs.requests.filter((type) => type === "GetStats").length;
  assert.equal(before, 0);

  const stats = await host.sample(["obs.stats.cpu", "obs.stats.memory", "obs.stats.disk_space", "obs.stats.fps", "obs.stream.congestion", "obs.stream.bitrate"]);
  assert.equal(stats["obs.stats.cpu"], 4.3);
  assert.equal(stats["obs.stats.memory"], 512);
  assert.equal(stats["obs.stats.disk_space"], 10);
  assert.equal(stats["obs.stats.fps"], 59.9);
  assert.equal(stats["obs.stream.congestion"], 25);
  assert.equal(stats["obs.stream.bitrate"], 0, "not streaming");

  obs.streaming = true;
  await host.sample(["obs.stream.bitrate"]);
  obs.streamBytes = 1_000_000;
  await new Promise((resolve) => setTimeout(resolve, 50));
  const live = await host.sample(["obs.stream.bitrate"]);
  assert.ok(Number(live["obs.stream.bitrate"]) > 0, "bytes sent since the last look make a bitrate");
});

test("a text source's words are a variable, and a key can change them", async () => {
  const obs = new FakeObs();
  const host = await connected(obs);
  await until(() => host.variable("obs.input.Title.text") === "Starting soon", "the text");
  assert.ok(!plugin.variables().some((variable) => variable.name === "obs.input.Title.muted"), "text has no audio");

  await host.invoke("set_text", { input: "Title", text: "Back in 5" });
  assert.equal(obs.texts.get("Title")?.text, "Back in 5");
  assert.equal(host.variable("obs.input.Title.text"), "Back in 5");

  obs.handle("SetInputSettings", { inputName: "Title", inputSettings: { text: "Live" } });
  await until(() => host.variable("obs.input.Title.text") === "Live", "a change made in OBS");
});

test("any source setting can be changed, keeping the type it already has", async () => {
  const obs = new FakeObs();
  const host = await connected(obs);

  const offered = await host.choices("set_input_setting", { input: "Browser Source" });
  assert.deepEqual(offered.arguments.setting?.map((choice) => choice.value), ["css", "fps", "reroute_audio", "url", "width"]);

  await host.invoke("set_input_setting", { input: "Browser Source", setting: "width", value: "1280" });
  assert.equal(obs.browser.width, 1280);
  await host.invoke("set_input_setting", { input: "Browser Source", setting: "reroute_audio", value: "true" });
  assert.equal(obs.browser.reroute_audio, true);
  await host.invoke("set_input_setting", { input: "Browser Source", setting: "url", value: "https://flexdeck.app" });
  assert.equal(obs.browser.url, "https://flexdeck.app");
  await assert.rejects(host.invoke("set_input_setting", { input: "Browser Source", setting: "width", value: "wide" }), /'wide' is not a number/);
  await assert.rejects(host.invoke("set_input_setting", { input: "Title", setting: "font", value: "big" }), /not a text, number or switch/);
});
