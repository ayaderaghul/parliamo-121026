/**
 * Where the game lives. Both stores hold the same thing, an event log; the
 * state is always replay(log), computed by the shared rules.
 *
 *   AccountGame: the server checks and stamps every event (its clock, its
 *                record of today's visitor).
 *   GuestGame:   this browser's localStorage, same rules, the browser's clock.
 */
import { CONTENT_VERSION } from "../game/content";
import { dayOf, moonAt } from "../game/cielo";
import { normalize, replay, step, tryStep, visitorFor, type EventBody, type GameEvent, type GameState, type Visitor } from "../game/rules";
import { api, ApiError } from "../client/store";

export interface Place { kind: "qui" | "citta"; name: string; lat: number; lon: number }
export interface Reading {
  sky: "clear" | "cloud" | "fog" | "rain" | "snow";
  source: string;
  at: string | null;
  blocked: string[];
}
export interface Today { day: string; reading: Reading; moon: { age: number; lit: number }; visitor: Visitor | null }

export interface Game {
  readonly kind: "guest" | "account";
  state: GameState;
  events: GameEvent[];
  place: Place | null;
  load(): Promise<void>;
  /** Apply one event; resolves with the new state, rejects with the rule that refused it. */
  send(body: EventBody): Promise<GameState>;
  setPlace(p: Place): Promise<void>;
  today(fallback: { lat: number; lon: number }): Promise<Today>;
}

/** One event at a time, in order: each knows its index in the log. */
class Queue {
  private chain: Promise<unknown> = Promise.resolve();
  run<T>(job: () => Promise<T>): Promise<T> {
    const next = this.chain.then(job, job);
    this.chain = next.catch(() => {});
    return next;
  }
}

export class AccountGame implements Game {
  readonly kind = "account";
  state = replay([]);
  events: GameEvent[] = [];
  place: Place | null = null;
  private q = new Queue();

  async load() {
    const r = await api<{ events: GameEvent[]; place: Place | null }>("/api/viaggio");
    this.events = r.events;
    this.state = replay(r.events);
    this.place = r.place;
  }

  send(body: EventBody) {
    return this.q.run(async () => {
      const index = this.events.length;
      try {
        const r = await api<{ index: number; at: string; v: string }>("/api/viaggio/eventi", { index, event: body });
        const e = { ...normalize(body), at: r.at, v: r.v } as GameEvent;
        this.events.push(e);
        step(this.state, e);
        return this.state;
      } catch (err) {
        // someone else (another tab) wrote first: reload the log and say so
        if (err instanceof ApiError && err.status === 409) await this.load();
        throw err;
      }
    });
  }

  async importDiagnostic() {
    return this.q.run(async () => {
      await api("/api/viaggio/ingresso", {});
      await this.load();
      return this.state;
    });
  }

  async setPlace(p: Place) {
    const r = await api<{ place: Place }>("/api/viaggio/luogo", p);
    this.place = r.place;
  }

  async today(fallback: { lat: number; lon: number }) {
    const q = this.place ? "" : `?lat=${fallback.lat}&lon=${fallback.lon}`;
    return api<Today>(withForce(`/api/viaggio/oggi${q}`));
  }
}

/** development: ?meteo=nebbia on the page is passed on to the server, which ignores it in production */
const force = () => { const m = new URLSearchParams(location.search).get("meteo"); return m ? `meteo=${encodeURIComponent(m)}` : ""; };
const withForce = (url: string) => { const f = force(); return f ? url + (url.includes("?") ? "&" : "?") + f : url; };

const KEY = "viaggio.guest.v1";
const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode: in memory only */ } };

export class GuestGame implements Game {
  readonly kind = "guest";
  state = replay([]);
  events: GameEvent[] = [];
  place: Place | null = null;
  private days: Record<string, Visitor | null> = {};

  async load() {
    const raw = get(KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      this.events = Array.isArray(saved.events) ? saved.events : [];
      this.place = saved.place ?? null;
      this.days = saved.days ?? {};
      this.state = replay(this.events);
    } catch { /* a damaged save starts over */ }
  }
  private save() {
    set(KEY, JSON.stringify({ events: this.events, place: this.place, days: this.days }));
  }

  async send(body: EventBody) {
    let at = new Date().toISOString();
    if (at < this.state.lastAt) at = this.state.lastAt;
    const e = { ...normalize(body), at, v: CONTENT_VERSION } as GameEvent;
    this.state = tryStep(this.state, e, { visitor: this.days[dayOf(at)] ?? null });
    this.events.push(e);
    this.save();
    return this.state;
  }

  async setPlace(p: Place) {
    this.place = p;
    this.save();
  }

  async today(fallback: { lat: number; lon: number }) {
    const at = this.place ?? fallback;
    const reading = await api<Reading & { moon: { age: number; lit: number } }>(withForce(`/api/meteo?lat=${at.lat}&lon=${at.lon}`));
    const moon = reading.moon ?? moonAt(Date.now());
    const day = dayOf(Date.now());
    if (!(day in this.days)) { this.days[day] = visitorFor(reading.sky, moon.lit); this.save(); }
    return { day, reading, moon, visitor: this.days[day] };
  }
}
