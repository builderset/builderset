-- ─────────────────────────────────────────────────────────────────────────────
-- 04 · Forms and their responses
-- ─────────────────────────────────────────────────────────────────────────────

create table form (
  id              bigint generated always as identity primary key,

  -- Where it lives
  slug            varchar(80) not null,                -- example.com/f/<slug>: document.meta.slug
  name            varchar(120) not null default '',    -- document.meta.name
  status          varchar(16) not null default 'draft'
                  check (status in ('draft', 'published', 'closed')),
  response_count  integer not null default 0,          -- kept by the response route

  -- The document
  document        jsonb not null,
  draft_document  jsonb,
  saved_at        timestamptz(3) not null default now(),
  version         integer not null default 0,
  published_at    timestamptz,
  published_by_id bigint references app_user (id) on delete set null,
  closed_at       timestamptz,
  closed_by_id    bigint references app_user (id) on delete set null,

  -- Audit
  uuid            uuid not null unique default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  created_by_id   bigint references app_user (id) on delete set null,
  updated_at      timestamptz not null default now(),
  updated_by_id   bigint references app_user (id) on delete set null,
  deleted_at      timestamptz,
  deleted_by_id   bigint references app_user (id) on delete set null
);

-- A new form has no address yet: it stores `draft-<uuid>` until publishing
-- copies the real one. A deleted form frees its address.
create unique index form_slug
  on form (slug)
  where deleted_at is null;

create trigger form_touch before update on form
  for each row execute function touch_updated_at();

create table form_revision (
  id            bigint generated always as identity primary key,
  uuid          uuid not null unique default gen_random_uuid(),
  form_id       bigint not null references form (id) on delete cascade,
  kind          varchar(16) not null check (kind in ('autosave', 'manual', 'publish')),
  label         varchar(120),
  version       integer not null,                      -- a response's form_version finds it
  document      jsonb not null,
  created_at    timestamptz not null default now(),
  created_by_id bigint references app_user (id) on delete set null
);

create index form_revision_history
  on form_revision (form_id, created_at desc);

-- One row per submission: the answers validateAnswers kept, never the raw body.
create table form_response (
  id            bigint generated always as identity primary key,
  form_id       bigint not null references form (id) on delete cascade,
  form_version  integer not null,                      -- the version answered
  answers       jsonb not null,
  locale        varchar(10),

  -- Your team's own triage
  status        varchar(30) not null default 'new',    -- new, called, done…
  note          text not null default '',

  -- Where it came from
  ip            inet,                                  -- only when settings.privacy.storeIp is on

  -- Audit: created_by_id is the visitor when signed in; updated_* is your team
  uuid          uuid not null unique default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  created_by_id bigint references app_user (id) on delete set null,
  updated_at    timestamptz not null default now(),
  updated_by_id bigint references app_user (id) on delete set null,
  deleted_at    timestamptz,
  deleted_by_id bigint references app_user (id) on delete set null
);

-- The inbox: one form's responses, newest first.
create index form_response_inbox
  on form_response (form_id, created_at desc)
  where deleted_at is null;

-- The retention job: responses older than settings.privacy.keepMonths are
-- deleted for good — the one place rows are removed, because the law says so.
create index form_response_age on form_response (created_at);

create trigger form_response_touch before update on form_response
  for each row execute function touch_updated_at();
