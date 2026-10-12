/**
 * Weight-redistribution engine. Implements this spec, literally:
 *
 *   1. Every node has an init-weight.
 *   2. Its initial probability of being chosen next is its share of the
 *      region's total init-weight.
 *   3. Right answer: the node's probability drops significantly; each of its
 *      prerequisites ("prefix") drops by half as much; everything removed is
 *      shared out to raise the other questions' probabilities.
 *   4. Wrong answer: the node's probability drops significantly; everything
 *      removed is shared out to raise all the other questions' probabilities.
 *   5. When 75% of a region is covered, stop that region and move to the next.
 *      Coverage is weighted: Σ init-weight of the covered nodes / Σ init-weight
 *      of the region. A node is covered once asked, or once credited: a right
 *      answer credits every prerequisite in the same region.
 *   6. Final percentage = Σ weight·grade / Σ weight over answered nodes, where
 *      a node's grade is the average of its answers. Nodes can be asked more
 *      than once; each counts once, at its average.
 *   7. Drop-out: once a region has had 7 questions, if its running percentage
 *      (rule 6, restricted to that region) is below 25%, the test ends.
 *   8. After a drop-out, every region the learner never reached counts as
 *      wrong: its full weight is added to the denominator of rule 6. Without
 *      this, stopping early raises the score, because the questions the learner
 *      would have missed are simply never counted.
 *
 * Pure: no DOM, no Math.random. The RNG seed lives in the state.
 */

export type Cefr = "A1" | "A2" | "B1" | "B2";
export const REGIONS: Cefr[] = ["A1", "A2", "B1", "B2"];

export interface Skill {
  id: string;
  label: string;
  cefr: Cefr;
  prereqs: string[];
  /** init-weight. */
  weight: number;
}

export interface Params {
  /** Fraction of its probability a node loses when answered. "Significantly." */
  dropSelf: number;
  /** Fraction a prerequisite loses on a right answer. "Half significantly." */
  dropPrefix: number;
  /** Share of a region's init-weight that must be asked before moving on. */
  coverage: number;
  /** Floor for a node not yet asked, as a fraction of its starting
   *  probability. Not in the original spec, but required by it: repeated
   *  prefix drops push foundational nodes (prerequisites of almost everything)
   *  toward zero, they are never picked, coverage never reaches its target and
   *  the region loops forever. Observed in about 1 flawless run in 100. */
  unaskedFloor: number;
  /** Rule 7: minimum questions in a region before drop-out can trigger. */
  dropoutAfter: number;
  /** Rule 7: running regional percentage below which the test ends. With four
   *  options this is exactly the guessing rate, so the rule reads: stop once
   *  the learner is doing no better than chance. */
  dropoutBelow: number;
}

export const DEFAULTS: Params = {
  dropSelf: 0.9,
  dropPrefix: 0.45,
  coverage: 0.75,
  unaskedFloor: 0.1,
  dropoutAfter: 7,
  dropoutBelow: 0.25,
};

export interface Attempt {
  skillId: string;
  correct: boolean;
  latencyMs: number;
  /** Practice answers colour the map but do not count in the test score. */
  practice: boolean;
}

export interface SessionState {
  /** Probability of being chosen next, for nodes in the current region.
   *  Always sums to 1 over that region. */
  prob: Record<string, number>;
  region: number;
  /** Nodes asked at least once during the test. */
  asked: Record<string, true>;
  /** Most recent answer per node: true = right, false = wrong. */
  last: Record<string, boolean>;
  /** Prerequisites credited by a right answer, never asked themselves. */
  credited: Record<string, true>;
  current: string | null;
  log: Attempt[];
  seed: number;
  done: boolean;
  /** Region where rule 7 ended the test; null if it ran to the end. */
  stoppedAt: Cefr | null;
}

// ── Graph ──────────────────────────────────────────────────────────────────

export interface Graph {
  skills: Skill[];
  byId: Record<string, Skill>;
  ancestors: Record<string, string[]>;
  descendants: Record<string, string[]>;
}

export function buildGraph(skills: Skill[]): Graph {
  const byId: Record<string, Skill> = {};
  for (const s of skills) byId[s.id] = s;
  const ancestors: Record<string, string[]> = {};
  const up = (id: string, out: Set<string>): Set<string> => {
    for (const p of byId[id].prereqs) {
      if (!out.has(p)) {
        out.add(p);
        up(p, out);
      }
    }
    return out;
  };
  for (const s of skills) ancestors[s.id] = [...up(s.id, new Set())];
  const descendants: Record<string, string[]> = {};
  for (const s of skills) descendants[s.id] = [];
  for (const s of skills) for (const a of ancestors[s.id]) descendants[a].push(s.id);
  return { skills, byId, ancestors, descendants };
}

// ── RNG ────────────────────────────────────────────────────────────────────

function nextRandom(seed: number): [number, number] {
  const t = (seed + 0x6d2b79f5) | 0;
  let r = Math.imul(t ^ (t >>> 15), t | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return [((r ^ (r >>> 14)) >>> 0) / 4294967296, t];
}

// ── Session ────────────────────────────────────────────────────────────────

export interface Ctx {
  graph: Graph;
  params: Params;
  hasItem: (id: string) => boolean;
}

const regionNodes = (ctx: Ctx, r: number) =>
  ctx.graph.skills.filter((s) => s.cefr === REGIONS[r] && ctx.hasItem(s.id));

/** Rule 2: initial probability = share of the region's total init-weight. */
function initRegion(s: SessionState, ctx: Ctx): SessionState {
  const nodes = regionNodes(ctx, s.region);
  const total = nodes.reduce((a, n) => a + n.weight, 0);
  const prob: Record<string, number> = {};
  for (const n of nodes) prob[n.id] = n.weight / total;
  return { ...s, prob };
}

export function createSession(seed: number): SessionState {
  return {
    prob: {},
    region: 0,
    asked: {},
    last: {},
    credited: {},
    current: null,
    log: [],
    seed,
    done: false,
    stoppedAt: null,
  };
}

export type Event =
  | { type: "start" }
  | { type: "answer"; correct: boolean; latencyMs: number }
  | { type: "practice"; skillId: string; correct: boolean; latencyMs: number };

export function reduce(s: SessionState, ev: Event, ctx: Ctx): SessionState {
  switch (ev.type) {
    case "start":
      return advance(initRegion(s, ctx), ctx);
    case "answer":
      return advance(answer(s, ev.correct, ev.latencyMs, ctx), ctx);
    case "practice":
      return {
        ...s,
        last: { ...s.last, [ev.skillId]: ev.correct },
        log: [...s.log, { skillId: ev.skillId, correct: ev.correct, latencyMs: ev.latencyMs, practice: true }],
      };
  }
}

/** Rules 3 and 4. */
function answer(s: SessionState, correct: boolean, latencyMs: number, ctx: Ctx): SessionState {
  const id = s.current;
  if (id === null) return s;
  const k = ctx.params;
  const prob = { ...s.prob };

  let removed = 0;
  const lowered = new Set<string>([id]);
  const credited = { ...s.credited };

  // the node itself drops significantly, right or wrong
  const d = prob[id] * k.dropSelf;
  prob[id] -= d;
  removed += d;

  // right answer: every prerequisite in this region drops half as much
  if (correct) {
    for (const a of ctx.graph.ancestors[id]) {
      if (!(a in prob)) continue; // prerequisite lives in an earlier region
      credited[a] = true;
      const da = prob[a] * k.dropPrefix;
      prob[a] -= da;
      removed += da;
      lowered.add(a);
    }
  }

  // share everything removed among the others, in proportion to where they are
  const others = Object.keys(prob).filter((x) => !lowered.has(x));
  const base = others.reduce((a, x) => a + prob[x], 0);
  for (const x of others) {
    prob[x] += base > 0 ? removed * (prob[x] / base) : removed / others.length;
  }

  // floor for unasked nodes, then renormalise so the region still sums to 1
  const asked: Record<string, true> = { ...s.asked, [id]: true };
  const nodes = regionNodes(ctx, s.region);
  const total = nodes.reduce((a, n) => a + n.weight, 0);
  for (const n of nodes) {
    if (asked[n.id] || credited[n.id]) continue;
    const floor = k.unaskedFloor * (n.weight / total);
    if (prob[n.id] < floor) prob[n.id] = floor;
  }
  const sum = Object.values(prob).reduce((a, b) => a + b, 0);
  for (const x in prob) prob[x] /= sum;

  return {
    ...s,
    prob,
    asked,
    credited,
    last: { ...s.last, [id]: correct },
    log: [...s.log, { skillId: id, correct, latencyMs, practice: false }],
  };
}

/** Rule 7, then rule 5, then a weighted die over the current region. */
function advance(s: SessionState, ctx: Ctx): SessionState {
  let st = s;
  for (;;) {
    if (st.region >= REGIONS.length) return { ...st, current: null, done: true };

    const region = REGIONS[st.region];
    const inRegion = st.log.filter(
      (a) => !a.practice && ctx.graph.byId[a.skillId].cefr === region,
    ).length;
    if (inRegion >= ctx.params.dropoutAfter) {
      const running = percent(ctx.graph, st, region) ?? 1;
      if (running < ctx.params.dropoutBelow) {
        return { ...st, current: null, done: true, stoppedAt: region };
      }
    }

    const nodes = regionNodes(ctx, st.region);
    const covered = regionCoverage(ctx.graph, st, REGIONS[st.region]);
    if (covered >= ctx.params.coverage) {
      st = { ...st, region: st.region + 1 };
      if (st.region < REGIONS.length) st = initRegion(st, ctx);
      continue;
    }
    const [r, seed] = nextRandom(st.seed);
    let acc = r;
    let chosen = nodes[nodes.length - 1].id;
    for (const n of nodes) {
      acc -= st.prob[n.id];
      if (acc <= 0) {
        chosen = n.id;
        break;
      }
    }
    return { ...st, current: chosen, seed };
  }
}

// ── Readouts ───────────────────────────────────────────────────────────────

/** Regions never reached because of a drop-out (rule 8). */
export function unreached(s: SessionState): Cefr[] {
  if (!s.stoppedAt) return [];
  return REGIONS.slice(REGIONS.indexOf(s.stoppedAt) + 1);
}

/** Rules 6 and 8. Test answers only; practice is excluded. Null if nothing
 *  answered. An unreached region reads 0%, and its whole weight counts
 *  against the overall figure, as if every node in it had been answered once
 *  and missed. */
export function percent(g: Graph, s: SessionState, region?: Cefr): number | null {
  const skipped = unreached(s);
  if (region && skipped.includes(region)) return 0;
  // per node: how many answers, how many right
  const tally: Record<string, [number, number]> = {};
  for (const a of s.log) {
    if (a.practice) continue;
    if (region && g.byId[a.skillId].cefr !== region) continue;
    const t = tally[a.skillId] || (tally[a.skillId] = [0, 0]);
    t[0] += 1;
    if (a.correct) t[1] += 1;
  }
  let right = 0;
  let total = 0;
  if (!region) {
    for (const sk of g.skills) if (skipped.includes(sk.cefr)) total += sk.weight;
  }
  for (const id in tally) {
    const w = g.byId[id].weight;
    total += w;
    right += w * (tally[id][1] / tally[id][0]); // the node's average grade
  }
  return total > 0 ? right / total : null;
}

/** Rule 5, weighted: share of a region's init-weight asked or credited. */
export function regionCoverage(g: Graph, s: SessionState, region: Cefr): number {
  const nodes = g.skills.filter((n) => n.cefr === region);
  const total = nodes.reduce((a, n) => a + n.weight, 0);
  const covered = nodes.reduce(
    (a, n) => a + (s.asked[n.id] || s.credited[n.id] ? n.weight : 0), 0);
  return total > 0 ? covered / total : 1;
}

export type Color = "green" | "red" | "gray";

/** Colour = the most recent answer to that node, test or practice. A node
 *  never answered but credited as a prerequisite shows green too. */
export function colorOf(s: SessionState, id: string): Color {
  if (id in s.last) return s.last[id] ? "green" : "red";
  return s.credited[id] ? "green" : "gray";
}

/** Border: solid if answered, dashed if only credited. */
export function sourceOf(s: SessionState, id: string): "measured" | "inferred" | "unknown" {
  if (id in s.last) return "measured";
  return s.credited[id] ? "inferred" : "unknown";
}

/** Red nodes, most important first: where to start studying. */
export function gaps(g: Graph, s: SessionState): Skill[] {
  return g.skills
    .filter((sk) => s.last[sk.id] === false)
    .sort((a, b) => b.weight - a.weight);
}
