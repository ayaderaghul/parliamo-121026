/**
 * Weather and places, from our server only (MET Norway's terms: no direct
 * browser calls). Positions are 0.1° cells, never exact coordinates.
 *
 * Weather: Open-Meteo → MET Norway → the last good reading → a clear sky.
 * Places:  Open-Meteo geocoding → OpenStreetMap search (Nominatim).
 */
import type { Pool } from "pg";
import { cell, skyFromMet, skyFromWmo, type Sky } from "../game/cielo";
import { Outside, Paused, SingleFlight } from "./outside";

const READING_MS = 30 * 60_000;

export interface Reading {
  sky: Sky;
  cloud: number | null;
  isDay: boolean | null;
  /** where it came from; "stale" is an older reading kept because both sources are paused */
  source: "open-meteo" | "met-norway" | "stale" | "none";
  /** when the reading was taken, shown as "aggiornato alle 14:32" (MET Norway's terms) */
  at: string | null;
  blocked: string[];
}

export interface Place { name: string; region: string; lat: number; lon: number }

const key = (lat: number, lon: number) => `${cell(lat).toFixed(1)},${cell(lon).toFixed(1)}`;

export class Meteo {
  private weather = new SingleFlight<Reading>();
  private search = new SingleFlight<Place[]>();
  private reverseFlight = new SingleFlight<string | null>();

  constructor(
    private db: Pool,
    private out: Outside,
    private nominatimEnabled: () => boolean,
    private now: () => number = Date.now,
  ) {}

  // ── weather ────────────────────────────────────────────────────────────────

  async reading(lat: number, lon: number): Promise<Reading> {
    const k = key(lat, lon);
    const { rows } = await this.db.query("select * from weather_cache where cell = $1", [k]);
    const row = rows[0];
    if (row && new Date(row.expires_at).getTime() > this.now()) return this.fromRow(row, row.source);
    return this.weather.run(k, () => this.refresh(k, row));
  }

  private fromRow(row: any, source: Reading["source"]): Reading {
    return {
      sky: row.sky, cloud: row.cloud, isDay: row.is_day, source,
      at: new Date(row.fetched_at).toISOString(), blocked: this.out.blocked(),
    };
  }

  private async refresh(k: string, old: any): Promise<Reading> {
    const [lat, lon] = k.split(",");
    // 1. Open-Meteo
    try {
      const res = await this.out.call("open-meteo",
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,cloud_cover,precipitation,is_day`);
      if (res.ok) {
        const c = (await res.json())?.current;
        if (c && typeof c.weather_code === "number") {
          return this.store(k, skyFromWmo(c.weather_code, c.cloud_cover ?? null), c.cloud_cover ?? null,
            c.is_day === undefined ? null : !!c.is_day, "open-meteo", this.now() + READING_MS, old?.met_last_modified ?? null);
        }
      }
    } catch (e) {
      if (!(e instanceof Paused)) console.warn("open-meteo:", (e as Error).message);
    }
    // 2. MET Norway, with Expires and If-Modified-Since
    try {
      const headers: Record<string, string> = {};
      if (old?.met_last_modified) headers["If-Modified-Since"] = old.met_last_modified;
      const res = await this.out.call("met-norway",
        `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`, headers);
      const expires = Math.max(Date.parse(res.headers.get("expires") ?? "") || 0, this.now() + READING_MS);
      if (res.status === 304 && old) {
        await this.db.query("update weather_cache set expires_at = $2 where cell = $1", [k, new Date(expires)]);
        return this.fromRow(old, "met-norway");
      }
      if (res.ok) {
        const ts = (await res.json())?.properties?.timeseries?.[0];
        const symbol: string | undefined = ts?.data?.next_1_hours?.summary?.symbol_code ?? ts?.data?.next_6_hours?.summary?.symbol_code;
        if (symbol) {
          const cloud = ts?.data?.instant?.details?.cloud_area_fraction ?? null;
          return this.store(k, skyFromMet(symbol), cloud, /_day$/.test(symbol) ? true : /_night$/.test(symbol) ? false : null,
            "met-norway", expires, res.headers.get("last-modified"));
        }
      }
    } catch (e) {
      if (!(e instanceof Paused)) console.warn("met-norway:", (e as Error).message);
    }
    // 3. the last good reading, 4. a clear sky. The game never waits on the weather.
    if (old) return this.fromRow(old, "stale");
    return { sky: "clear", cloud: null, isDay: null, source: "none", at: null, blocked: this.out.blocked() };
  }

  private async store(k: string, sky: Sky, cloud: number | null, isDay: boolean | null,
                      source: "open-meteo" | "met-norway", expires: number, metLastModified: string | null): Promise<Reading> {
    await this.db.query(
      `insert into weather_cache (cell, sky, cloud, is_day, source, fetched_at, expires_at, met_last_modified)
       values ($1, $2, $3, $4, $5, now(), $6, $7)
       on conflict (cell) do update set sky = $2, cloud = $3, is_day = $4, source = $5, fetched_at = now(),
         expires_at = $6, met_last_modified = $7`,
      [k, sky, cloud === null ? null : Math.round(cloud), isDay, source, new Date(expires), metLastModified],
    );
    return { sky, cloud, isDay, source, at: new Date(this.now()).toISOString(), blocked: this.out.blocked() };
  }

  // ── places ─────────────────────────────────────────────────────────────────

  /** City search, only when the player presses Cerca. Answers are cached for a day, the empty ones too. */
  async places(q: string): Promise<Place[]> {
    const query = q.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 80);
    if (query.length < 2) return [];
    const { rows } = await this.db.query("select results from search_cache where q = $1 and expires_at > now()", [query]);
    if (rows[0]) return rows[0].results;
    return this.search.run(query, async () => {
      let found: Place[] | null = null;
      try {
        const res = await this.out.call("open-meteo-geocoding",
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=it&countryCode=IT&format=json`);
        if (res.ok) {
          found = ((await res.json())?.results ?? []).map((r: any) => ({
            name: r.name, region: r.admin1 ?? "", lat: cell(r.latitude), lon: cell(r.longitude),
          }));
        } else found = []; // 400: a bad search; cache it as empty
      } catch (e) {
        if (!(e instanceof Paused)) console.warn("geocoding:", (e as Error).message);
      }
      if (found === null && this.nominatimEnabled()) {
        try {
          const res = await this.out.call("nominatim",
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=it&format=jsonv2&limit=8&accept-language=it`);
          found = res.ok
            ? ((await res.json()) ?? []).map((r: any) => ({
                name: String(r.name || r.display_name).split(",")[0], region: String(r.display_name ?? "").split(", ").slice(-3, -2)[0] ?? "",
                lat: cell(Number(r.lat)), lon: cell(Number(r.lon)),
              }))
            : [];
        } catch (e) {
          if (!(e instanceof Paused)) console.warn("nominatim:", (e as Error).message);
        }
      }
      if (found === null) throw new Paused("open-meteo-geocoding", this.out.state("open-meteo-geocoding"));
      const unique = found.filter((p, i) => found!.findIndex((x) => x.name === p.name && x.lat === p.lat && x.lon === p.lon) === i);
      await this.db.query(
        `insert into search_cache (q, results, expires_at) values ($1, $2, now() + interval '1 day')
         on conflict (q) do update set results = $2, expires_at = now() + interval '1 day'`,
        [query, JSON.stringify(unique)],
      );
      return unique;
    });
  }

  /** The town name for the player's own cell: once per cell, kept for 30 days. */
  async placeName(lat: number, lon: number): Promise<string | null> {
    const k = key(lat, lon);
    const { rows } = await this.db.query("select name from place_names where cell = $1 and fetched_at > now() - interval '30 days'", [k]);
    if (rows[0]) return rows[0].name;
    if (!this.nominatimEnabled()) return null;
    return this.reverseFlight.run(k, async () => {
      const [la, lo] = k.split(",");
      try {
        const res = await this.out.call("nominatim",
          `https://nominatim.openstreetmap.org/reverse?lat=${la}&lon=${lo}&zoom=10&format=jsonv2&accept-language=it`);
        const name: string | null = res.ok ? ((await res.json())?.name || null) : null;
        await this.db.query(
          `insert into place_names (cell, name, fetched_at) values ($1, $2, now())
           on conflict (cell) do update set name = $2, fetched_at = now()`, [k, name]);
        return name;
      } catch {
        return null;
      }
    });
  }
}
