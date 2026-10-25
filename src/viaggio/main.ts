/**
 * Il Viaggio, phase 1: Veneto (A1) and Emilia-Romagna (A2).
 *
 * Canvas for the world (overworld, region maps, sprites, rain); HTML for every
 * word (lessons, cards, quizzes, dialogs), so zoom, screen readers and text
 * selection keep working. Every reward is decided by src/game/rules.ts.
 */
import {
  CARDS, CONSIGLI, ITEMS, PROVERBI, REGIONS, TOWNS, kindName, monsterOf, regionOf, townsIn, type RegionId,
} from "../game/content";
import { DATA } from "../shared/progress";
import { dayOf } from "../game/cielo";
import {
  COVERAGE_FOR_EXAM, DROPS_PER_DAY, EXAM_PASS, EXAM_SIZE, GEMS, GEM_NAME, GOLD, STAR_XP,
  coverage, currentRegion, gemTotal, goldValue, hasWeeds, isDue, isFlagged, isOpen, isUnlocked, recalled, stars, titleOf,
  type Answer, type Gem, type GameState, type Grade, type Visitor,
} from "../game/rules";
import { api, ApiError } from "../client/store";
import { AccountGame, GuestGame, type Game, type Place, type Today } from "./store";
import * as px from "./pixel";

declare const BUILD_ID: string;

// ── helpers ──────────────────────────────────────────────────────────────────

const $ = <T extends HTMLElement = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector(s) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const today = () => dayOf(Date.now());
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
const gemIcon = (g: Gem, k = 3) => `<img class="gem" src="${ICONS[g]}" width="${5 * k}" height="${5 * k}" alt="">`;
const plural = (g: Gem, n: number) => GEM_NAME[g][n === 1 ? 0 : 1];
let ICONS: Record<string, string> = {};

let game: Game;
let todayInfo: Today | null = null;
let anim = 0; // the running animation loop's token

const SKY_WORD: Record<string, string> = { clear: "Sereno", cloud: "Nuvoloso", fog: "Nebbia", rain: "Pioggia", snow: "Neve" };
const VISITOR: Record<Visitor, { name: string; line: string }> = {
  folletto: { name: "Il Folletto della nebbia", line: "Nella nebbia ti aspetta un folletto con un proverbio." },
  fata: { name: "La Fata", line: "Sotto le nuvole è passata una fata: ha un consiglio per te." },
  lupo: { name: "Il Lupo", line: "Luna piena: il lupo ti sfida, 60 secondi di domande." },
  sibilla: { name: "La Sibilla", line: "Luna nuova, nuovo inizio: la Sibilla ti offre un segreto." },
  pioggia: { name: "Pioggia di gemme", line: "Piove! Tocca le gocce sulla mappa per raccoglierle." },
};

function toast(html: string) {
  const t = $("#toast");
  t.innerHTML = html;
  t.classList.add("on");
  clearTimeout((t as any).timer);
  (t as any).timer = setTimeout(() => t.classList.remove("on"), 2600);
}

/** What the last event paid, as a line. */
function rewardLine(s: GameState) {
  const parts: string[] = [];
  for (const [g, n] of Object.entries(s.last.gems) as [Gem, number][]) {
    if (n > 0) parts.push(`${gemIcon(g, 2)} +${n} ${plural(g, n)}`);
  }
  if (s.last.gold) parts.push(`<b class="gold">+${s.last.gold} oro</b>`);
  if (s.last.xp) parts.push(`+${s.last.xp} XP`);
  return parts.join(" · ");
}

async function send(body: Parameters<Game["send"]>[0]) {
  try {
    const s = await game.send(body);
    const line = rewardLine(s);
    if (line) toast(line);
    renderHud();
    return s;
  } catch (e) {
    toast(`<span class="err">${esc(e instanceof Error ? e.message : "Errore.")}</span>`);
    throw e;
  }
}

// ── HUD ──────────────────────────────────────────────────────────────────────

function renderHud() {
  const s = game.state;
  const reg = currentRegion(s);
  const st = stars(s, reg);
  const next = STAR_XP[st];
  const bag = gemTotal(s);
  const sky = todayInfo?.reading;
  const place = game.place?.name || (game.place ? "La tua posizione" : regionOf(reg)!.city);
  $("#hud").innerHTML = `
    <a class="brand" href="#italia">IL VIAGGIO</a>
    <span class="lvl">${reg} <span class="stars" aria-label="${st} stelle su 3">${"★".repeat(st)}<i>${"★".repeat(3 - st)}</i></span>
      <b>${titleOf(s).toUpperCase()}</b></span>
    <span class="xp" title="XP in ${regionOf(reg)!.name}">${s.xpBy[reg] ?? 0}${next ? `/${next}` : ""} XP</span>
    <a class="bag" href="#zaino" aria-label="Zaino">${(["rubino", "smeraldo", "zaffiro", "perla", "pietra", "goccia"] as Gem[])
      .map((g) => `<span title="${GEM_NAME[g][1]}">${gemIcon(g)}${bag[g]}</span>`).join("")}
      <span title="Oro"><img class="gem" src="${ICONS.coin}" width="15" height="15" alt="">${s.gold}</span></a>
    <button class="sky" data-act="place" title="Cambia città">
      <b>${sky ? SKY_WORD[sky.sky] : "…"}</b> ${esc(place)}
      ${sky?.at ? `<small>aggiornato alle ${hhmm(sky.at)}</small>` : ""}
    </button>
    ${sky?.blocked.length ? `<span class="blocked" role="status">${sky.blocked.map(esc).join(" · ")}</span>` : ""}`;
}

// ── router ───────────────────────────────────────────────────────────────────

function route() {
  cancelAnimationFrame(anim);
  anim = 0;
  const [view, arg, tab] = location.hash.replace(/^#/, "").split("/");
  const v = $("#view");
  v.className = "";
  if (view === "regione" && (arg === "A1" || arg === "A2")) return renderRegion(arg);
  if (view === "citta" && TOWNS.has(decodeURIComponent(arg ?? ""))) return renderTown(decodeURIComponent(arg), tab);
  if (view === "stazione" && (arg === "A1" || arg === "A2")) return renderExam(arg);
  if (view === "zaino") return renderBag();
  return renderItaly();
}
window.addEventListener("hashchange", route);

// ── the overworld ────────────────────────────────────────────────────────────

function renderItaly() {
  const s = game.state;
  const v = $("#view");
  v.className = "italia";
  const regionCard = (r: RegionId) => {
    const R = regionOf(r)!;
    const open = isUnlocked(s, r);
    const cov = Math.round(coverage(s, r) * 100);
    return `<a class="regcard ${open ? "" : "locked"}" href="${open ? `#regione/${r}` : "#italia"}" ${open ? "" : 'aria-disabled="true"'}>
      <b>${R.name.toUpperCase()}</b> <span>${r} · ${esc(R.city)}</span>
      ${open ? `<span class="bar"><i style="width:${cov}%"></i></span><small>${cov}% delle regole · treno a ${COVERAGE_FOR_EXAM * 100}%</small>`
             : `<small>Si apre col treno da ${regionOf(PLAYABLE_PREV(r))!.name}</small>`}
      ${s.passed.includes(r) ? `<small class="ok">Esame superato</small>` : ""}</a>`;
  };
  const vis = todayInfo?.visitor;
  v.innerHTML = `
    <div class="world">
      <canvas id="map" width="200" height="140" aria-label="Mappa d'Italia: Veneto ed Emilia-Romagna si possono visitare"></canvas>
      <aside class="side">
        <h1>Il Viaggio</h1>
        <p>Un viaggio per l'Italia, una regola alla volta. Ogni regione è un livello, ogni città una regola di Parliamo.</p>
        ${regionCard("A1")}${regionCard("A2")}
        <div class="regcard locked"><b>TOSCANA, LAZIO…</b><span>B1 · B2 · C1 · C2</span><small>Nella nebbia, per ora.</small></div>
        ${vis && !s.visited.includes(vis) ? `<p class="visit">${VISITOR[vis].line} <a href="#regione/${currentRegion(s)}">Vai</a></p>` : ""}
        ${game.kind === "account" && !s.importDone ? `<p class="small">Hai fatto il test diagnostico di Parliamo?
          <button class="link" data-act="import">Usalo come esame d'ingresso</button>: le regole giuste diventano città con la bandiera.</p>` : ""}
        ${game.kind === "guest" ? `<p class="small">Stai giocando senza account: il viaggio resta su questo browser.</p>` : ""}
      </aside>
    </div>`;
  const cv = $<HTMLCanvasElement>("#map");
  const c = px.fitCanvas(cv, 200, 140);
  let hover: string | null = null;
  const draw = () => {
    px.drawItaly(c, { A1: isUnlocked(s, "A1"), A2: isUnlocked(s, "A2") }, hover);
    for (const R of REGIONS) {
      const x = Math.round(px.X(R.lon)) - 3, y = Math.round(px.Y(R.lat)) - 5;
      px.spr(c, x, y, px.HOUSE, 1, R.playable && isUnlocked(s, R.id as RegionId) ? {} : { r: px.P.a, w: px.P.u, o: px.P.n });
      if (s.passed.includes(R.id as RegionId)) px.spr(c, x + 6, y - 5, px.FLAG);
    }
    const here = regionOf(currentRegion(s))!;
    px.spr(c, Math.round(px.X(here.lon)) - 13, Math.round(px.Y(here.lat)) - 9, px.HERO);
  };
  draw();
  const at = (ev: MouseEvent) => {
    const r = cv.getBoundingClientRect();
    return px.regionAtPixel(Math.floor(((ev.clientX - r.left) / r.width) * 200), Math.floor(((ev.clientY - r.top) / r.height) * 140));
  };
  cv.addEventListener("mousemove", (ev) => { const h = at(ev); if (h !== hover) { hover = h; draw(); cv.style.cursor = h ? "pointer" : "default"; } });
  cv.addEventListener("click", (ev) => { const r = at(ev); if (r && isUnlocked(s, r)) location.hash = `#regione/${r}`; });
}
const PLAYABLE_PREV = (r: RegionId): RegionId => (r === "A2" ? "A1" : "A1");

// ── a region ─────────────────────────────────────────────────────────────────

const RW = 320, RH = 180;
function layout(r: RegionId) {
  const ts = townsIn(r);
  const cols = Math.max(...ts.map((t) => t.depth)) + 1;
  const pos = new Map<string, { x: number; y: number }>();
  for (let d = 0; d < cols; d++) {
    const col = ts.filter((t) => t.depth === d).sort((a, b) => b.weight - a.weight);
    col.forEach((t, i) => pos.set(t.id, {
      x: 22 + (d * (RW - 70)) / Math.max(1, cols - 1),
      y: 26 + ((i + 0.5) * (RH - 40)) / col.length + (d % 2 ? 4 : -4),
    }));
  }
  return pos;
}

function renderRegion(r: RegionId) {
  const s = game.state;
  if (!isUnlocked(s, r)) { location.hash = "#italia"; return; }
  const R = regionOf(r)!;
  const v = $("#view");
  v.className = "regione";
  const pos = layout(r);
  const ts = townsIn(r);
  const day = today();
  const vis = todayInfo?.visitor ?? null;
  const visitorHere = vis && vis !== "pioggia" && !s.visited.includes(vis) && r === currentRegion(s);
  const raining = vis === "pioggia" && s.drops < DROPS_PER_DAY && r === currentRegion(s);
  const status = (id: string) => isFlagged(s, id) ? (hasWeeds(s, id, day) ? "weeds" : "flag") : isOpen(s, id) ? "open" : "locked";
  const cov = coverage(s, r);

  v.innerHTML = `
    <nav class="crumbs"><a href="#italia">Italia</a> › ${esc(R.name)}</nav>
    <h1>${esc(R.name)} <small>${r} · ${R.title}</small></h1>
    ${visitorHere ? `<p class="visit">${VISITOR[vis!].line} <button class="btn" data-act="meet">Incontra</button></p>` : ""}
    ${raining ? `<p class="visit">${VISITOR.pioggia.line} <b>${s.drops}/${DROPS_PER_DAY}</b> oggi.</p>` : ""}
    <canvas id="rmap" width="${RW}" height="${RH}" aria-hidden="true"></canvas>
    <p id="tip" class="tip" aria-live="polite">Tocca una città.</p>
    <div class="regionbar">
      <span class="bar"><i style="width:${Math.round(cov * 100)}%"></i></span>
      <span>${Math.round(cov * 100)}% delle regole con la bandiera, pesate come nel test.</span>
      ${s.passed.includes(r) ? `<b class="ok">Esame superato</b>` : `<a class="btn" href="#stazione/${r}">Stazione: esame per ${r === "A1" ? "l'Emilia-Romagna" : "la Toscana"}</a>`}
    </div>
    <h2>Le città</h2>
    <ul class="towns">${[...ts].sort((a, b) => a.depth - b.depth).map((t) => {
      const st = status(t.id);
      const n = t.cards.filter((c) => recalled(s, c)).length;
      return `<li class="t-${st}">${st === "locked" ? `<span>${esc(t.label)}</span>` : `<a href="#citta/${encodeURIComponent(t.id)}">${esc(t.label)}</a>`}
        <small>${st === "locked" ? "chiusa: prima " + t.prereqs.filter((p) => !isFlagged(s, p)).map((p) => esc(TOWNS.get(p)!.label)).join(", ")
          : st === "flag" ? "bandiera" : st === "weeds" ? "erbacce: ripasso" : `${n}/${t.cards.length} mattoni${s.quizWon[t.id] ? " · quiz vinto" : ""}`}</small></li>`;
    }).join("")}</ul>`;

  const cv = $<HTMLCanvasElement>("#rmap");
  const c = px.fitCanvas(cv, RW, RH);
  const rnd = px.seeded(r === "A1" ? 11 : 23);
  const grass: [number, number][] = Array.from({ length: 140 }, () => [rnd() * RW, rnd() * RH]);
  const drops = raining ? px.newDrops(DROPS_PER_DAY - s.drops, RW, RH) : [];
  if (raining && reduced()) drops.forEach((d) => (d.y = 20 + Math.random() * (RH - 40)));
  const visitorAt = { x: RW - 40, y: 16 };
  const sprite = vis === "folletto" ? px.ELF : vis === "fata" ? px.FAIRY : vis === "lupo" ? px.WOLF : px.SIBYL;
  const lastTown = sessionStorage.getItem("viaggio.last") ?? "";

  const draw = (t: number) => {
    rect(c, 0, 0, RW, RH, "d");
    for (const [x, y] of grass) px.px(c, x, y, "g");
    if (r === "A1") { // the lagoon to the east
      for (let y = 0; y < RH; y++) px.rect(c, RW - 22 + Math.round(Math.sin(y / 9) * 3), y, 30, 1, "n");
    } else {           // the Po along the north
      for (let x = 0; x < RW; x++) px.rect(c, x, 6 + Math.round(Math.sin(x / 17) * 2), 1, 3, "b");
    }
    // roads
    for (const town of ts) for (const p of town.prereqs) {
      const a = pos.get(p), b = pos.get(town.id);
      if (!a || !b) continue;
      const n = Math.hypot(b.x - a.x, b.y - a.y);
      const lit = isFlagged(s, p);
      for (let k = 0; k < n; k += 3) px.px(c, a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n, lit ? "y" : "a");
    }
    // the station
    px.spr(c, RW - 34, RH / 2 - 4, px.STATION);
    // towns
    for (const town of ts) {
      const p = pos.get(town.id)!;
      const st = status(town.id);
      px.spr(c, p.x - 3, p.y - 5, px.HOUSE, 1, st === "locked" ? { r: px.P.a, w: px.P.u, o: px.P.n } : {});
      if (st === "flag" || st === "weeds") px.spr(c, p.x + 3, p.y - 10, px.FLAG);
      if (st === "weeds") px.spr(c, p.x - 7, p.y - 2, px.WEED);
    }
    const h = pos.get(lastTown) ?? pos.get(ts.find((x) => isOpen(s, x.id))?.id ?? "")!;
    if (h) px.spr(c, h.x - 12, h.y - 9 + (reduced() ? 0 : Math.round(Math.sin(t / 300))), px.HERO);
    if (visitorHere) px.spr(c, visitorAt.x, visitorAt.y + (reduced() ? 0 : Math.round(Math.sin(t / 250) * 2)), sprite);
    if (todayInfo?.reading.sky === "fog") px.drawFog(c, RW, RH, t);
    if (todayInfo?.reading.sky === "cloud") px.drawClouds(c, RW, t);
    if (todayInfo?.reading.sky === "rain" && !reduced()) px.drawRainStreaks(c, RW, RH, t);
    for (const d of drops) {
      if (d.caught) continue;
      if (!reduced()) { d.y += d.v; if (d.y > RH) d.y = -5; }
      px.spr(c, d.x, d.y, px.GEM_SPRITE.goccia, 2); // twice the size: easy to tap on a phone
    }
  };
  const rect = (cx: px.Ctx, x: number, y: number, w: number, h: number, col: string) => px.rect(cx, x, y, w, h, col);

  const token = Math.random();
  const loop = (t: number) => {
    if (anim === 0 || (cv as any).token !== token) return;
    draw(t);
    anim = requestAnimationFrame(loop);
  };
  (cv as any).token = token;
  draw(0);
  if (!reduced() || raining) anim = requestAnimationFrame(loop);

  const toWorld = (ev: MouseEvent) => {
    const b = cv.getBoundingClientRect();
    return { x: ((ev.clientX - b.left) / b.width) * RW, y: ((ev.clientY - b.top) / b.height) * RH };
  };
  const townAt = (p: { x: number; y: number }) => {
    let best: string | null = null, dist = 9;
    for (const [id, q] of pos) { const d = Math.hypot(q.x - p.x, q.y - 2 - p.y); if (d < dist) { dist = d; best = id; } }
    return best;
  };
  cv.addEventListener("mousemove", (ev) => {
    const id = townAt(toWorld(ev));
    cv.style.cursor = id ? "pointer" : "default";
    $("#tip").textContent = id ? `${TOWNS.get(id)!.label} · ${({ open: "aperta", locked: "chiusa", flag: "bandiera", weeds: "da ripassare" } as any)[status(id)]}` : "Tocca una città.";
  });
  cv.addEventListener("click", async (ev) => {
    const p = toWorld(ev);
    if (raining) {
      const d = drops.find((x) => !x.caught && Math.abs(x.x + 5 - p.x) < 11 && Math.abs(x.y + 5 - p.y) < 11);
      if (d) {
        d.caught = true;
        try { await send({ t: "drop" }); } catch { /* refused: the toast says why */ }
        if (game.state.drops >= DROPS_PER_DAY) renderRegion(r);
        return;
      }
    }
    if (visitorHere && p.x >= visitorAt.x - 2 && p.x <= visitorAt.x + 12 && p.y >= visitorAt.y - 2 && p.y <= visitorAt.y + 16) return meet(vis!);
    if (p.x > RW - 36 && Math.abs(p.y - RH / 2) < 10) { location.hash = `#stazione/${r}`; return; }
    const id = townAt(p);
    if (id && isOpen(s, id)) location.hash = `#citta/${encodeURIComponent(id)}`;
    else if (id) toast(`Prima: ${TOWNS.get(id)!.prereqs.filter((q) => !isFlagged(s, q)).map((q) => esc(TOWNS.get(q)!.label)).join(", ")}`);
  });
}

// ── a town ───────────────────────────────────────────────────────────────────

function renderTown(id: string, tab = "") {
  const s = game.state;
  const t = TOWNS.get(id)!;
  if (!isOpen(s, id)) { location.hash = `#regione/${t.region}`; return; }
  sessionStorage.setItem("viaggio.last", id);
  const v = $("#view");
  v.className = "citta";
  const n = t.cards.filter((c) => recalled(s, c)).length;
  const flagged = isFlagged(s, id);
  const tabs: [string, string, boolean][] = [
    ["lezione", "Lezione", !!s.lessons[id]],
    ["mattoni", `Mattoni ${n}/${t.cards.length}`, n === t.cards.length],
    ["quiz", "Quiz", !!s.quizWon[id]],
    ["cambio", "Cambiavalute", false],
  ];
  const active = tabs.some(([k]) => k === tab) ? tab : !s.lessons[id] ? "lezione" : n < t.cards.length ? "mattoni" : "quiz";
  v.innerHTML = `
    <nav class="crumbs"><a href="#italia">Italia</a> › <a href="#regione/${t.region}">${esc(regionOf(t.region)!.name)}</a> › ${esc(t.label)}</nav>
    <canvas id="tbanner" width="320" height="56" aria-hidden="true"></canvas>
    <h1>${esc(t.label)} ${flagged ? `<span class="flag">bandiera</span>` : ""}</h1>
    <p class="small">Per la bandiera: ricorda tutti i mattoni e vinci il quiz contro ${esc(monsterOf(id))}.</p>
    <div class="tabs" role="tablist">${tabs.map(([k, label, done]) =>
      `<a role="tab" href="#citta/${encodeURIComponent(id)}/${k}" aria-selected="${k === active}" class="${done ? "done" : ""}">${label}${done ? " ✓" : ""}</a>`).join("")}</div>
    <section id="panel"></section>`;

  const c = px.fitCanvas($<HTMLCanvasElement>("#tbanner"), 320, 56);
  px.rect(c, 0, 0, 320, 56, "b");
  px.rect(c, 0, 20, 320, 26, "o");
  for (let x = 4; x < 320; x += 20) { px.rect(c, x + 3, 30, 14, 16, "v"); px.rect(c, x, 28, 3, 18, "e"); }
  for (let y = 46; y < 56; y++) for (let x = 0; x < 320; x++) px.px(c, x, y, ((x >> 2) + (y >> 2)) % 2 ? "l" : "u");
  px.spr(c, 40, 34, px.HERO);
  if (!s.quizWon[id]) px.spr(c, 270, 39, px.MONSTER);
  if (flagged) { px.rect(c, 300, 12, 1, 34, "l"); px.spr(c, 300, 12, px.FLAG); }

  const panel = $("#panel");
  if (active === "lezione") lessonPanel(panel, id);
  else if (active === "mattoni") cardsPanel(panel, id);
  else if (active === "quiz") quizPanel(panel, id);
  else bagPanel(panel);
}

function lessonPanel(panel: HTMLElement, id: string) {
  const lesson = DATA.lessons[id];
  panel.innerHTML = `<article class="lesson">${lesson.html}</article>
    <p><a class="btn" href="#citta/${encodeURIComponent(id)}/mattoni">Ai mattoni</a> ${segnala(`lezione ${id}`)}</p>`;
  if (!game.state.lessons[id]) void send({ t: "lesson", town: id }).catch(() => {});
}

function cardsPanel(panel: HTMLElement, id: string) {
  const day = today();
  const s = game.state;
  const t = TOWNS.get(id)!;
  // due or never recalled first; done for today when nothing is due
  const queue = t.cards.filter((c) => isDue(s, c, day) && s.cards[c]?.last !== day);
  if (!queue.length) {
    panel.innerHTML = `<div class="card done"><p>Nessun mattone da ripassare oggi.</p>
      ${t.cards.every((c) => recalled(s, c)) ? `<p>Hai tutti i mattoni di questa città.</p>` : ""}
      <p><a class="btn" href="#citta/${encodeURIComponent(id)}/quiz">Al quiz</a></p></div>`;
    return;
  }
  const card = CARDS.get(queue[0])!;
  const pays = isDue(s, card.id, day) && s.cards[card.id]?.last !== day;
  panel.innerHTML = `
    <div class="card" aria-live="polite">
      <header><b>MATTONE · ${kindName(card.kind).toUpperCase()}</b> <span>${t.cards.indexOf(card.id) + 1}/${t.cards.length}</span>
        ${pays ? `<span class="pay">${gemIcon("rubino", 2)} se lo ricordi</span>` : ""}</header>
      <div class="front">${card.front}</div>
      <div class="back" hidden>${card.back}</div>
      <p class="actions"><button class="btn" data-act="flip">Gira la carta</button></p>
      <p class="actions grade" hidden>
        <button class="btn no" data-grade="no">NO</button>
        <button class="btn quasi" data-grade="quasi">QUASI</button>
        <button class="btn si" data-grade="si">SÌ</button>
      </p>
      <p class="small">Pensa alla risposta, poi gira la carta e sii onesto: solo un SÌ vero aiuta a ricordare. ${segnala(`carta ${card.id}`)}</p>
    </div>`;
  panel.querySelector('[data-act="flip"]')!.addEventListener("click", (e) => {
    $(".back", panel).hidden = false;
    $(".grade", panel).hidden = false;
    (e.currentTarget as HTMLElement).parentElement!.hidden = true;
    ($('[data-grade="si"]', panel) as HTMLButtonElement).focus();
  });
  panel.querySelectorAll<HTMLButtonElement>("[data-grade]").forEach((b) => b.addEventListener("click", async () => {
    panel.querySelectorAll<HTMLButtonElement>("[data-grade]").forEach((x) => (x.disabled = true));
    try { await send({ t: "card", card: card.id, grade: b.dataset.grade as Grade }); } catch { /* shown */ }
    renderTown(id, "mattoni");
  }));
}

/** Four options, shuffled; resolves with the answer. */
function ask(host: HTMLElement, itemId: string, header = ""): Promise<Answer> {
  const it = ITEMS.get(itemId)!;
  const opts = shuffle(it.o.map((o, i) => ({ o, right: i === 0 })));
  host.innerHTML = `${header}<p class="q">${esc(it.q)}</p>
    <div class="opts">${opts.map((x, i) => `<button class="btn opt" data-i="${i}">${esc(x.o)}</button>`).join("")}</div>
    <p class="fb" aria-live="assertive"></p>`;
  return new Promise((resolve) => {
    host.querySelectorAll<HTMLButtonElement>(".opt").forEach((b) => b.addEventListener("click", () => {
      const pick = opts[Number(b.dataset.i)];
      host.querySelectorAll<HTMLButtonElement>(".opt").forEach((x, i) => {
        x.disabled = true;
        if (opts[i].right) x.classList.add("right");
      });
      if (!pick.right) b.classList.add("wrong");
      setTimeout(() => resolve({ item: itemId, correct: pick.right }), pick.right ? 500 : 1200);
    }));
  });
}

async function quizPanel(panel: HTMLElement, id: string) {
  const t = TOWNS.get(id)!;
  const s = game.state;
  const items = shuffle(t.items).slice(0, 3);
  const monster = monsterOf(id);
  const traps = t.cards.map((c) => CARDS.get(c)!).filter((c) => c.kind === "trappola");
  panel.innerHTML = `<div class="battle"><p class="vs"><b>${esc(monster)}</b> ti sfida!
    ${s.quizWon[id] ? `<span class="small">(già vinto: le risposte di oggi pagano solo la prima volta)</span>` : ""}</p>
    <p class="hp" aria-label="Vita del mostro">${"♥".repeat(3)}</p><div id="q"></div></div>`;
  const answers: Answer[] = [];
  let hp = 3;
  for (let i = 0; i < items.length; i++) {
    const a = await ask($("#q", panel), items[i], `<p class="small">Domanda ${i + 1} di 3</p>`);
    answers.push(a);
    if (a.correct) hp--;
    $(".hp", panel).textContent = "♥".repeat(hp) + "♡".repeat(3 - hp);
    if (!a.correct && traps.length) {
      $("#q", panel).insertAdjacentHTML("beforeend", `<div class="monsterline"><b>${esc(monster)}:</b> ${traps[i % traps.length].back}</div>`);
      await new Promise((r) => setTimeout(r, 2200));
    }
  }
  let res: GameState;
  try { res = await send({ t: "battle", town: id, answers }); } catch { return; }
  const won = answers.filter((x) => x.correct).length >= 2;
  panel.innerHTML = `<div class="battle result ${won ? "won" : "lost"}">
    <h2>${won ? "Vittoria!" : "Ritirata…"}</h2>
    <p>${answers.filter((x) => x.correct).length} risposte giuste su 3. ${won ? `${esc(monster)} scappa.` : "Ne servono 2 su 3."}</p>
    <p>${rewardLine(res) || "Nessuna gemma: queste domande le avevi già fatte oggi."}</p>
    <p>${isFlagged(res, id) ? `<b class="ok">Bandiera!</b> <a class="btn" href="#regione/${t.region}">Alla mappa</a>`
        : won ? `<a class="btn" href="#citta/${encodeURIComponent(id)}/mattoni">Mancano dei mattoni</a>`
        : `<button class="btn" data-act="again">Riprova</button> <a class="link" href="#citta/${encodeURIComponent(id)}/lezione">Rileggi la lezione</a>`}</p></div>`;
  panel.querySelector('[data-act="again"]')?.addEventListener("click", () => quizPanel(panel, id));
  renderTownTabs(id);
}
/** Refresh the tick marks without leaving the panel. */
function renderTownTabs(id: string) {
  const s = game.state;
  const t = TOWNS.get(id)!;
  const tabs = document.querySelectorAll<HTMLAnchorElement>(".tabs a");
  const done = [!!s.lessons[id], t.cards.every((c) => recalled(s, c)), !!s.quizWon[id], false];
  tabs.forEach((a, i) => { a.classList.toggle("done", done[i]); if (done[i] && !a.textContent!.endsWith("✓")) a.textContent += " ✓"; });
}

function bagPanel(panel: HTMLElement) {
  const s = game.state;
  const rows = Object.entries(s.gems).flatMap(([r, bag]) => GEMS.filter((g) => bag[g] > 0).map((g) =>
    `<tr><td>${gemIcon(g)} ${GEM_NAME[g][1]}</td><td>${r}</td><td>${bag[g]}</td><td>${GOLD[g]} × ${regionOf(r)!.mult}</td></tr>`));
  const value = goldValue(s.gems);
  panel.innerHTML = `<div class="bagbox">
    <h2>Cambiavalute</h2>
    <p>Ogni gemma vale oro secondo la fatica che è costata: un mattone ricordato vale più di una risposta scelta tra quattro.
      Nelle regioni più a sud ogni gemma vale di più.</p>
    ${rows.length ? `<table><thead><tr><th>Gemma</th><th>Regione</th><th>Quante</th><th>Oro l'una</th></tr></thead><tbody>${rows.join("")}</tbody></table>
      <p><button class="btn" data-act="exchange">Cambia tutto: ${value} oro</button></p>` : `<p>Lo zaino è vuoto.</p>`}
    <p class="small">Hai <b class="gold">${s.gold} oro</b>. L'oro compra vestiti e souvenir (presto), mai una bandiera o un livello.</p></div>`;
  panel.querySelector('[data-act="exchange"]')?.addEventListener("click", async () => {
    try { await send({ t: "exchange" }); } catch { return; }
    bagPanel(panel);
  });
}

function renderBag() {
  const s = game.state;
  const v = $("#view");
  v.className = "zaino";
  v.innerHTML = `<nav class="crumbs"><a href="#italia">Italia</a> › Zaino</nav><h1>Zaino</h1><section id="panel"></section>
    <h2>Proverbi raccolti</h2>${s.proverbs.length ? `<ul class="plain">${s.proverbs.map((id) => {
      const p = PROVERBI.find((x) => x.id === id)!;
      return `<li><b>${esc(p.testo.replace("___", p.o[0]))}</b> <span class="small">${esc(p.en)}</span></li>`; }).join("")}</ul>` : `<p class="small">Nessuno ancora: il folletto viene coi giorni di nebbia.</p>`}
    <h2>Segreti della Sibilla</h2>${s.tips.length ? `<ul class="plain">${s.tips.map((id) => {
      const c = CONSIGLI.find((x) => x.id === id)!;
      return `<li><b>${esc(c.it)}</b> ${esc(c.en)}<br><span class="small">${esc(c.esempio)} ${esc(c.nota)}</span></li>`; }).join("")}</ul>` : `<p class="small">Nessuno ancora: la Sibilla viene con la luna nuova.</p>`}`;
  bagPanel($("#panel"));
}

// ── the station exam ─────────────────────────────────────────────────────────

function examItems(r: RegionId): string[] {
  // 12 questions, heavier rules more often, one question per town at most
  const pool = townsIn(r).map((t) => ({ t, key: Math.random() ** (1 / t.weight) })).sort((a, b) => b.key - a.key);
  return pool.slice(0, EXAM_SIZE).map(({ t }) => shuffle(t.items)[0]);
}

async function renderExam(r: RegionId) {
  const s = game.state;
  const v = $("#view");
  v.className = "stazione";
  const R = regionOf(r)!;
  const cov = coverage(s, r);
  const head = `<nav class="crumbs"><a href="#italia">Italia</a> › <a href="#regione/${r}">${esc(R.name)}</a> › Stazione</nav>
    <h1>Stazione di ${esc(R.city)}</h1>`;
  if (s.passed.includes(r)) { v.innerHTML = `${head}<p>Esame superato: il treno ti aspetta. <a class="btn" href="#italia">Alla mappa</a></p>`; return; }
  if (cov < COVERAGE_FOR_EXAM) {
    v.innerHTML = `${head}<p>Per il biglietto servono le bandiere sul ${COVERAGE_FOR_EXAM * 100}% delle regole di ${esc(R.name)}, pesate come nel test.
      Ora sei al <b>${Math.round(cov * 100)}%</b>.</p><p><a class="btn" href="#regione/${r}">Torna alle città</a></p>`;
    return;
  }
  if (s.examFailedOn[r] === today()) { v.innerHTML = `${head}<p>L'esame si può ripetere domani. Intanto ripassa le città con le erbacce.</p>`; return; }
  v.innerHTML = `${head}<p>${EXAM_SIZE} domande da tutte le città di ${esc(R.name)}. Ne servono ${EXAM_PASS}.</p>
    <p><button class="btn" data-act="go">Inizia l'esame</button></p><div id="q"></div>`;
  await new Promise<void>((res) => v.querySelector('[data-act="go"]')!.addEventListener("click", () => res(), { once: true }));
  v.querySelector('[data-act="go"]')!.parentElement!.remove();
  const answers: Answer[] = [];
  for (const [i, item] of examItems(r).entries()) answers.push(await ask($("#q"), item, `<p class="small">Domanda ${i + 1} di ${EXAM_SIZE}</p>`));
  let res: GameState;
  try { res = await send({ t: "exam", region: r, answers }); } catch { return; }
  const right = answers.filter((a) => a.correct).length;
  const passed = res.passed.includes(r);
  v.innerHTML = `${head}<div class="battle result ${passed ? "won" : "lost"}"><h2>${passed ? "Promosso!" : "Non ancora"}</h2>
    <p>${right} su ${EXAM_SIZE}.</p>
    ${passed ? `<p>Sei <b>${titleOf(res)}</b>. ${r === "A1" ? "Il treno per Bologna parte: l'Emilia-Romagna è aperta." : "La Toscana arriverà presto."}</p><p><a class="btn" href="#italia">Alla mappa</a></p>`
      : `<p>Riprova domani. Le domande sbagliate:</p><ul class="plain">${answers.filter((a) => !a.correct).map((a) => {
          const t = TOWNS.get(ITEMS.get(a.item)!.town)!;
          return `<li><a href="#citta/${encodeURIComponent(t.id)}/lezione">${esc(t.label)}</a></li>`; }).join("")}</ul>`}</div>`;
}

// ── visitors ─────────────────────────────────────────────────────────────────

function dialog(html: string) {
  const d = $<HTMLDialogElement>("#dlg");
  d.innerHTML = `<div class="dlgbox">${html}</div>`;
  if (!d.open) d.showModal();
  return d;
}
const closeDialog = () => { const d = $<HTMLDialogElement>("#dlg"); if (d.open) d.close(); route(); };
const pickOf = <T extends { id: string }>(list: T[], have: string[]) => {
  const fresh = list.filter((x) => !have.includes(x.id));
  const from = fresh.length ? fresh : list;
  return from[parseInt(today().replace(/-/g, ""), 10) % from.length];
};

async function meet(v: Visitor) {
  const s = game.state;
  if (v === "folletto") {
    const p = pickOf(PROVERBI, s.proverbs);
    const opts = shuffle(p.o);
    const d = dialog(`<h2 class="g">IL FOLLETTO DELLA NEBBIA</h2>
      <p class="big">«${esc(p.testo)}»</p><p>Qual è la parola che manca?</p>
      <div class="opts">${opts.map((o) => `<button class="btn opt" data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div><div id="after"></div>`);
    d.querySelectorAll<HTMLButtonElement>(".opt").forEach((b) => b.addEventListener("click", async () => {
      const correct = b.dataset.o === p.o[0];
      d.querySelectorAll<HTMLButtonElement>(".opt").forEach((x) => { x.disabled = true; if (x.dataset.o === p.o[0]) x.classList.add("right"); });
      if (!correct) b.classList.add("wrong");
      try { await send({ t: "proverb", id: p.id, correct }); } catch { /* shown */ }
      $("#after", d).innerHTML = `<p class="big">«${esc(p.testo.replace("___", p.o[0]))}»</p>
        <p>${esc(p.significa)} <span class="small">${esc(p.en)}</span></p><p class="small">${esc(p.quando)}</p>
        <p><button class="btn" data-act="close">Grazie, folletto</button> ${segnala(`proverbio ${p.id}`)}</p>`;
    }));
  } else if (v === "fata") {
    const open = [...TOWNS.values()].filter((t) => isOpen(s, t.id) && !isFlagged(s, t.id));
    const weakest = (open.length ? open : [...TOWNS.values()].filter((t) => isOpen(s, t.id)))
      .sort((a, b) => a.cards.filter((c) => recalled(s, c)).length / a.cards.length - b.cards.filter((c) => recalled(s, c)).length / b.cards.length)[0];
    const card = weakest.cards.map((c) => CARDS.get(c)!).find((c) => c.kind === "trappola") ?? CARDS.get(weakest.cards[0])!;
    const d = dialog(`<h2 class="p">LA FATA</h2><p>Ho visto che <b>${esc(weakest.label)}</b> ti dà ancora fastidio. Ricorda:</p>
      <div class="card">${card.back}</div>
      <p><button class="btn" data-act="hint">Grazie, fata</button> <a class="link" href="#citta/${encodeURIComponent(weakest.id)}">Vai a ${esc(weakest.label)}</a></p>
      <p class="small">Le storie della fata arriveranno con la Toscana.</p>`);
    d.querySelector('[data-act="hint"]')!.addEventListener("click", async () => {
      try { await send({ t: "hint", town: weakest.id }); } catch { /* shown */ }
      closeDialog();
    });
  } else if (v === "lupo") {
    wolf();
  } else if (v === "sibilla") {
    const tip = pickOf(CONSIGLI, s.tips);
    const target = [...TOWNS.values()].find((t) => isOpen(s, t.id) && !s.quizWon[t.id]);
    const d = dialog(`<h2 class="u">LA SIBILLA</h2><p>Luna nuova, nuovo inizio. Scegli un dono, uno solo:</p>
      <p><button class="btn" data-act="tip">Un segreto per parlare come un italiano</button></p>
      ${target ? `<p><button class="btn" data-act="short">Una scorciatoia: salta il quiz di ${esc(target.label)} (3 risposte giuste su 3)</button></p>` : ""}
      <div id="after"></div>`);
    d.querySelector('[data-act="tip"]')!.addEventListener("click", async () => {
      try { await send({ t: "tip", id: tip.id }); } catch { return; }
      $(".dlgbox", d).innerHTML = `<h2 class="u">IL SEGRETO</h2><p class="big">${esc(tip.it)}</p><p>${esc(tip.en)}</p>
        <p><i>${esc(tip.esempio)}</i></p><p class="small">${esc(tip.nota)}</p>
        <p><button class="btn" data-act="close">Grazie, Sibilla</button> ${segnala(`consiglio ${tip.id}`)}</p>`;
    });
    d.querySelector('[data-act="short"]')?.addEventListener("click", async () => {
      const box = $(".dlgbox", d);
      const answers: Answer[] = [];
      for (const [i, item] of shuffle(target!.items).slice(0, 3).entries()) {
        answers.push(await ask(box, item, `<h2 class="u">SCORCIATOIA · ${i + 1}/3</h2>`));
      }
      try { await send({ t: "shortcut", town: target!.id, answers }); } catch { return; }
      const ok = answers.every((a) => a.correct);
      box.innerHTML = `<h2 class="u">${ok ? "LA STRADA È APERTA" : "LA NEBBIA RESTA"}</h2>
        <p>${ok ? `Il quiz di ${esc(target!.label)} è vinto.` : "Servivano 3 risposte giuste su 3. Tornerò con la prossima luna nuova."}</p>
        <p><button class="btn" data-act="close">Chiudi</button></p>`;
    });
  }
}

async function wolf() {
  const s = game.state;
  const pool = shuffle([...TOWNS.values()].filter((t) => isUnlocked(s, t.region) && (isFlagged(s, t.id) || s.lessons[t.id])).flatMap((t) => t.items));
  const items = pool.length >= 10 ? pool : shuffle([...TOWNS.values()].filter((t) => isOpen(s, t.id)).flatMap((t) => t.items));
  const d = dialog(`<h2 class="l">IL LUPO</h2><p class="big">«In bocca al lupo!»</p><p>Cosa rispondi?</p>
    <div class="opts">${shuffle(["Crepi!", "Grazie!", "Anche a te!"]).map((o) => `<button class="btn opt" data-o="${o}">${o}</button>`).join("")}</div><p class="fb"></p>`);
  await new Promise<void>((res) => d.querySelectorAll<HTMLButtonElement>(".opt").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.o === "Crepi!") res();
    else $(".fb", d).textContent = "Il lupo ringhia: a «in bocca al lupo» si risponde «crepi!», mai «grazie».";
  })));
  const box = $(".dlgbox", d);
  box.innerHTML = `<h2 class="l">60 SECONDI</h2><p class="timer"><b id="secs">60</b> s · combo <b id="combo">0</b></p><div id="wq"></div>`;
  const answers: Answer[] = [];
  const end = Date.now() + 60_000;
  let combo = 0;
  const tick = setInterval(() => { const el = document.getElementById("secs"); if (el) el.textContent = String(Math.max(0, Math.ceil((end - Date.now()) / 1000))); }, 250);
  for (const item of items) {
    if (Date.now() >= end || answers.length >= 40) break;
    const a = await Promise.race([ask($("#wq", box), item), new Promise<null>((r) => setTimeout(() => r(null), end - Date.now()))]);
    if (!a) break;
    answers.push(a);
    combo = a.correct ? combo + 1 : 0;
    $("#combo", box).textContent = String(combo);
  }
  clearInterval(tick);
  let res: GameState;
  try { res = await send({ t: "wolf", answers }); } catch { return; }
  box.innerHTML = `<h2 class="l">IL LUPO SE NE VA</h2><p>${answers.filter((a) => a.correct).length} giuste su ${answers.length}.</p>
    <p>${rewardLine(res)}</p><p><button class="btn" data-act="close">Crepi!</button></p>`;
}

// ── the place ────────────────────────────────────────────────────────────────

function placePicker(first = false) {
  const d = dialog(`<h2>DOVE SEI?</h2>
    <p>Il cielo del gioco è quello vero: pioggia, nebbia e luna cambiano chi incontri.
      ${first ? "Prima di partire, dimmi dove sei." : ""}</p>
    <p><button class="btn" data-act="here">Usa la mia posizione</button></p>
    <p class="small">Il browser ti chiederà il permesso. Salviamo solo una zona di circa 10 km, mai la posizione esatta.</p>
    <form id="search"><label for="q">Oppure cerca una città italiana</label>
      <span class="row"><input id="q" name="q" autocomplete="off" minlength="2" maxlength="80" required><button class="btn">Cerca</button></span></form>
    <div id="results"></div>
    <p class="quick">${REGIONS.map((R) => `<button class="link" data-city="${R.city}" data-lat="${R.lat}" data-lon="${R.lon}">${R.city}</button>`).join(" · ")}</p>
    <p><button class="link" data-act="close">${first ? "Non ora" : "Annulla"}</button></p>`);
  const choose = async (p: Place) => {
    try { await game.setPlace(p); } catch (e) { toast(esc((e as Error).message)); return; }
    await refreshToday();
    closeDialog();
  };
  d.querySelector('[data-act="here"]')!.addEventListener("click", () => {
    if (!navigator.geolocation) return toast("Questo browser non dà la posizione.");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = Math.round(pos.coords.latitude * 10) / 10, lon = Math.round(pos.coords.longitude * 10) / 10; // rounded here, before it leaves the browser
      let name = "";
      try { name = (await api<{ name: string | null }>(`/api/luoghi/nome?lat=${lat}&lon=${lon}`)).name ?? ""; } catch { /* no name is fine */ }
      choose({ kind: "qui", name, lat, lon });
    }, () => toast("Posizione non disponibile: scegli una città."), { maximumAge: 3_600_000, timeout: 10_000 });
  });
  $("#search", d).addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = ($("#q", d) as HTMLInputElement).value.trim();
    const out = $("#results", d);
    out.innerHTML = `<p class="small">Cerco…</p>`;
    try {
      const r = await api<{ places: { name: string; region: string; lat: number; lon: number }[] }>(`/api/luoghi?q=${encodeURIComponent(q)}`);
      out.innerHTML = r.places.length ? `<ul class="plain">${r.places.map((p, i) =>
        `<li><button class="link" data-i="${i}">${esc(p.name)}</button> <span class="small">${esc(p.region)}</span></li>`).join("")}</ul>`
        : `<p class="small">Nessuna città trovata.</p>`;
      out.querySelectorAll<HTMLButtonElement>("[data-i]").forEach((b) => b.addEventListener("click", () => {
        const p = r.places[Number(b.dataset.i)];
        choose({ kind: "citta", name: p.name, lat: p.lat, lon: p.lon });
      }));
    } catch (err) {
      out.innerHTML = `<p class="small">${esc(err instanceof ApiError ? err.message : "Ricerca non disponibile, riprova più tardi.")}</p>`;
    }
  });
  d.querySelectorAll<HTMLButtonElement>("[data-city]").forEach((b) => b.addEventListener("click", () =>
    choose({ kind: "citta", name: b.dataset.city!, lat: Number(b.dataset.lat), lon: Number(b.dataset.lon) })));
}

async function refreshToday() {
  const R = regionOf(currentRegion(game.state))!;
  try { todayInfo = await game.today({ lat: R.lat, lon: R.lon }); } catch { todayInfo = null; }
  renderHud();
}

// ── reports, version, wiring ─────────────────────────────────────────────────

const segnala = (where: string) => `<button class="link small" data-act="segnala" data-where="${esc(where)}">Segnala un errore</button>`;

function report(where: string) {
  const d = dialog(`<h2>SEGNALA UN ERRORE</h2><p class="small">${esc(where)}</p>
    <form id="rep"><label for="rt">Cosa non va?</label><textarea id="rt" maxlength="1000" rows="4" required></textarea>
    <p><button class="btn">Invia</button> <button type="button" class="link" data-act="close">Annulla</button></p></form>`);
  $("#rep", d).addEventListener("submit", async (e) => {
    e.preventDefault();
    try { await api("/api/segnala", { where, text: ($("#rt", d) as HTMLTextAreaElement).value }); toast("Grazie! L'errore è nella lista."); }
    catch (err) { toast(esc((err as Error).message)); }
    closeDialog();
  });
}

async function checkVersion() {
  try {
    const r = await api<{ build: string }>("/api/version");
    if (r.build !== BUILD_ID) $("#banner").hidden = false; // never reloads on its own, so no quiz is cut short
  } catch { /* offline: check again later */ }
}

document.addEventListener("click", (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  if (act === "place") placePicker();
  else if (act === "close") closeDialog();
  else if (act === "meet" && todayInfo?.visitor) meet(todayInfo.visitor);
  else if (act === "segnala") report(el.dataset.where ?? location.hash);
  else if (act === "reload") location.reload();
  else if (act === "import" && game instanceof AccountGame) {
    game.importDiagnostic().then(() => { toast("Test importato: le tue regole hanno la bandiera."); renderHud(); route(); })
      .catch((err) => toast(esc(err.message)));
  }
});

async function boot() {
  ICONS = Object.fromEntries([...Object.entries(px.GEM_SPRITE).map(([k, v]) => [k, px.icon(v)]), ["coin", px.icon(px.COIN)]]);
  try {
    await api("/api/me");
    game = new AccountGame();
  } catch {
    game = new GuestGame();
  }
  try { await game.load(); } catch { game = new GuestGame(); await game.load(); }
  renderHud();
  route();
  await refreshToday();
  route();
  if (!game.place) placePicker(true);
  setInterval(checkVersion, 10 * 60_000);
  window.addEventListener("focus", checkVersion);
}

void boot();
