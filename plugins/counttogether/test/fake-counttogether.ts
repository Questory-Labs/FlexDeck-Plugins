import type { Connect, Counter, Fetch, SocketLike } from "../src/ct-client.ts";

export class FakeSocket implements SocketLike {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: { code?: number; reason?: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  closed = false;
  readonly url: string;
  readonly token: string;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
    setTimeout(() => this.onopen?.(), 0);
  }

  push(method: string, params: Record<string, unknown>): void {
    this.onmessage?.({ data: JSON.stringify({ jsonrpc: "2.0", method, params }) });
  }

  drop(): void {
    this.onclose?.({ code: 1006 });
  }

  close(): void {
    this.closed = true;
  }
}

export class FakeCountTogether {
  token = "good-token";
  counters: Counter[] = [
    { id: "11111111-1111-1111-1111-111111111111", name: "Coffee", type: "UpDown", value: 3 },
    { id: "22222222-2222-2222-2222-222222222222", name: "Tägliche Übung", type: "UpDown", value: 10 },
    { id: "33333333-3333-3333-3333-333333333333", name: "Holiday", type: "ToDate", value: 12, endDate: "2026-11-06" },
  ];
  requests: { method: string; url: string; body?: string; auth: string }[] = [];
  sockets: FakeSocket[] = [];
  status: number | null = null;

  fetch: Fetch = async (url, init) => {
    this.requests.push({ method: init.method, url, body: init.body, auth: init.headers.Authorization ?? "" });
    const reply = (status: number, body: unknown) => ({ status, text: async () => (body === undefined ? "" : JSON.stringify(body)) });
    if (this.status) return reply(this.status, { message: "nope" });
    if (init.headers.Authorization !== `Bearer ${this.token}`) return reply(401, { message: "unauthorized" });
    const path = new URL(url).pathname.replace(/^\/v2/, "");
    if (init.method === "GET" && path === "/counters") return reply(200, this.counters);
    let match = /^\/counters\/([^/]+)\/(increment|decrement)(?:\/(\d+))?$/.exec(path);
    if (init.method === "POST" && match) {
      const counter = this.counters.find((entry) => entry.id === match![1]);
      if (!counter) return reply(404, undefined);
      const amount = Number(match[3] ?? "1");
      counter.value = (counter.value ?? 0) + (match[2] === "increment" ? amount : -amount);
      return reply(200, counter.value);
    }
    match = /^\/counters\/([^/]+)$/.exec(path);
    if (init.method === "PATCH" && match) {
      const counter = this.counters.find((entry) => entry.id === match![1]);
      if (!counter) return reply(404, undefined);
      Object.assign(counter, JSON.parse(init.body ?? "{}"));
      return reply(200, counter);
    }
    return reply(404, undefined);
  };

  connect: Connect = (url, token) => {
    const socket = new FakeSocket(url, token);
    this.sockets.push(socket);
    return socket;
  };

  get socket(): FakeSocket {
    return this.sockets[this.sockets.length - 1]!;
  }
}
