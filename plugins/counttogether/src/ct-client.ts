export const BASE_URL = "https://developers.counttogether.app/v2";
const SOCKET_URL = "wss://developers.counttogether.app/v2/ws";
const TIMEOUT_MS = 8000;

export type CounterKind = "UpDown" | "FromDate" | "ToDate";

export interface Counter {
  id: string;
  name: string;
  type: CounterKind;
  value: number | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface Notification {
  method: string;
  params: Record<string, unknown>;
}

export interface SocketLike {
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code?: number; reason?: string }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  close(): void;
}

export type Fetch = (url: string, init: { method: string; headers: Record<string, string>; body?: string; signal: AbortSignal }) => Promise<{
  status: number;
  text(): Promise<string>;
}>;

export type Connect = (url: string, token: string) => SocketLike;

export const defaultConnect: Connect = (url, token) =>
  new WebSocket(url, { headers: { Authorization: `Bearer ${token}` } } as unknown as string[]) as unknown as SocketLike;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function explain(status: number, body: string): string {
  if (status === 401 || status === 403) return "CountTogether refused the API token; copy a new one from the app";
  if (status === 404) return "that counter is gone, or no longer shared with you";
  if (status === 429) return "too many changes at once; try again in a moment";
  let detail = "";
  try {
    const parsed = JSON.parse(body) as { message?: string; detail?: string; title?: string };
    detail = parsed.message ?? parsed.detail ?? parsed.title ?? "";
  } catch {
    detail = "";
  }
  return detail ? `CountTogether said: ${detail.slice(0, 200)}` : `CountTogether answered ${status}`;
}

export class RateLimiter {
  private readonly stamps: number[] = [];
  private readonly perSecond: number;
  private readonly queueLimit: number;
  private waiting = 0;

  constructor(perSecond = 3, queueLimit = 12) {
    this.perSecond = perSecond;
    this.queueLimit = queueLimit;
  }

  async take(): Promise<void> {
    if (this.waiting >= this.queueLimit) throw new ApiError(429, "too many changes at once; try again in a moment");
    this.waiting += 1;
    try {
      for (;;) {
        const now = Date.now();
        while (this.stamps.length > 0 && now - this.stamps[0]! >= 1000) this.stamps.shift();
        if (this.stamps.length < this.perSecond) {
          this.stamps.push(now);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 - (now - this.stamps[0]!) + 1));
      }
    } finally {
      this.waiting -= 1;
    }
  }
}

export function timeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export class CountTogetherClient {
  private readonly token: string;
  private readonly zone: string;
  private readonly fetcher: Fetch;
  private readonly connector: Connect;
  private readonly limiter = new RateLimiter();

  constructor(token: string, options: { fetch?: Fetch; connect?: Connect; timeZone?: string } = {}) {
    this.token = token;
    this.zone = options.timeZone ?? timeZone();
    this.fetcher = options.fetch ?? (fetch as unknown as Fetch);
    this.connector = options.connect ?? defaultConnect;
  }

  private async request<T>(method: string, path: string, body?: unknown, zone = true): Promise<T> {
    await this.limiter.take();
    const url = `${BASE_URL}${path}${zone ? `?timezone=${encodeURIComponent(this.zone)}` : ""}`;
    let answer: { status: number; text(): Promise<string> };
    try {
      answer = await this.fetcher(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      throw new ApiError(0, timedOut ? "CountTogether did not answer in time" : "could not reach CountTogether");
    }
    const text = await answer.text();
    if (answer.status < 200 || answer.status >= 300) throw new ApiError(answer.status, explain(answer.status, text));
    if (answer.status === 204 || !text) return undefined as T;
    return JSON.parse(text) as T;
  }

  async counters(): Promise<Counter[]> {
    const data = await this.request<Counter[] | { data?: Counter[] }>("GET", "/counters");
    return Array.isArray(data) ? data : (data?.data ?? []);
  }

  async change(id: string, up: boolean, amount?: number): Promise<number> {
    const path = `/counters/${encodeURIComponent(id)}/${up ? "increment" : "decrement"}${amount === undefined ? "" : `/${amount}`}`;
    return Number(await this.request<number>("POST", path, undefined, false));
  }

  async setDate(id: string, field: "startDate" | "endDate", date: string): Promise<Counter> {
    const data = await this.request<Counter | { data: Counter }>("PATCH", `/counters/${encodeURIComponent(id)}`, { [field]: date });
    return "data" in data ? data.data : data;
  }

  listen(onNotification: (note: Notification) => void, onOpen: () => void, onClose: (code: number | undefined) => void): () => void {
    const socket = this.connector(`${SOCKET_URL}?timezone=${encodeURIComponent(this.zone)}`, this.token);
    let closed = false;
    socket.onopen = () => onOpen();
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as { method?: unknown; params?: unknown };
        if (typeof message.method === "string") {
          onNotification({ method: message.method, params: (message.params ?? {}) as Record<string, unknown> });
        }
      } catch {
        return;
      }
    };
    socket.onerror = () => {};
    socket.onclose = (event) => {
      if (closed) return;
      closed = true;
      onClose(event?.code);
    };
    return () => {
      closed = true;
      socket.close();
    };
  }
}
