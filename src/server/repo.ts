/**
 * Every query lives here, and every query that touches a user's data filters
 * on user_id. Routes never build SQL themselves, so no route can forget it.
 */
import type { Pool, PoolClient } from "pg";
import * as E from "../engine";
import {
  GRAPH,
  replay,
  type Progress,
  type TestEvent,
  type TestRecord,
} from "../shared/progress";

export interface User {
  id: string;
  name: string;
  email: string;
}

const toTest = (r: any): TestRecord => ({
  id: r.id,
  seed: r.seed,
  events: r.events,
  status: r.status,
  createdAt: new Date(r.created_at).toISOString(),
});

/** One connection, begin/commit/rollback, and always released. */
async function tx<T>(db: Pool, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await db.connect();
  try {
    await c.query("begin");
    const result = await fn(c);
    await c.query("commit");
    return result;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

// ── users ───────────────────────────────────────────────────────────────────

export async function createUser(db: Pool, name: string, email: string, hash: string) {
  try {
    const { rows } = await db.query(
      `insert into users (name, email, password_hash) values ($1, $2, $3)
       returning id, name, email`,
      [name, email, hash],
    );
    return rows[0] as User;
  } catch (e: any) {
    if (e.code === "23505") return null; // unique violation: email taken
    throw e;
  }
}

export async function findLogin(db: Pool, email: string) {
  const { rows } = await db.query(
    `select id, name, email, password_hash from users where email = $1`,
    [email],
  );
  return rows[0] as (User & { password_hash: string }) | undefined;
}

export async function getUser(db: Pool, id: string) {
  const { rows } = await db.query(`select id, name, email from users where id = $1`, [id]);
  return rows[0] as User | undefined;
}

// ── progress ────────────────────────────────────────────────────────────────

const TEST_COLS = `id, seed, events, status, created_at`;

export async function loadProgress(db: Pool, userId: string): Promise<Progress> {
  const [current, last, history, practice] = await Promise.all([
    db.query(`select ${TEST_COLS} from tests where user_id = $1 and status = 'active' limit 1`, [userId]),
    db.query(
      `select ${TEST_COLS} from tests where user_id = $1 and status = 'done'
       order by created_at desc limit 1`,
      [userId],
    ),
    db.query(
      `select id, score, created_at from tests where user_id = $1 and status = 'done'
       order by created_at desc limit 20`,
      [userId],
    ),
    // latest answer per skill: all the map needs
    db.query(
      `select distinct on (skill_id) skill_id, correct, created_at
       from practice where user_id = $1
       order by skill_id, created_at desc`,
      [userId],
    ),
  ]);
  return {
    current: current.rows[0] ? toTest(current.rows[0]) : null,
    last: last.rows[0] ? toTest(last.rows[0]) : null,
    history: history.rows.map((r) => ({
      id: r.id,
      score: r.score,
      createdAt: new Date(r.created_at).toISOString(),
    })),
    practice: practice.rows.map((r) => ({
      skillId: r.skill_id,
      correct: r.correct,
      at: new Date(r.created_at).toISOString(),
    })),
  };
}

/** Starting a test abandons any test still in progress. */
export function startTest(db: Pool, userId: string, seed: number) {
  return tx(db, async (c) => {
    await c.query(`update tests set status = 'abandoned' where user_id = $1 and status = 'active'`, [
      userId,
    ]);
    const { rows } = await c.query(
      `insert into tests (user_id, seed) values ($1, $2) returning ${TEST_COLS}`,
      [userId, seed],
    );
    return toTest(rows[0]);
  });
}

export type AppendResult =
  | { kind: "ok"; test: TestRecord }
  | { kind: "not-found" }
  | { kind: "conflict"; test: TestRecord; reason: string };

/**
 * Append one answer. `index` is how many answers the client believes are
 * already stored: a retry of the same answer is accepted once, a stale or
 * out-of-order one is refused, and the engine must agree on which question
 * was being asked.
 */
export function appendAnswer(
  db: Pool,
  userId: string,
  testId: string,
  index: number,
  answer: Omit<TestEvent, "at">,
): Promise<AppendResult> {
  return tx(db, async (c) => {
    const { rows } = await c.query(
      `select ${TEST_COLS} from tests where id = $1 and user_id = $2 for update`,
      [testId, userId],
    );
    if (!rows[0]) return { kind: "not-found" };
    const test = toTest(rows[0]);
    const conflict = (reason: string): AppendResult => ({ kind: "conflict", test, reason });

    if (test.status !== "active") return conflict("Questo test è già chiuso.");
    if (index < test.events.length) {
      const prev = test.events[index];
      const sameAnswer = prev.skillId === answer.skillId && prev.correct === answer.correct;
      return sameAnswer ? { kind: "ok", test } : conflict("Risposta già registrata.");
    }
    if (index > test.events.length) return conflict("Manca una risposta precedente.");

    let state;
    try {
      state = replay(test.seed, [...test.events, answer]);
    } catch (e) {
      return conflict("Domanda non valida per questo test.");
    }

    const events = [...test.events, { ...answer, at: new Date().toISOString() }];
    const status = state.done ? "done" : "active";
    const score = state.done ? E.percent(GRAPH, state) : null;
    await c.query(
      `update tests set events = $3::jsonb, status = $4, score = $5, updated_at = now()
       where id = $1 and user_id = $2`,
      [testId, userId, JSON.stringify(events), status, score],
    );
    return { kind: "ok", test: { ...test, events, status } };
  });
}

export async function addPractice(db: Pool, userId: string, skillId: string, correct: boolean) {
  const { rows } = await db.query(
    `insert into practice (user_id, skill_id, correct) values ($1, $2, $3) returning created_at`,
    [userId, skillId, correct],
  );
  return new Date(rows[0].created_at).toISOString();
}

// ── guest import ────────────────────────────────────────────────────────────

export interface GuestTest {
  seed: number;
  events: TestEvent[];
  createdAt: string;
}

/** Already validated by the route. One transaction: all of it or none. */
export function importGuest(
  db: Pool,
  userId: string,
  done: GuestTest[],
  current: GuestTest | null,
  practice: { skillId: string; correct: boolean; at: string }[],
) {
  return tx(db, async (c) => {
    for (const t of done) {
      const score = E.percent(GRAPH, replay(t.seed, t.events));
      await c.query(
        `insert into tests (user_id, seed, events, status, score, created_at, updated_at)
         values ($1, $2, $3::jsonb, 'done', $4, $5, $5)`,
        [userId, t.seed, JSON.stringify(t.events), score, t.createdAt],
      );
    }
    if (current) {
      // the test in progress on this device replaces one in progress elsewhere
      await c.query(`update tests set status = 'abandoned' where user_id = $1 and status = 'active'`, [
        userId,
      ]);
      await c.query(
        `insert into tests (user_id, seed, events, status, created_at, updated_at)
         values ($1, $2, $3::jsonb, 'active', $4, now())`,
        [userId, current.seed, JSON.stringify(current.events), current.createdAt],
      );
    }
    for (const p of practice) {
      await c.query(
        `insert into practice (user_id, skill_id, correct, created_at) values ($1, $2, $3, $4)`,
        [userId, p.skillId, p.correct, p.at],
      );
    }
  });
}
