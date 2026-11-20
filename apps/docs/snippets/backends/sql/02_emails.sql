-- ─────────────────────────────────────────────────────────────────────────────
-- 02 · Email templates
-- ─────────────────────────────────────────────────────────────────────────────

create table email_template (
  id              bigint generated always as identity primary key,

  -- What it is
  name            varchar(120) not null,               -- document.meta.name
  type_key        varchar(60),                         -- password_reset, newsletter: its variables
  status          varchar(16) not null default 'draft'
                  check (status in ('draft', 'published')),

  -- The document
  document        jsonb not null,                      -- live: what the mailer sends
  draft_document  jsonb,                               -- unpublished changes; null when none
  saved_at        timestamptz(3) not null default now(), -- the editor's conflict check
  version         integer not null default 0,          -- counts publishes
  published_at    timestamptz,
  published_by_id bigint references app_user (id) on delete set null,

  -- Audit
  uuid            uuid not null unique default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  created_by_id   bigint references app_user (id) on delete set null,
  updated_at      timestamptz not null default now(),
  updated_by_id   bigint references app_user (id) on delete set null,
  deleted_at      timestamptz,
  deleted_by_id   bigint references app_user (id) on delete set null
);

-- One active design per email type: the one the mailer sends.
create unique index email_template_one_active_per_type
  on email_template (type_key)
  where status = 'published' and deleted_at is null;

-- The list: newest change first.
create index email_template_list
  on email_template (updated_at desc)
  where deleted_at is null;

create trigger email_template_touch before update on email_template
  for each row execute function touch_updated_at();

-- A version to go back to: every manual save and publish, and a few autosaves.
-- Written once and never edited: restoring one writes a new one.
create table email_template_revision (
  id                bigint generated always as identity primary key,
  uuid              uuid not null unique default gen_random_uuid(),
  email_template_id bigint not null references email_template (id) on delete cascade,
  kind              varchar(16) not null check (kind in ('autosave', 'manual', 'publish')),
  label             varchar(120),                      -- "Before the legal review"
  version           integer not null,                  -- the template's version then
  document          jsonb not null,
  created_at        timestamptz not null default now(),
  created_by_id     bigint references app_user (id) on delete set null
);

create index email_template_revision_history
  on email_template_revision (email_template_id, created_at desc);
