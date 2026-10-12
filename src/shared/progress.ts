/**
 * Shared by the browser and the server.
 *
 * A test is stored as its seed plus the list of answers, never as computed
 * probabilities. Everything else (current question, coverage, credits, score)
 * is recomputed by replaying the answers through the engine. Because the
 * engine is pure and seeded, the browser and the server always agree, and the
 * server can reject an answer the engine would never have asked for.
 */
import * as E from "../engine";
import data from "../data.json";

export const DATA = data as unknown as {
  skills: (E.Skill & { prior: number })[];
  layout: { id: string; x: number; y: number; w: number; h: number }[];
  edges: { a: string; b: string; p: [number, number][] }[];
  items: Record<string, { q: string; o: string[] }[]>;
  lessons: Record<string, { label: string; html: string }>;
  W: number;
  H: number;
};

export const GRAPH = E.buildGraph(DATA.skills);
export const CTX: E.Ctx = {
  graph: GRAPH,
  params: E.DEFAULTS,
  hasItem: (id) => (DATA.items[id] ?? []).length > 0,
};

export interface TestEvent {
  skillId: string;
  correct: boolean;
  ms: number;
  /** ISO timestamp, set by whoever stores the answer. */
  at: string;
}

export interface TestRecord {
  id: string;
  seed: number;
  events: TestEvent[];
  status: "active" | "done";
  createdAt: string;
}

/** Most recent practice answer for one skill. */
export interface PracticeLatest {
  skillId: string;
  correct: boolean;
  at: string;
}

export interface Progress {
  /** A test in progress, if any. */
  current: TestRecord | null;
  /** The most recent finished test: this is what colours the map. */
  last: TestRecord | null;
  /** Finished tests, newest first. */
  history: { id: string; score: number; createdAt: string }[];
  practice: PracticeLatest[];
}

export const emptyProgress = (): Progress => ({
  current: null,
  last: null,
  history: [],
  practice: [],
});

export class ReplayError extends Error {
  constructor(readonly index: number, message: string) {
    super(message);
  }
}

/** Rebuild the engine state for a test. Throws if any answer is impossible. */
export function replay(seed: number, events: Pick<TestEvent, "skillId" | "correct" | "ms">[]) {
  let s = E.reduce(E.createSession(seed), { type: "start" }, CTX);
  events.forEach((e, i) => {
    if (s.done) throw new ReplayError(i, "il test era già finito");
    if (s.current !== e.skillId) {
      throw new ReplayError(i, `domanda attesa ${s.current}, ricevuta ${e.skillId}`);
    }
    s = E.reduce(s, { type: "answer", correct: e.correct, latencyMs: e.ms }, CTX);
  });
  return s;
}

export function scoreOf(test: TestRecord): number {
  return E.percent(GRAPH, replay(test.seed, test.events)) ?? 0;
}

export type NodeStatus = "right" | "wrong" | "credited" | "unasked";

/**
 * Colour of each node on the map: the most recent evidence wins, whether it
 * came from the last finished test or from practice. A node with no direct
 * answer shows as credited if the last test deduced it from a right answer.
 */
export function nodeStatuses(p: Progress): Record<string, NodeStatus> {
  const latest = new Map<string, { at: string; correct: boolean }>();
  const consider = (id: string, at: string, correct: boolean) => {
    const prev = latest.get(id);
    if (!prev || prev.at <= at) latest.set(id, { at, correct });
  };
  for (const e of p.last?.events ?? []) consider(e.skillId, e.at, e.correct);
  for (const r of p.practice) consider(r.skillId, r.at, r.correct);

  const credited = p.last ? replay(p.last.seed, p.last.events).credited : {};
  const out: Record<string, NodeStatus> = {};
  for (const s of DATA.skills) {
    const ev = latest.get(s.id);
    out[s.id] = ev ? (ev.correct ? "right" : "wrong") : credited[s.id] ? "credited" : "unasked";
  }
  return out;
}

export const isSkill = (id: unknown): id is string =>
  typeof id === "string" && id in GRAPH.byId;
