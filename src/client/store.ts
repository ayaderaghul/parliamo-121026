/**
 * Where progress lives. The UI computes every change itself (the engine is
 * pure), shows it immediately, then hands the result to a store to keep:
 *
 *   GuestStore    — this browser's localStorage, for people without an account
 *   AccountStore  — the server, for signed-in users
 *
 * Both get the same calls, so the rest of the app never asks which one it has.
 */
import * as E from "../engine";
import {
  GRAPH,
  emptyProgress,
  replay,
  type PracticeLatest,
  type Progress,
  type TestEvent,
  type TestRecord,
} from "../shared/progress";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Store {
  readonly kind: "guest" | "account";
  load(): Promise<Progress>;
  createTest(p: Progress): Promise<TestRecord>;
  /** `p` already contains the answer; `index` is its position in the test. */
  saveAnswer(p: Progress, test: TestRecord, index: number): Promise<void>;
  savePractice(p: Progress, row: PracticeLatest): Promise<void>;
}

// ── pure updates, shared by both stores' callers ────────────────────────────

export function withAnswer(p: Progress, test: TestRecord, a: Omit<TestEvent, "at">) {
  const events = [...test.events, { ...a, at: new Date().toISOString() }];
  const state = replay(test.seed, events);
  const next: TestRecord = { ...test, events, status: state.done ? "done" : "active" };
  if (!state.done) return { progress: { ...p, current: next }, test: next };
  const score = E.percent(GRAPH, state) ?? 0;
  return {
    test: next,
    progress: {
      ...p,
      current: null,
      last: next,
      history: [{ id: next.id, score, createdAt: next.createdAt }, ...p.history],
    },
  };
}

export function withPractice(p: Progress, row: PracticeLatest): Progress {
  return { ...p, practice: [...p.practice.filter((r) => r.skillId !== row.skillId), row] };
}

// ── server ──────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(readonly status: number, message: string, readonly body: any) {
    super(message);
  }
}

export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const json = isJson ? await res.json() : null;
  if (!res.ok) throw new ApiError(res.status, json?.error ?? "Errore di rete.", json);
  if (!isJson && res.status !== 204) throw new ApiError(0, "Nessun server.", null);
  return json as T;
}

export class AccountStore implements Store {
  readonly kind = "account";
  load() {
    return api<Progress>("/api/progress");
  }
  async createTest() {
    return (await api<{ test: TestRecord }>("/api/tests", {})).test;
  }
  async saveAnswer(_p: Progress, test: TestRecord, index: number) {
    const e = test.events[index];
    await api(`/api/tests/${test.id}/answers`, {
      index,
      skillId: e.skillId,
      correct: e.correct,
      ms: Math.round(e.ms),
    });
  }
  async savePractice(_p: Progress, row: PracticeLatest) {
    await api("/api/practice", { skillId: row.skillId, correct: row.correct });
  }
}

// ── this browser ────────────────────────────────────────────────────────────

interface GuestData {
  progress: Progress;
  /** Finished tests with their answers, newest first, so they can be imported. */
  done: TestRecord[];
}

const KEY = "parliamo.guest.v1";

export class GuestStore implements Store {
  readonly kind = "guest";
  private data: GuestData = { progress: emptyProgress(), done: [] };

  constructor() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = JSON.parse(raw);
    } catch {
      // storage blocked or corrupt: keep going in memory
    }
  }

  private write(p: Progress, finished?: TestRecord) {
    this.data.progress = p;
    if (finished) this.data.done = [finished, ...this.data.done].slice(0, 10);
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // full or blocked: progress stays for this visit only
    }
  }

  async load() {
    return this.data.progress;
  }
  async createTest(p: Progress) {
    const test: TestRecord = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      seed: 1 + Math.floor(Math.random() * (2 ** 31 - 2)),
      events: [],
      status: "active",
      createdAt: new Date().toISOString(),
    };
    this.write({ ...p, current: test });
    return test;
  }
  async saveAnswer(p: Progress, test: TestRecord) {
    this.write(p, test.status === "done" ? test : undefined);
  }
  async savePractice(p: Progress) {
    this.write(p);
  }

  hasData() {
    const p = this.data.progress;
    return !!(p.current || p.last || p.practice.length);
  }
  /** What to upload to a new or existing account. */
  exportForImport() {
    const p = this.data.progress;
    return { done: this.data.done, current: p.current, practice: p.practice };
  }
  clear() {
    this.data = { progress: emptyProgress(), done: [] };
    try {
      localStorage.removeItem(KEY);
    } catch {}
  }
}
