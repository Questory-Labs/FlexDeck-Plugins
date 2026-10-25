import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { checkDefinition, harness } from "@flexdeck/plugin-sdk/testing";

import plugin, { parse, useRunner, values } from "../src/index.ts";

const TWO_GPUS = [
  "0, NVIDIA GeForce RTX 5080, 2742, 16303, 7, 39, 45.98, 360.00, 0, 1162, 7001",
  "1, NVIDIA GeForce GTX 1060 6GB, 512, 6144, 0, 31, [N/A], [N/A], 23, 139, 405",
].join("\r\n");

afterEach(() => useRunner(undefined));

test("the definition is one the agent will accept", async () => {
  await checkDefinition(plugin, new URL("../plugin.json", import.meta.url), { run: false });
});

test("nvidia-smi's lines are read, with what a card cannot report left out", () => {
  const [first, second] = parse(TWO_GPUS);
  assert.equal(first?.name, "NVIDIA GeForce RTX 5080");
  assert.equal(first?.memoryTotal, 16303);
  assert.equal(second?.power, null);
  const published = values(second, null);
  assert.equal(published["gpu.memory.used_percent"], 8.3);
  assert.equal(published["gpu.memory.free"], 5632);
  assert.equal("gpu.power" in published, false);
});

test("sampling reads the chosen card and keeps a history for graphs", async () => {
  const calls: string[][] = [];
  useRunner(async (_file, args) => {
    calls.push(args);
    return TWO_GPUS;
  });
  const host = await harness(plugin, { settings: { gpu: "0", every: "1" } });
  await host.sample(["gpu.memory.used"]);
  assert.equal(host.variable("gpu.available"), true);
  assert.equal(host.variable("gpu.memory.used"), 2742);
  assert.equal(host.variable("gpu.memory.total_gb"), 15.9);
  assert.equal(host.variable("gpu.power"), 46);
  assert.match(calls[0]?.[0] ?? "", /^--query-gpu=index,name,memory\.used/);
  await host.sample(["gpu.memory.used"]);
  assert.equal(calls.length, 1, "a second sample within the interval reuses the reading");
  assert.deepEqual(host.series("gpu.usage"), [7]);
});

test("another card is picked by its index", async () => {
  useRunner(async () => TWO_GPUS);
  const host = await harness(plugin, { settings: { gpu: "1" } });
  await host.invoke("refresh");
  assert.equal(host.variable("gpu.name"), "NVIDIA GeForce GTX 1060 6GB");
});

test("no NVIDIA driver is reported, with the reason", async () => {
  useRunner(async () => {
    throw new Error("spawn nvidia-smi ENOENT");
  });
  const host = await harness(plugin, { settings: { path: "nvidia-smi" } });
  await assert.rejects(host.invoke("refresh"), /nvidia-smi was not found/);
  assert.equal(host.variable("gpu.available"), false);
  assert.match(String(host.variable("gpu.error")), /nvidia-smi was not found/);
});

test("a card index that is not there says so", async () => {
  useRunner(async () => TWO_GPUS);
  const host = await harness(plugin, { settings: { gpu: "4" } });
  await host.sample(["gpu.usage"]);
  assert.equal(host.variable("gpu.available"), false);
  assert.equal(host.variable("gpu.error"), "no such graphics card");
});
