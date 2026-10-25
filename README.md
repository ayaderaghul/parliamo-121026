# parliamo

A map of Italian grammar from A1 to B2. Every rule opens a lesson and a short
practice set; an optional diagnostic test colours the map for you. Anyone can
use it without an account. With an account, the test, the practice and a test
left halfway are saved and follow you to any device.

**New accounts are closed.** Existing accounts sign in as usual; visitors use
the site as guests, with progress kept in their browser. To reopen sign-ups,
set `REGISTRATION_OPEN=true` in the Render dashboard (Environment): the service
restarts with it, no deploy needed. Any other value, or none, keeps them closed.

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

## Il Viaggio (`/viaggio`)

An 8-bit trip down Italy on the same account: each CEFR level is a region,
each rule a town. Playable: **Veneto (A1)**, **Emilia-Romagna (A2)**,
**Toscana (B1)** and **Lazio (B2)**, 78 towns. Campania and Sicilia (C1, C2)
are still in the fog. Design: the "Il Viaggio game design" doc.

- **A town** = Lezione (the Parliamo lesson, as is) → Mattoni (cards cut from
  the lesson at load time: rule, forms table, fill-in, traps) → Quiz against
  the town's Errore monster (3 questions from the bank, win at 2) → in B1 and
  B2, a Scena: a 4-turn conversation where the rule is needed. Every card
  recalled, the quiz won and the scene played through = the flag. Cards come
  back by spaced repetition; a flagged town with a card due grows weeds.
  Scenes speak of the player in the feminine or masculine (`{o|a}` in the
  text), as the player chooses.
- **The station**: 75% of the region's rules flagged (weighted, as in the
  test), then 12 questions, pass at 9. A fail waits until tomorrow.
- **Gems → gold** at the Cambiavalute: Rubino 5 (a due card recalled),
  Pietra di luna 8, Smeraldo 3 (a right turn in a scene, a fairy question),
  Perla 3, Zaffiro 2 (a right quiz answer), Goccia 1 (rain). Times ×1 in A1,
  ×1.25 A2, ×1.5 B1, ×1.75 B2.
- **The bottega**: an outfit per title (zaino, bicicletta, Vespa, chiavi di
  casa, worn by the hero on every map), two souvenirs per region for the
  album, and in quizzes an *aiutino* for 10 gold that removes two wrong
  options; that answer pays no gem. Gold never buys a flag, a level or an exam.
- **The sky is real**: the player's own place (asked on the first visit, or a
  city picked), one visitor a day, chosen the first time the day is asked for:
  moon ≥98% the Lupo (60-second quiz), ≤2% the Sibilla (a tip or a shortcut),
  then fog the Folletto (a proverb), rain a shower of gems (20 a day), clouds
  the Fata (a story at the player's level, two questions, and a hint for the
  weakest town).

```
src/game/      shared by browser and server, pure
  content.ts     towns, cards cut from the lessons, quiz ids (hash of the text)
  rules.ts       the reducer: every reward and every refusal
  cielo.ts       weather codes → sky, the moon, 0.1° cells, Italian days
  testi.ts       the new Italian: proverbs and tips (shipped as generated)
  scene.ts       24 conversations, one per B1/B2 rule (shipped as generated)
  storie.ts      the fairy's stories, 6 per level A1–B2 (shipped as generated)
  bottega.ts     outfits, souvenirs, the hint price
src/server/
  outside.ts     the only door to public services, with their etiquette
  meteo.ts       Open-Meteo → MET Norway → last reading → clear; city search
  viaggio.ts     /api/viaggio, /api/meteo, /api/luoghi, /api/version, /api/segnala
src/viaggio/   the page: canvas for the world, HTML for the words
```

The game is an event log, like the test: the browser sends what happened
(`card … recalled`), the server replays the log, checks the event against the
rules and today's visitor, stamps it with its own clock and stores only the
fields that event type has. A client can never say what it earned. Events
point at ids made from a hash of the text, so editing one lesson never renames
another's cards, and an event whose card no longer exists is skipped on replay.

### Outside services

| service | for | if it is paused |
|---|---|---|
| Open-Meteo forecast | the weather of a 0.1° cell | MET Norway |
| MET Norway Locationforecast 2.0 | the weather, as fallback | the last good reading, then a clear sky |
| Open-Meteo geocoding | city search | OpenStreetMap search |
| OpenStreetMap search (Nominatim) | city search fallback, the name of the player's cell | "search unavailable", the six cities |

All calls go from the server, with a User-Agent naming the app, 3-second
timeouts and one shared call per cell or search. Each service has its own
pause, saved in `service_state`: `Retry-After` (up to a day), a used-up quota
(daily → 00:05 UTC), 403 one hour (logged and shown as "you are blocked"),
5xx and timeouts 1, 2, 4 … 60 minutes; 400/404 pause nothing. Readings are
cached 30 minutes per cell (MET Norway until its `Expires`, then asked with
`If-Modified-Since`). Nominatim gets at most one request a second, never
search-as-you-type, and `NOMINATIM_ENABLED=false` on Render switches it off.
The footer credits Open-Meteo, MET Norway, GeoNames and OpenStreetMap.

In development (`NODE_ENV` not `production`) `/viaggio?meteo=nebbia` (or
`pioggia`, `nuvole`, `sereno`, `luna-piena`, `luna-nuova`) forces the sky.

### Caching

`/` and `/viaggio` are revalidated on every load; `/assets/viaggio-HASH.js` and
`/fonts/*-HASH.woff2` are cached for a year, immutable; player data is
`no-store`; `/api/meteo` is `max-age=600`. An open tab asks `/api/version`
on focus and every 10 minutes and shows *Nuova versione: ricarica*. No service
worker.

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
| GET | `/api/config` | `{registrationOpen}` |
| POST | `/api/auth/register` | `{name, email, password}` → account + session cookie; 403 while sign-ups are closed |
| POST | `/api/auth/login` | `{email, password}` → session cookie |
| POST | `/api/auth/logout` | clears the cookie |
| GET | `/api/me` | current user, or 401 |
| GET | `/api/progress` | test in progress, last finished test, history, practice |
| POST | `/api/tests` | starts a test (abandons one in progress) |
| POST | `/api/tests/:id/answers` | `{index, skillId, correct, ms}` |
| POST | `/api/practice` | `{skillId, correct}` |
| POST | `/api/import` | guest progress, validated by replay |
| GET | `/api/health` | `{ok: true}` when the database answers |
| GET | `/api/viaggio` | the player's game log and place |
| POST | `/api/viaggio/eventi` | `{index, event}` → checked by the rules, stamped, stored |
| GET | `/api/viaggio/oggi` | today's sky, moon and visitor |
| POST | `/api/viaggio/luogo` | `{kind, name, lat, lon}`, rounded to 0.1° |
| POST | `/api/viaggio/ingresso` | the diagnostic flags its right and credited towns |
| GET | `/api/meteo?lat&lon` | the sky of a cell (guests) |
| GET | `/api/luoghi?q` · `/api/luoghi/nome?lat&lon` | city search, a cell's name |
| POST | `/api/segnala` | `{where, text}`: a reported mistake |
| GET | `/api/version` | `{build}` |

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
- Nothing is loaded from a third party. The fonts (Bodoni Moda, Titillium Web,
  both SIL Open Font License) are copied from their npm packages into
  `dist/public/fonts/` with a content hash in the name and served by us with a
  one-year immutable cache, so no visitor's IP address goes to Google Fonts. The
  build fails if `page.html` ever loads a script, stylesheet, font or image from
  another site.

Answers are checked in the browser, so a user could fake their own score. For
a self-assessment that's acceptable; it would not be for a graded exam.
