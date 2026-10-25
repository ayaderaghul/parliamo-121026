import express, { type Request, type Response, type NextFunction } from "express";
import cookieParser from "cookie-parser";
import { randomInt } from "node:crypto";
import type { Pool } from "pg";
import { join } from "node:path";
import {
  checkPassword,
  clearSession,
  hashPassword,
  rateLimit,
  requireAuth,
  setSession,
} from "./auth";
import * as repo from "./repo";
import { mountViaggio } from "./viaggio";
import type { Meteo } from "./meteo";
import { isSkill, replay, ReplayError, type TestEvent } from "../shared/progress";

export interface AppOptions {
  db: Pool;
  secret: string;
  /** true in production: cookies only over HTTPS */
  secure: boolean;
  /** directory with the built index.html; omitted in API tests */
  publicDir?: string;
  /** false: nobody can create an account; existing accounts still sign in */
  registrationOpen: boolean;
  /** Il Viaggio's weather and places; omitted in tests that don't need them */
  meteo?: Meteo;
  /** id of this build, for /api/version */
  buildId?: string;
  /** development only: lets ?meteo=… force the sky to test the visitors */
  allowForcing?: boolean;
}

// ── validation ──────────────────────────────────────────────────────────────

class BadRequest extends Error {}
const fail = (msg: string): never => {
  throw new BadRequest(msg);
};

const str = (v: unknown, field: string, min: number, max: number) => {
  if (typeof v !== "string") return fail(`Campo mancante: ${field}.`);
  const s = v.trim();
  if (s.length < min || s.length > max) fail(`Lunghezza non valida: ${field}.`);
  return s;
};
const bool = (v: unknown, field: string) =>
  typeof v === "boolean" ? v : fail(`Campo non valido: ${field}.`);
const int = (v: unknown, field: string, min: number, max: number) =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max
    ? (v as number)
    : fail(`Campo non valido: ${field}.`);
const iso = (v: unknown, field: string) => {
  const t = typeof v === "string" ? Date.parse(v) : NaN;
  if (Number.isNaN(t)) fail(`Data non valida: ${field}.`);
  return new Date(Math.min(t, Date.now())).toISOString(); // never in the future
};
const skill = (v: unknown) => (isSkill(v) ? v : fail("Competenza sconosciuta."));
const email = (v: unknown) => {
  const e = str(v, "email", 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) fail("Indirizzo email non valido.");
  return e;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const event = (e: any): TestEvent => ({
  skillId: skill(e?.skillId),
  correct: bool(e?.correct, "correct"),
  ms: int(e?.ms, "ms", 0, 3_600_000),
  at: iso(e?.at, "at"),
});

const guestTest = (t: any, wantDone: boolean): repo.GuestTest => {
  const seed = int(t?.seed, "seed", 1, 2 ** 31 - 1);
  if (!Array.isArray(t?.events) || t.events.length > 400) fail("Test non valido.");
  const events = t.events.map(event);
  try {
    const state = replay(seed, events);
    if (state.done !== wantDone) fail("Stato del test non valido.");
  } catch (e) {
    if (e instanceof ReplayError) fail("Le risposte del test non sono coerenti.");
    throw e;
  }
  return { seed, events, createdAt: iso(t?.createdAt, "createdAt") };
};

// ── app ─────────────────────────────────────────────────────────────────────

export function createApp({ db, secret, secure, publicDir, registrationOpen, meteo, buildId = "dev", allowForcing = false }: AppOptions) {
  const app = express();
  app.set("trust proxy", 1); // Render terminates TLS in front of us
  app.disable("x-powered-by");

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("X-Frame-Options", "DENY");
    next();
  });
  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());

  // Every state-changing API call must be JSON. A plain HTML form on another
  // site cannot send that without a CORS preflight, which we never answer:
  // together with SameSite=Lax this is the CSRF protection.
  app.use("/api", (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD" && !req.is("application/json")) {
      return res.status(415).json({ error: "Richiesta non valida." });
    }
    next();
  });

  const auth = requireAuth(secret);
  const authLimit = rateLimit(20, 15 * 60 * 1000);

  app.get("/api/health", async (_req, res) => {
    await db.query("select 1");
    res.json({ ok: true });
  });

  // What the page needs to know before it draws the account buttons.
  app.get("/api/config", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ registrationOpen });
  });

  // ── accounts ──────────────────────────────────────────────────────────────

  app.post("/api/auth/register", authLimit, async (req, res) => {
    if (!registrationOpen) {
      return res.status(403).json({ error: "Le iscrizioni sono chiuse. Chi ha già un account può accedere." });
    }
    const name = str(req.body?.name, "nome", 1, 60);
    const mail = email(req.body?.email);
    const password = str(req.body?.password, "password", 8, 200);
    const user = await repo.createUser(db, name, mail, await hashPassword(password));
    if (!user) return res.status(409).json({ error: "Esiste già un account con questa email." });
    setSession(res, user.id, secret, secure);
    res.status(201).json({ user });
  });

  app.post("/api/auth/login", authLimit, async (req, res) => {
    const mail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const row = await repo.findLogin(db, mail);
    if (!(await checkPassword(password, row?.password_hash))) {
      return res.status(401).json({ error: "Email o password non corretti." });
    }
    setSession(res, row!.id, secret, secure);
    res.json({ user: { id: row!.id, name: row!.name, email: row!.email } });
  });

  app.post("/api/auth/logout", (_req, res) => {
    clearSession(res, secure);
    res.status(204).end();
  });

  app.get("/api/me", auth, async (req, res) => {
    const user = await repo.getUser(db, req.userId!);
    if (!user) {
      clearSession(res, secure);
      return res.status(401).json({ error: "Account non trovato." });
    }
    res.json({ user });
  });

  // ── progress ──────────────────────────────────────────────────────────────

  app.get("/api/progress", auth, async (req, res) => {
    res.json(await repo.loadProgress(db, req.userId!));
  });

  app.post("/api/tests", auth, async (req, res) => {
    res.status(201).json({ test: await repo.startTest(db, req.userId!, randomInt(1, 2 ** 31 - 1)) });
  });

  app.post("/api/tests/:id/answers", auth, async (req, res) => {
    const id = String(req.params.id);
    if (!UUID.test(id)) return res.status(404).json({ error: "Test non trovato." });
    const index = int(req.body?.index, "index", 0, 400);
    const answer = {
      skillId: skill(req.body?.skillId),
      correct: bool(req.body?.correct, "correct"),
      ms: int(req.body?.ms, "ms", 0, 3_600_000),
    };
    const r = await repo.appendAnswer(db, req.userId!, id, index, answer);
    if (r.kind === "not-found") return res.status(404).json({ error: "Test non trovato." });
    if (r.kind === "conflict") return res.status(409).json({ error: r.reason, test: r.test });
    res.json({ test: r.test });
  });

  app.post("/api/practice", auth, async (req, res) => {
    const id = skill(req.body?.skillId);
    const at = await repo.addPractice(db, req.userId!, id, bool(req.body?.correct, "correct"));
    res.status(201).json({ skillId: id, at });
  });

  /** Progress made as a guest on this device, uploaded once after signing in. */
  app.post("/api/import", auth, async (req, res) => {
    const b = req.body ?? {};
    if (!Array.isArray(b.done) || b.done.length > 20) fail("Dati non validi.");
    if (!Array.isArray(b.practice) || b.practice.length > 1000) fail("Dati non validi.");
    const done = b.done.map((t: unknown) => guestTest(t, true));
    const current = b.current ? guestTest(b.current, false) : null;
    const practice = b.practice.map((p: any) => ({
      skillId: skill(p?.skillId),
      correct: bool(p?.correct, "correct"),
      at: iso(p?.at, "at"),
    }));
    await repo.importGuest(db, req.userId!, done, current, practice);
    res.json(await repo.loadProgress(db, req.userId!));
  });

  if (meteo) mountViaggio(app, { db, auth, meteo, buildId, allowForcing });

  app.use("/api", (_req, res) => res.status(404).json({ error: "Endpoint inesistente." }));

  // ── front end ─────────────────────────────────────────────────────────────

  if (publicDir) {
    // Fonts have their content hash in the name: cache for a year, never revalidate.
    // The page itself is always revalidated, so a deploy is seen on the next load.
    app.use("/fonts", express.static(join(publicDir, "fonts"), { immutable: true, maxAge: "365d" }));
    app.use("/fonts", (_req, res) => res.status(404).end()); // never the page instead of a font
    app.use("/assets", express.static(join(publicDir, "assets"), { immutable: true, maxAge: "365d" }));
    app.use("/assets", (_req, res) => res.status(404).end());
    // Pages keep a fixed name and are revalidated on every load (304 when unchanged).
    const page = (file: string) => (_req: Request, res: Response) =>
      res.sendFile(file, { root: publicDir, headers: { "Cache-Control": "no-cache" } });
    app.get(["/viaggio", "/viaggio/"], page("viaggio.html"));
    app.use(express.static(publicDir, { index: false, maxAge: 0 }));
    app.get("/{*any}", page("index.html"));
  }

  // Express 5 forwards rejected promises here, so async routes need no try/catch.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof BadRequest) return res.status(400).json({ error: err.message });
    if ((err as any)?.type === "entity.parse.failed") {
      return res.status(400).json({ error: "JSON non valido." });
    }
    console.error(err);
    res.status(500).json({ error: "Errore del server. Riprova." });
  });

  return app;
}
