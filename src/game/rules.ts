/**
 * Il Viaggio's rules: the player's state is the fold of their event log.
 *
 * The browser sends what happened ("card pp.essere/completa-… recalled"), never
 * what it is worth. This module decides every reward, the same way on the
 * browser (for instant feedback and for guests) and on the server (which
 * replays the log and refuses an event the rules don't allow).
 */
import { CARDS, CONSIGLI, ITEMS, PLAYABLE, PROVERBI, REGIONS, TOWNS, townsIn, type RegionId } from "./content";
import { addDays, dayOf } from "./cielo";

// ── gems and gold ────────────────────────────────────────────────────────────

export const GEMS = ["rubino", "pietra", "smeraldo", "perla", "zaffiro", "goccia"] as const;
export type Gem = (typeof GEMS)[number];
export type Gems = Record<Gem, number>;
/** gold per gem before the region's multiplier: recall pays most, luck least */
export const GOLD: Gems = { rubino: 5, pietra: 8, smeraldo: 3, perla: 3, zaffiro: 2, goccia: 1 };
export const GEM_NAME: Record<Gem, [string, string]> = {
  rubino: ["Rubino", "Rubini"], pietra: ["Pietra di luna", "Pietre di luna"], smeraldo: ["Smeraldo", "Smeraldi"],
  perla: ["Perla", "Perle"], zaffiro: ["Zaffiro", "Zaffiri"], goccia: ["Goccia", "Gocce"],
};
const noGems = (): Gems => ({ rubino: 0, pietra: 0, smeraldo: 0, perla: 0, zaffiro: 0, goccia: 0 });

/** days until a card is due again, by box after a right recall */
const INTERVAL = [0, 1, 3, 7, 14, 30];
export const DROPS_PER_DAY = 20;
export const EXAM_SIZE = 12;
export const EXAM_PASS = 9; // 9 of 12 = 75%, the first score at or above 70%
export const COVERAGE_FOR_EXAM = 0.75;
export const STAR_XP = [150, 400, 800];

// ── events ───────────────────────────────────────────────────────────────────

export type Grade = "no" | "quasi" | "si";
export interface Answer { item: string; correct: boolean }
export type Visitor = "lupo" | "sibilla" | "folletto" | "pioggia" | "fata";

export type EventBody =
  | { t: "lesson"; town: string }
  | { t: "card"; card: string; grade: Grade }
  | { t: "battle"; town: string; answers: Answer[] }
  | { t: "exam"; region: RegionId; answers: Answer[] }
  | { t: "exchange" }
  | { t: "drop" }
  | { t: "proverb"; id: string; correct: boolean }
  | { t: "hint"; town: string }
  | { t: "wolf"; answers: Answer[] }
  | { t: "tip"; id: string }
  | { t: "shortcut"; town: string; answers: Answer[] }
  | { t: "import"; towns: string[] };

export type GameEvent = EventBody & {
  /** ISO time, set by whoever stores the event (the server, for accounts) */
  at: string;
  /** content version the event was played on */
  v: string;
};

/** The fields each event may carry; anything else is dropped before storing. */
const FIELDS: Record<EventBody["t"], string[]> = {
  lesson: ["town"], card: ["card", "grade"], battle: ["town", "answers"], exam: ["region", "answers"],
  exchange: [], drop: [], proverb: ["id", "correct"], hint: ["town"], wolf: ["answers"], tip: ["id"],
  shortcut: ["town", "answers"], import: ["towns"],
};
export function normalize(b: any): EventBody {
  const keys = FIELDS[b?.t as EventBody["t"]];
  if (!keys) throw new RuleError("Evento sconosciuto.");
  const out: any = { t: b.t };
  for (const k of keys) {
    if (k === "answers") out.answers = Array.isArray(b.answers) ? b.answers.map((a: any) => ({ item: a?.item, correct: a?.correct })) : b.answers;
    else out[k] = b[k];
  }
  return out;
}

/** Which visitor allows which event. */
export const NEEDS: Partial<Record<EventBody["t"], Visitor>> = {
  drop: "pioggia", proverb: "folletto", hint: "fata", wolf: "lupo", tip: "sibilla", shortcut: "sibilla",
};

// ── state ────────────────────────────────────────────────────────────────────

export interface CardState { box: number; due: string; last: string }
export interface Reward { xp: number; gems: Partial<Gems>; gold: number; notes: string[] }

export interface GameState {
  xp: number;
  xpBy: Record<string, number>;
  gold: number;
  /** gems per region: a gem is worth its region's multiplier when exchanged */
  gems: Record<string, Gems>;
  lessons: Record<string, true>;
  quizWon: Record<string, true>;
  imported: Record<string, true>;
  importDone: boolean;
  cards: Record<string, CardState>;
  /** last day each quiz item was answered: a repeat the same day pays nothing */
  answeredOn: Record<string, string>;
  passed: RegionId[];
  examFailedOn: Record<string, string>;
  day: string;
  drops: number;
  visited: Visitor[];
  tips: string[];
  proverbs: string[];
  events: number;
  /** replayed events that no longer apply to the current content */
  skipped: number;
  lastAt: string;
  last: Reward;
}

export const emptyGame = (): GameState => ({
  xp: 0, xpBy: {}, gold: 0, gems: {}, lessons: {}, quizWon: {}, imported: {}, importDone: false,
  cards: {}, answeredOn: {}, passed: [], examFailedOn: {}, day: "", drops: 0, visited: [],
  tips: [], proverbs: [], events: 0, skipped: 0, lastAt: "", last: { xp: 0, gems: {}, gold: 0, notes: [] },
});

export class RuleError extends Error {}
const no = (msg: string): never => { throw new RuleError(msg); };

// ── derived facts ────────────────────────────────────────────────────────────

export const recalled = (s: GameState, card: string) => (s.cards[card]?.box ?? 0) >= 1;
export const isFlagged = (s: GameState, town: string) =>
  !!s.imported[town] || (!!s.quizWon[town] && TOWNS.get(town)!.cards.every((c) => recalled(s, c)));

export const isUnlocked = (s: GameState, r: RegionId) => {
  const i = PLAYABLE.indexOf(r);
  return i === 0 || (i > 0 && s.passed.includes(PLAYABLE[i - 1]));
};
export const isOpen = (s: GameState, town: string) => {
  const t = TOWNS.get(town);
  return !!t && isUnlocked(s, t.region) && t.prereqs.every((p) => isFlagged(s, p));
};
export function coverage(s: GameState, r: RegionId): number {
  const ts = townsIn(r);
  const total = ts.reduce((a, t) => a + t.weight, 0);
  return ts.filter((t) => isFlagged(s, t.id)).reduce((a, t) => a + t.weight, 0) / total;
}
export const isDue = (s: GameState, card: string, day: string) => {
  const c = s.cards[card];
  return !c || c.due <= day;
};
/** A flagged town with a card due for review grows weeds on the map. */
export const hasWeeds = (s: GameState, town: string, day: string) =>
  isFlagged(s, town) && TOWNS.get(town)!.cards.some((c) => recalled(s, c) && isDue(s, c, day));

export const currentRegion = (s: GameState): RegionId =>
  [...PLAYABLE].reverse().find((r) => isUnlocked(s, r)) ?? "A1";
export const titleOf = (s: GameState) => REGIONS.find((r) => r.id === currentRegion(s))!.title;
export const stars = (s: GameState, r: RegionId) => STAR_XP.filter((x) => (s.xpBy[r] ?? 0) >= x).length;

export function goldValue(gems: Record<string, Gems>): number {
  let g = 0;
  for (const [r, bag] of Object.entries(gems)) {
    const mult = REGIONS.find((x) => x.id === r)?.mult ?? 1;
    for (const k of GEMS) g += bag[k] * GOLD[k] * mult;
  }
  return Math.round(g);
}
export const gemTotal = (s: GameState): Gems => {
  const t = noGems();
  for (const bag of Object.values(s.gems)) for (const k of GEMS) t[k] += bag[k];
  return t;
};

// ── one step ─────────────────────────────────────────────────────────────────

export interface Check {
  /** today's visitor, as the server recorded it; null when there is none */
  visitor: Visitor | null;
}

/**
 * Apply one event, in place. With `check`, the event is new and is validated
 * against the rules (and the day's visitor); without it, it is a replay of an
 * event that was accepted when it happened.
 */
export function step(s: GameState, e: GameEvent, check?: Check): GameState {
  const day = dayOf(e.at);
  if (s.lastAt && e.at < s.lastAt) no("Evento fuori ordine.");
  if (day !== s.day) { s.day = day; s.drops = 0; s.visited = []; }

  const r: Reward = { xp: 0, gems: {}, gold: 0, notes: [] };
  const region = (town?: string): RegionId => (town ? TOWNS.get(town)!.region : currentRegion(s));
  const gem = (k: Gem, n: number, where: RegionId) => {
    if (n <= 0) return;
    (s.gems[where] ??= noGems())[k] += n;
    r.gems[k] = (r.gems[k] ?? 0) + n;
  };
  const xp = (n: number, where: RegionId) => {
    s.xp += n; s.xpBy[where] = (s.xpBy[where] ?? 0) + n; r.xp += n;
  };
  const town = (id: string) => (TOWNS.has(id) ? id : no("Città sconosciuta."));
  const answers = (a: Answer[], allowed: (it: string) => boolean, n: [number, number]) => {
    if (!Array.isArray(a) || a.length < n[0] || a.length > n[1]) no("Numero di risposte non valido.");
    const seen = new Set<string>();
    for (const x of a) {
      if (!ITEMS.has(x.item) || !allowed(x.item) || seen.has(x.item) || typeof x.correct !== "boolean") no("Domanda non valida.");
      seen.add(x.item);
    }
    return a.filter((x) => x.correct).length;
  };
  const visit = (v: Visitor) => {
    if (check && check.visitor !== v) no("Oggi questo visitatore non c'è.");
    if (s.visited.includes(v) && v !== "pioggia") no("Questo visitatore è già passato oggi.");
    if (!s.visited.includes(v)) s.visited.push(v);
  };

  switch (e.t) {
    case "lesson": {
      const t = town(e.town);
      if (!s.lessons[t]) { s.lessons[t] = true; xp(5, region(t)); }
      break;
    }

    case "card": {
      const c = CARDS.get(e.card) ?? no("Carta sconosciuta.");
      if (check && !isOpen(s, c.town)) no("Questa città non è ancora aperta.");
      if (!["no", "quasi", "si"].includes(e.grade)) no("Voto non valido.");
      const st = s.cards[c.id] ?? { box: 0, due: day, last: "" };
      const due = st.due <= day && st.last !== day; // pays at most once a day, and only when due
      if (e.grade === "si") {
        if (due) {
          gem("rubino", 1, region(c.town)); xp(10, region(c.town));
          st.box = Math.min(5, st.box + 1);
          st.due = addDays(day, INTERVAL[st.box]);
        } else if (st.box === 0) {
          // failed earlier today and now recalled: back on the ladder, no ruby
          xp(1, region(c.town)); st.box = 1; st.due = addDays(day, 1);
        } else xp(st.last === day ? 1 : 2, region(c.town)); // early review: XP only, schedule unchanged
      } else if (e.grade === "quasi") {
        xp(1, region(c.town));
        st.due = addDays(day, 1);
      } else {
        st.box = 0;
        st.due = day;
      }
      st.last = day;
      s.cards[c.id] = st;
      break;
    }

    case "battle": {
      const t = town(e.town);
      if (check && !isOpen(s, t)) no("Questa città non è ancora aperta.");
      const items = new Set(TOWNS.get(t)!.items);
      const right = answers(e.answers, (i) => items.has(i), [3, 3]);
      for (const a of e.answers) {
        if (a.correct && s.answeredOn[a.item] !== day) { gem("zaffiro", 1, region(t)); xp(5, region(t)); }
        s.answeredOn[a.item] = day;
      }
      if (right >= 2) {
        if (!s.quizWon[t]) { xp(20, region(t)); r.notes.push("vinto"); }
        s.quizWon[t] = true;
      } else r.notes.push("perso");
      break;
    }

    case "exam": {
      const reg = PLAYABLE.includes(e.region) ? e.region : no("Regione sconosciuta.");
      if (check) {
        if (!isUnlocked(s, reg)) no("Regione non ancora raggiunta.");
        if (s.passed.includes(reg)) no("Esame già superato.");
        if (s.examFailedOn[reg] === day) no("L'esame si può ripetere domani.");
        if (coverage(s, reg) < COVERAGE_FOR_EXAM) no("Servono più bandiere per l'esame.");
      }
      const right = answers(e.answers, (i) => TOWNS.get(ITEMS.get(i)!.town)?.region === reg, [EXAM_SIZE, EXAM_SIZE]);
      xp(2 * right, reg);
      if (right >= EXAM_PASS) { s.passed.push(reg); xp(100, reg); r.notes.push("promosso"); }
      else { s.examFailedOn[reg] = day; r.notes.push("bocciato"); }
      break;
    }

    case "exchange": {
      const g = goldValue(s.gems);
      if (check && g <= 0) no("Lo zaino è vuoto.");
      for (const bag of Object.values(s.gems)) for (const k of GEMS) { if (bag[k]) r.gems[k] = (r.gems[k] ?? 0) - bag[k]; }
      s.gems = {};
      s.gold += g;
      r.gold = g;
      break;
    }

    case "drop": {
      visit("pioggia");
      if (s.drops >= DROPS_PER_DAY) no("Per oggi le gocce sono finite.");
      s.drops++;
      gem("goccia", 1, region());
      break;
    }

    case "proverb": {
      visit("folletto");
      const p = PROVERBI.find((x) => x.id === e.id) ?? no("Proverbio sconosciuto.");
      xp(10, region());
      if (e.correct) { gem("perla", 1, region()); if (!s.proverbs.includes(p.id)) s.proverbs.push(p.id); }
      break;
    }

    case "hint": {
      visit("fata");
      town(e.town);
      xp(10, region());
      break;
    }

    case "wolf": {
      visit("lupo");
      const right = answers(e.answers, (i) => isUnlocked(s, TOWNS.get(ITEMS.get(i)!.town)!.region), [0, 40]);
      let streak = 0, best = 0;
      for (const a of e.answers) { streak = a.correct ? streak + 1 : 0; best = Math.max(best, streak); }
      gem("pietra", Math.min(5, Math.floor(right / 3) + (best >= 5 ? 1 : 0)), region());
      xp(40 + 2 * right, region());
      break;
    }

    case "tip": {
      visit("sibilla");
      const c = CONSIGLI.find((x) => x.id === e.id) ?? no("Consiglio sconosciuto.");
      if (!s.tips.includes(c.id)) s.tips.push(c.id);
      xp(15, region());
      break;
    }

    case "shortcut": {
      visit("sibilla");
      const t = town(e.town);
      if (check && !isOpen(s, t)) no("Questa città non è ancora aperta.");
      const items = new Set(TOWNS.get(t)!.items);
      const right = answers(e.answers, (i) => items.has(i), [3, 3]);
      xp(15, region(t));
      if (right === 3) { s.quizWon[t] = true; r.notes.push("scorciatoia"); }
      break;
    }

    case "import": {
      if (s.importDone) no("Il test d'ingresso è già stato importato.");
      for (const id of e.towns) s.imported[town(id)] = true;
      s.importDone = true;
      // the player starts in the region where the test stopped
      for (const reg of PLAYABLE) if (isUnlocked(s, reg) && coverage(s, reg) >= COVERAGE_FOR_EXAM && !s.passed.includes(reg)) s.passed.push(reg);
      xp(5 * e.towns.length, "A1");
      break;
    }

    default:
      no("Evento sconosciuto.");
  }

  s.events++;
  s.lastAt = e.at;
  s.last = r;
  return s;
}

/**
 * Rebuild the state from the log. An event whose card, question or town no
 * longer exists (the content changed since) is skipped, so a saved game
 * survives new content: the rest of the log still counts.
 */
export function replay(events: GameEvent[]): GameState {
  const s = emptyGame();
  for (const e of events) {
    try {
      step(s, e);
    } catch (err) {
      if (!(err instanceof RuleError)) throw err;
      s.skipped++;
      s.lastAt = e.at > s.lastAt ? e.at : s.lastAt;
    }
  }
  return s;
}

/** Validate a new event against a state without touching it. */
export function tryStep(s: GameState, e: GameEvent, check: Check): GameState {
  return step(structuredClone(s), e, check);
}

// ── visitors ─────────────────────────────────────────────────────────────────

import type { Sky } from "./cielo";
/** The day's visitor: moon first, then fog, rain, cloud. One a day. */
export function visitorFor(sky: Sky, moonLit: number): Visitor | null {
  if (moonLit >= 0.98) return "lupo";
  if (moonLit <= 0.02) return "sibilla";
  if (sky === "fog") return "folletto";
  if (sky === "rain") return "pioggia";
  if (sky === "cloud") return "fata";
  return null;
}
