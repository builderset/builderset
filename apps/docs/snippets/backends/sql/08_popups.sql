-- ─────────────────────────────────────────────────────────────────────────────
-- 08 · Popups, what visitors sent through them, and how they did
-- ─────────────────────────────────────────────────────────────────────────────

create table popup (
  id              bigint generated always as identity primary key,

  -- What it is
  name            varchar(120) not null,               -- document.meta.name
  type            varchar(16) not null default 'modal'
                  check (type in ('modal', 'slidein', 'bartop', 'barbottom',
                                  'fullscreen', 'drawer', 'inline')),
  status          varchar(16) not null default 'draft'
                  check (status in ('draft', 'published', 'paused')),

  -- Copies of document.display, so the site asks one indexed question:
  -- which popups may show on this page today. The rest of the rules
  -- (audience, frequency, device) run in the browser with shouldShow.
  starts_at       timestamptz,
  ends_at         timestamptz,
  priority        smallint not null default 0,         -- two popups match: the higher one shows

  -- The document
  document        jsonb not null,
  draft_document  jsonb,
  saved_at        timestamptz(3) not null default now(),
  version         integer not null default 0,
  published_at    timestamptz,
  published_by_id bigint references app_user (id) on delete set null,

  -- Audit
  uuid            uuid not null unique default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  created_by_id   bigint references app_user (id) on delete set null,
  updated_at      timestamptz not null default now(),
  updated_by_id   bigint references app_user (id) on delete set null,
  deleted_at      timestamptz,
  deleted_by_id   bigint references app_user (id) on delete set null,

  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

-- The site's question, on every page view.
create index popup_live
  on popup (priority desc)
  where status = 'published' and deleted_at is null;

create trigger popup_touch before update on popup
  for each row execute function touch_updated_at();

create table popup_revision (
  id            bigint generated always as identity primary key,
  uuid          uuid not null unique default gen_random_uuid(),
  popup_id      bigint not null references popup (id) on delete cascade,
  kind          varchar(16) not null check (kind in ('autosave', 'manual', 'publish')),
  label         varchar(120),
  version       integer not null,
  document      jsonb not null,
  created_at    timestamptz not null default now(),
  created_by_id bigint references app_user (id) on delete set null
);

create index popup_revision_history
  on popup_revision (popup_id, created_at desc);

-- What a visitor typed into a popup's inputs: validateSubmission's values only.
create table popup_submission (
  id             bigint generated always as identity primary key,
  popup_id       bigint not null references popup (id) on delete cascade,
  popup_version  integer not null,
  answers        jsonb not null,
  page_path      varchar(500),                         -- where it was sent from
  locale         varchar(10),
  status         varchar(30) not null default 'new',   -- your team's triage
  ip             inet,                                 -- only if your privacy rules allow it

  -- Audit
  uuid           uuid not null unique default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  created_by_id  bigint references app_user (id) on delete set null,
  updated_at     timestamptz not null default now(),
  updated_by_id  bigint references app_user (id) on delete set null,
  deleted_at     timestamptz,
  deleted_by_id  bigint references app_user (id) on delete set null
);

create index popup_submission_inbox
  on popup_submission (popup_id, created_at desc)
  where deleted_at is null;

create trigger popup_submission_touch before update on popup_submission
  for each row execute function touch_updated_at();

-- How a popup did, one row per popup and day: counters, never one row per view.
-- The public route adds to today's row with an upsert.
create table popup_daily_stat (
  popup_id    bigint not null references popup (id) on delete cascade,
  day         date not null,
  shown       integer not null default 0,
  closed      integer not null default 0,
  clicked     integer not null default 0,
  submitted   integer not null default 0,
  primary key (popup_id, day)
);
