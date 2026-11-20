-- ─────────────────────────────────────────────────────────────────────────────
-- 03 · Articles
-- ─────────────────────────────────────────────────────────────────────────────

create table public.article (
  id             bigint generated always as identity primary key,

  -- Where it lives
  slug           varchar(200) not null,                -- the address, per language
  locale         varchar(10) not null,                 -- the language its tree is written in
  status         varchar(16) not null default 'draft'
                 check (status in ('draft', 'scheduled', 'published', 'archived')),
  scheduled_at   timestamptz,                          -- publish_due_articles() publishes it then

  -- Copies of document.meta, kept by a trigger, for lists, search and cards:
  -- the site never reads inside the JSON for them.
  title          varchar(300) not null default '',
  excerpt        varchar(600) not null default '',
  cover_key      varchar(300),
  cover_alt      varchar(300),
  author_id      uuid references auth.users (id) on delete set null, -- the byline

  -- The document
  document       jsonb not null,
  draft_document jsonb,
  saved_at       timestamptz(3) not null default now(),
  version        integer not null default 0,
  published_at   timestamptz,                          -- the first publish; the list sorts by it
  published_by   uuid references auth.users (id) on delete set null,

  -- Audit
  uuid           uuid not null unique default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null,
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users (id) on delete set null,
  deleted_at     timestamptz,
  deleted_by     uuid references auth.users (id) on delete set null
);

-- One article per address and language. Partial, so a deleted article frees
-- its slug instead of keeping it forever.
create unique index article_slug_locale
  on public.article (slug, locale)
  where deleted_at is null;

-- The site's list: published, in one language, newest first.
create index article_published
  on public.article (locale, published_at desc)
  where status = 'published' and deleted_at is null;

-- The job's question: which scheduled articles are due.
create index article_due
  on public.article (scheduled_at)
  where status = 'scheduled' and deleted_at is null;

create trigger article_touch before update on public.article
  for each row execute function public.touch_updated_at();
create trigger article_stamp before insert or update on public.article
  for each row execute function public.stamp_actor();

create function public.article_copy_meta() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.title     := left(coalesce(new.document #>> '{meta,title}', ''), 300);
  new.excerpt   := left(coalesce(new.document #>> '{meta,excerpt}', ''), 600);
  new.cover_key := new.document #>> '{meta,cover,media,key}';
  new.cover_alt := left(new.document #>> '{meta,cover,alt}', 300);
  return new;
end;
$$;

create trigger article_copy_meta
  before insert or update of document on public.article
  for each row execute function public.article_copy_meta();

create table public.article_revision (
  id         bigint generated always as identity primary key,
  uuid       uuid not null unique default gen_random_uuid(),
  article_id bigint not null references public.article (id) on delete cascade,
  kind       varchar(16) not null check (kind in ('autosave', 'manual', 'publish')),
  label      varchar(120),
  version    integer not null,
  document   jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create index article_revision_history
  on public.article_revision (article_id, created_at desc);
