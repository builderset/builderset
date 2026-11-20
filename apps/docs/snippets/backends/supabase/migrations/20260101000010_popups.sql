-- ─────────────────────────────────────────────────────────────────────────────
-- 10 · Popups, what visitors sent through them, and how they did
-- ─────────────────────────────────────────────────────────────────────────────
--
-- The tables, the writes that are a popup's own, and who may read them. The
-- writes every document shares (07_writes.sql) take popup like the others.

create table public.popup (
  id             bigint generated always as identity primary key,

  -- What it is: copies of the document, kept by popup_copy_meta()
  name           varchar(120) not null,                -- document.meta.name
  type           varchar(16) not null default 'modal'
                 check (type in ('modal', 'slidein', 'bartop', 'barbottom',
                                 'fullscreen', 'drawer', 'inline')),
  status         varchar(16) not null default 'draft'
                 check (status in ('draft', 'published', 'paused')),

  -- Copies of document.display, so the site asks one indexed question:
  -- which popups may show on this page today. The rest of the rules
  -- (audience, frequency, device) run in the browser with shouldShow.
  starts_at      timestamptz,
  ends_at        timestamptz,
  priority       smallint not null default 0,          -- two popups match: the higher one shows

  -- The document
  document       jsonb not null,
  draft_document jsonb,
  saved_at       timestamptz(3) not null default now(),
  version        integer not null default 0,
  published_at   timestamptz,
  published_by   uuid references auth.users (id) on delete set null,

  -- Audit
  uuid           uuid not null unique default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null,
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users (id) on delete set null,
  deleted_at     timestamptz,
  deleted_by     uuid references auth.users (id) on delete set null,

  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

-- The site's question, on every page view.
create index popup_live
  on public.popup (priority desc)
  where status = 'published' and deleted_at is null;

create trigger popup_touch before update on public.popup
  for each row execute function public.touch_updated_at();
create trigger popup_stamp before insert or update on public.popup
  for each row execute function public.stamp_actor();

-- The display rules keep calendar days, 2026-11-30, in the visitor's own time
-- zone. A day begins and ends at different instants around the world, so the
-- columns hold the widest window — from the first place the first day begins
-- (UTC+14) to the last place the last day ends (UTC−12) — and the browser's
-- shouldShow decides by the visitor's own day.
create function public.popup_copy_meta() returns trigger
language plpgsql set search_path = ''
as $$
declare
  popup   jsonb := new.document -> 'nodes' -> (new.document ->> 'root') -> 'props';
  display jsonb := popup -> 'display';
  starts  date  := nullif(display ->> 'starts', '')::date;
  ends    date  := nullif(display ->> 'ends', '')::date;
begin
  new.name     := left(coalesce(new.document #>> '{meta,name}', ''), 120);
  new.type     := popup ->> 'type';
  new.priority := coalesce((display ->> 'priority')::smallint, 0);
  -- A draft may hold its dates the wrong way round (publishing refuses them):
  -- no window until they are fixed.
  if starts > ends then
    starts := null;
    ends := null;
  end if;
  new.starts_at := (starts - interval '14 hours') at time zone 'UTC';
  new.ends_at   := (ends + interval '36 hours') at time zone 'UTC';
  return new;
end;
$$;

create trigger popup_copy_meta
  before insert or update of document on public.popup
  for each row execute function public.popup_copy_meta();

create table public.popup_revision (
  id         bigint generated always as identity primary key,
  uuid       uuid not null unique default gen_random_uuid(),
  popup_id   bigint not null references public.popup (id) on delete cascade,
  kind       varchar(16) not null check (kind in ('autosave', 'manual', 'publish')),
  label      varchar(120),
  version    integer not null,
  document   jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create index popup_revision_history
  on public.popup_revision (popup_id, created_at desc);

-- What a visitor typed into a popup's inputs: validateSubmission's values only.
create table public.popup_submission (
  id            bigint generated always as identity primary key,
  popup_id      bigint not null references public.popup (id) on delete cascade,
  popup_version integer not null,
  answers       jsonb not null,
  page_path     varchar(500),                          -- where it was sent from
  locale        varchar(10),
  status        varchar(30) not null default 'new',    -- your team's triage
  ip            inet,                                  -- only if your privacy rules allow it

  -- Audit
  uuid          uuid not null unique default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users (id) on delete set null,
  deleted_at    timestamptz,
  deleted_by    uuid references auth.users (id) on delete set null
);

create index popup_submission_inbox
  on public.popup_submission (popup_id, created_at desc)
  where deleted_at is null;

create trigger popup_submission_touch before update on public.popup_submission
  for each row execute function public.touch_updated_at();
create trigger popup_submission_stamp before insert or update on public.popup_submission
  for each row execute function public.stamp_actor();

-- How a popup did, one row per popup and day: counters, never one row per view.
create table public.popup_daily_stat (
  popup_id  bigint not null references public.popup (id) on delete cascade,
  day       date not null,
  shown     integer not null default 0,
  closed    integer not null default 0,
  clicked   integer not null default 0,
  submitted integer not null default 0,
  primary key (popup_id, day)
);

-- ── The writes ──────────────────────────────────────────────────────────────

-- PATCH /popups/:id/pause, { paused }: off the site, kept as it is, or back
-- on. Only the status changes: the document and saved_at stay as they are.
create function public.pause_popup(
  p_uuid uuid, p_paused boolean, p_actor uuid
) returns text
language plpgsql set search_path = ''
as $$
declare
  doc    record;
  wanted text := case when p_paused then 'paused' else 'published' end;
begin
  select * into doc from public.lock_document('popup', p_uuid);
  if doc.status = 'draft' then
    raise exception 'This popup has never been published: publish it first.'
      using errcode = 'PT409';
  end if;
  if doc.status <> wanted then
    update public.popup set status = wanted, updated_by = p_actor where id = doc.id;
    perform public.log_activity('popup', doc.id,
      case when p_paused then 'paused' else 'published' end, p_actor, doc.status, wanted);
  end if;
  return wanted;
end;
$$;

-- PopupView's onEvent, straight from the page with the anon key:
--   supabase.rpc('record_popup_event', { p_popup: id, p_event: 'shown' })
-- A counter needs none of the kit's checks, so no Edge Function sits in
-- between. It runs as its owner, because the public may not write to
-- popup_daily_stat; all a caller can do is add one to a counter of a popup
-- that has been on the site. One statement, so two visitors both count.
create function public.record_popup_event(p_popup uuid, p_event text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  live_popup bigint;
begin
  if p_event is null or p_event not in ('shown', 'closed', 'clicked', 'submitted') then
    raise exception 'An event is shown, closed, clicked or submitted.' using errcode = 'PT422';
  end if;
  select id into live_popup
    from public.popup
   where uuid = p_popup and status in ('published', 'paused') and deleted_at is null;
  if live_popup is null then
    raise exception 'There is no such popup.' using errcode = 'PT404';
  end if;

  insert into public.popup_daily_stat as stat (popup_id, day, shown, closed, clicked, submitted)
  values (live_popup, current_date, (p_event = 'shown')::int, (p_event = 'closed')::int,
          (p_event = 'clicked')::int, (p_event = 'submitted')::int)
  on conflict (popup_id, day) do update
     set shown     = stat.shown     + excluded.shown,
         closed    = stat.closed    + excluded.closed,
         clicked   = stat.clicked   + excluded.clicked,
         submitted = stat.submitted + excluded.submitted;
end;
$$;

-- A visitor's submission, after validateSubmission. Stored only while the
-- popup is on the site: null means it was paused or ended meanwhile.
-- p_visitor is the signed-in visitor, or null.
create function public.record_popup_submission(
  p_popup uuid, p_popup_version integer, p_answers jsonb, p_page_path text,
  p_locale text, p_ip inet, p_visitor uuid
) returns uuid
language plpgsql set search_path = ''
as $$
declare
  live_popup      bigint;
  submission_id   bigint;
  submission_uuid uuid;
begin
  select id into live_popup
    from public.popup
   where uuid = p_popup and status = 'published' and deleted_at is null
     and (starts_at is null or starts_at <= now())
     and (ends_at is null or ends_at > now())
     for share;
  if live_popup is null then
    return null;
  end if;

  insert into public.popup_submission
    (popup_id, popup_version, answers, page_path, locale, ip, created_by, updated_by)
  values
    (live_popup, p_popup_version, p_answers, p_page_path, p_locale, p_ip, p_visitor, p_visitor)
  returning id, uuid into submission_id, submission_uuid;
  perform public.log_activity('popup_submission', submission_id, 'created', p_visitor,
    p_to_status => 'new', p_details => jsonb_build_object('popup', p_popup));
  return submission_uuid;
end;
$$;

-- ── Who may read and write ──────────────────────────────────────────────────
--
--   the team (profiles)   reads every popup, revision, submission and counter
--   the public (anon)     reads the live popups' public columns, and adds to
--                         their counters with record_popup_event()
--   the service role      writes everything else, after the kits' checks

alter table public.popup            enable row level security;
alter table public.popup_revision   enable row level security;
alter table public.popup_submission enable row level security;
alter table public.popup_daily_stat enable row level security;

revoke insert, update, delete, truncate
  on public.popup, public.popup_revision, public.popup_submission, public.popup_daily_stat
  from anon, authenticated;
revoke select
  on public.popup, public.popup_revision, public.popup_submission, public.popup_daily_stat
  from anon;
revoke update, truncate on public.popup_revision from service_role;

create policy "the team reads popups" on public.popup
  for select to authenticated using ((select public.is_team_member()));
create policy "the team reads popup revisions" on public.popup_revision
  for select to authenticated using ((select public.is_team_member()));
create policy "the team reads popup submissions" on public.popup_submission
  for select to authenticated using ((select public.is_team_member()));
create policy "the team reads popup counters" on public.popup_daily_stat
  for select to authenticated using ((select public.is_team_member()));

-- The site's question: a published popup, not deleted, inside its window.
-- Never a draft_document, a paused one, or who wrote it; the page's path and
-- language are the popups function's to match, the rest is shouldShow's.
grant select (uuid, type, version, document, priority) on public.popup to anon;
create policy "the public reads live popups" on public.popup
  for select to anon
  using (status = 'published' and deleted_at is null
         and (starts_at is null or starts_at <= now())
         and (ends_at is null or ends_at > now()));

revoke execute on function
  public.popup_copy_meta(),
  public.pause_popup(uuid, boolean, uuid),
  public.record_popup_event(uuid, text),
  public.record_popup_submission(uuid, integer, jsonb, text, text, inet, uuid)
  from public, anon, authenticated;
grant execute on function public.record_popup_event(uuid, text) to anon, authenticated;
