/**
 * The sky as facts, with no game in it: the part Il Viaggio and Data Quest can
 * share (the future `cielo` package). Pure, no network.
 */

export type Sky = "clear" | "cloud" | "fog" | "rain" | "snow";

/** WMO weather code (Open-Meteo) and cloud cover → sky. */
export function skyFromWmo(code: number, cloudCover: number | null): Sky {
  if (code === 45 || code === 48) return "fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code === 3 || (cloudCover ?? 0) >= 70) return "cloud";
  return "clear";
}

/** MET Norway symbol_code (e.g. "lightrainshowers_day") → sky. */
export function skyFromMet(symbol: string): Sky {
  const s = symbol.replace(/_(day|night|polartwilight)$/, "");
  if (s === "fog") return "fog";
  if (/snow/.test(s) && !/sleet/.test(s)) return "snow";
  if (/rain|sleet|thunder/.test(s)) return "rain";
  if (s === "cloudy") return "cloud";
  return "clear"; // clearsky, fair, partlycloudy
}

// ── moon ─────────────────────────────────────────────────────────────────────

const SYNODIC = 29.530588853;
const KNOWN_NEW = Date.UTC(2000, 0, 6, 18, 14); // a new moon, 6 Jan 2000 18:14 UTC

export interface Moon {
  /** days since the last new moon, 0 to 29.53 */
  age: number;
  /** lit fraction, 0 to 1 */
  lit: number;
}

export function moonAt(t: Date | number): Moon {
  const days = ((typeof t === "number" ? t : t.getTime()) - KNOWN_NEW) / 86_400_000;
  const age = ((days % SYNODIC) + SYNODIC) % SYNODIC;
  return { age, lit: (1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2 };
}

// ── place ────────────────────────────────────────────────────────────────────

/** A weather cell: coordinates rounded to 0.1°, about 10 km. The only position we keep or send. */
export const cell = (x: number) => Math.round(x * 10) / 10;
export const cellKey = (lat: number, lon: number) => `${cell(lat).toFixed(1)},${cell(lon).toFixed(1)}`;

// ── days ─────────────────────────────────────────────────────────────────────

const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" });
/** The calendar day in Italy, "2026-10-25": visitors and daily limits reset at midnight in Rome. */
export const dayOf = (t: Date | string | number) => DAY.format(new Date(t));
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
