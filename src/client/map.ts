/**
 * The skill map: graphviz coordinates drawn on squared exercise-book paper,
 * pannable and zoomable with mouse, touch and keyboard.
 */
import { DATA, type NodeStatus } from "../shared/progress";
import type { Cefr } from "../engine";

const NS = "http://www.w3.org/2000/svg";
const el = (tag: string, attrs: Record<string, string | number> = {}) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

export const STATUS_WORD: Record<NodeStatus, string> = {
  right: "Giusta",
  credited: "Dedotta da una risposta giusta",
  wrong: "Da rivedere",
  unasked: "Non ancora vista",
};

export const STATUS_SHORT: Record<NodeStatus, string> = {
  right: "Giusta",
  credited: "Dedotta",
  wrong: "Da rivedere",
  unasked: "Non vista",
};

/** Below this many pixels per unit the 13-unit labels stop being readable. */
const READABLE_K = 0.72;

export class SkillMap {
  private svg: SVGSVGElement;
  private groups = new Map<string, SVGGElement>();
  private edges: { a: string; b: string; line: SVGPolylineElement }[] = [];
  private byId = new Map(DATA.skills.map((s) => [s.id, s]));
  private pos = new Map(DATA.layout.map((l) => [l.id, l]));

  // view: world point at the centre of the frame, and pixels per world unit
  private cx = DATA.W / 2;
  private cy = DATA.H / 2;
  private k = 0.5;

  private pointers = new Map<number, { x: number; y: number }>();
  private dragStart: { x: number; y: number; t: number } | null = null;
  private moved = 0;
  private pinch: { d: number } | null = null;
  private ro: ResizeObserver;

  constructor(private host: HTMLElement, private onSelect: (id: string) => void) {
    this.svg = el("svg", {
      role: "group",
      "aria-label": "Mappa delle competenze: trascina per spostarti, usa i pulsanti per lo zoom",
      class: "skillmap",
    }) as SVGSVGElement;

    // squared paper that moves with the drawing
    const defs = el("defs");
    const pat = el("pattern", { id: "quadretti", width: 20, height: 20, patternUnits: "userSpaceOnUse" });
    pat.append(el("path", { d: "M20 0H0V20", class: "grid" }));
    defs.append(pat);
    this.svg.append(defs);
    this.svg.append(el("rect", { x: -4000, y: -4000, width: DATA.W + 8000, height: DATA.H + 8000, fill: "url(#quadretti)" }));

    const gEdges = el("g", { class: "edges" });
    for (const e of DATA.edges) {
      const line = el("polyline", { points: e.p.map((p) => p.join(",")).join(" ") }) as SVGPolylineElement;
      gEdges.append(line);
      this.edges.push({ a: e.a, b: e.b, line });
    }
    this.svg.append(gEdges);

    for (const s of DATA.skills) {
      const p = this.pos.get(s.id)!;
      const g = el("g", {
        "data-id": s.id,
        class: "node s-unasked",
        tabindex: 0,
        role: "button",
      }) as SVGGElement;
      const title = el("title");
      g.append(title);
      g.append(el("rect", { x: p.x, y: p.y, width: p.w, height: p.h, rx: 3 }));
      const t = el("text", { x: p.x + p.w / 2, y: p.y + p.h / 2, "text-anchor": "middle", "dominant-baseline": "central" });
      t.textContent = s.label;
      g.append(t);
      g.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          this.onSelect(s.id);
        }
      });
      this.groups.set(s.id, g);
      this.svg.append(g);
    }

    host.append(this.svg);
    this.bindPointer();
    this.ro = new ResizeObserver(() => this.apply());
    this.ro.observe(host);
  }

  destroy() {
    this.ro.disconnect();
  }

  // ── state ──────────────────────────────────────────────────────────────────

  setStatuses(st: Record<string, NodeStatus>) {
    for (const [id, g] of this.groups) {
      const s = st[id] ?? "unasked";
      g.setAttribute("class", g.getAttribute("class")!.replace(/s-\w+/, `s-${s}`));
      const sk = this.byId.get(id)!;
      g.querySelector("title")!.textContent = `${sk.label}, ${sk.cefr}: ${STATUS_WORD[s].toLowerCase()}`;
      g.setAttribute("aria-label", `${sk.label}, livello ${sk.cefr}, ${STATUS_WORD[s].toLowerCase()}`);
    }
    const known = (id: string) => st[id] === "right" || st[id] === "credited";
    for (const e of this.edges) e.line.classList.toggle("lit", known(e.a) && known(e.b));
  }

  setSelected(id: string | null) {
    for (const [nid, g] of this.groups) g.classList.toggle("sel", nid === id);
  }

  /** Dim everything outside a level and frame that level; null shows all. */
  setLevel(level: Cefr | null, animate = true) {
    for (const [id, g] of this.groups) {
      g.classList.toggle("dim", level !== null && this.byId.get(id)!.cefr !== level);
    }
    const ids = level ? DATA.skills.filter((s) => s.cefr === level).map((s) => s.id) : null;
    this.frame(ids, animate);
  }

  /** Bring one node to the centre, e.g. when opened from the list. */
  focus(id: string) {
    const p = this.pos.get(id);
    if (!p) return;
    this.cx = p.x + p.w / 2;
    this.cy = p.y + p.h / 2;
    this.k = Math.max(this.k, 0.8);
    this.apply();
  }

  zoomBy(f: number) {
    this.k = this.clampK(this.k * f);
    this.apply();
  }

  // ── view ───────────────────────────────────────────────────────────────────

  private frame(ids: string[] | null, animate: boolean) {
    const boxes = (ids ?? DATA.layout.map((l) => l.id)).map((id) => this.pos.get(id)!);
    const x0 = Math.min(...boxes.map((b) => b.x)), x1 = Math.max(...boxes.map((b) => b.x + b.w));
    const y0 = Math.min(...boxes.map((b) => b.y)), y1 = Math.max(...boxes.map((b) => b.y + b.h));
    const { width, height } = this.host.getBoundingClientRect();
    const pad = 24;
    const fitK = Math.min((width - 2 * pad) / (x1 - x0), (height - 2 * pad) / (y1 - y0));
    // never so small that the labels can't be read: frame what fits, from the
    // left edge where the foundations are, and let the rest be panned to
    const target = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, k: this.clampK(Math.max(fitK, READABLE_K)) };
    if (fitK < READABLE_K) target.cx = x0 + (width / 2 - pad) / target.k;
    this.tween(target, animate);
  }

  private tween(to: { cx: number; cy: number; k: number }, animate: boolean) {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate || reduce) {
      Object.assign(this, to);
      return this.apply();
    }
    const from = { cx: this.cx, cy: this.cy, k: this.k };
    const t0 = performance.now(), dur = 280;
    const step = (now: number) => {
      const u = Math.min(1, (now - t0) / dur), e = 1 - (1 - u) ** 3;
      this.cx = from.cx + (to.cx - from.cx) * e;
      this.cy = from.cy + (to.cy - from.cy) * e;
      this.k = from.k + (to.k - from.k) * e;
      this.apply();
      if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  private clampK(k: number) {
    return Math.min(2.4, Math.max(0.12, k));
  }

  private apply() {
    const { width, height } = this.host.getBoundingClientRect();
    if (!width || !height) return;
    const w = width / this.k, h = height / this.k;
    this.svg.setAttribute("viewBox", `${this.cx - w / 2} ${this.cy - h / 2} ${w} ${h}`);
  }

  // ── input ──────────────────────────────────────────────────────────────────

  private bindPointer() {
    const s = this.svg;
    s.addEventListener("pointerdown", (e) => {
      s.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) {
        this.dragStart = { x: e.clientX, y: e.clientY, t: performance.now() };
        this.moved = 0;
      } else if (this.pointers.size === 2) {
        this.pinch = { d: this.pinchDistance() };
      }
    });

    s.addEventListener("pointermove", (e) => {
      const prev = this.pointers.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) {
        this.moved += Math.abs(dx) + Math.abs(dy);
        this.cx -= dx / this.k;
        this.cy -= dy / this.k;
        this.apply();
      } else if (this.pinch && this.pointers.size === 2) {
        const d = this.pinchDistance();
        const [a, b] = [...this.pointers.values()];
        this.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / this.pinch.d);
        this.pinch.d = d;
        this.moved = 99; // a pinch is never a tap
      }
    });

    const end = (e: PointerEvent) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = null;
      if (this.pointers.size === 0 && this.dragStart && this.moved < 8) {
        const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest("g[data-id]");
        if (hit) this.onSelect(hit.getAttribute("data-id")!);
      }
      if (this.pointers.size === 0) this.dragStart = null;
    };
    s.addEventListener("pointerup", end);
    s.addEventListener("pointercancel", end);

    // Ctrl/⌘ + wheel, and trackpad pinch (which arrives as ctrl+wheel), zoom.
    // A plain wheel scrolls the page, so the map never traps scrolling.
    s.addEventListener(
      "wheel",
      (e) => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        this.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
      },
      { passive: false },
    );
  }

  private pinchDistance() {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  }

  /** Zoom keeping the world point under (sx, sy) fixed on screen. */
  private zoomAt(sx: number, sy: number, f: number) {
    const r = this.host.getBoundingClientRect();
    const ox = sx - r.left - r.width / 2, oy = sy - r.top - r.height / 2;
    const wx = this.cx + ox / this.k, wy = this.cy + oy / this.k;
    this.k = this.clampK(this.k * f);
    this.cx = wx - ox / this.k;
    this.cy = wy - oy / this.k;
    this.apply();
  }
}
