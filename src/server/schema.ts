/** Applied on every boot; every statement is idempotent. */
export const SCHEMA = /* sql */ `
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,          -- stored lowercased
  name          text not null,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- One row per diagnostic test. The answers are the source of truth; the score
-- is a cache, recomputed by replaying them when the test finishes.
create table if not exists tests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  seed       integer not null,
  events     jsonb not null default '[]',
  status     text not null default 'active'
             check (status in ('active', 'done', 'abandoned')),
  score      real,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tests_by_user on tests (user_id, created_at desc);
-- At most one test in progress per user, enforced by the database.
create unique index if not exists one_active_test on tests (user_id) where status = 'active';

create table if not exists practice (
  id         bigserial primary key,
  user_id    uuid not null references users(id) on delete cascade,
  skill_id   text not null,
  correct    boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists practice_by_user on practice (user_id, skill_id, created_at desc);

-- ── Il Viaggio ────────────────────────────────────────────────────────────
-- The player's state is the fold of this log (src/game/rules.ts). Events
-- point at stable content ids and record the content version they used.
create table if not exists game_events (
  user_id uuid not null references users(id) on delete cascade,
  idx     integer not null,
  body    jsonb not null,
  at      timestamptz not null,
  v       text not null,
  primary key (user_id, idx)
);

-- Where the player is: a 0.1° cell, never exact coordinates.
create table if not exists game_settings (
  user_id uuid primary key references users(id) on delete cascade,
  place   jsonb not null,
  updated_at timestamptz not null default now()
);

-- The day's visitor, fixed the first time the day is asked for: changing
-- city does not bring another one.
create table if not exists game_days (
  user_id uuid not null references users(id) on delete cascade,
  day     date not null,
  visitor text,
  sky     text not null,
  primary key (user_id, day)
);

-- Outside services: readings, searches, names, and each service's pause.
create table if not exists weather_cache (
  cell       text primary key,
  sky        text not null,
  cloud      integer,
  is_day     boolean,
  source     text not null,
  fetched_at timestamptz not null,
  expires_at timestamptz not null,
  met_last_modified text
);
create table if not exists search_cache (
  q          text primary key,
  results    jsonb not null,
  expires_at timestamptz not null
);
create table if not exists place_names (
  cell       text primary key,
  name       text,
  fetched_at timestamptz not null
);
-- "Segnala un errore": the generated Italian ships as generated, players report mistakes.
create table if not exists segnalazioni (
  id         bigserial primary key,
  dove       text not null,
  testo      text not null,
  created_at timestamptz not null default now()
);
create table if not exists service_state (
  service      text primary key,
  paused_until timestamptz,
  failures     integer not null default 0,
  last_status  integer,
  reason       text,
  updated_at   timestamptz not null default now()
);
`;
