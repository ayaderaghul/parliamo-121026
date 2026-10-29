/**
 * Il Viaggio's API against a real Postgres, with the weather services faked:
 * the server must fall back, cache, and refuse what the rules don't allow.
 */
import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import pg from "pg";
import { createApp } from "../src/server/app";
import { SCHEMA } from "../src/server/schema";
import { Outside } from "../src/server/outside";
import { Meteo } from "../src/server/meteo";
import { TOWNS, townsIn, PROVERBI } from "../src/game/content";
import { replay } from "../src/game/rules";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("set TEST_DATABASE_URL");
const db = new pg.Pool({ connectionString: url });

type Answer = { status: number; body?: any; headers?: Record<string, string> };
let queue: Record<string, Answer[]> = {};
const calls: { host: string; url: string; headers: any }[] = [];
const fakeFetch = async (u: string, init: RequestInit) => {
  const host = new URL(u).host;
  calls.push({ host, url: u, headers: init.headers });
  const a = queue[host]?.shift();
  if (!a) return new Response("{}", { status: 500 });
  return new Response(a.status === 304 ? null : JSON.stringify(a.body ?? {}), { status: a.status, headers: a.headers });
};
const outside = new Outside(db, fakeFetch, Date.now, () => {});
const meteo = new Meteo(db, outside, () => true);
const app = createApp({ db, secret: "y".repeat(40), secure: false, registrationOpen: true, meteo, buildId: "test-build" });

const OM = "api.open-meteo.com", MET = "api.met.no", GEO = "geocoding-api.open-meteo.com", OSM = "nominatim.openstreetmap.org";
const omSky = (code: number, cloud = 50) => ({ status: 200, body: { current: { weather_code: code, cloud_cover: cloud, is_day: 1 } } });
const metSky = (symbol: string, lastModified = "Sun, 25 Oct 2026 12:00:00 GMT") => ({
  status: 200, headers: { "Last-Modified": lastModified, Expires: new Date(Date.now() + 45 * 60_000).toUTCString() },
  body: { properties: { timeseries: [{ data: { instant: { details: { cloud_area_fraction: 90 } }, next_1_hours: { summary: { symbol_code: symbol } } } }] } },
});

beforeAll(async () => {
  await db.query("drop table if exists game_events, game_settings, game_days, weather_cache, search_cache, place_names, service_state, segnalazioni, practice, tests, users cascade");
  await db.query(SCHEMA);
});
beforeEach(async () => {
  queue = {}; calls.length = 0;
  await db.query("delete from weather_cache; delete from service_state; delete from search_cache");
  await (outside as any).states.clear();
});
afterAll(() => db.end());

async function player(mail: string) {
  const a = request.agent(app);
  const r = await a.post("/api/auth/register").send({ name: "Chi", email: mail, password: "password123" });
  expect(r.status).toBe(201);
  return a;
}

describe("weather", () => {
  it("uses Open-Meteo, then serves the cached reading for 30 minutes", async () => {
    queue[OM] = [omSky(61)];
    const r1 = await request(app).get("/api/meteo?lat=45.67&lon=11.93");
    expect(r1.body.sky).toBe("rain");
    expect(r1.body.cell).toEqual([45.7, 11.9]);
    expect(r1.headers["cache-control"]).toBe("public, max-age=600");
    expect(calls[0].url).toContain("latitude=45.7&longitude=11.9"); // only the 0.1° cell leaves our server
    await request(app).get("/api/meteo?lat=45.71&lon=11.88");
    expect(calls.length).toBe(1);
  });

  it("falls back to MET Norway when Open-Meteo's daily quota is used up, and skips Open-Meteo after that", async () => {
    queue[OM] = [{ status: 429, body: { reason: "Daily API request limit exceeded" } }];
    queue[MET] = [metSky("fog")];
    const r = await request(app).get("/api/meteo?lat=45.4&lon=12.3");
    expect(r.body).toMatchObject({ sky: "fog", source: "met-norway" });
    const met = calls.find((c) => c.host === MET)!;
    expect(met.headers["User-Agent"]).toMatch(/parliamo-viaggio/);
    expect(met.url).toMatch(/lat=45\.4&lon=12\.3$/);
    // another cell: Open-Meteo is paused, so it is not called at all
    queue[MET] = [metSky("cloudy")];
    await request(app).get("/api/meteo?lat=44.5&lon=11.3");
    expect(calls.filter((c) => c.host === OM).length).toBe(1);
    const st = await db.query("select paused_until, last_status from service_state where service = 'open-meteo'");
    expect(st.rows[0].last_status).toBe(429);
    expect(new Date(st.rows[0].paused_until).getUTCHours()).toBe(0);
  });

  it("asks MET Norway with If-Modified-Since and keeps the reading on 304", async () => {
    await db.query("insert into service_state (service, paused_until, failures, reason) values ('open-meteo', now() + interval '1 hour', 1, 'test')");
    await (outside as any).load();
    queue[MET] = [metSky("lightrain_day", "Sun, 25 Oct 2026 10:00:00 GMT")];
    await request(app).get("/api/meteo?lat=41.9&lon=12.5");
    await db.query("update weather_cache set expires_at = now() - interval '1 minute' where cell = '41.9,12.5'");
    queue[MET] = [{ status: 304, headers: { Expires: new Date(Date.now() + 3600_000).toUTCString() } }];
    const r = await request(app).get("/api/meteo?lat=41.9&lon=12.5");
    expect(r.body.sky).toBe("rain");
    const second = calls.filter((c) => c.host === MET)[1];
    expect(second.headers["If-Modified-Since"]).toBe("Sun, 25 Oct 2026 10:00:00 GMT");
  });

  it("shows 'you are blocked' and serves the last reading when both sources refuse", async () => {
    queue[OM] = [omSky(3, 90)];
    await request(app).get("/api/meteo?lat=40.8&lon=14.3");
    await db.query("update weather_cache set expires_at = now() - interval '1 minute'");
    queue[OM] = [{ status: 500 }];
    queue[MET] = [{ status: 403 }];
    const r = await request(app).get("/api/meteo?lat=40.8&lon=14.3");
    expect(r.body).toMatchObject({ sky: "cloud", source: "stale", blocked: ["MET Norway: you are blocked"] });
  });

  it("answers a clear sky when there is nothing at all", async () => {
    queue[OM] = [{ status: 500 }];
    queue[MET] = [{ status: 500 }];
    const r = await request(app).get("/api/meteo?lat=38.1&lon=13.4");
    expect(r.body).toMatchObject({ sky: "clear", source: "none" });
  });

  it("refuses places outside Italy", async () => {
    expect((await request(app).get("/api/meteo?lat=48.9&lon=2.3")).status).toBe(400);
  });
});

describe("city search", () => {
  it("uses Open-Meteo geocoding, caches the answer, and falls back to Nominatim", async () => {
    queue[GEO] = [{ status: 200, body: { results: [{ name: "Castelfranco Veneto", admin1: "Veneto", latitude: 45.671, longitude: 11.927 }] } }];
    const r = await request(app).get("/api/luoghi?q=Castelfranco");
    expect(r.body.places[0]).toEqual({ name: "Castelfranco Veneto", region: "Veneto", lat: 45.7, lon: 11.9 });
    await request(app).get("/api/luoghi?q=castelfranco");
    expect(calls.length).toBe(1);
    queue[GEO] = [{ status: 503, headers: { "Retry-After": "60" } }];
    queue[OSM] = [{ status: 200, body: [{ name: "Asolo", display_name: "Asolo, Treviso, Veneto, Italia", lat: "45.80", lon: "11.91" }] }];
    const f = await request(app).get("/api/luoghi?q=asolo");
    expect(f.body.places[0].name).toBe("Asolo");
    expect(calls.find((c) => c.host === OSM)!.url).toContain("countrycodes=it");
  });
  it("does not search one letter", async () => {
    expect((await request(app).get("/api/luoghi?q=a")).body.places).toEqual([]);
    expect(calls.length).toBe(0);
  });
});

describe("the game log", () => {
  const root = townsIn("A1").find((t) => t.prereqs.length === 0)!;

  it("stores events, replays them, and refuses what the rules do not allow", async () => {
    const a = await player("viaggio1@example.com");
    expect((await a.post("/api/viaggio/eventi").send({ index: 0, event: { t: "lesson", town: root.id } })).status).toBe(201);
    // a retry of the same event is accepted once
    expect((await a.post("/api/viaggio/eventi").send({ index: 0, event: { t: "lesson", town: root.id } })).status).toBe(200);
    // a gap is refused
    expect((await a.post("/api/viaggio/eventi").send({ index: 5, event: { t: "lesson", town: root.id } })).status).toBe(409);
    // a locked town is refused
    const locked = townsIn("A1").find((t) => t.prereqs.length > 0)!;
    const r = await a.post("/api/viaggio/eventi").send({ index: 1, event: { t: "card", card: locked.cards[0], grade: "si" } });
    expect(r.status).toBe(422);
    // the client can never say how much it earned
    await a.post("/api/viaggio/eventi").send({ index: 1, event: { t: "card", card: root.cards[0], grade: "si", gold: 9999 } });
    const g = await a.get("/api/viaggio");
    const s = replay(g.body.events);
    expect(s.gold).toBe(0);
    expect(s.cards[root.cards[0]].box).toBe(1);
    const stored = await db.query("select body from game_events where idx = 1 and body->>'t' = 'card'");
    expect(stored.rows.every((r) => !("gold" in r.body))).toBe(true);
  });

  it("fixes the day's visitor the first time, and only pays that visitor", async () => {
    const a = await player("viaggio2@example.com");
    queue[OM] = [omSky(45)]; // fog
    const d = await a.get("/api/viaggio/oggi?lat=45.4&lon=12.3");
    const lit = d.body.moon.lit;
    const expected = lit >= 0.98 ? "lupo" : lit <= 0.02 ? "sibilla" : "folletto";
    expect(d.body.visitor).toBe(expected);
    // changing city does not bring another visitor
    queue[OM] = [omSky(61)];
    await a.post("/api/viaggio/luogo").send({ kind: "citta", name: "Roma", lat: 41.9, lon: 12.5 });
    expect((await a.get("/api/viaggio/oggi")).body.visitor).toBe(expected);
    const proverb = await a.post("/api/viaggio/eventi").send({ index: 0, event: { t: "proverb", id: PROVERBI[0].id, correct: true } });
    expect(proverb.status).toBe(expected === "folletto" ? 201 : 422);
    const drop = await a.post("/api/viaggio/eventi").send({ index: expected === "folletto" ? 1 : 0, event: { t: "drop" } });
    expect(drop.status).toBe(422);
  });

  it("keeps players apart", async () => {
    const a = await player("viaggio3@example.com");
    const b = await player("viaggio4@example.com");
    await a.post("/api/viaggio/eventi").send({ index: 0, event: { t: "lesson", town: root.id } });
    expect((await b.get("/api/viaggio")).body.events).toEqual([]);
  });

  it("joins a guest journey to the account, re-checked, without visitor events", async () => {
    const a = await player("viaggio6@example.com");
    await a.post("/api/viaggio/eventi").send({ index: 0, event: { t: "lesson", town: root.id } });
    const locked = townsIn("A1").find((t) => t.prereqs.length > 0)!;
    const guest = [
      { t: "card", card: root.cards[0], grade: "si", at: "2026-10-01T10:00:00Z", v: "old" },
      { t: "proverb", id: PROVERBI[0].id, correct: true, at: "2026-10-01T10:01:00Z", v: "old" }, // a visitor: dropped
      { t: "card", card: locked.cards[0], grade: "si", at: "2026-10-01T10:02:00Z", v: "old" },   // a locked town: refused
      { t: "battle", town: root.id, answers: root.items.slice(0, 3).map((item) => ({ item, correct: true })), gold: 999 },
    ];
    const r = await a.post("/api/viaggio/ospite").send({ events: guest, place: { kind: "citta", name: "Asolo", lat: 45.8, lon: 11.9 } });
    expect(r.body).toEqual({ added: 2, skipped: 2 });
    const g = await a.get("/api/viaggio");
    expect(g.body.events.map((e: any) => e.t)).toEqual(["lesson", "card", "battle"]);
    expect(g.body.events.every((e: any) => e.at > "2026-10-02")).toBe(true); // the server's clock, not the browser's
    expect("gold" in g.body.events[2]).toBe(false);
    expect(g.body.place).toMatchObject({ name: "Asolo", lat: 45.8, lon: 11.9 });
    expect(replay(g.body.events).quizWon[root.id]).toBe(true);
  });

  it("needs a finished diagnostic for the entrance exam", async () => {
    const a = await player("viaggio5@example.com");
    expect((await a.post("/api/viaggio/ingresso").send({})).status).toBe(400);
  });

  it("serves the build id without caching", async () => {
    const r = await request(app).get("/api/version");
    expect(r.body).toEqual({ build: "test-build" });
    expect(r.headers["cache-control"]).toBe("no-store");
  });
});
