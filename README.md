# parliamo

A map of Italian grammar from A1 to B2. Every rule opens a lesson and a short
practice set; an optional diagnostic test colours the map for you. Anyone can
use it without an account. With an account, the test, the practice and a test
left halfway are saved and follow you to any device.

One Render web service runs the API and serves the front end. Data lives in
Postgres on Neon.

```
content/                    what you edit
  italian-skill-graph.ts      78 rules: weight, prerequisites, notes
  bank.py                     272 questions, 3–6 per rule
  lezioni/*.md                one lesson section per rule
scripts/
  prepare-data.py             content → src/data.json   (local: needs graphviz)
  build.mjs                   src → dist/               (CI: Node only)
src/
  engine.ts                   the adaptive test (pure, seeded)
  shared/progress.ts          replay, scoring, map colours: used by browser AND server
  server/                     Express 5 + pg: auth, tests, practice, import
  client/                     the page: map, test, lessons, accounts
  data.json                   generated and COMMITTED: graph, layout, items, lessons
test/                         vitest: API against a real Postgres, progress rules
```

## How progress is stored

A test is stored as its seed plus the list of answers, never as probabilities.
The engine is pure, so replaying the answers rebuilds everything: the next
question, coverage, deduced rules, the score.

That gives three properties for free:

- **Resume anywhere.** A half-finished test is just a shorter list.
- **The server can check every answer.** It replays the test and refuses an
  answer for a question the engine would never have asked (409).
- **Retries are safe.** Each answer carries its position; sending the same one
  twice is accepted once.

Guests keep the same structure in `localStorage`. On sign-up or sign-in it is
uploaded once to `/api/import`, validated by replay, then cleared from the browser.

## Deploy

**1. Database (Neon, free).** Create a project at neon.tech, copy the connection
string (it ends in `?sslmode=require`). The tables are created on first boot.

**2. Push this folder to GitHub** as the repo root.

**3. Render → New → Blueprint**, pick the repo. It reads `render.yaml`:

- generates `JWT_SECRET` for you
- asks for `DATABASE_URL`: paste the Neon string

Click Apply. The first build takes a couple of minutes; then
`https://parliamo.onrender.com/api/health` should answer `{"ok":true}`.

If you already have the old *static site* on Render, delete it or rename this
service: the static site cannot run the server.

Free web services sleep after about 15 minutes without visits; the first visit
afterwards takes up to a minute to wake. Neon's free database does not expire.

## Run locally

```bash
cp .env.example .env        # put a Neon branch URL or a local Postgres in it
npm ci
npm run dev                 # build, then http://localhost:3000
```

Tests need a database they may wipe:

```bash
TEST_DATABASE_URL=postgres://... npm test
npm run check               # type-check everything
```

## Editing content

| to change… | edit | then |
|---|---|---|
| lesson text only | `content/lezioni/*.md` | `npm run data:lessons`, commit `src/data.json` |
| rules, weights, prerequisites, questions | `content/` | `npm run data` (needs graphviz), commit `src/data.json` |
| engine rules | `DEFAULTS` in `src/engine.ts` | commit |
| page | `src/client/` | commit |

`npm run data:lessons` refreshes lessons without touching the map layout, so it
needs no graphviz. A full `npm run data` re-solves the layout, which can move
nodes. Either way Render only reads `src/data.json`: if you skip the step, the
site keeps the old content.

Changing the engine or the item bank changes which question comes next, so
tests saved under the old rules no longer replay. Before changing either with
real users, add an engine version to `tests` and keep old versions replayable.

## API

| method | path | what it does |
|---|---|---|
| POST | `/api/auth/register` | `{name, email, password}` → account + session cookie |
| POST | `/api/auth/login` | `{email, password}` → session cookie |
| POST | `/api/auth/logout` | clears the cookie |
| GET | `/api/me` | current user, or 401 |
| GET | `/api/progress` | test in progress, last finished test, history, practice |
| POST | `/api/tests` | starts a test (abandons one in progress) |
| POST | `/api/tests/:id/answers` | `{index, skillId, correct, ms}` |
| POST | `/api/practice` | `{skillId, correct}` |
| POST | `/api/import` | guest progress, validated by replay |
| GET | `/api/health` | `{ok: true}` when the database answers |

## Security choices

- The server refuses to start without a `JWT_SECRET` of 32+ characters. No
  fallback secret, no unsigned tokens; verification pins HS256.
- The session is an `httpOnly`, `SameSite=Lax`, `Secure` cookie: JavaScript
  on the page cannot read it.
- Every mutating API call must be `application/json`. Together with `SameSite`,
  that blocks cross-site form posts (CSRF).
- Every query that touches user data filters on `user_id`, in one file
  (`src/server/repo.ts`). Another user's test id answers 404, not 403.
- A wrong email and a wrong password get the same message and take the same
  time (bcrypt runs against a dummy hash).
- Auth routes are rate-limited (20 per 15 minutes per IP, in memory).
- One test in progress per user is enforced by a partial unique index.

Answers are checked in the browser, so a user could fake their own score. For
a self-assessment that's acceptable; it would not be for a graded exam.
