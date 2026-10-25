/**
 * Il Viaggio: everything the game shows, derived from Parliamo's own content.
 *
 * Shared by the browser and the server, pure, no DOM: the lessons are cut into
 * cards with regular expressions, so both sides get the same cards with the
 * same ids. Ids come from a hash of the text, not a position, so editing one
 * lesson never renames the cards or questions of another.
 */
import { DATA } from "../shared/progress";
import type { Cefr } from "../engine";
import { PROVERBI, CONSIGLI } from "./testi";

export type RegionId = "A1" | "A2";
export const PLAYABLE: RegionId[] = ["A1", "A2"];

export interface Region {
  id: Cefr;
  name: string;
  city: string;
  title: string;
  lat: number;
  lon: number;
  /** gold per gem is the base value times this */
  mult: number;
  playable: boolean;
}

export const REGIONS: Region[] = [
  { id: "A1", name: "Veneto", city: "Venezia", title: "Turista", lat: 45.44, lon: 12.33, mult: 1, playable: true },
  { id: "A2", name: "Emilia-Romagna", city: "Bologna", title: "Viandante", lat: 44.49, lon: 11.34, mult: 1.25, playable: true },
  { id: "B1", name: "Toscana", city: "Firenze", title: "Ospite", lat: 43.77, lon: 11.25, mult: 1.5, playable: false },
  { id: "B2", name: "Lazio", city: "Roma", title: "Residente", lat: 41.9, lon: 12.5, mult: 1.75, playable: false },
];
export const regionOf = (id: string) => REGIONS.find((r) => r.id === id);

// ── small text tools ─────────────────────────────────────────────────────────

/** FNV-1a, 32 bit, as 7 base-36 characters: short, stable, good enough for ids. */
export function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).padStart(7, "0");
}

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };
export const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&(#?\w+);/g, (m, e) => ENT[e] ?? m)
    .replace(/\s+/g, " ")
    .trim();

const BLOCK = /^(p|ul|ol|table|blockquote|pre|h[1-6])$/;

/** Split a lesson into its top-level blocks (<p>, <ul>, <table>, ...). */
export function blocks(html: string): string[] {
  const out: string[] = [];
  const re = /<(\/?)([a-z0-9]+)[^>]*>/gi;
  let depth = 0, start = -1, top = "";
  for (let m: RegExpExecArray | null; (m = re.exec(html)); ) {
    const [, close, tag] = m;
    const t = tag.toLowerCase();
    if (!BLOCK.test(t)) continue;
    if (!close) {
      if (depth === 0) { start = m.index; top = t; }
      if (t === top) depth++;
    } else if (t === top) {
      depth--;
      if (depth === 0) out.push(html.slice(start, m.index + m[0].length));
    }
  }
  return out;
}

/** Notes written for the map's designers, not for the learner. */
const NOTE = /\b(node|nodes|graph|diagnostic|blame|downstream|spine)\b|<code>/i;
const TRAP = /^<p><strong>(Traps?|Trap)\.?<\/strong>/i;

/**
 * Drop the designers' notes from a block, keeping the learner's text: whole
 * sentences in a paragraph, whole items in a list, whole tables that mention them.
 */
function clean(b: string): string {
  if (b.startsWith("<p")) {
    const marker = b.match(TRAP)?.[0].replace(/^<p>/, "") ?? "";
    const inner = b.replace(TRAP, "<p>").replace(/^<p>|<\/p>$/g, "").trim();
    const kept = inner.split(/(?<=[.!?])\s+(?=[A-Z<])/).filter((x) => x && !NOTE.test(x));
    if (!kept.length) return marker ? `<p>${marker}</p>` : "";
    return `<p>${marker ? marker + " " : ""}${kept.join(" ")}</p>`;
  }
  if (b.startsWith("<ul") || b.startsWith("<ol")) {
    const items = [...b.matchAll(/<li>[\s\S]*?<\/li>/g)].map((m) => m[0]).filter((li) => !NOTE.test(li));
    return items.length ? `<${b.slice(1, 3)}>${items.join("")}</${b.slice(1, 3)}>` : "";
  }
  return NOTE.test(b) ? "" : b;
}

// ── cards ────────────────────────────────────────────────────────────────────

export type CardKind = "regola" | "forma" | "completa" | "trappola";
export interface Card {
  id: string;
  town: string;
  kind: CardKind;
  /** html, from the lesson */
  front: string;
  back: string;
}

const KIND_NAME: Record<CardKind, string> = {
  regola: "Regola", forma: "Forma", completa: "Completa", trappola: "Trappola",
};
export const kindName = (k: CardKind) => KIND_NAME[k];

function cardsOf(id: string): Card[] {
  const lesson = DATA.lessons[id];
  if (!lesson) return [];
  const label = lesson.label;
  const all = blocks(lesson.html);
  const trapAt = all.findIndex((b) => TRAP.test(b));
  const keep = (b: string) => text(b).length > 0;
  const body = (trapAt < 0 ? all : all.slice(0, trapAt)).map(clean).filter(keep);
  const traps = trapAt < 0 ? [] : all.slice(trapAt).map(clean).filter(keep);
  const cards: Card[] = [];
  const add = (kind: CardKind, front: string, back: string) =>
    cards.push({ id: `${id}/${kind}-${hash(text(front) + "|" + text(back))}`, town: id, kind, front, back });

  // Regola: the first explanatory block, recalled from the rule's name
  // (a sentence ending in ":" or a very short one takes the block after it too)
  const ruleAt = Math.max(0, body.findIndex((b) => b.startsWith("<p") && text(b).length > 40));
  let rule = body[ruleAt] ?? "";
  for (let k = ruleAt + 1; k < body.length && k <= ruleAt + 2 && (/:$/.test(text(rule)) || text(rule).length < 60); k++) {
    rule += body[k];
  }
  if (rule) add("regola", `<p><strong>${label}</strong></p><p>What is the rule?</p>`, rule);

  // Forma: the first table of forms, recalled from its header
  const table = body.find((b) => b.startsWith("<table"));
  if (table) add("forma", `<p><strong>${label}</strong></p><p>Recall the table of forms.</p>`, table);

  // Completa: example sentences where the lesson bolds the key form
  const seen = new Set<string>();
  for (const b of [...body, ...traps]) {
    for (const m of b.matchAll(/<em>((?:(?!<\/em>).)*?<strong>(?:(?!<\/em>).)*?)<\/em>/gs)) {
      const ex = m[1];
      const plain = text(ex);
      const blanked = ex.replace(/<strong>(.*?)<\/strong>/gs, (_s, w: string) => "_".repeat(Math.max(3, text(w).length)));
      if (text(blanked).replace(/_/g, "").trim().length < 3 || seen.has(plain)) continue; // nothing left to see
      seen.add(plain);
      const context = b.startsWith("<p") && text(b) !== plain ? b : "";
      add("completa", `<p class="ex">${blanked}</p><p>Complete it.</p>`, `<p class="ex">${ex}</p>${context}`);
      if (cards.filter((c) => c.kind === "completa").length >= 2) break;
    }
    if (cards.filter((c) => c.kind === "completa").length >= 2) break;
  }

  // Trappola: each trap the lesson lists, recalled from its first words
  const trapItems: string[] = [];
  for (const b of traps) {
    if (TRAP.test(b)) {
      const rest = b.replace(TRAP, "<p>").trim();
      if (text(rest).length > 20) trapItems.push(rest);
    } else if (b.startsWith("<ul") || b.startsWith("<ol")) {
      for (const li of b.matchAll(/<li>([\s\S]*?)<\/li>/g)) trapItems.push(li[1].trim());
    } else if (b.startsWith("<p")) trapItems.push(b);
  }
  for (const t of trapItems.slice(0, 2)) {
    const plain = text(t);
    const colon = plain.indexOf(":");
    const cued = colon > 8 && colon < 90;
    const cue = cued ? plain.slice(0, colon) : plain.split(" ").slice(0, 6).join(" ") + " …";
    add("trappola", `<p><strong>${label}</strong>, a trap:</p><p>${esc(cue)}</p><p>${cued ? "Give the examples." : "Recall the whole trap."}</p>`, t);
  }
  return cards;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// ── quiz items ───────────────────────────────────────────────────────────────

export interface Item {
  id: string;
  town: string;
  q: string;
  /** o[0] is the right answer, as in Parliamo's bank; the page shuffles */
  o: string[];
}

// ── towns ────────────────────────────────────────────────────────────────────

export interface Town {
  id: string;
  label: string;
  region: RegionId;
  weight: number;
  /** prerequisites inside the same region; the others are met by being here */
  prereqs: string[];
  cards: string[];
  items: string[];
  /** longest chain of prerequisites inside the region: the map's column */
  depth: number;
}

export const CARDS = new Map<string, Card>();
export const ITEMS = new Map<string, Item>();
export const TOWNS = new Map<string, Town>();

for (const s of DATA.skills) {
  if (s.cefr !== "A1" && s.cefr !== "A2") continue;
  const cards = cardsOf(s.id);
  for (const c of cards) CARDS.set(c.id, c);
  const items = (DATA.items[s.id] ?? []).map((it) => ({ id: `${s.id}/q-${hash(it.q)}`, town: s.id, q: it.q, o: it.o }));
  for (const it of items) ITEMS.set(it.id, it);
  TOWNS.set(s.id, {
    id: s.id, label: s.label, region: s.cefr, weight: s.weight,
    prereqs: s.prereqs.filter((p) => DATA.skills.find((x) => x.id === p)?.cefr === s.cefr),
    cards: cards.map((c) => c.id), items: items.map((i) => i.id), depth: 0,
  });
}
// depth by longest path, prerequisites first
const depthOf = (id: string, stack = new Set<string>()): number => {
  const t = TOWNS.get(id)!;
  if (t.depth || stack.has(id)) return t.depth;
  stack.add(id);
  t.depth = t.prereqs.length ? 1 + Math.max(...t.prereqs.map((p) => depthOf(p, stack))) : 0;
  return t.depth;
};
for (const id of TOWNS.keys()) depthOf(id);

export const townsIn = (r: RegionId) => [...TOWNS.values()].filter((t) => t.region === r);

/** Errore monsters: each town fights the mistake its lesson warns about. */
export function monsterOf(town: string): string {
  const names = ["lo Svarione", "l'Erroraccio", "il Falso Amico", "la Svista", "il Pasticcio", "lo Strafalcione", "la Papera"];
  const t = TOWNS.get(town)!;
  return names[parseInt(hash(town), 36) % names.length] + " " + monsterSuffix(t.label);
}
const monsterSuffix = (label: string) => {
  const w = label.split(/[ ,]/)[0];
  return w.length > 2 ? `di ${w.toLowerCase()}` : "";
};

export { PROVERBI, CONSIGLI };

/** One hash for all the content: stored with each event, and part of the build id. */
export const CONTENT_VERSION = hash(
  [...CARDS.keys(), ...ITEMS.keys(), ...PROVERBI.map((p) => p.id), ...CONSIGLI.map((c) => c.id)].join(","),
);
