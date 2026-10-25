import * as E from "../engine";
import {
  DATA,
  GRAPH,
  emptyProgress,
  nodeStatuses,
  replay,
  type NodeStatus,
  type Progress,
  type TestRecord,
} from "../shared/progress";
import {
  AccountStore,
  ApiError,
  GuestStore,
  api,
  withAnswer,
  withPractice,
  type Store,
  type User,
} from "./store";
import { SkillMap, STATUS_WORD, STATUS_SHORT } from "./map";

// ── state ───────────────────────────────────────────────────────────────────

type Mode = "account" | "guest" | "preview"; // preview: no server behind the page

const guest = new GuestStore();
const app = {
  mode: "guest" as Mode,
  user: null as User | null,
  store: guest as Store,
  progress: emptyProgress(),
  statuses: {} as Record<string, NodeStatus>,
  view: "map" as "map" | "list",
  level: null as E.Cefr | null,
  /** set from /api/config; closed until the server says otherwise */
  registrationOpen: false,
};

let map: SkillMap | null = null;
let homeMounted = false;
const usedItems = new Map<string, number[]>();
let questionShownAt = 0;

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector(sel) as T;
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pct = (x: number) => `${Math.round(x * 100)}%`;
const day = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long" }).format(new Date(iso));
const skill = (id: string) => GRAPH.byId[id];

function setProgress(p: Progress) {
  app.progress = p;
  app.statuses = nodeStatuses(p);
  map?.setStatuses(app.statuses);
}

// ── saving in order, retrying while offline ─────────────────────────────────

let chain: Promise<void> = Promise.resolve();
let offline = false;

function sync(job: () => Promise<void>) {
  chain = chain.then(() => retrying(job)).catch(async (e) => {
    if (e instanceof ApiError && e.status === 401) {
      toast("La sessione è scaduta. Accedi di nuovo per continuare a salvare.");
      return signedOut(false);
    }
    // 409: another device moved the test on. The server is right; reload it.
    toast(
      e instanceof ApiError && e.status === 409
        ? "Il test è cambiato su un altro dispositivo: ho ricaricato i progressi."
        : "Non sono riuscita a salvare l'ultima azione. Ricarico i progressi dal server.",
    );
    setProgress(await app.store.load());
    route();
  });
}

async function retrying(job: () => Promise<void>) {
  for (let wait = 1000; ; wait = Math.min(wait * 2, 15000)) {
    try {
      await job();
      if (offline) toast("Di nuovo online: progressi salvati.");
      offline = false;
      return;
    } catch (e) {
      const network = !(e instanceof ApiError) || e.status === 0 || e.status >= 500;
      if (!network) throw e;
      if (!offline) toast("Connessione assente: salverò tutto appena torni online.");
      offline = true;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

let toastTimer = 0;
function toast(msg: string) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove("on"), 4200);
}

// ── routing: #mappa, #test, #risultati, #nodo-<id> ──────────────────────────

const go = (hash: string) => {
  if (location.hash === `#${hash}`) route();
  else location.hash = hash;
};

function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  renderAccount();
  if (h === "test") return renderTest();
  if (h === "risultati") return renderResults();
  renderHome();
  if (h.startsWith("nodo-") && skill(h.slice(5))) openSheet(h.slice(5));
  else closeSheet(false);
}

// ── header ──────────────────────────────────────────────────────────────────

function renderAccount() {
  const nav = $("#account");
  if (app.mode === "preview") nav.innerHTML = "";
  else if (app.user) {
    nav.innerHTML = `<span class="who">${esc(app.user.name)}</span>
      <button class="link" data-act="logout">Esci</button>`;
  } else {
    nav.innerHTML = app.registrationOpen
      ? `<button class="link" data-act="login">Accedi</button>
      <button class="btn small" data-act="register">Crea un account</button>`
      : `<button class="btn small" data-act="login">Accedi</button>`;
  }
}

// ── home: the map ───────────────────────────────────────────────────────────

function renderHome() {
  if (!homeMounted) {
    map?.destroy();
    $("#view").innerHTML = `
      <section class="intro">
        <h1>La mappa dell’italiano</h1>
        <p class="lede">Settantotto regole dall’A1 al B2, ognuna legata a quelle che servono per
        impararla. Tocca una regola per studiarla.</p>
        <div id="testbox" class="testbox"></div>
        <p id="guestnote" class="guestnote" hidden></p>
      </section>
      <section class="mapsec" aria-label="Le regole">
        <div class="mapbar">
          <div class="seg" role="group" aria-label="Vista">
            <button data-view="map">Mappa</button><button data-view="list">Elenco</button>
          </div>
          <div class="seg levels" role="group" aria-label="Livello">
            <button data-lvl="">Tutti</button>${E.REGIONS.map((r) => `<button data-lvl="${r}">${r}</button>`).join("")}
          </div>
        </div>
        <div class="mapwrap">
          <div id="mapframe" class="mapframe"></div>
          <div class="zoom" id="zoombar" role="group" aria-label="Zoom">
            <button data-act="zoomin" aria-label="Avvicina">+</button>
            <button data-act="zoomout" aria-label="Allontana">−</button>
          </div>
        </div>
        <div id="listframe" class="listframe" hidden></div>
        <ul class="legend" id="legend"></ul>
      </section>`;
    map = new SkillMap($("#mapframe"), (id) => go(`nodo-${id}`));
    homeMounted = true;
    map.setStatuses(app.statuses);
    requestAnimationFrame(() => map?.setLevel(app.level, false));
  }
  map?.setStatuses(app.statuses);
  renderTestBox();
  renderGuestNote();
  renderLegend();
  renderControls();
  if (app.view === "list") renderList();
}

function renderTestBox() {
  const p = app.progress;
  const box = $("#testbox");
  const parts: string[] = [];
  if (p.current) {
    const n = p.current.events.length;
    parts.push(`<p>Hai un test in corso: ${n} ${n === 1 ? "risposta data" : "risposte date"}.
      Riprendi dal punto in cui eri.</p>
      <div class="actions"><button class="btn" data-act="resume">Riprendi il test</button>
      <button class="link" data-act="newtest">Ricomincia da capo</button></div>`);
  } else if (p.last) {
    const [now, before] = p.history;
    const delta = before ? Math.round((now.score - before.score) * 100) : null;
    parts.push(`<div class="lastscore">
        <span class="big">${pct(now.score)}</span>
        <span><strong>Ultimo test, ${day(now.createdAt)}</strong>
        ${delta !== null ? `<br>${delta >= 0 ? "+" : "−"}${Math.abs(delta)} punti rispetto al ${day(before.createdAt)}` : ""}</span>
      </div>
      <div class="actions"><button class="btn" data-act="results">Vedi i risultati</button>
      <button class="link" data-act="newtest">Rifai il test</button></div>`);
  } else {
    parts.push(`<p><strong>Non sai da dove cominciare?</strong> Il test colora la mappa al posto tuo
      in una decina di minuti, e puoi interromperlo quando vuoi.</p>
      <div class="actions"><button class="btn" data-act="newtest">Fai il test diagnostico</button></div>`);
  }
  box.innerHTML = parts.join("");
}

function renderGuestNote() {
  const note = $("#guestnote");
  const p = app.progress;
  const hasData = !!(p.current || p.last || p.practice.length);
  if (app.mode === "preview") {
    note.hidden = false;
    note.textContent =
      "Anteprima: i progressi restano su questo browser. Sul sito pubblicato puoi creare un account per salvarli.";
  } else if (app.mode === "guest" && hasData) {
    note.hidden = false;
    note.innerHTML = app.registrationOpen
      ? `Stai usando Parliamo senza account: i progressi restano su questo browser.
      <button class="link" data-act="register">Crea un account</button> per ritrovarli su ogni dispositivo.`
      : `Stai usando Parliamo senza account: i progressi restano su questo browser.`;
  } else note.hidden = true;
}

function renderLegend() {
  const count: Record<NodeStatus, number> = { right: 0, credited: 0, wrong: 0, unasked: 0 };
  for (const s of Object.values(app.statuses)) count[s]++;
  $("#legend").innerHTML = (["right", "credited", "wrong", "unasked"] as NodeStatus[])
    .map((s) => `<li class="s-${s}"><span class="sw"></span>${STATUS_WORD[s]}<b>${count[s]}</b></li>`)
    .join("");
}

function renderControls() {
  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.view === app.view)),
  );
  document.querySelectorAll<HTMLButtonElement>("[data-lvl]").forEach((b) =>
    b.setAttribute("aria-pressed", String((b.dataset.lvl || null) === app.level)),
  );
  $("#mapframe").hidden = app.view !== "map";
  $("#zoombar").hidden = app.view !== "map";
  $("#listframe").hidden = app.view !== "list";
}

function renderList() {
  const levels = app.level ? [app.level] : E.REGIONS;
  $("#listframe").innerHTML = levels
    .map((lv) => {
      const rows = DATA.skills.filter((s) => s.cefr === lv);
      return `<section><h3>${lv}<span>${rows.length} regole</span></h3><ul class="rules">${rows
        .map((s) => {
          const st = app.statuses[s.id];
          return `<li><button class="rule s-${st}" data-open="${s.id}">
            <span class="sw"></span><span class="name">${esc(s.label)}</span>
            <span class="state">${STATUS_SHORT[st]}</span></button></li>`;
        })
        .join("")}</ul></section>`;
    })
    .join("");
}

// ── test ────────────────────────────────────────────────────────────────────

async function startTest() {
  try {
    const t = await app.store.createTest(app.progress);
    usedItems.clear();
    setProgress({ ...app.progress, current: t });
    go("test");
  } catch (e) {
    toast(e instanceof ApiError ? e.message : "Non riesco a iniziare il test. Riprova.");
  }
}

function pickItem(id: string) {
  const pool = DATA.items[id];
  const seen = usedItems.get(id) ?? [];
  const fresh = pool.map((_, i) => i).filter((i) => !seen.includes(i));
  const choices = fresh.length ? fresh : pool.map((_, i) => i);
  const i = choices[Math.floor(Math.random() * choices.length)];
  usedItems.set(id, [...seen, i]);
  return pool[i];
}

function shuffled(n: number) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderTest() {
  homeMounted = false;
  closeSheet(false);
  const t = app.progress.current;
  if (!t) return go(app.progress.last ? "risultati" : "mappa");
  const s = replay(t.seed, t.events);
  if (s.done || !s.current) return go("risultati");

  const region = E.REGIONS[s.region];
  const item = pickItem(s.current);
  const order = shuffled(item.o.length);
  const track = E.REGIONS.map((r, i) => {
    const fill =
      i < s.region ? 1 : i > s.region ? 0 : Math.min(1, E.regionCoverage(GRAPH, s, r) / E.DEFAULTS.coverage);
    return `<span class="${i === s.region ? "here" : ""}"><i style="width:${fill * 100}%"></i><em>${r}</em></span>`;
  }).join("");
  const [before, after] = esc(item.q).split("___");

  $("#view").innerHTML = `
    <section class="quiz" aria-labelledby="qtext">
      <div class="quizbar">
        <button class="link" data-act="pause">Interrompi</button>
        <span>Domanda ${t.events.length + 1}</span>
      </div>
      <div class="track" aria-label="Livello ${region}">${track}</div>
      <p class="qtext" id="qtext">${before}${after !== undefined ? `<span class="blank" aria-label="spazio vuoto"></span>${after}` : ""}</p>
      <div class="opts">${order
        .map((i, n) => `<button class="opt" data-ans="${i}"><kbd>${n + 1}</kbd>${esc(item.o[i])}</button>`)
        .join("")}</div>
      <button class="link dunno" data-ans="-1">Non lo so</button>
    </section>`;
  ($("#view .opt") as HTMLButtonElement)?.focus({ preventScroll: true });
  questionShownAt = performance.now();
}

function answerTest(choice: number) {
  const t = app.progress.current;
  if (!t) return;
  const s = replay(t.seed, t.events);
  const ms = Math.round(performance.now() - questionShownAt);
  const r = withAnswer(app.progress, t, { skillId: s.current!, correct: choice === 0, ms });
  const index = t.events.length;
  setProgress(r.progress);
  sync(() => app.store.saveAnswer(app.progress, r.test, index));
  if (r.test.status === "done") go("risultati");
  else renderTest();
}

// ── results ─────────────────────────────────────────────────────────────────

function renderResults() {
  homeMounted = false;
  closeSheet(false);
  const t = app.progress.last;
  if (!t) return go("mappa");
  const s = replay(t.seed, t.events);
  const score = E.percent(GRAPH, s) ?? 0;
  const skipped = E.unreached(s);
  const gaps = E.gaps(GRAPH, s);
  const R = 54, C = 2 * Math.PI * R;

  const levels = E.REGIONS.map((r) => {
    const v = E.percent(GRAPH, s, r);
    const label = skipped.includes(r) ? "non raggiunto" : v === null ? "nessuna domanda" : pct(v);
    return `<li><span>${r}</span><span class="bar"><i style="width:${(v ?? 0) * 100}%"></i></span><span>${label}</span></li>`;
  }).join("");

  const older = app.progress.history.slice(1, 6);

  $("#view").innerHTML = `
    <section class="results">
      <p class="when">Test del ${day(t.createdAt)}</p>
      <div class="score">
        <svg viewBox="0 0 128 128" aria-hidden="true">
          <circle class="track-c" cx="64" cy="64" r="${R}"/>
          <circle class="arc" cx="64" cy="64" r="${R}" style="--c:${C};--off:${C * (1 - score)}"/>
        </svg>
        <span class="num">${pct(score)}</span>
      </div>
      <p class="explain">Punteggio pesato: le regole più importanti contano di più.
      ${s.stoppedAt ? `Il test si è fermato al livello ${s.stoppedAt}, dove le risposte erano quasi tutte a caso${
        skipped.length ? `; ${skipped.join(", ")} ${skipped.length === 1 ? "conta" : "contano"} zero` : ""
      }.` : ""}</p>

      <h2>Per livello</h2>
      <ul class="levelbars">${levels}</ul>

      ${gaps.length ? `<h2>Da rivedere</h2>
        <p class="muted">Dalla più importante. Ogni regola apre la sua lezione.</p>
        <ul class="rules">${gaps.slice(0, 8).map((g) => `<li><button class="rule s-wrong" data-open="${g.id}">
          <span class="sw"></span><span class="name">${esc(g.label)}</span><span class="state">${g.cefr}</span></button></li>`).join("")}</ul>`
        : `<h2>Nessuna regola da rivedere</h2><p class="muted">Ogni risposta data in questo test era giusta.</p>`}

      ${older.length ? `<h2>Test precedenti</h2><ul class="history">${older
        .map((h) => `<li><span>${day(h.createdAt)}</span><span>${pct(h.score)}</span></li>`).join("")}</ul>` : ""}

      ${app.mode === "guest" && app.registrationOpen ? `<div class="callout"><p><strong>Vuoi conservare questo risultato?</strong>
        Con un account lo ritrovi su ogni dispositivo, insieme agli esercizi.</p>
        <button class="btn" data-act="register">Crea un account</button></div>` : ""}

      <div class="actions"><button class="btn" data-act="home">Vai alla mappa</button>
      <button class="link" data-act="newtest">Rifai il test</button></div>
    </section>`;
}

// ── lesson sheet ────────────────────────────────────────────────────────────

let practice: { id: string; n: number; right: number; item?: { q: string; o: string[] }; order: number[]; answered?: number } | null = null;
let lastFocus: HTMLElement | null = null;

function openSheet(id: string) {
  const sheet = $("#sheet");
  if (sheet.hidden) lastFocus = document.activeElement as HTMLElement;
  if (practice?.id !== id) practice = null;
  map?.setSelected(id);
  renderSheet(id);
  sheet.hidden = false;
  $("#scrim").hidden = false;
  document.body.classList.add("sheet-open");
  requestAnimationFrame(() => sheet.classList.add("on"));
  ($("#sheet h2") as HTMLElement)?.focus({ preventScroll: true });
}

function closeSheet(navigate = true) {
  const sheet = $("#sheet");
  if (sheet.hidden) return;
  sheet.classList.remove("on");
  sheet.hidden = true;
  $("#scrim").hidden = true;
  document.body.classList.remove("sheet-open");
  map?.setSelected(null);
  practice = null;
  lastFocus?.focus?.({ preventScroll: true });
  if (navigate) history.replaceState(null, "", location.pathname + location.search + "#mappa");
}

function renderSheet(id: string) {
  const sk = skill(id);
  const st = app.statuses[id];
  const weak = GRAPH.ancestors[id]
    .filter((a) => app.statuses[a] === "wrong")
    .sort((a, b) => skill(b).weight - skill(a).weight)
    .slice(0, 3);
  $("#sheet").innerHTML = `
    <div class="sheet-head">
      <div>
        <p class="sheet-meta"><span class="lvl">${sk.cefr}</span><span class="pill s-${st}"><span class="sw"></span>${STATUS_WORD[st]}</span></p>
        <h2 tabindex="-1">${esc(sk.label)}</h2>
      </div>
      <button class="x" data-act="close" aria-label="Chiudi la lezione">×</button>
    </div>
    ${weak.length ? `<p class="before">Questa regola poggia su ${weak
      .map((w) => `<button class="link" data-open="${w}">${esc(skill(w).label)}</button>`)
      .join(", ")}, ${weak.length === 1 ? "che è da rivedere" : "che sono da rivedere"}. Conviene partire da lì.</p>` : ""}
    <div id="prac" class="prac"></div>
    <article class="lesson">${DATA.lessons[id]?.html ?? "<p>Lezione in preparazione.</p>"}</article>`;
  renderPractice();
}

function renderPractice() {
  const box = $("#prac");
  if (!box) return;
  if (!practice) {
    box.innerHTML = `<button class="btn" data-act="practice">Esercitati: 3 domande</button>`;
    return;
  }
  if (practice.n >= 3 && practice.answered === undefined) {
    box.innerHTML = `<div class="pracdone"><p><strong>${practice.right} su 3.</strong>
      La regola prende il colore della tua ultima risposta.</p>
      <button class="btn" data-act="practice">Altre 3 domande</button></div>`;
    return;
  }
  const it = practice.item!;
  const [before, after] = esc(it.q).split("___");
  const done = practice.answered !== undefined;
  box.innerHTML = `<div class="pracq">
    <p class="muted">Esercizio ${Math.min(practice.n + (done ? 0 : 1), 3)} di 3</p>
    <p class="qtext small">${before}${after !== undefined ? `<span class="blank"></span>${after}` : ""}</p>
    <div class="opts">${practice.order.map((i) => {
      const cls = !done ? "" : i === 0 ? " right" : i === practice!.answered ? " wrong" : "";
      return `<button class="opt${cls}" data-pans="${i}" ${done ? "disabled" : ""}>${esc(it.o[i])}</button>`;
    }).join("")}</div>
    ${done ? `<p class="feedback" role="status">${practice.answered === 0 ? "Giusto." : `La risposta giusta è «${esc(it.o[0])}».`}</p>
      <button class="btn" data-act="pnext">${practice.n >= 3 ? "Vedi com’è andata" : "Avanti"}</button>` : ""}
  </div>`;
}

function nextPracticeItem() {
  if (!practice) return;
  practice.answered = undefined;
  if (practice.n >= 3) return renderPractice();
  practice.item = pickItem(practice.id);
  practice.order = shuffled(practice.item.o.length);
  renderPractice();
}

function answerPractice(choice: number) {
  if (!practice || practice.answered !== undefined) return;
  const correct = choice === 0;
  practice.answered = choice;
  practice.n++;
  if (correct) practice.right++;
  const row = { skillId: practice.id, correct, at: new Date().toISOString() };
  setProgress(withPractice(app.progress, row));
  sync(() => app.store.savePractice(app.progress, row));
  const pill = $("#sheet .pill");
  const st = app.statuses[practice.id];
  if (pill) pill.outerHTML = `<span class="pill s-${st}"><span class="sw"></span>${STATUS_WORD[st]}</span>`;
  renderPractice();
  if (homeMounted) renderLegend();
}

// ── accounts ────────────────────────────────────────────────────────────────

let authMode: "login" | "register" = "register";

function openAuth(mode: "login" | "register") {
  if (!app.registrationOpen) mode = "login";
  authMode = mode;
  const d = $("#auth") as HTMLDialogElement;
  const reg = mode === "register";
  const carry = guest.hasData()
    ? `<p class="carry">Il test e gli esercizi fatti su questo browser verranno aggiunti al tuo account.</p>`
    : "";
  d.innerHTML = `<form id="authform" novalidate>
      <h2>${reg ? "Crea un account" : "Accedi"}</h2>
      <p class="muted">${reg ? "Salva i tuoi progressi e ritrovali su ogni dispositivo." : "Ritrova i tuoi progressi."}</p>
      ${carry}
      ${reg ? `<label for="f-name">Nome</label><input id="f-name" name="name" autocomplete="given-name" required maxlength="60">` : ""}
      <label for="f-email">Email</label>
      <input id="f-email" name="email" type="email" autocomplete="email" required>
      <label for="f-pw">Password</label>
      <input id="f-pw" name="password" type="password" minlength="8" required
        autocomplete="${reg ? "new-password" : "current-password"}">
      ${reg ? `<p class="hint">Almeno 8 caratteri.</p>` : ""}
      <p class="err" id="autherr" role="alert"></p>
      <div class="actions">
        <button type="submit" class="btn" id="authsubmit">${reg ? "Crea l’account" : "Accedi"}</button>
        <button type="button" class="link" data-act="authclose">Annulla</button>
      </div>
      <p class="switch">${reg
        ? `Hai già un account? <button type="button" class="link" data-act="login">Accedi</button>`
        : app.registrationOpen
          ? `Non hai un account? <button type="button" class="link" data-act="register">Creane uno</button>`
          : `Le iscrizioni sono chiuse.`}</p>
    </form>`;
  if (!d.open) d.showModal();
  (d.querySelector("input") as HTMLInputElement).focus();
}

async function submitAuth(form: HTMLFormElement) {
  const f = new FormData(form);
  const err = $("#autherr");
  const btn = $<HTMLButtonElement>("#authsubmit");
  const body: Record<string, string> = {
    email: String(f.get("email") ?? "").trim(),
    password: String(f.get("password") ?? ""),
  };
  if (authMode === "register") body.name = String(f.get("name") ?? "").trim();
  if (authMode === "register" && !body.name) return (err.textContent = "Scrivi il tuo nome.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return (err.textContent = "Controlla l’indirizzo email.");
  if (body.password.length < 8) return (err.textContent = "La password deve avere almeno 8 caratteri.");

  err.textContent = "";
  btn.disabled = true;
  try {
    const { user } = await api<{ user: User }>(`/api/auth/${authMode}`, body);
    await signedIn(user);
    ($("#auth") as HTMLDialogElement).close();
  } catch (e) {
    err.textContent = e instanceof ApiError ? e.message : "Il server non risponde. Riprova tra poco.";
  } finally {
    btn.disabled = false;
  }
}

async function signedIn(user: User) {
  app.user = user;
  app.mode = "account";
  app.store = new AccountStore();
  if (guest.hasData()) {
    setProgress(await api<Progress>("/api/import", guest.exportForImport()));
    guest.clear();
    toast(`Ciao ${user.name}: il test e gli esercizi fatti come ospite ora sono nel tuo account.`);
  } else {
    setProgress(await app.store.load());
    toast(`Ciao ${user.name}.`);
  }
  route();
}

async function signedOut(callServer = true) {
  if (callServer) await api("/api/auth/logout", {}).catch(() => {});
  app.user = null;
  app.mode = "guest";
  app.store = guest;
  setProgress(await guest.load());
  homeMounted = false;
  if (callServer) toast("Hai chiuso la sessione. I tuoi progressi restano nel tuo account.");
  go("mappa");
}

// ── events ──────────────────────────────────────────────────────────────────

document.addEventListener("click", (ev) => {
  const t = ev.target as HTMLElement;
  const open = t.closest<HTMLElement>("[data-open]");
  if (open) {
    const id = open.dataset.open!;
    // a rule outside the current level filter would open dimmed: clear the filter
    if (app.level && skill(id).cefr !== app.level) {
      app.level = null;
      if (homeMounted) {
        renderControls();
        if (app.view === "list") renderList();
        else map?.setLevel(null, false);
      }
    }
    return go(`nodo-${id}`);
  }
  const ans = t.closest<HTMLElement>("[data-ans]");
  if (ans) return answerTest(Number(ans.dataset.ans));
  const pans = t.closest<HTMLElement>("[data-pans]");
  if (pans) return answerPractice(Number(pans.dataset.pans));
  const view = t.closest<HTMLElement>("[data-view]");
  if (view) {
    app.view = view.dataset.view as "map" | "list";
    renderControls();
    if (app.view === "list") renderList();
    else requestAnimationFrame(() => map?.setLevel(app.level, false));
    return;
  }
  const lvl = t.closest<HTMLElement>("[data-lvl]");
  if (lvl) {
    app.level = (lvl.dataset.lvl || null) as E.Cefr | null;
    renderControls();
    if (app.view === "list") renderList();
    else map?.setLevel(app.level);
    return;
  }
  const act = t.closest<HTMLElement>("[data-act]")?.dataset.act;
  switch (act) {
    case "newtest": return void startTest();
    case "resume": return go("test");
    case "results": return go("risultati");
    case "home":
    case "pause": return go("mappa");
    case "zoomin": return map?.zoomBy(1.35);
    case "zoomout": return map?.zoomBy(1 / 1.35);
    case "close": return closeSheet();
    case "login": return openAuth("login");
    case "register": return openAuth("register");
    case "authclose": return ($("#auth") as HTMLDialogElement).close();
    case "logout": return void signedOut();
    case "practice": {
      const id = decodeURIComponent(location.hash.slice(6));
      practice = { id, n: 0, right: 0, order: [] };
      return nextPracticeItem();
    }
    case "pnext": return nextPracticeItem();
  }
});

$("#scrim").addEventListener("click", () => closeSheet());

document.addEventListener("submit", (ev) => {
  const form = ev.target as HTMLFormElement;
  if (form.id === "authform") {
    ev.preventDefault();
    void submitAuth(form);
  }
});

document.addEventListener("keydown", (ev) => {
  if (($("#auth") as HTMLDialogElement).open) return;
  if (ev.key === "Escape" && !$("#sheet").hidden) return closeSheet();
  if (location.hash === "#test" && /^[1-4]$/.test(ev.key) && !ev.ctrlKey && !ev.metaKey) {
    const btn = document.querySelectorAll<HTMLButtonElement>(".quiz .opt")[Number(ev.key) - 1];
    btn?.click();
  }
});

window.addEventListener("hashchange", route);

// ── boot ────────────────────────────────────────────────────────────────────

async function boot() {
  setProgress(await guest.load());
  try {
    app.registrationOpen = (await api<{ registrationOpen: boolean }>("/api/config")).registrationOpen === true;
  } catch {
    app.registrationOpen = false; // no answer: show sign-in only
  }
  try {
    const { user } = await api<{ user: User }>("/api/me");
    app.user = user;
    app.mode = "account";
    app.store = new AccountStore();
    setProgress(await app.store.load());
  } catch (e) {
    // 401: there is a server and nobody is signed in. Anything else: no server.
    app.mode = e instanceof ApiError && e.status === 401 ? "guest" : "preview";
  }
  if (app.mode === "account" && guest.hasData()) {
    setProgress(await api<Progress>("/api/import", guest.exportForImport()));
    guest.clear();
  }
  route();
}

void boot();
