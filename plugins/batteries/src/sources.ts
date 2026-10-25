import { execFile } from "node:child_process";
import { join } from "node:path";

export interface Battery {
  key: string;
  name: string;
  kind: "bluetooth" | "android";
  level: number;
  charging: boolean | null;
  online: boolean;
}

export type Runner = (file: string, args: string[], timeoutMs: number) => Promise<string>;

export const defaultRunner: Runner = (file, args, timeoutMs) =>
  new Promise((resolve, reject) => {
    execFile(file, args, { timeout: timeoutMs, windowsHide: true, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(String(stderr || error.message).trim().split(/\r?\n/)[0]));
      else resolve(stdout);
    });
  });

const BLUETOOTH_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
$key = '{104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2'
$devices = @(Get-PnpDevice -PresentOnly | Where-Object { $_.InstanceId -match '^(BTHENUM|BTHLE|BTHLEDEVICE)\\\\' })
$levels = @{}
if ($devices.Count -gt 0) {
  Get-PnpDeviceProperty -InstanceId ($devices | ForEach-Object { $_.InstanceId }) -KeyName $key | ForEach-Object {
    if ($_.Type -ne 'Empty' -and $null -ne $_.Data) { $levels[$_.InstanceId] = [int]$_.Data }
  }
}
ConvertTo-Json -Compress -InputObject @($devices | ForEach-Object {
  [pscustomobject]@{ id = $_.InstanceId; name = $_.FriendlyName; status = [string]$_.Status; level = $levels[$_.InstanceId] }
})
`;

export interface PnpNode {
  id: string;
  name: string | null;
  status: string;
  level: number | null;
}

export function address(instanceId: string): string | null {
  const found = [...instanceId.matchAll(/(?:^|[_&\\])([0-9A-F]{12})(?=$|[_&\\])/gi)];
  return found.length > 0 ? found[found.length - 1]![1]!.toLowerCase() : null;
}

const GENERIC = /^(bluetooth|hands-free|handsfree|avrcp|audio|generic|device information|battery|le |microsoft)/i;

export function groupBluetooth(nodes: PnpNode[]): Battery[] {
  const groups = new Map<string, PnpNode[]>();
  for (const node of nodes) {
    const mac = address(node.id);
    if (!mac) continue;
    const group = groups.get(mac) ?? [];
    group.push(node);
    groups.set(mac, group);
  }
  const batteries: Battery[] = [];
  for (const [mac, group] of groups) {
    const levels = group.map((node) => node.level).filter((level): level is number => typeof level === "number" && level >= 0 && level <= 100);
    if (levels.length === 0) continue;
    const root = group.find((node) => /^(BTHENUM|BTHLE)\\DEV_/i.test(node.id) && node.name);
    const named = group.find((node) => node.name && !GENERIC.test(node.name));
    batteries.push({
      key: `bt-${mac}`,
      name: (root?.name ?? named?.name ?? `Bluetooth ${mac.slice(-4)}`).trim(),
      kind: "bluetooth",
      level: Math.max(...levels),
      charging: null,
      online: group.some((node) => node.status === "OK"),
    });
  }
  return batteries;
}

function powershell(): string {
  const root = process.env.SYSTEMROOT || process.env.SystemRoot || "C:\\Windows";
  return join(root, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
}

export async function bluetooth(run: Runner): Promise<Battery[]> {
  if (process.platform !== "win32") return [];
  const encoded = Buffer.from(BLUETOOTH_SCRIPT, "utf16le").toString("base64");
  const out = await run(powershell(), ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded], 20_000);
  const text = out.trim();
  if (!text) return [];
  const parsed = JSON.parse(text) as PnpNode[] | PnpNode;
  return groupBluetooth(Array.isArray(parsed) ? parsed : [parsed]);
}

export function parseAdbDevices(out: string): string[] {
  const serials: string[] = [];
  for (const line of out.split(/\r?\n/)) {
    const match = /^(\S+)\s+device(\s|$)/.exec(line.trim());
    if (match) serials.push(match[1]!);
  }
  return serials;
}

export function parseDumpsys(serial: string, out: string): Battery | null {
  const lines = out.split(/\r?\n/);
  const field = (name: string) => {
    const line = lines.find((entry) => entry.trim().toLowerCase().startsWith(`${name}:`));
    return line ? line.slice(line.indexOf(":") + 1).trim() : undefined;
  };
  const level = Number(field("level"));
  const scale = Number(field("scale") ?? "100") || 100;
  if (!Number.isFinite(level)) return null;
  const status = Number(field("status"));
  const model = lines[0]?.includes(":") ? "" : (lines[0] ?? "").trim();
  return {
    key: `android-${serial.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: model || `Android ${serial}`,
    kind: "android",
    level: Math.round((level / scale) * 100),
    charging: status === 2,
    online: true,
  };
}

export async function android(run: Runner, adb: string): Promise<Battery[]> {
  const serials = parseAdbDevices(await run(adb, ["devices"], 10_000));
  const batteries: Battery[] = [];
  for (const serial of serials) {
    try {
      const out = await run(adb, ["-s", serial, "shell", "getprop ro.product.model; dumpsys battery"], 10_000);
      const battery = parseDumpsys(serial, out);
      if (battery) batteries.push(battery);
    } catch {
      continue;
    }
  }
  return batteries;
}
