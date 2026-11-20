-- The tables a Builderset backend needs, for every builder: email templates,
-- articles and forms, with what they share — revisions, saved sections and
-- uploaded media — and the responses a form collects. PostgreSQL 13 or newer.
--
-- Every document table has the same core:
--   document        the live document: what readers get, what is sent
--   draft_document  work in progress since; null when there is none
--   saved_at        changes on every write; a save that brings an older one
--                   is someone else's stale copy (409)
--   status, version, published_at
-- and adds the columns its site lists, searches and joins by.

-- ── Email templates ─────────────────────────────────────────────────────────
create table email_template (
  id             bigint generated always as identity primary key,
  name           varchar(120) not null,
  -- The email type it is for (password_reset, newsletter): its variables.
  type_key       varchar(60),
  status         text not null default 'draft'
                 check (status in ('draft', 'published')),
  document       jsonb not null,
  draft_document jsonb,
  saved_at       timestamptz(3) not null default now(),
  version        integer not null default 0,
  published_at   timestamptz(3),
  created_by     bigint,
  created_at     timestamptz(3) not null default now()
);
-- One active design per email type: the one the mailer sends.
create unique index email_template_active_type
  on email_template (type_key) where status = 'published';

-- ── Articles ────────────────────────────────────────────────────────────────
create table article (
  id             bigint generated always as identity primary key,
  slug           varchar(200) not null,
  -- The language the article's tree is written in.
  locale         varchar(10) not null,
  status         text not null default 'draft'
                 check (status in ('draft', 'scheduled', 'published', 'archived')),
  document       jsonb not null,
  draft_document jsonb,
  saved_at       timestamptz(3) not null default now(),
  version        integer not null default 0,
  scheduled_at   timestamptz(3),
  published_at   timestamptz(3),
  -- Copies of document.meta, written in the same transaction as the document,
  -- for lists, search and cards: the site never reads inside the JSON for them.
  title          varchar(300) not null default '',
  excerpt        varchar(600) not null default '',
  cover_key      varchar(300),
  cover_alt      varchar(300),
  author_id      bigint,
  created_at     timestamptz(3) not null default now(),
  unique (slug, locale)
);
create index article_published on article (locale, published_at desc)
  where status = 'published';
-- A job publishes these when their time comes.
create index article_due on article (scheduled_at) where status = 'scheduled';

-- ── Forms ───────────────────────────────────────────────────────────────────
create table form (
  id             bigint generated always as identity primary key,
  -- Its public address: example.com/f/<slug>. A copy of document.meta.slug.
  slug           varchar(80) not null unique,
  name           varchar(120) not null default '',
  status         text not null default 'draft'
                 check (status in ('draft', 'published', 'closed')),
  document       jsonb not null,
  draft_document jsonb,
  saved_at       timestamptz(3) not null default now(),
  version        integer not null default 0,
  published_at   timestamptz(3),
  response_count integer not null default 0,
  created_by     bigint,
  created_at     timestamptz(3) not null default now()
);

-- One row per submission: the answers validateAnswers kept, never the raw body.
create table form_response (
  id           bigint generated always as identity primary key,
  form_id      bigint not null references form (id) on delete cascade,
  -- The version answered: a later edit to the form does not change what it asked.
  form_version integer not null,
  answers      jsonb not null,
  locale       varchar(10),
  -- Your team's own triage: new, called, done…
  status       varchar(30) not null default 'new',
  -- Only when the form's settings.privacy.storeIp is on.
  ip           inet,
  created_at   timestamptz(3) not null default now()
);
create index form_response_latest on form_response (form_id, created_at desc);

-- ── What every builder shares ──────────────────────────────────────────────
-- A version to go back to: every manual save and publish, and a few autosaves.
create table revision (
  id            bigint generated always as identity primary key,
  document_kind text not null check (document_kind in ('email', 'article', 'form')),
  document_id   bigint not null,
  kind          text not null check (kind in ('autosave', 'manual', 'publish')),
  label         varchar(120),
  document      jsonb not null,
  author_id     bigint,
  created_at    timestamptz(3) not null default now()
);
create index revision_history on revision (document_kind, document_id, created_at desc);

-- A piece of a document saved to reuse: an email header, an article's call to action.
create table saved_section (
  id         bigint generated always as identity primary key,
  kit        text not null check (kit in ('email', 'article', 'form')),
  name       varchar(120) not null,
  fragment   jsonb not null,
  -- An email section kept in step everywhere it is used.
  synced     boolean not null default false,
  created_by bigint,
  created_at timestamptz(3) not null default now()
);

-- Every uploaded file, by the key the documents store.
create table media (
  key        varchar(300) primary key,
  kind       text not null check (kind in ('image', 'video', 'audio', 'file')),
  mime       varchar(100) not null,
  size       integer not null,
  width      integer,
  height     integer,
  name       varchar(300) not null,
  owner_id   bigint,
  created_at timestamptz(3) not null default now()
);
