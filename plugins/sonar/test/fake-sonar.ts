import type { Answer, Transport } from "../src/sonar-client.ts";

type Level = { volume: number; muted: boolean };
const WIRE = ["game", "chatRender", "chatCapture", "media", "aux"];

const levels = (volume: number): Record<string, Level> =>
  Object.fromEntries(["master", ...WIRE].map((name) => [name, { volume, muted: false }]));

export class FakeSonar {
  running = true;
  ggUp = true;
  mode: "classic" | "stream" = "classic";
  chatMixRoute = true;
  chatMix = 0;
  classic = levels(1);
  monitoring = levels(0.8);
  streaming = levels(0.6);
  puts: string[] = [];
  ggAddressValue = "127.0.0.1:6327";
  sonarAddress = "http://127.0.0.1:60758";

  private settings(): string {
    const node = (name: string) => ({
      classic: this.classic[name],
      stream: this.mode === "stream" ? { monitoring: this.monitoring[name], streaming: this.streaming[name] } : {},
    });
    return JSON.stringify({
      masters: node("master"),
      devices: Object.fromEntries(WIRE.map((name) => [name, node(name)])),
    });
  }

  private handle(method: string, path: string): Answer {
    const ok = (body = "") => ({ status: 200, body });
    if (method === "GET") {
      if (path === "/mode") return ok(JSON.stringify(this.mode));
      if (path === "/chatMix") return this.chatMixRoute ? ok(JSON.stringify({ balance: this.chatMix })) : { status: 404, body: "" };
      if (path === "/volumeSettings/classic" || path === "/volumeSettings/streamer") return ok(this.settings());
      return { status: 404, body: "" };
    }
    this.puts.push(path);
    let match = /^\/mode\/(stream|classic)$/.exec(path);
    if (match) {
      this.mode = match[1] as "stream" | "classic";
      return ok();
    }
    match = /^\/chatMix\?balance=(-?[\d.]+)$/.exec(path);
    if (match) {
      if (!this.chatMixRoute) return { status: 404, body: "" };
      this.chatMix = Number(match[1]);
      return ok();
    }
    match = /^\/volumeSettings\/classic\/(\w+)\/(Volume|Mute)\/([\w.]+)$/.exec(path);
    if (match) {
      const level = this.classic[match[1]!];
      if (!level) return { status: 404, body: "" };
      if (match[2] === "Volume") level.volume = Number(match[3]);
      else level.muted = match[3] === "true";
      return ok();
    }
    match = /^\/volumeSettings\/streamer\/(monitoring|streaming)\/(\w+)\/(volume|isMuted)\/([\w.]+)$/.exec(path);
    if (match) {
      const level = (match[1] === "monitoring" ? this.monitoring : this.streaming)[match[2]!];
      if (!level) return { status: 404, body: "" };
      if (match[3] === "volume") level.volume = Number(match[4]);
      else level.muted = match[4] === "true";
      return ok();
    }
    return { status: 404, body: "" };
  }

  transport: Transport = {
    ggAddress: () => this.ggAddressValue,
    gg: async (url) => {
      if (!this.ggUp) throw new Error("ECONNREFUSED");
      if (!url.endsWith("/subApps")) return { status: 404, body: "" };
      return {
        status: 200,
        body: JSON.stringify({
          subApps: { sonar: { isEnabled: true, isRunning: this.running, metadata: { webServerAddress: this.sonarAddress } } },
        }),
      };
    },
    sonar: async (method, url) => {
      if (!this.running) throw new Error("ECONNREFUSED");
      const parsed = new URL(url);
      return this.handle(method, parsed.pathname + parsed.search);
    },
  };
}
