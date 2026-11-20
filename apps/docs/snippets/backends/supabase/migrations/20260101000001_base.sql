-- ─────────────────────────────────────────────────────────────────────────────
-- 01 · What every table shares, on Supabase
-- ─────────────────────────────────────────────────────────────────────────────
--
-- The audit columns of the SQL schema, with Supabase's own users:
--
--   id          bigint  the row, for joins; never leaves the server
--   uuid        uuid    the public id: the only one the API shows
--   created_at  when it was made        created_by  by whom
--   updated_at  when it last changed    updated_by  by whom
--   deleted_at  when it was deleted     deleted_by  by whom
--
-- The *_by columns hold an auth.users id, `on delete set null`: removing a
-- person keeps everything they made, without their name on it.

-- ── The team ────────────────────────────────────────────────────────────────
-- A row here makes a user part of the team. A team edits each other's work, so
-- the rule is "is on the team", not "made this row" (auth.uid() = created_by),
-- which would let nobody but its author fix a typo in a template. You add
-- members yourself, from the dashboard or SQL.
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       varchar(120) not null,                     -- what answers show beside the id
  -- Publishing is its own permission: a draft and a live page are different trust.
  role       varchar(16) not null check (role in ('editor', 'publisher')),
  created_at timestamptz not null default now()
);

-- Runs as its owner, so a policy can ask it without reading profiles itself.
create function public.is_team_member() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()))
$$;

-- ── updated_at ──────────────────────────────────────────────────────────────
-- Follows every change, whoever makes it: a function, a job, the SQL editor.
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── created_by and updated_by ───────────────────────────────────────────────
-- A write made with a user's token carries auth.uid(), and it wins over
-- anything the request said: a user cannot sign someone else's name.
--
-- The Edge Functions write with the service role, which has no user, so
-- auth.uid() is null there. They checked the caller's token themselves and
-- pass that user to the write functions (07_writes.sql), which set the
-- columns; this trigger then leaves them alone.
create function public.stamp_actor() returns trigger
language plpgsql set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.created_by := actor;
  end if;
  new.updated_by := actor;
  return new;
end;
$$;

-- The audit columns, for a table to copy. Written out in every table that
-- follows so each one reads on its own; this is the reference:
--
--   uuid        uuid not null unique default gen_random_uuid(),
--   created_at  timestamptz not null default now(),
--   created_by  uuid references auth.users (id) on delete set null,
--   updated_at  timestamptz not null default now(),
--   updated_by  uuid references auth.users (id) on delete set null,
--   deleted_at  timestamptz,
--   deleted_by  uuid references auth.users (id) on delete set null,
--
-- and after the table:
--
--   create trigger <table>_touch before update on public.<table>
--     for each row execute function public.touch_updated_at();
--   create trigger <table>_stamp before insert or update on public.<table>
--     for each row execute function public.stamp_actor();
