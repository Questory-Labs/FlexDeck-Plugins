import { readFileSync } from "node:fs";
import { request as httpsRequest } from "node:https";
import { join } from "node:path";

export const CHANNELS = ["master", "game", "chat", "mic", "media", "aux"] as const;
export type Channel = (typeof CHANNELS)[number];
const WIRE: Record<Channel, string> = {
  master: "master",
  game: "game",
  chat: "chatRender",
  mic: "chatCapture",
  media: "media",
  aux: "aux",
};

export type Mix = "classic" | "monitoring" | "streaming";

export interface Level {
  volume: number;
  muted: boolean;
}

export interface SonarState {
  streamer: boolean;
  personal: Record<Channel, Level>;
  stream: Record<Channel, Level> | null;
  chatMix: number | null;
}

export interface Answer {
  status: number;
  body: string;
}
export interface Transport {
  ggAddress(): string;
  gg(url: string): Promise<Answer>;
  sonar(method: "GET" | "PUT", url: string): Promise<Answer>;
}

const TIMEOUT_MS = 2500;
const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

export function isLoopback(address: string): boolean {
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(address) ? address : `http://${address}`);
    return LOOPBACK.has(url.hostname);
  } catch {
    return false;
  }
}

export function corePropsPath(): string {
  return join(process.env.PROGRAMDATA || process.env.ProgramData || "C:\\ProgramData", "SteelSeries", "GG", "coreProps.json");
}

export const defaultTransport: Transport = {
  ggAddress() {
    let raw: string;
    try {
      raw = readFileSync(corePropsPath(), "utf8");
    } catch {
      throw new Error("SteelSeries GG is not installed (no coreProps.json)");
    }
    const props = JSON.parse(raw) as { ggEncryptedAddress?: string };
    if (!props.ggEncryptedAddress) throw new Error("coreProps.json names no GG address; update SteelSeries GG");
    return props.ggEncryptedAddress;
  },
  gg(url) {
    const target = new URL(url);
    if (!LOOPBACK.has(target.hostname)) return Promise.reject(new Error(`GG's address ${target.host} is not on this computer`));
    return new Promise((resolve, reject) => {
      const req = httpsRequest(
        target,
        { method: "GET", rejectUnauthorized: false, timeout: TIMEOUT_MS },
        (res) => {
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (chunk: string) => {
            body += chunk;
            if (body.length > 1_000_000) req.destroy(new Error("GG's answer is too large"));
          });
          res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
        },
      );
      req.on("timeout", () => req.destroy(new Error("GG did not answer in time")));
      req.on("error", reject);
      req.end();
    });
  },
  async sonar(method, url) {
    const res = await fetch(url, { method, signal: AbortSignal.timeout(TIMEOUT_MS) });
    return { status: res.status, body: await res.text() };
  },
};

function level(node: unknown): Level {
  const value = (node ?? {}) as { volume?: unknown; muted?: unknown };
  return {
    volume: typeof value.volume === "number" && Number.isFinite(value.volume) ? value.volume : 0,
    muted: value.muted === true,
  };
}

interface VolumeSettings {
  masters?: { classic?: unknown; stream?: Record<string, unknown> };
  devices?: Record<string, { classic?: unknown; stream?: Record<string, unknown> }>;
}
export function readMix(json: string, mix: Mix): Record<Channel, Level> {
  const settings = JSON.parse(json) as VolumeSettings;
  const pick = (node: { classic?: unknown; stream?: Record<string, unknown> } | undefined) =>
    level(mix === "classic" ? node?.classic : node?.stream?.[mix]);
  const out = {} as Record<Channel, Level>;
  for (const channel of CHANNELS) {
    out[channel] = channel === "master" ? pick(settings.masters) : pick(settings.devices?.[WIRE[channel]]);
  }
  return out;
}
const num = (value: number) => String(Math.round(value * 10_000) / 10_000);

export class SonarClient {
  private base: string | null = null;
  private lastDiscovery = 0;

  private readonly transport: Transport;

  constructor(transport: Transport = defaultTransport) {
    this.transport = transport;
  }
  forget(): void {
    this.base = null;
  }

  async address(): Promise<string> {
    if (this.base) return this.base;
    const since = Date.now() - this.lastDiscovery;
    if (since < 3000) throw new Error("Sonar is not reachable; trying again in a moment");
    this.lastDiscovery = Date.now();
    const gg = this.transport.ggAddress();
    if (!isLoopback(gg)) throw new Error(`GG's address ${gg} is not on this computer`);
    let answer: Answer;
    try {
      answer = await this.transport.gg(`https://${gg.replace(/^https?:\/\//, "")}/subApps`);
    } catch {
      throw new Error("SteelSeries GG is not running");
    }
    if (answer.status !== 200) throw new Error(`SteelSeries GG answered ${answer.status}`);
    const apps = JSON.parse(answer.body) as {
      subApps?: Record<string, { isEnabled?: boolean; isRunning?: boolean; metadata?: { webServerAddress?: string } | null }>;
    };
    const sonar = apps.subApps?.sonar;
    if (!sonar || sonar.isEnabled === false) throw new Error("Sonar is switched off in SteelSeries GG");
    const address = sonar.metadata?.webServerAddress;
    if (!address || sonar.isRunning === false) throw new Error("Sonar is not running yet");
    if (!isLoopback(address)) throw new Error(`Sonar's address ${address} is not on this computer`);
    this.base = (/^https?:\/\//.test(address) ? address : `http://${address}`).replace(/\/+$/, "");
    return this.base;
  }

  private async call(method: "GET" | "PUT", path: string): Promise<Answer> {
    const base = await this.address();
    let answer: Answer;
    try {
      answer = await this.transport.sonar(method, `${base}${path}`);
    } catch {
      this.forget();
      throw new Error("Sonar stopped answering");
    }
    return answer;
  }

  private async get(path: string): Promise<string> {
    const answer = await this.call("GET", path);
    if (answer.status !== 200) throw new Error(`Sonar answered ${answer.status} for ${path}`);
    return answer.body;
  }

  private async put(path: string, missingIsFine = false): Promise<Answer> {
    const answer = await this.call("PUT", path);
    if (answer.status === 404 && missingIsFine) return answer;
    if (answer.status >= 300) throw new Error(`Sonar refused the change (${answer.status})`);
    return answer;
  }

  async streamerMode(): Promise<boolean> {
    return (await this.get("/mode")).replace(/"/g, "").trim().toLowerCase() === "stream";
  }

  async setStreamerMode(on: boolean): Promise<void> {
    await this.put(`/mode/${on ? "stream" : "classic"}`);
  }

  async chatMix(): Promise<number | null> {
    const answer = await this.call("GET", "/chatMix");
    if (answer.status !== 200) return null;
    try {
      const body = JSON.parse(answer.body) as number | { balance?: unknown };
      const value = typeof body === "number" ? body : body.balance;
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  }

  async state(): Promise<SonarState> {
    const streamer = await this.streamerMode();
    const chatMix = await this.chatMix();
    if (!streamer) {
      return { streamer, personal: readMix(await this.get("/volumeSettings/classic"), "classic"), stream: null, chatMix };
    }
    const json = await this.get("/volumeSettings/streamer");
    return { streamer, personal: readMix(json, "monitoring"), stream: readMix(json, "streaming"), chatMix };
  }

  private path(channel: Channel, mix: Mix, what: "volume" | "mute", value: string): string {
    const wire = WIRE[channel];
    if (mix === "classic") return `/volumeSettings/classic/${wire}/${what === "volume" ? "Volume" : "Mute"}/${value}`;
    return `/volumeSettings/streamer/${mix}/${wire}/${what === "volume" ? "volume" : "isMuted"}/${value}`;
  }
  async setVolume(channel: Channel, volume: number, stream = false): Promise<void> {
    const mix = await this.mixFor(stream);
    await this.put(this.path(channel, mix, "volume", num(Math.min(1, Math.max(0, volume)))));
  }

  async setMuted(channel: Channel, muted: boolean, stream = false): Promise<void> {
    const mix = await this.mixFor(stream);
    await this.put(this.path(channel, mix, "mute", String(muted)));
  }
  async setChatMix(balance: number): Promise<void> {
    const clamped = Math.min(1, Math.max(-1, balance));
    const answer = await this.put(`/chatMix?balance=${num(clamped)}`, true);
    if (answer.status !== 404) return;
    await this.setVolume("game", clamped >= 0 ? 1 : 1 + clamped);
    await this.setVolume("chat", clamped <= 0 ? 1 : 1 - clamped);
  }

  private async mixFor(stream: boolean): Promise<Mix> {
    const streamer = await this.streamerMode();
    if (stream && !streamer) throw new Error("the stream mix needs Sonar's streamer mode on");
    return streamer ? (stream ? "streaming" : "monitoring") : "classic";
  }
}
