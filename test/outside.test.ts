import { describe, it, expect } from "vitest";
import { Outside, Paused, SingleFlight, backoffMs, quotaReset, retryAfterMs, USER_AGENT } from "../src/server/outside";

const MIN = 60_000;
/** A fake service that answers with whatever the test queues, and a clock the test moves. */
function rig(answers: (() => Response | Promise<Response>)[]) {
  let t = Date.UTC(2026, 9, 25, 14, 0);
  const calls: { url: string; headers: any }[] = [];
  const logs: string[] = [];
  const out = new Outside(null, async (url, init) => {
    calls.push({ url, headers: init.headers });
    const a = answers.shift();
    if (!a) throw new Error("no answer queued");
    return a();
  }, () => t, (m) => logs.push(m));
  return { out, calls, logs, advance: (ms: number) => (t += ms), now: () => t };
}
const json = (status: number, body: any = {}, headers: Record<string, string> = {}) =>
  () => new Response(JSON.stringify(body), { status, headers });

describe("the polite client", () => {
  it("identifies itself and asks for gzip", async () => {
    const r = rig([json(200)]);
    await r.out.call("met-norway", "https://api.met.no/x");
    expect(r.calls[0].headers["User-Agent"]).toBe(USER_AGENT);
    expect(r.calls[0].headers["Accept-Encoding"]).toMatch(/gzip/);
  });

  it("waits exactly as long as Retry-After says, up to one day", async () => {
    const r = rig([json(503, {}, { "Retry-After": "120" })]);
    await expect(r.out.call("open-meteo", "u")).rejects.toBeInstanceOf(Paused);
    expect(r.out.state("open-meteo").pausedUntil - r.now()).toBe(120_000);
    expect(retryAfterMs("999999", 0)).toBe(86_400_000);
    expect(retryAfterMs(new Date(60_000).toUTCString(), 0)).toBe(60_000);
  });

  it("pauses a used-up daily quota until 00:05 UTC", async () => {
    const r = rig([json(429, { error: true, reason: "Daily API request limit exceeded. Please try again tomorrow." })]);
    await expect(r.out.call("open-meteo", "u")).rejects.toBeInstanceOf(Paused);
    expect(new Date(r.out.state("open-meteo").pausedUntil).toISOString()).toBe("2026-10-26T00:05:00.000Z");
    expect(quotaReset("Hourly API request limit exceeded", Date.UTC(2026, 9, 25, 14, 20))).toBe(Date.UTC(2026, 9, 25, 15, 0, 5));
  });

  it("pauses an hour on 403 and says 'you are blocked'", async () => {
    const r = rig([json(403)]);
    await expect(r.out.call("met-norway", "u")).rejects.toBeInstanceOf(Paused);
    expect(r.out.state("met-norway").pausedUntil - r.now()).toBe(60 * MIN);
    expect(r.logs.some((l) => l === "MET Norway: you are blocked")).toBe(true);
    expect(r.out.blocked()).toEqual(["MET Norway: you are blocked"]);
  });

  it("backs off 1, 2, 4 … 60 minutes on server errors, and resets on success", async () => {
    const r = rig([json(500), json(502), json(503), json(200)]);
    for (const expected of [1, 2, 4]) {
      await expect(r.out.call("open-meteo", "u")).rejects.toBeInstanceOf(Paused);
      expect(r.out.state("open-meteo").pausedUntil - r.now()).toBe(expected * MIN);
      r.advance(expected * MIN + 1);
    }
    expect([5, 6, 7, 8].map(backoffMs).map((ms) => ms / MIN)).toEqual([16, 32, 60, 60]);
    await r.out.call("open-meteo", "u");
    expect(r.out.state("open-meteo").failures).toBe(0);
  });

  it("treats timeouts and network failures like server errors", async () => {
    const r = rig([() => { throw Object.assign(new Error("t"), { name: "TimeoutError" }); }]);
    await expect(r.out.call("open-meteo", "u")).rejects.toBeInstanceOf(Paused);
    expect(r.out.state("open-meteo").reason).toBe("timeout");
  });

  it("does not pause the service for a bad request about one place", async () => {
    const r = rig([json(400), json(404)]);
    expect((await r.out.call("open-meteo-geocoding", "u")).status).toBe(400);
    expect((await r.out.call("open-meteo-geocoding", "u")).status).toBe(404);
    expect(r.out.isPaused("open-meteo-geocoding")).toBe(false);
  });

  it("never calls a paused service, and keeps the pauses of others apart", async () => {
    const r = rig([json(403), json(200)]);
    await expect(r.out.call("met-norway", "u")).rejects.toBeInstanceOf(Paused);
    await expect(r.out.call("met-norway", "u")).rejects.toBeInstanceOf(Paused);
    expect(r.calls.length).toBe(1);
    await r.out.call("open-meteo", "u");
    expect(r.calls.length).toBe(2);
  });

  it("spaces Nominatim requests at least a second apart", async () => {
    const out = new Outside(null, async () => new Response("[]"));
    const t0 = Date.now();
    await Promise.all([out.call("nominatim", "a"), out.call("nominatim", "b")]);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(1000);
  });

  it("shares one call between requests for the same thing", async () => {
    const sf = new SingleFlight<number>();
    let n = 0;
    const job = () => new Promise<number>((r) => setTimeout(() => r(++n), 20));
    const [a, b] = await Promise.all([sf.run("k", job), sf.run("k", job)]);
    expect([a, b, n]).toEqual([1, 1, 1]);
  });
});
