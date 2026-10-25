/**
 * The 8-bit world: a low-resolution canvas scaled up without smoothing, in
 * the 16 colours of the PICO-8 palette. Only pictures live here; every word
 * the player reads is HTML.
 */

export const P: Record<string, string> = {
  k: "#000000", n: "#1d2b53", v: "#7e2553", d: "#008751", o: "#ab5236", a: "#5f574f", l: "#c2c3c7", w: "#fff1e8",
  r: "#ff004d", e: "#ffa300", y: "#ffec27", g: "#00e436", b: "#29adff", u: "#83769c", p: "#ff77a8", f: "#ffccaa",
  c: "#004a2b", // cypress green, darker than the grass
};

export type Ctx = CanvasRenderingContext2D;
export const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
  c.fillStyle = P[col] ?? col;
  c.fillRect(Math.round(x), Math.round(y), w, h);
};
export const px = (c: Ctx, x: number, y: number, col: string) => rect(c, x, y, 1, 1, col);

/** Draw a sprite from rows of palette letters; "." is transparent. */
export function spr(c: Ctx, x: number, y: number, rows: string[], k = 1, map: Record<string, string> = {}) {
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === ".") return;
    c.fillStyle = map[ch] ?? P[ch];
    c.fillRect(Math.round(x) + i * k, Math.round(y) + j * k, k, k);
  }));
}

/** A seeded random, so a map looks the same on every visit. */
export function seeded(seed: number) {
  let s = seed % 2147483647 || 7;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// ── sprites ──────────────────────────────────────────────────────────────────

export const HERO = ["..rrrr..", ".rrrrrr.", "..ffff..", "..nffn..", "..ffff..", ".bbbbbb.", "f.bbbb.f", "..bbbb..", "..a..a..", "..a..a..", ".oo..oo."];
export const ELF = ["....dd....", "...dddd...", "..dddddd..", "f.dffffd.f", ".ffnffnff.", "..ffffff..", "...fppf...", "..dddddd..", ".ddyyyydd.", ".fddddddf.", "..dddddd..", "..d....d..", "..o....o..", ".oo....oo."];
export const FAIRY = ["..w....w..", ".www..www.", ".wwwppwww.", "..wffffw..", "...nffn...", "...ffff...", "..pppppp..", ".pppppppp.", "...pppp...", "...f..f..."];
export const WOLF = ["l........l", "ll......ll", "lll....lll", ".llllllll.", ".lkllllkl.", ".llllllll.", "..llnnll..", "...lnnl...", "..llllll..", ".llllllll.", ".ll.ll.ll.", ".l..l..l.."];
export const SIBYL = ["...uuuu...", "..uuuuuu..", ".uuffffuu.", ".uufnnfuu.", ".uuffffuu.", "..uuuuuu..", ".uuuyyuuu.", "uuuuyyuuuu", "uuuuuuuuuu", ".uuuuuuuu.", "..uu..uu.."];
export const MONSTER = ["..vvvv..", ".vvvvvv.", "vvwvvwvv", "vvkvvkvv", "vvvvvvvv", "vv.vv.vv", "v..vv..v"];
export const HOUSE = ["...r...", "..rrr..", ".rrrrr.", ".wwwww.", ".wwoww.", ".wwoww."];
export const STATION = ["...aaaaaaa...", "..aaaaaaaaa..", ".aaaaaaaaaaa.", ".lllllllllll.", ".lnnlllllnnl.", ".lnnlooolnnl.", ".llllooollll."];
export const FLAG = ["wrrr", "wrrr", "w...", "w...", "w..."];
export const WEED = ["g.g.g", ".ggg.", "..g.."];
const gem = (c: string) => ["..c..", ".ccc.", "ccwcc", ".ccc.", "..c.."].map((r) => r.replace(/c/g, c));
export const GEM_SPRITE: Record<string, string[]> = {
  rubino: gem("r"), pietra: gem("l"), smeraldo: gem("g"), perla: [".www.", "wwwww", "wwlww", "wwwww", ".www."], zaffiro: gem("b"),
  goccia: ["..b..", "..b..", ".bbb.", "bbwbb", ".bbb."], // a raindrop, not a sapphire
};
export const COIN = [".yyy.", "yyeyy", "yeyey", "yyeyy", ".yyy."];

// ── outfits: drawn on top of (or under) the hero ────────────────────────────
export const BACKPACK = ["oo", "oe", "oo", "o."]; // on the hero's back, left side
export const BACKPACK_ICON = [".aaaa.", "a....a", "oooooo", "oeeeeo", "oooooo", "oo..oo", "oooooo"];
export const BIKE = ["..a.......", ".a.a....aa", "aaaaaaaaa.", "a.a.a.a..a", ".a.....a..", "a.a...a.a.", ".a.....a.."];
export const VESPA = ["........ll", ".......l..", "..gggggg..", ".gggggggg.", "gggggggggg", ".kk....kk.", ".kk....kk."];
export const KEYS = ["yy.", "y.y", "yy.", ".y.", ".yy"];

/** The hero, with what they wear. */
export function drawHero(c: Ctx, x: number, y: number, wearing: string | null, k = 1) {
  if (wearing === "bicicletta") spr(c, x - 1 * k, y + 7 * k, BIKE, k);
  if (wearing === "vespa") spr(c, x - 1 * k, y + 6 * k, VESPA, k);
  spr(c, x, y, HERO, k);
  if (wearing === "zaino") spr(c, x - 1 * k, y + 5 * k, BACKPACK, k);
  if (wearing === "chiavi") spr(c, x + 8 * k, y + 5 * k, KEYS, k);
}

// ── souvenirs, for the album ─────────────────────────────────────────────────
export const SOUVENIR: Record<string, string[]> = {
  gondola: ["..........l", ".........u.", "l...r...u..", "uuuuuuuuu..", ".uuuuuuu...", "bbbbbbbbbbb"],
  maschera: [".yyyyyyy.", "ywwwwwwwy", "ywkwwwkwy", "ywwwwwwwy", ".ywwywwy.", "..yyyyy.."],
  tortellini: [".fff..fff.", "ffeff.ffef", "feeff.feef", ".fff..fff.", "..........", ".fff..fff.", "fefff.ffef", ".fff..fff."],
  "due-torri": [".o.....", ".o..o..", ".o..o..", ".o..o..", ".o..o..", ".o..o..", ".o.o...", "lllllll"],
  "torre-pisa": ["..ww.", "..ww.", "..ww.", ".ww..", ".ww..", ".ww..", "ww...", "lllll"],
  fiasco: ["..r..", "..e..", ".eee.", "ddddd", "ddrdd", "ddddd", ".ddd."],
  colosseo: [".ffffffff.", "fofofofoff", "ffffffffff", "fofofofoff", "ffffffffff", "lllllllll."],
  bocca: [".lllll.", "lllllll", "lklllkl", "lllllll", "llkkkll", "lllllll", ".lllll."],
};

// ── region scenery ───────────────────────────────────────────────────────────
export const CYPRESS = [".c.", "ccc", "ccc", "ccc", "ccc", ".o."];
export const COLUMN = ["fff", ".f.", ".f.", ".f.", ".f.", "fff"];

/** A sprite as a small image, for the HUD and the HTML around the canvas. */
export function icon(rows: string[], k = 3): string {
  const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
  const cv = document.createElement("canvas");
  cv.width = w * k; cv.height = h * k;
  spr(cv.getContext("2d")!, 0, 0, rows, k);
  return cv.toDataURL();
}

// ── Italy ────────────────────────────────────────────────────────────────────

const ITALY: [number, number][] = [[6.6,45.1],[7.0,45.9],[8.4,46.4],[9.0,46.0],[10.4,46.6],[12.2,47.0],[13.7,46.5],[13.7,45.6],[12.4,45.4],[12.3,44.9],[12.5,44.2],[13.6,43.5],[14.2,42.4],[15.2,41.9],[16.0,41.9],[16.0,41.5],[17.0,41.0],[18.5,40.2],[18.4,39.8],[17.2,40.4],[16.5,39.7],[17.1,39.0],[16.6,38.4],[15.7,37.9],[15.6,38.3],[16.2,38.9],[15.7,40.0],[14.9,40.3],[14.5,40.6],[14.0,40.8],[13.0,41.3],[12.2,41.8],[11.1,42.4],[10.5,42.9],[10.2,43.9],[9.2,44.3],[8.4,44.0],[7.5,43.8],[7.6,44.2],[6.9,44.4]];
const SICILY: [number, number][] = [[12.4,37.8],[13.4,38.2],[15.6,38.3],[15.1,37.3],[15.1,36.7],[14.3,37.0],[12.5,37.6]];
const SARDINIA: [number, number][] = [[8.4,39.0],[8.2,40.9],[9.2,41.3],[9.8,40.6],[9.6,39.2],[9.0,39.0]];

/** lon/lat → pixel on the 200×140 overworld */
export const X = (lon: number) => 20 + (lon - 6) * 8.8;
export const Y = (lat: number) => 6 + (47.5 - lat) * 12;

function inside(x: number, y: number, poly: [number, number][]) {
  let r = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) r = !r;
  }
  return r;
}
const polys = [ITALY, SICILY, SARDINIA].map((p) => p.map(([lo, la]) => [X(lo), Y(la)] as [number, number]));
const land = (x: number, y: number) => polys.some((p) => inside(x + 0.5, y + 0.5, p));

export type MapRegion = "A1" | "A2" | "B1" | "B2";
const CITIES: [MapRegion, number, number][] = [["A1", 45.44, 12.33], ["A2", 44.49, 11.34], ["B1", 43.47, 11.1], ["B2", 41.9, 12.9]];
/** Which game region a pixel belongs to: the nearest of the four cities, inside the north and centre. */
export function regionAtPixel(x: number, y: number): MapRegion | null {
  if (!land(x, y)) return null;
  if (y < Y(45.85)) return null; // the Alps
  const lon = (x - 20) / 8.8 + 6, lat = 47.5 - (y - 6) / 12;
  if (lat < 41.2 || lat > 45.85 || lon < 9.6 || lon > 14.2) return null;
  let best: MapRegion | null = null, dist = Infinity;
  for (const [r, la, lo] of CITIES) {
    const d = (la - lat) ** 2 + ((lo - lon) * 0.73) ** 2;
    if (d < dist) { dist = d; best = r; }
  }
  return best;
}

/** The overworld: Italy, the two playable regions lit, the rest under fog. */
export function drawItaly(c: Ctx, lit: Record<MapRegion, boolean>, hover: string | null) {
  const rnd = seeded(7);
  for (let y = 0; y < 140; y++) for (let x = 0; x < 200; x++) {
    if (!land(x, y)) {
      px(c, x, y, "n");
      if (rnd() < 0.02) { px(c, x, y, "b"); px(c, x + 1, y, "b"); }
      continue;
    }
    const coast = !land(x - 1, y) || !land(x + 1, y) || !land(x, y - 1) || !land(x, y + 1);
    const reg = regionAtPixel(x, y);
    let col = coast ? "f" : (x + y) % 7 === 0 ? "g" : "d";
    if (!coast && y < Y(45.85)) col = (x * 3 + y) % 4 === 0 ? "w" : "l";
    if (reg && hover === reg && !coast && (x + y) % 3 === 0) col = "y";
    const fogged = reg ? !lit[reg] : y > Y(43.0) || x < X(9.6);
    if (!coast && fogged && (x + y) % 2 === 0) col = "n";
    px(c, x, y, col);
  }
}

// ── weather on the canvas ────────────────────────────────────────────────────

export interface Drop { x: number; y: number; v: number; caught: boolean }
export const newDrops = (n: number, w: number, h: number, rnd = Math.random): Drop[] =>
  Array.from({ length: n }, () => ({ x: rnd() * w, y: -rnd() * h, v: 0.25 + rnd() * 0.35, caught: false }));

export function drawRainStreaks(c: Ctx, w: number, h: number, t: number) {
  for (let i = 0; i < 60; i++) {
    const x = (i * 37 + t * 0.4) % w, y = (i * 53 + t * 1.6) % h;
    px(c, x, y, "b"); px(c, x - 1, y + 1, "b");
  }
}

/** Fog: soft dithered banks drifting slowly across the map. */
const FOG_BANKS = Array.from({ length: 7 }, (_, i) => ({ y: 8 + i * 25, h: 10 + (i % 3) * 5, w: 70 + (i * 37) % 60, x: (i * 97) % 320, v: 0.004 + (i % 4) * 0.002 }));
export function drawFog(c: Ctx, w: number, h: number, t: number) {
  for (const b of FOG_BANKS) {
    const x0 = ((b.x + t * b.v) % (w + b.w)) - b.w;
    for (let y = b.y; y < Math.min(h, b.y + b.h); y++) {
      const edge = Math.min(y - b.y, b.y + b.h - y);
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(w, x0 + b.w); x++) {
        const fromSide = Math.min(x - x0, x0 + b.w - x);
        const dense = edge > 2 && fromSide > 8;
        if (dense ? (x + y) % 2 === 0 : (x + y) % 4 === 0 && (x * 3 + y) % 3 === 0) px(c, x, y, "w");
      }
    }
  }
}

export function drawClouds(c: Ctx, w: number, t: number) {
  for (let i = 0; i < 4; i++) {
    const x = ((i * 83 + t * 0.05) % (w + 40)) - 30, y = 4 + i * 7;
    rect(c, x, y, 22, 4, "l"); rect(c, x + 5, y - 3, 11, 3, "l");
  }
}

/** Make a canvas crisp at an integer scale that fits its box. */
export function fitCanvas(cv: HTMLCanvasElement, w: number, h: number) {
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return ctx;
}
