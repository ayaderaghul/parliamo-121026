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
`;
