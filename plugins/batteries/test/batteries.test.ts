import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { checkDefinition, harness } from "@flexdeck/plugin-sdk/testing";

import plugin, { slug, useRunner } from "../src/index.ts";
import { address, groupBluetooth, parseAdbDevices, parseDumpsys, type PnpNode } from "../src/sources.ts";

const HEADSET_MAC = "B8F653A1C2D4";
const MOUSE_MAC = "C8A1B2C3D4E5";

const NODES: PnpNode[] = [
  { id: `BTHENUM\\DEV_${HEADSET_MAC}\\7&1A2B3C&0&BLUETOOTHDEVICE_${HEADSET_MAC}`, name: "WH-1000XM5", status: "OK", level: null },
  { id: `BTHENUM\\{0000111E-0000-1000-8000-00805F9B34FB}_VID&0001054C_PID&0DF0\\8&2F1&0&${HEADSET_MAC}_C00000000`, name: "Hands-Free AG", status: "OK", level: 70 },
  { id: `BTHLE\\DEV_${MOUSE_MAC}\\8&3A&0&${MOUSE_MAC}`, name: "MX Master 3S", status: "Unknown", level: 15 },
  { id: "BTHENUM\\{00001200-0000-1000-8000-00805F9B34FB}_LOCALMFG&0000\\7&0&0&000000000000_00000000", name: "Device Identification Service", status: "OK", level: null },
];

const DUMPSYS = ["Pixel 8", "Current Battery Service state:", "  AC powered: false", "  USB powered: true", "  status: 2", "  level: 42", "  scale: 100"].join("\n");

function fakeRunner(nodes: PnpNode[] | null, adb?: { devices: string; dumpsys: string }) {
  const calls: { file: string; args: string[] }[] = [];
  const runner = async (file: string, args: string[]) => {
    calls.push({ file, args });
    if (file.toLowerCase().endsWith("powershell.exe")) {
      if (nodes === null) throw new Error("powershell failed");
      return JSON.stringify(nodes);
    }
    if (!adb) throw new Error("spawn adb ENOENT");
    if (args[0] === "devices") return adb.devices;
    return adb.dumpsys;
  };
  return { calls, runner };
}

afterEach(() => useRunner(undefined));

async function until(condition: () => boolean, what: string): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

test("the definition is one the agent will accept", async () => {
  await checkDefinition(plugin, new URL("../plugin.json", import.meta.url), { run: false });
});

test("a device's address is found in each of its nodes", () => {
  assert.equal(address(NODES[0]!.id), HEADSET_MAC.toLowerCase());
  assert.equal(address(NODES[1]!.id), HEADSET_MAC.toLowerCase());
  assert.equal(address("ROOT\\SYSTEM\\0001"), null);
});

test("Bluetooth nodes are grouped into one battery per device, named after the device", () => {
  const batteries = groupBluetooth(NODES);
  assert.deepEqual(
    batteries.map(({ name, level, online }) => ({ name, level, online })),
    [
      { name: "WH-1000XM5", level: 70, online: true },
      { name: "MX Master 3S", level: 15, online: false },
    ],
  );
});

test("adb's device list and battery dump are read", () => {
  assert.deepEqual(parseAdbDevices("List of devices attached\nR58M123\tdevice\n192.168.1.5:5555\tdevice\nemulator-5554\toffline\n"), [
    "R58M123",
    "192.168.1.5:5555",
  ]);
  const phone = parseDumpsys("R58M123", DUMPSYS);
  assert.equal(phone?.name, "Pixel 8");
  assert.equal(phone?.level, 42);
  assert.equal(phone?.charging, true);
  assert.equal(parseDumpsys("x", "error: device offline"), null);
});

test("a refresh publishes each device, the lowest one, and warns once when one runs low", async () => {
  if (process.platform !== "win32") return;
  const { runner } = fakeRunner(NODES);
  useRunner(runner);
  const host = await harness(plugin, { settings: { low: "20" } });
  await host.invoke("refresh");
  assert.equal(host.variable("batteries.count"), 2);
  assert.equal(host.variable("batteries.wh_1000xm5.level"), 70);
  assert.equal(host.variable("batteries.mx_master_3s.online"), false);
  assert.equal(host.variable("batteries.lowest.name"), "WH-1000XM5");
  await host.invoke("refresh");
  assert.equal(host.events().filter((event) => event.event === "low").length, 1);
  assert.deepEqual(host.events().find((event) => event.event === "low")?.payload, { device: "MX Master 3S", level: "15" });
});

test("phones are read over adb when it is set, and their charging is announced", async () => {
  const adb = { devices: "List of devices attached\nR58M123\tdevice\n", dumpsys: DUMPSYS };
  const { runner, calls } = fakeRunner([], adb);
  useRunner(runner);
  const host = await harness(plugin, { settings: { adb: "adb", bluetooth: "false" } });
  await host.invoke("refresh");
  assert.equal(host.variable("batteries.pixel_8.level"), 42);
  assert.equal(host.variable("batteries.pixel_8.charging"), true);
  assert.deepEqual(calls[1]?.args.slice(0, 3), ["-s", "R58M123", "shell"]);
  adb.dumpsys = DUMPSYS.replace("status: 2", "status: 3");
  await host.invoke("refresh");
  assert.equal(host.events().at(-1)?.event, "charging_stopped");
});

test("nothing found and every source failing is an error with the reasons", async () => {
  const { runner } = fakeRunner(null);
  useRunner(runner);
  const host = await harness(plugin, { settings: { adb: "adb", bluetooth: process.platform === "win32" ? "true" : "false" } });
  await assert.rejects(host.invoke("refresh"), /adb ENOENT/);
});

test("a key's feed follows the device it names", async () => {
  if (process.platform !== "win32") return;
  const { runner } = fakeRunner(NODES);
  useRunner(runner);
  const host = await harness(plugin, { settings: {} });
  await host.watch("k1", "device", { device: "mx master 3s" });
  await until(() => host.feed("k1").found === true, "the feed");
  assert.equal(host.feed("k1").level, 15);
  await host.watch("k2", "device", { device: "Nothing" });
  assert.equal(host.feed("k2").found, false);
  await host.unwatch("k1");
  await host.unwatch("k2");
});

test("names become variable-safe", () => {
  assert.equal(slug("Galaxy Buds2 Pro (L)"), "galaxy_buds2_pro_l");
});
