import { describe, it, expect } from "vitest";
import { CARDS, ITEMS, TOWNS, townsIn, CONTENT_VERSION, PROVERBI } from "../src/game/content";
import {
  coverage, emptyGame, gemTotal, goldValue, isFlagged, isOpen, isUnlocked, replay, step, tryStep,
  visitorFor, RuleError, EXAM_SIZE, type GameEvent, type GameState, type EventBody,
} from "../src/game/rules";
import { moonAt, skyFromMet, skyFromWmo, dayOf, addDays, cellKey } from "../src/game/cielo";
import { SCENE, sceneOf, genere } from "../src/game/scene";
import { STORIE } from "../src/game/storie";
import { BOTTEGA, HINT_PRICE } from "../src/game/bottega";

const AT = (d: string, h = 10) => `${d}T${String(h).padStart(2, "0")}:00:00.000Z`;
const ev = (b: EventBody, at: string): GameEvent => ({ ...b, at, v: CONTENT_VERSION } as GameEvent);
const ok = { visitor: null };
const play = (s: GameState, b: EventBody, at: string, visitor: any = null) => step(s, ev(b, at), { visitor });

/** a town with no prerequisites in A1 */
const root = townsIn("A1").find((t) => t.prereqs.length === 0)!;
const winBattle = (s: GameState, town: string, at: string) =>
  play(s, { t: "battle", town, answers: TOWNS.get(town)!.items.slice(0, 3).map((item) => ({ item, correct: true })) }, at);
const recallAll = (s: GameState, town: string, at: string) => { for (const c of TOWNS.get(town)!.cards) play(s, { t: "card", card: c, grade: "si" }, at); };
const flag = (s: GameState, town: string, at: string) => { recallAll(s, town, at); winBattle(s, town, at); };

describe("content", () => {
  it("cuts every A1 to B2 lesson into cards and keeps 3+ questions per town", () => {
    expect(TOWNS.size).toBe(78);
    for (const t of TOWNS.values()) {
      expect(t.cards.length, t.id).toBeGreaterThan(0);
      expect(t.items.length, t.id).toBeGreaterThanOrEqual(3);
    }
    expect(new Set(CARDS.keys()).size).toBe(CARDS.size);
  });
  it("gives cards and questions ids that do not depend on position", () => {
    for (const id of CARDS.keys()) expect(id).toMatch(/^[a-z.0-9]+\/(regola|forma|completa|trappola)-[0-9a-z]{7}$/);
    for (const id of ITEMS.keys()) expect(id).toMatch(/^[a-z.0-9]+\/q-[0-9a-z]{7}$/);
  });
  it("keeps designer notes out of the cards", () => {
    for (const c of CARDS.values()) expect(c.back).not.toMatch(/<code>|\bgraph\b|\bdiagnostic\b/);
  });
});

describe("cards", () => {
  it("pays a ruby for a due card recalled, once a day; early reviews pay XP only", () => {
    const s = emptyGame();
    const card = root.cards[0];
    play(s, { t: "card", card, grade: "si" }, AT("2026-10-25"));
    expect(gemTotal(s).rubino).toBe(1);
    play(s, { t: "card", card, grade: "si" }, AT("2026-10-25", 11));
    expect(gemTotal(s).rubino).toBe(1);
    play(s, { t: "card", card, grade: "si" }, AT("2026-10-26"));   // due again after 1 day
    expect(gemTotal(s).rubino).toBe(2);
    play(s, { t: "card", card, grade: "si" }, AT("2026-10-27"));   // box 2: due 3 days later, the 29th
    expect(gemTotal(s).rubino).toBe(2);
    play(s, { t: "card", card, grade: "si" }, AT("2026-10-29"));
    expect(gemTotal(s).rubino).toBe(3);
  });
  it("cannot farm rubies by failing a card and recalling it again the same day", () => {
    const s = emptyGame();
    const card = root.cards[0];
    for (let h = 8; h < 14; h++) {
      play(s, { t: "card", card, grade: "no" }, AT("2026-10-25", h));
      play(s, { t: "card", card, grade: "si" }, AT("2026-10-25", h));
    }
    expect(gemTotal(s).rubino).toBe(0); // the first grade of the day was "no"
  });
  it("refuses cards of a town that is not open yet", () => {
    const locked = townsIn("A1").find((t) => t.prereqs.length > 0)!;
    expect(() => tryStep(emptyGame(), ev({ t: "card", card: locked.cards[0], grade: "si" }, AT("2026-10-25")), ok)).toThrow(RuleError);
  });
});

describe("quiz and flags", () => {
  it("pays sapphires per right answer, nothing for the same question the same day", () => {
    const s = emptyGame();
    winBattle(s, root.id, AT("2026-10-25"));
    expect(gemTotal(s).zaffiro).toBe(3);
    winBattle(s, root.id, AT("2026-10-25", 12));
    expect(gemTotal(s).zaffiro).toBe(3);
    winBattle(s, root.id, AT("2026-10-26"));
    expect(gemTotal(s).zaffiro).toBe(6);
  });
  it("flags a town only with every card recalled and the battle won, then opens what depends on it", () => {
    const s = emptyGame();
    const next = townsIn("A1").find((t) => t.prereqs.length === 1 && t.prereqs[0] === root.id);
    winBattle(s, root.id, AT("2026-10-25"));
    expect(isFlagged(s, root.id)).toBe(root.cards.length === 0);
    recallAll(s, root.id, AT("2026-10-25"));
    expect(isFlagged(s, root.id)).toBe(true);
    if (next) expect(isOpen(s, next.id)).toBe(true);
  });
  it("loses a battle at 1 of 3", () => {
    const s = emptyGame();
    const [a, b, c] = root.items;
    play(s, { t: "battle", town: root.id, answers: [{ item: a, correct: true }, { item: b, correct: false }, { item: c, correct: false }] }, AT("2026-10-25"));
    expect(s.quizWon[root.id]).toBeUndefined();
  });
  it("refuses questions from another town", () => {
    const other = [...TOWNS.values()].find((t) => t.id !== root.id)!;
    expect(() => tryStep(emptyGame(), ev({ t: "battle", town: root.id, answers: other.items.slice(0, 3).map((item) => ({ item, correct: true })) }, AT("2026-10-25")), ok)).toThrow(RuleError);
  });
});

describe("the station exam", () => {
  /** flag every A1 town in prerequisite order */
  const allA1 = () => {
    const s = emptyGame();
    const order = [...townsIn("A1")].sort((a, b) => a.depth - b.depth);
    for (const t of order) flag(s, t.id, AT("2026-10-25"));
    return s;
  };
  const exam = (right: number) => ({ t: "exam" as const, region: "A1" as const,
    answers: townsIn("A1").flatMap((t) => t.items).slice(0, EXAM_SIZE).map((item, i) => ({ item, correct: i < right })) });

  it("needs 75% weighted coverage before it can be taken", () => {
    expect(() => tryStep(emptyGame(), ev(exam(12), AT("2026-10-25")), ok)).toThrow(/bandiere/);
  });
  it("passes at 9 of 12 and opens Emilia-Romagna; a fail waits until tomorrow", () => {
    const s = allA1();
    expect(coverage(s, "A1")).toBe(1);
    expect(isUnlocked(s, "A2")).toBe(false);
    play(s, exam(8), AT("2026-10-25", 12));
    expect(() => tryStep(s, ev(exam(12), AT("2026-10-25", 13)), ok)).toThrow(/domani/);
    play(s, exam(9), AT("2026-10-26"));
    expect(isUnlocked(s, "A2")).toBe(true);
  });
});

describe("gems and gold", () => {
  it("exchanges with the region multiplier and empties the backpack", () => {
    const s = emptyGame();
    s.gems = { A1: { rubino: 2, pietra: 0, smeraldo: 0, perla: 0, zaffiro: 3, goccia: 0 },
               A2: { rubino: 0, pietra: 1, smeraldo: 0, perla: 0, zaffiro: 0, goccia: 4 } };
    expect(goldValue(s.gems)).toBe(Math.round(2 * 5 + 3 * 2 + (8 + 4) * 1.25));
    play(s, { t: "exchange" }, AT("2026-10-25"));
    expect(s.gold).toBe(31);
    expect(gemTotal(s).rubino).toBe(0);
    expect(() => tryStep(s, ev({ t: "exchange" }, AT("2026-10-25", 11)), ok)).toThrow(/vuoto/);
  });
});

describe("visitors", () => {
  it("pick moon first, then fog, rain, cloud", () => {
    expect(visitorFor("fog", 0.99)).toBe("lupo");
    expect(visitorFor("rain", 0.01)).toBe("sibilla");
    expect(visitorFor("fog", 0.5)).toBe("folletto");
    expect(visitorFor("rain", 0.5)).toBe("pioggia");
    expect(visitorFor("cloud", 0.5)).toBe("fata");
    expect(visitorFor("clear", 0.5)).toBeNull();
  });
  it("refuse a visitor's reward on a day it is not there, and a second visit", () => {
    const s = emptyGame();
    const p = { t: "proverb" as const, id: PROVERBI[0].id, correct: true };
    expect(() => tryStep(s, ev(p, AT("2026-10-25")), { visitor: "fata" })).toThrow(RuleError);
    play(s, p, AT("2026-10-25"), "folletto");
    expect(gemTotal(s).perla).toBe(1);
    expect(() => tryStep(s, ev(p, AT("2026-10-25", 12)), { visitor: "folletto" })).toThrow(/già passato/);
    play(s, p, AT("2026-10-26"), "folletto");
    expect(gemTotal(s).perla).toBe(2);
  });
  it("stop rain drops at 20 a day", () => {
    const s = emptyGame();
    for (let i = 0; i < 20; i++) play(s, { t: "drop" }, AT("2026-10-25"), "pioggia");
    expect(() => tryStep(s, ev({ t: "drop" }, AT("2026-10-25")), { visitor: "pioggia" })).toThrow(/finite/);
    expect(gemTotal(s).goccia).toBe(20);
  });
  it("give moonstones for the wolf's run, at most 5", () => {
    const s = emptyGame();
    const items = townsIn("A1").flatMap((t) => t.items).slice(0, 30);
    play(s, { t: "wolf", answers: items.map((item) => ({ item, correct: true })) }, AT("2026-10-25"), "lupo");
    expect(gemTotal(s).pietra).toBe(5);
  });
});

describe("replay", () => {
  it("rebuilds the same state from the log", () => {
    const s = emptyGame();
    const log: GameEvent[] = [];
    const add = (b: EventBody, at: string) => { const e = ev(b, at); step(s, e, ok); log.push(e); };
    add({ t: "lesson", town: root.id }, AT("2026-10-25", 9));
    for (const c of root.cards) add({ t: "card", card: c, grade: "si" }, AT("2026-10-25", 10));
    add({ t: "battle", town: root.id, answers: root.items.slice(0, 3).map((item) => ({ item, correct: true })) }, AT("2026-10-25", 11));
    add({ t: "exchange" }, AT("2026-10-25", 12));
    const r = replay(log);
    expect(r.gold).toBe(s.gold);
    expect(r.xp).toBe(s.xp);
    expect(isFlagged(r, root.id)).toBe(true);
  });
  it("skips an event whose card no longer exists and keeps the rest", () => {
    const log = [
      ev({ t: "lesson", town: root.id }, AT("2026-10-25", 9)),
      ev({ t: "card", card: `${root.id}/regola-gone000`, grade: "si" }, AT("2026-10-25", 10)),
      ev({ t: "card", card: root.cards[0], grade: "si" }, AT("2026-10-25", 11)),
    ];
    const r = replay(log);
    expect(r.skipped).toBe(1);
    expect(r.lessons[root.id]).toBe(true);
    expect(gemTotal(r).rubino).toBe(1);
  });
  it("refuses events out of order", () => {
    const s = emptyGame();
    play(s, { t: "lesson", town: root.id }, AT("2026-10-25", 12));
    expect(() => tryStep(s, ev({ t: "lesson", town: root.id }, AT("2026-10-25", 11)), ok)).toThrow(/ordine/);
  });
});

describe("sky and moon", () => {
  it("maps weather codes and MET symbols", () => {
    expect(skyFromWmo(45, 100)).toBe("fog");
    expect(skyFromWmo(61, 100)).toBe("rain");
    expect(skyFromWmo(95, 100)).toBe("rain");
    expect(skyFromWmo(73, 100)).toBe("snow");
    expect(skyFromWmo(2, 80)).toBe("cloud");
    expect(skyFromWmo(1, 20)).toBe("clear");
    expect(skyFromMet("fog")).toBe("fog");
    expect(skyFromMet("lightrainshowers_day")).toBe("rain");
    expect(skyFromMet("heavysnow")).toBe("snow");
    expect(skyFromMet("cloudy")).toBe("cloud");
    expect(skyFromMet("partlycloudy_night")).toBe("clear");
  });
  it("finds known full and new moons", () => {
    expect(moonAt(Date.UTC(2024, 0, 25, 17, 54)).lit).toBeGreaterThan(0.99);
    expect(moonAt(Date.UTC(2025, 10, 5, 13, 19)).lit).toBeGreaterThan(0.99);
    expect(moonAt(Date.UTC(2024, 3, 8, 18, 21)).lit).toBeLessThan(0.01);
  });
  it("counts days in Italy and rounds places to 0.1°", () => {
    expect(dayOf("2026-10-24T22:30:00Z")).toBe("2026-10-25"); // 00:30 in Rome
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(cellKey(45.6712, 11.9349)).toBe("45.7,11.9");
  });
});

describe("Toscana and Lazio", () => {
  it("gives every B1 and B2 town a scene of four turns, three different replies each", () => {
    for (const t of [...townsIn("B1"), ...townsIn("B2")]) {
      const sc = sceneOf(t.id);
      expect(sc, t.id).toBeDefined();
      expect(t.scene).toBe(true);
      expect(sc!.turni.length).toBeGreaterThanOrEqual(4);
      for (const turn of sc!.turni) expect(new Set(turn.o).size, turn.npc).toBe(3);
    }
    expect(SCENE.every((s) => TOWNS.has(s.town))).toBe(true);
  });
  it("writes {m|f} for the player's own agreement", () => {
    expect(genere("Sono arrivat{o|a}.", "f")).toBe("Sono arrivata.");
    expect(genere("Sono arrivat{o|a}.", "m")).toBe("Sono arrivato.");
  });
  it("has fairy stories at every level, two questions each with three options", () => {
    for (const lvl of ["A1", "A2", "B1", "B2"]) expect(STORIE.filter((s) => s.level === lvl).length).toBeGreaterThanOrEqual(6);
    for (const s of STORIE) { expect(s.domande.length).toBe(2); for (const d of s.domande) expect(new Set(d.o).size).toBe(3); }
    expect(new Set(STORIE.map((s) => s.id)).size).toBe(STORIE.length);
  });

  const b1 = townsIn("B1").find((t) => t.prereqs.length === 0)!;
  /** a player standing in Toscana: A1 and A2 passed */
  const inToscana = () => { const s = emptyGame(); s.passed = ["A1", "A2"]; return s; };

  it("needs the scene for the flag in B1, and pays emeralds once a day", () => {
    const s = inToscana();
    recallAll(s, b1.id, AT("2026-10-25"));
    winBattle(s, b1.id, AT("2026-10-25"));
    expect(isFlagged(s, b1.id)).toBe(false);
    const turns = sceneOf(b1.id)!.turni.length;
    play(s, { t: "scene", town: b1.id, answers: Array(turns).fill(true) }, AT("2026-10-25", 11));
    expect(isFlagged(s, b1.id)).toBe(true);
    expect(gemTotal(s).smeraldo).toBe(turns);
    play(s, { t: "scene", town: b1.id, answers: Array(turns).fill(true) }, AT("2026-10-25", 12));
    expect(gemTotal(s).smeraldo).toBe(turns);
    expect(() => tryStep(s, ev({ t: "scene", town: b1.id, answers: [true] }, AT("2026-10-26")), ok)).toThrow(RuleError);
  });
  it("still flags A1 towns without a scene", () => {
    const s = emptyGame();
    flag(s, root.id, AT("2026-10-25"));
    expect(isFlagged(s, root.id)).toBe(true);
  });
  it("lets the fairy tell a story on a cloudy day only, paying an emerald per right answer", () => {
    const s = inToscana();
    const st = STORIE.find((x) => x.level === "B1")!;
    expect(() => tryStep(s, ev({ t: "story", id: st.id, answers: [true, true] }, AT("2026-10-25")), { visitor: "lupo" })).toThrow(RuleError);
    play(s, { t: "story", id: st.id, answers: [true, false] }, AT("2026-10-25"), "fata");
    expect(gemTotal(s).smeraldo).toBe(1);
    expect(s.stories).toEqual([st.id]);
  });
  it("sells an outfit only in its region and only for enough gold, and wears it", () => {
    const s = emptyGame();
    const vespa = BOTTEGA.find((a) => a.id === "vespa")!;
    s.gold = 1000;
    expect(() => tryStep(s, ev({ t: "buy", item: "vespa" }, AT("2026-10-25")), ok)).toThrow(/regione/);
    s.passed = ["A1", "A2"];
    play(s, { t: "buy", item: "vespa" }, AT("2026-10-25"));
    expect(s.gold).toBe(1000 - vespa.price);
    expect(s.wearing).toBe("vespa");
    expect(() => tryStep(s, ev({ t: "buy", item: "vespa" }, AT("2026-10-25")), ok)).toThrow(/già/);
    s.gold = 1;
    expect(() => tryStep(s, ev({ t: "buy", item: "zaino" }, AT("2026-10-25")), ok)).toThrow(/oro/);
    play(s, { t: "wear", item: "" }, AT("2026-10-25"));
    expect(s.wearing).toBeNull();
  });
  it("charges 10 gold for a quiz hint and pays no gem for that answer", () => {
    const s = emptyGame();
    s.gold = 25;
    const [a, b, c] = root.items;
    play(s, { t: "battle", town: root.id, answers: [{ item: a, correct: true, hint: true }, { item: b, correct: true }, { item: c, correct: true }] }, AT("2026-10-25"));
    expect(s.gold).toBe(25 - HINT_PRICE);
    expect(gemTotal(s).zaffiro).toBe(2);
    s.gold = 5;
    expect(() => tryStep(s, ev({ t: "battle", town: root.id, answers: [{ item: a, correct: true, hint: true }, { item: b, correct: true }, { item: c, correct: true }] }, AT("2026-10-26")), ok)).toThrow(/oro/);
  });
  it("allows no hints in the exam", () => {
    const s = emptyGame();
    const items = townsIn("A1").flatMap((t) => t.items).slice(0, EXAM_SIZE);
    for (const t of [...townsIn("A1")].sort((x, y) => x.depth - y.depth)) flag(s, t.id, AT("2026-10-25"));
    s.gold = 500;
    expect(() => tryStep(s, ev({ t: "exam", region: "A1", answers: items.map((item, i) => ({ item, correct: true, hint: i === 0 })) }, AT("2026-10-25", 12)), ok)).toThrow(/aiutini/);
  });
  it("opens Lazio after the Toscana exam", () => {
    const s = inToscana();
    for (const t of [...townsIn("B1")].sort((x, y) => x.depth - y.depth)) {
      flag(s, t.id, AT("2026-10-25"));
      play(s, { t: "scene", town: t.id, answers: Array(sceneOf(t.id)!.turni.length).fill(true) }, AT("2026-10-25"));
    }
    expect(coverage(s, "B1")).toBe(1);
    play(s, { t: "exam", region: "B1", answers: townsIn("B1").flatMap((t) => t.items).slice(0, EXAM_SIZE).map((item) => ({ item, correct: true })) }, AT("2026-10-25", 12));
    expect(isUnlocked(s, "B2")).toBe(true);
  });
});
