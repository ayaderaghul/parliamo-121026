/**
 * Every call to a public service goes through here, so the etiquette lives in
 * one place (design doc, "When a service fails: no bombarding"):
 *
 *   1. Retry-After from the service: wait exactly that long, up to a day.
 *   2. A used-up quota: daily → 00:05 UTC, hourly → next hour, minutely → next minute.
 *   3. 403: pause one hour, log and show "you are blocked".
 *   4. 5xx, timeouts, network failures: back off 1, 2, 4 … 60 minutes.
 *   5. 400 / 404: no pause; the caller caches the answer.
 *
 * A paused service is not called at all. Pauses are saved in the database so
 * a restart does not forget them.
 */
import type { Pool } from "pg";

export type Service = "open-meteo" | "open-meteo-geocoding" | "met-norway" | "nominatim";
export const SERVICE_NAME: Record<Service, string> = {
  "open-meteo": "Open-Meteo",
  "open-meteo-geocoding": "Open-Meteo geocoding",
  "met-norway": "MET Norway",
  nominatim: "OpenStreetMap search",
};

/** Identifies the app and a contact, as MET Norway and Nominatim require. */
export const USER_AGENT = "parliamo-viaggio/1.0 (+https://github.com/ayaderaghul/parliamo-121026)";
export const TIMEOUT_MS = 3000;
const MINUTE = 60_000, HOUR = 60 * MINUTE, DAY = 24 * HOUR;

export interface ServiceState {
  pausedUntil: number;
  failures: number;
  lastStatus: number | null;
  reason: string;
}
const fresh = (): ServiceState => ({ pausedUntil: 0, failures: 0, lastStatus: null, reason: "" });

export class Paused extends Error {
  constructor(public service: Service, public state: ServiceState) {
    super(`${SERVICE_NAME[service]} paused until ${new Date(state.pausedUntil).toISOString()} (${state.reason})`);
  }
}

export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/** Seconds or an HTTP date, capped at one day; null when absent or unreadable. */
export function retryAfterMs(h: string | null, now: number): number | null {
  if (!h) return null;
  const secs = Number(h);
  const ms = Number.isFinite(secs) ? secs * 1000 : Date.parse(h) - now;
  return Number.isFinite(ms) && ms > 0 ? Math.min(ms, DAY) : null;
}

/** When a used-up quota resets, read from the refusal's text. */
export function quotaReset(body: string, now: number): number | null {
  const d = new Date(now);
  if (/daily|per day|day limit/i.test(body)) {
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 5); // 00:05 UTC
  }
  if (/hourly|per hour|hour limit/i.test(body)) return Math.floor(now / HOUR) * HOUR + HOUR + 5_000;
  if (/minutely|per minute|minute limit/i.test(body)) return Math.floor(now / MINUTE) * MINUTE + MINUTE + 1_000;
  return null;
}

export const backoffMs = (failures: number) => Math.min(60, 2 ** Math.max(0, failures - 1)) * MINUTE;

export class Outside {
  private states = new Map<Service, ServiceState>();
  private nominatimNext = 0;
  private nominatimChain: Promise<void> = Promise.resolve();

  constructor(
    private db: Pool | null,
    private fetchImpl: Fetch = (u, i) => fetch(u, i),
    private now: () => number = Date.now,
    private log: (msg: string) => void = (m) => console.warn(m),
  ) {}

  async load() {
    if (!this.db) return;
    const { rows } = await this.db.query("select service, paused_until, failures, last_status, reason from service_state");
    for (const r of rows) {
      this.states.set(r.service, {
        pausedUntil: r.paused_until ? new Date(r.paused_until).getTime() : 0,
        failures: r.failures, lastStatus: r.last_status, reason: r.reason ?? "",
      });
    }
  }

  state(s: Service): ServiceState {
    return this.states.get(s) ?? fresh();
  }
  isPaused(s: Service) {
    return this.state(s).pausedUntil > this.now();
  }
  /** Services refusing us with 403 right now: shown on screen as "you are blocked". */
  blocked(): string[] {
    return [...this.states.entries()]
      .filter(([, st]) => st.lastStatus === 403 && st.pausedUntil > this.now())
      .map(([s]) => `${SERVICE_NAME[s]}: you are blocked`);
  }

  private async save(s: Service, st: ServiceState) {
    this.states.set(s, st);
    if (!this.db) return;
    await this.db.query(
      `insert into service_state (service, paused_until, failures, last_status, reason, updated_at)
       values ($1, $2, $3, $4, $5, now())
       on conflict (service) do update set paused_until = $2, failures = $3, last_status = $4, reason = $5, updated_at = now()`,
      [s, st.pausedUntil ? new Date(st.pausedUntil) : null, st.failures, st.lastStatus, st.reason],
    ).catch((e) => this.log(`service_state not saved: ${e.message}`));
  }

  private async pause(s: Service, until: number, status: number | null, reason: string, failures?: number) {
    const st = this.state(s);
    await this.save(s, { pausedUntil: until, failures: failures ?? st.failures, lastStatus: status, reason });
    this.log(`${SERVICE_NAME[s]} paused until ${new Date(until).toISOString()}: ${reason}`);
  }

  private async backoff(s: Service, status: number | null, reason: string) {
    const failures = this.state(s).failures + 1;
    await this.pause(s, this.now() + backoffMs(failures), status, reason, failures);
  }

  /**
   * One polite request. Returns the response for 2xx, 304, 400 and 404 (the
   * caller decides); throws Paused when the service is paused or has just
   * been paused by this answer.
   */
  async call(s: Service, url: string, headers: Record<string, string> = {}): Promise<Response> {
    if (this.isPaused(s)) throw new Paused(s, this.state(s));
    if (s === "nominatim") await this.nominatimSlot();

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        headers: { "User-Agent": USER_AGENT, "Accept-Encoding": "gzip, deflate", Accept: "application/json", ...headers },
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e: any) {
      await this.backoff(s, null, e?.name === "TimeoutError" ? "timeout" : `network: ${e?.message ?? e}`);
      throw new Paused(s, this.state(s));
    }

    const now = this.now();
    if (res.ok || res.status === 304) {
      if (res.status === 203) this.log(`${SERVICE_NAME[s]} answered 203: this API version is deprecated and will stop`);
      if (this.state(s).failures || this.state(s).lastStatus) await this.save(s, fresh());
      return res;
    }
    if (res.status === 400 || res.status === 404) return res; // that request is wrong, the service is fine

    const wait = retryAfterMs(res.headers.get("retry-after"), now);
    if (wait !== null) {
      await this.pause(s, now + wait, res.status, `Retry-After ${Math.round(wait / 1000)} s`);
      throw new Paused(s, this.state(s));
    }
    if (res.status === 429) {
      const body = await res.text().catch(() => "");
      const reset = quotaReset(body, now);
      if (reset) await this.pause(s, reset, 429, `quota: ${body.slice(0, 120)}`);
      else await this.backoff(s, 429, "429 without a reset time");
      throw new Paused(s, this.state(s));
    }
    if (res.status === 403) {
      this.log(`${SERVICE_NAME[s]}: you are blocked`);
      await this.pause(s, now + HOUR, 403, "you are blocked");
      throw new Paused(s, this.state(s));
    }
    if (res.status >= 500) {
      await this.backoff(s, res.status, `server error ${res.status}`);
      throw new Paused(s, this.state(s));
    }
    return res; // other 4xx: the request, not the service
  }

  /** Nominatim: at most one request a second for the whole app. */
  private nominatimSlot(): Promise<void> {
    const next = this.nominatimChain.then(async () => {
      const wait = this.nominatimNext - this.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.nominatimNext = this.now() + 1100;
    });
    this.nominatimChain = next.catch(() => {});
    return next;
  }
}

/** Requests for the same thing that arrive together share one call. */
export class SingleFlight<T> {
  private inFlight = new Map<string, Promise<T>>();
  run(key: string, job: () => Promise<T>): Promise<T> {
    const running = this.inFlight.get(key);
    if (running) return running;
    const p = job().finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, p);
    return p;
  }
}
