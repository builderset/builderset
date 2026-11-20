-- ─────────────────────────────────────────────────────────────────────────────
-- 01 · What every table shares                                PostgreSQL 13+
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Every table in this schema carries the same audit columns:
--
--   id              bigint     the row, for joins; never leaves the server
--   uuid            uuid       the public id: the only one the API shows
--   created_at      when it was made        created_by_id   by whom
--   updated_at      when it last changed    updated_by_id   by whom
--   deleted_at      when it was deleted     deleted_by_id   by whom
--
-- Deleting is a soft delete: it stamps deleted_at and deleted_by_id, and the
-- row stays, so it can be restored and its history still makes sense. Every
-- list filters on `deleted_at is null`, and the indexes are partial on it.
--
-- The *_by_id columns point at your users with `on delete set null`: removing
-- a person keeps everything they made, without their name on it.

-- Your users. The schema only needs `id`: point the foreign keys at your own
-- table (Django's auth_user, Supabase's auth.users) and drop this one.
create table app_user (
  id         bigint generated always as identity primary key,
  uuid       uuid not null unique default gen_random_uuid(),
  email      varchar(254) not null unique,
  name       varchar(120) not null,
  created_at timestamptz not null default now()
);

-- updated_at follows every change, whoever makes it — the app, a job, psql.
-- updated_by_id is set by the app, which knows who is signed in.
create function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- The audit columns, for a table to copy. Written out in every table below so
-- each one reads on its own; this is the reference:
--
--   uuid           uuid not null unique default gen_random_uuid(),
--   created_at     timestamptz not null default now(),
--   created_by_id  bigint references app_user (id) on delete set null,
--   updated_at     timestamptz not null default now(),
--   updated_by_id  bigint references app_user (id) on delete set null,
--   deleted_at     timestamptz,
--   deleted_by_id  bigint references app_user (id) on delete set null,
--
-- and after the table:
--
--   create trigger <table>_touch before update on <table>
--     for each row execute function touch_updated_at();
