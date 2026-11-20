-- ─────────────────────────────────────────────────────────────────────────────
-- 05 · The library: saved sections and uploaded media, shared by every builder
-- ─────────────────────────────────────────────────────────────────────────────

-- A piece of a document saved to reuse: an email header, an article's call to action.
create table saved_section (
  id            bigint generated always as identity primary key,
  kit           varchar(16) not null check (kit in ('email', 'article', 'form')),
  name          varchar(120) not null,
  fragment      jsonb not null,                        -- the editor's { roots, nodes }
  synced        boolean not null default false,        -- an email section kept in step everywhere

  -- Audit
  uuid          uuid not null unique default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  created_by_id bigint references app_user (id) on delete set null,
  updated_at    timestamptz not null default now(),
  updated_by_id bigint references app_user (id) on delete set null,
  deleted_at    timestamptz,
  deleted_by_id bigint references app_user (id) on delete set null
);

create index saved_section_by_kit
  on saved_section (kit, name)
  where deleted_at is null;

create trigger saved_section_touch before update on saved_section
  for each row execute function touch_updated_at();

-- Every uploaded file, by the key the documents store. A document holds the key,
-- never a URL: the URL is built when it is shown, so a CDN can move in front.
create table media (
  id            bigint generated always as identity primary key,
  key           varchar(300) not null unique,          -- where the bytes are: 2026/11/3f9c….png
  kind          varchar(8) not null check (kind in ('image', 'video', 'audio', 'file')),
  mime          varchar(100) not null,                 -- checked by the file's first bytes
  size          integer not null check (size > 0),     -- bytes
  width         integer,                               -- images and video
  height        integer,
  name          varchar(300) not null,                 -- the name it was uploaded with
  alt           varchar(300) not null default '',      -- the default alt text
  sha256        char(64) not null,                     -- the same file twice is one row

  -- Audit
  uuid          uuid not null unique default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  created_by_id bigint references app_user (id) on delete set null,
  updated_at    timestamptz not null default now(),
  updated_by_id bigint references app_user (id) on delete set null,
  deleted_at    timestamptz,
  deleted_by_id bigint references app_user (id) on delete set null
);

create index media_library
  on media (kind, created_at desc)
  where deleted_at is null;

create index media_by_hash on media (sha256);

create trigger media_touch before update on media
  for each row execute function touch_updated_at();
