/**
 * Il Viaggio's API. The browser sends what happened; the server replays the
 * player's log, checks the new event against the rules and today's visitor,
 * stamps it with the server's time and stores it. Every query filters on
 * user_id.
 */
import type { Express, Request, RequestHandler } from "express";
import type { Pool } from "pg";
import { CONTENT_VERSION, TOWNS } from "../game/content";
import { cell, dayOf, moonAt } from "../game/cielo";
import { NEEDS, normalize, replay, RuleError, tryStep, visitorFor, type EventBody, type GameEvent, type Visitor } from "../game/rules";
import { nodeStatuses } from "../shared/progress";
import * as repo from "./repo";
import { Paused } from "./outside";
import type { Meteo } from "./meteo";
import { rateLimit } from "./auth";

class Bad extends Error {}
const bad = (m: string): never => { throw new Bad(m); };

const coord = (v: unknown, lim: number) => {
  const n = Number(v);
  return Number.isFinite(n) && Math.abs(n) <= lim ? cell(n) : bad("Coordinate non valide.");
};
/** Italy and a margin: the game's weather is Italian. */
const inItaly = (lat: number, lon: number) => lat >= 35 && lat <= 48 && lon >= 5.5 && lon <= 19.5;

const sameBody = (a: any, b: any) => {
  const strip = ({ at: _a, v: _v, ...rest }: any) => rest;
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
};

async function loadEvents(db: Pool | import("pg").PoolClient, userId: string): Promise<GameEvent[]> {
  const { rows } = await db.query("select body, at, v from game_events where user_id = $1 order by idx", [userId]);
  return rows.map((r: any) => ({ ...r.body, at: new Date(r.at).toISOString(), v: r.v }));
}

export interface ViaggioDeps {
  db: Pool;
  auth: RequestHandler;
  meteo: Meteo;
  buildId: string;
  /** development only: ?meteo=nebbia|pioggia|nuvole|sereno|luna-piena|luna-nuova forces the sky */
  allowForcing?: boolean;
}

const FORCE: Record<string, { sky?: "fog" | "rain" | "cloud" | "clear"; lit?: number }> = {
  nebbia: { sky: "fog", lit: 0.5 }, pioggia: { sky: "rain", lit: 0.5 }, nuvole: { sky: "cloud", lit: 0.5 }, sereno: { sky: "clear", lit: 0.5 },
  "luna-piena": { lit: 1 }, "luna-nuova": { lit: 0 },
};

export function mountViaggio(app: Express, { db, auth, meteo, buildId, allowForcing = false }: ViaggioDeps) {
  const forced = (req: Request) => (allowForcing ? FORCE[String(req.query.meteo ?? "")] : undefined);
  const skyFor = async (req: Request, lat: number, lon: number) => {
    const f = forced(req);
    const reading = await meteo.reading(lat, lon);
    const m = moonAt(Date.now());
    return {
      reading: f?.sky ? { ...reading, sky: f.sky } : reading,
      moon: f?.lit !== undefined ? { ...m, lit: f.lit } : m,
    };
  };
  const searchLimit = rateLimit(30, 60_000);
  const uid = (req: Request) => req.userId!;

  // ── public: version, weather, places ───────────────────────────────────────

  app.get("/api/version", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ build: buildId });
  });

  app.get("/api/meteo", async (req, res) => {
    const lat = coord(req.query.lat, 90), lon = coord(req.query.lon, 180);
    if (!inItaly(lat, lon)) bad("Il gioco conosce solo il meteo italiano.");
    const { reading, moon } = await skyFor(req, lat, lon);
    res.setHeader("Cache-Control", forced(req) ? "no-store" : "public, max-age=600");
    res.json({ ...reading, cell: [lat, lon], moon });
  });

  app.get("/api/luoghi", searchLimit, async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      res.json({ places: await meteo.places(String(req.query.q ?? "")) });
    } catch (e) {
      if (e instanceof Paused) return res.status(503).json({ error: "Ricerca non disponibile, riprova più tardi.", places: [] });
      throw e;
    }
  });

  app.get("/api/luoghi/nome", searchLimit, async (req, res) => {
    const lat = coord(req.query.lat, 90), lon = coord(req.query.lon, 180);
    res.setHeader("Cache-Control", "no-store");
    res.json({ name: inItaly(lat, lon) ? await meteo.placeName(lat, lon) : null });
  });

  // ── the player's game ──────────────────────────────────────────────────────

  app.get("/api/viaggio", auth, async (req, res) => {
    const id = uid(req);
    const [events, settings] = await Promise.all([
      loadEvents(db, id),
      db.query("select place from game_settings where user_id = $1", [id]),
    ]);
    res.setHeader("Cache-Control", "no-store");
    res.json({ events, place: settings.rows[0]?.place ?? null, content: CONTENT_VERSION });
  });

  app.post("/api/viaggio/luogo", auth, async (req, res) => {
    const b = req.body ?? {};
    const kind = b.kind === "qui" ? "qui" : b.kind === "citta" ? "citta" : bad("Tipo di luogo non valido.");
    const lat = coord(b.lat, 90), lon = coord(b.lon, 180);
    if (!inItaly(lat, lon)) bad("Scegli un luogo in Italia.");
    const name = typeof b.name === "string" ? b.name.trim().slice(0, 80) : "";
    const place = { kind, name, lat, lon };
    await db.query(
      `insert into game_settings (user_id, place, updated_at) values ($1, $2, now())
       on conflict (user_id) do update set place = $2, updated_at = now()`, [uid(req), JSON.stringify(place)]);
    res.json({ place });
  });

  /** Today's sky and visitor. The visitor is fixed the first time the day is asked for. */
  app.get("/api/viaggio/oggi", auth, async (req, res) => {
    const id = uid(req);
    const day = dayOf(Date.now());
    const s = await db.query("select place from game_settings where user_id = $1", [id]);
    const place = s.rows[0]?.place;
    const lat = place ? place.lat : coord(req.query.lat, 90), lon = place ? place.lon : coord(req.query.lon, 180);
    const { reading, moon } = await skyFor(req, lat, lon);
    await db.query(
      `insert into game_days (user_id, day, visitor, sky) values ($1, $2, $3, $4) on conflict (user_id, day) do nothing`,
      [id, day, visitorFor(reading.sky, moon.lit), reading.sky]);
    const d = await db.query("select visitor, sky from game_days where user_id = $1 and day = $2", [id, day]);
    res.setHeader("Cache-Control", "no-store");
    res.json({ day, reading, moon, visitor: d.rows[0].visitor as Visitor | null, visitorSky: d.rows[0].sky, place });
  });

  app.post("/api/viaggio/eventi", auth, async (req, res) => {
    const id = uid(req);
    const index = Number.isInteger(req.body?.index) ? req.body.index : bad("Indice mancante.");
    const raw = req.body?.event;
    if (!raw || typeof raw !== "object" || typeof raw.t !== "string") bad("Evento mancante.");
    if (JSON.stringify(raw).length > 8000) bad("Evento troppo grande.");
    let body: EventBody;
    try { body = normalize(raw); } catch (e) { return res.status(422).json({ error: (e as Error).message }); }

    const c = await db.connect();
    try {
      await c.query("begin");
      await c.query("select pg_advisory_xact_lock(hashtext($1))", [id]); // one writer per player
      const events = await loadEvents(c, id);

      if (index < events.length) { // a retry of an event already stored
        await c.query("rollback");
        const stored = events[index];
        return sameBody(stored, body)
          ? res.json({ index, at: stored.at, v: stored.v })
          : res.status(409).json({ error: "Evento diverso già registrato.", count: events.length });
      }
      if (index > events.length) {
        await c.query("rollback");
        return res.status(409).json({ error: "Manca un evento precedente.", count: events.length });
      }

      const state = replay(events);
      let at = new Date().toISOString();
      if (at < state.lastAt) at = state.lastAt; // never earlier than the last one
      const e = { ...body, at, v: CONTENT_VERSION } as GameEvent;

      let visitor: Visitor | null = null;
      if (NEEDS[e.t]) {
        const d = await c.query("select visitor from game_days where user_id = $1 and day = $2", [id, dayOf(at)]);
        visitor = d.rows[0]?.visitor ?? null;
      }
      if (e.t === "import") bad("Usa /api/viaggio/ingresso.");
      tryStep(state, e, { visitor });

      const { at: _a, v: _v, ...stored } = e as any;
      await c.query("insert into game_events (user_id, idx, body, at, v) values ($1, $2, $3, $4, $5)",
        [id, index, JSON.stringify(stored), at, CONTENT_VERSION]);
      await c.query("commit");
      res.status(201).json({ index, at, v: CONTENT_VERSION });
    } catch (err) {
      await c.query("rollback").catch(() => {});
      if (err instanceof RuleError) return res.status(422).json({ error: err.message });
      throw err;
    } finally {
      c.release();
    }
  });

  /** Esame d'ingresso: the Parliamo diagnostic flags every right or credited town. */
  app.post("/api/viaggio/ingresso", auth, async (req, res) => {
    const id = uid(req);
    const progress = await repo.loadProgress(db, id);
    if (!progress.last) return res.status(400).json({ error: "Non hai ancora finito un test diagnostico." });
    const st = nodeStatuses(progress);
    const towns = [...TOWNS.keys()].filter((t) => st[t] === "right" || st[t] === "credited");

    const c = await db.connect();
    try {
      await c.query("begin");
      await c.query("select pg_advisory_xact_lock(hashtext($1))", [id]);
      const events = await loadEvents(c, id);
      const state = replay(events);
      let at = new Date().toISOString();
      if (at < state.lastAt) at = state.lastAt;
      const e: GameEvent = { t: "import", towns, at, v: CONTENT_VERSION };
      tryStep(state, e, { visitor: null });
      await c.query("insert into game_events (user_id, idx, body, at, v) values ($1, $2, $3, $4, $5)",
        [id, events.length, JSON.stringify({ t: "import", towns }), at, CONTENT_VERSION]);
      await c.query("commit");
      res.status(201).json({ index: events.length, event: e });
    } catch (err) {
      await c.query("rollback").catch(() => {});
      if (err instanceof RuleError) return res.status(422).json({ error: err.message });
      throw err;
    } finally {
      c.release();
    }
  });

  /** "Segnala un errore": a list of reported sentences to fix. Guests can report too. */
  const reportLimit = rateLimit(10, 60 * 60_000);
  app.post("/api/segnala", reportLimit, async (req, res) => {
    const where = typeof req.body?.where === "string" ? req.body.where.slice(0, 200) : bad("Manca dove.");
    const text = typeof req.body?.text === "string" && req.body.text.trim() ? req.body.text.trim().slice(0, 1000) : bad("Scrivi cosa non va.");
    await db.query("insert into segnalazioni (dove, testo) values ($1, $2)", [where, text]);
    res.status(201).json({ ok: true });
  });

  // validation errors of this module
  app.use("/api", (err: unknown, _req: Request, res: any, next: any) => {
    if (err instanceof Bad) return res.status(400).json({ error: err.message });
    next(err);
  });
}
