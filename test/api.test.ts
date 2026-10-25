/**
 * Runs against a real Postgres (TEST_DATABASE_URL), schema rebuilt from scratch.
 * The answers sent here are the ones the engine would really ask, obtained by
 * replaying the test, exactly as the browser does.
 */
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import pg from "pg";
import { createApp } from "../src/server/app";
import { SCHEMA } from "../src/server/schema";
import { replay, type TestRecord } from "../src/shared/progress";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("set TEST_DATABASE_URL");
const db = new pg.Pool({ connectionString: url });
const app = createApp({ db, secret: "x".repeat(40), secure: false, registrationOpen: true });
const closed = createApp({ db, secret: "x".repeat(40), secure: false, registrationOpen: false });

beforeAll(async () => {
  await db.query("drop table if exists practice, tests, users cascade");
  await db.query(SCHEMA);
});
afterAll(() => db.end());

const agent = () => request.agent(app); // keeps cookies, like a browser

async function signup(a: ReturnType<typeof agent>, mail: string) {
  const r = await a.post("/api/auth/register").send({ name: "Chi", email: mail, password: "password123" });
  expect(r.status).toBe(201);
  return r.body.user;
}

/** Answer the question the engine is actually asking. */
async function answer(a: ReturnType<typeof agent>, t: TestRecord, correct: boolean) {
  const s = replay(t.seed, t.events);
  return a.post(`/api/tests/${t.id}/answers`).send({
    index: t.events.length,
    skillId: s.current,
    correct,
    ms: 1500,
  });
}

describe("accounts", () => {
  it("registers, keeps the session in a cookie, logs out", async () => {
    const a = agent();
    await signup(a, "Chi@Example.com");
    expect((await a.get("/api/me")).body.user.email).toBe("chi@example.com");
    await a.post("/api/auth/logout").send({});
    expect((await a.get("/api/me")).status).toBe(401);
  });

  it("refuses a duplicate email, case-insensitively", async () => {
    const r = await agent().post("/api/auth/register")
      .send({ name: "Altro", email: "CHI@example.com", password: "password123" });
    expect(r.status).toBe(409);
  });

  it("logs in, and gives the same error for a wrong email and a wrong password", async () => {
    const wrongPw = await agent().post("/api/auth/login").send({ email: "chi@example.com", password: "nope-nope" });
    const wrongEmail = await agent().post("/api/auth/login").send({ email: "nobody@example.com", password: "password123" });
    expect(wrongPw.status).toBe(401);
    expect(wrongEmail.body.error).toBe(wrongPw.body.error);
    const ok = await agent().post("/api/auth/login").send({ email: "chi@example.com", password: "password123" });
    expect(ok.status).toBe(200);
  });

  it("with registration closed: refuses sign-ups, creates nothing, still lets members in", async () => {
    expect((await request(closed).get("/api/config")).body).toEqual({ registrationOpen: false });
    expect((await request(app).get("/api/config")).body).toEqual({ registrationOpen: true });

    const r = await request.agent(closed).post("/api/auth/register")
      .send({ name: "Nuovo", email: "nuovo@example.com", password: "password123" });
    expect(r.status).toBe(403);
    expect(r.headers["set-cookie"]).toBeUndefined();
    const rows = await db.query("select 1 from users where email = 'nuovo@example.com'");
    expect(rows.rowCount).toBe(0);

    const member = request.agent(closed);
    const ok = await member.post("/api/auth/login").send({ email: "chi@example.com", password: "password123" });
    expect(ok.status).toBe(200);
    expect((await member.get("/api/progress")).status).toBe(200);
  });

  it("rejects a forged token", async () => {
    const r = await request(app).get("/api/me").set("Cookie", "parliamo_sid=eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.");
    expect(r.status).toBe(401);
  });

  it("rejects a non-JSON POST (CSRF guard)", async () => {
    const r = await request(app).post("/api/auth/login").type("form").send("email=a&password=b");
    expect(r.status).toBe(415);
  });
});

describe("tests and progress", () => {
  it("runs a whole test and stores the score", async () => {
    const a = agent();
    await signup(a, "flawless@example.com");
    let t: TestRecord = (await a.post("/api/tests").send({})).body.test;
    while (t.status === "active") {
      const r = await answer(a, t, true);
      expect(r.status).toBe(200);
      t = r.body.test;
    }
    const p = (await a.get("/api/progress")).body;
    expect(p.current).toBe(null);
    expect(p.last.id).toBe(t.id);
    expect(p.history[0].score).toBe(1);
  });

  it("accepts a retried answer once, refuses a wrong question", async () => {
    const a = agent();
    await signup(a, "retry@example.com");
    const t: TestRecord = (await a.post("/api/tests").send({})).body.test;
    const first = await answer(a, t, true);
    const retry = await answer(a, t, true); // same index again, e.g. a network retry
    expect(first.status).toBe(200);
    expect(retry.status).toBe(200);
    expect(retry.body.test.events).toHaveLength(1);

    const t1: TestRecord = retry.body.test;
    const wrongSkill = await a.post(`/api/tests/${t.id}/answers`)
      .send({ index: 1, skillId: "passato.remoto", correct: true, ms: 1 });
    // passato.remoto is B2: never the second question of an A1 region
    expect(wrongSkill.status).toBe(409);
    expect(wrongSkill.body.test.events).toHaveLength(t1.events.length);
  });

  it("keeps a test in progress so it can be resumed", async () => {
    const a = agent();
    await signup(a, "resume@example.com");
    let t: TestRecord = (await a.post("/api/tests").send({})).body.test;
    for (let i = 0; i < 5; i++) t = (await answer(a, t, i % 2 === 0)).body.test;
    const p = (await a.get("/api/progress")).body;
    expect(p.current.id).toBe(t.id);
    expect(p.current.events).toHaveLength(5);
  });

  it("allows only one test in progress", async () => {
    const a = agent();
    await signup(a, "twice@example.com");
    await a.post("/api/tests").send({});
    const second = (await a.post("/api/tests").send({})).body.test;
    expect((await a.get("/api/progress")).body.current.id).toBe(second.id);
  });

  it("does not let one user answer another user's test (IDOR)", async () => {
    const owner = agent();
    await signup(owner, "owner@example.com");
    const t: TestRecord = (await owner.post("/api/tests").send({})).body.test;
    const intruder = agent();
    await signup(intruder, "intruder@example.com");
    const r = await answer(intruder, t, true);
    expect(r.status).toBe(404); // not 403: don't even confirm it exists
  });

  it("saves practice, latest answer per skill", async () => {
    const a = agent();
    await signup(a, "practice@example.com");
    await a.post("/api/practice").send({ skillId: "pp.essere", correct: false });
    await a.post("/api/practice").send({ skillId: "pp.essere", correct: true });
    const bad = await a.post("/api/practice").send({ skillId: "nonexistent", correct: true });
    expect(bad.status).toBe(400);
    const p = (await a.get("/api/progress")).body;
    expect(p.practice).toEqual([expect.objectContaining({ skillId: "pp.essere", correct: true })]);
  });

  it("refuses everything without a session", async () => {
    for (const [method, path] of [["get", "/api/progress"], ["post", "/api/tests"], ["post", "/api/practice"]]) {
      const r = await (request(app) as any)[method](path).send({});
      expect(r.status).toBe(401);
    }
  });
});

describe("guest import", () => {
  /** Build a valid guest test locally, as the browser does in guest mode. */
  function guestTest(answers: number, correct = true) {
    const seed = 12345;
    const events: any[] = [];
    for (let i = 0; i < answers; i++) {
      const s = replay(seed, events);
      if (s.done) break;
      events.push({ skillId: s.current, correct, ms: 1000, at: new Date().toISOString() });
    }
    return { seed, events, createdAt: new Date().toISOString() };
  }

  it("imports a finished test, a test in progress, and practice", async () => {
    const a = agent();
    await signup(a, "guest@example.com");
    const finished = guestTest(500); // runs to the end
    const current = guestTest(4);
    const r = await a.post("/api/import").send({
      done: [finished],
      current,
      practice: [{ skillId: "noun.gender", correct: true, at: new Date().toISOString() }],
    });
    expect(r.status).toBe(200);
    expect(r.body.last.events).toHaveLength(finished.events.length);
    expect(r.body.current.events).toHaveLength(4);
    expect(r.body.practice).toHaveLength(1);
  });

  it("rejects a tampered guest test", async () => {
    const a = agent();
    await signup(a, "tamper@example.com");
    const t = guestTest(3);
    t.events[1].skillId = "registro"; // not the question the engine asked
    const r = await a.post("/api/import").send({ done: [], current: t, practice: [] });
    expect(r.status).toBe(400);
    expect((await a.get("/api/progress")).body.current).toBe(null);
  });
});
