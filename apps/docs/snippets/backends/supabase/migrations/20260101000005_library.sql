-- ─────────────────────────────────────────────────────────────────────────────
-- 05 · The library: saved sections and uploaded media, shared by every builder
-- ─────────────────────────────────────────────────────────────────────────────

-- A piece of a document saved to reuse: an email header, an article's call to action.
create table public.saved_section (
  id         bigint generated always as identity primary key,
  kit        varchar(16) not null check (kit in ('email', 'article', 'form')),
  name       varchar(120) not null,
  fragment   jsonb not null,                            -- the editor's { roots, nodes }
  synced     boolean not null default false,            -- an email section kept in step everywhere

  -- Audit
  uuid       uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id) on delete set null
);

create index saved_section_by_kit
  on public.saved_section (kit, name)
  where deleted_at is null;

create trigger saved_section_touch before update on public.saved_section
  for each row execute function public.touch_updated_at();
create trigger saved_section_stamp before insert or update on public.saved_section
  for each row execute function public.stamp_actor();

-- Every uploaded file, by its key in the `media` bucket. Storage keeps its own
-- storage.objects; this table adds what the editor needs and Storage does not
-- know: the kind, the size of an image, its alt text, who uploaded it, and a
-- hash so the same file twice is one row.
create table public.media (
  id         bigint generated always as identity primary key,
  key        varchar(300) not null unique,              -- the object's name in the bucket
  kind       varchar(8) not null check (kind in ('image', 'video', 'audio', 'file')),
  mime       varchar(100) not null,                     -- checked by the file's first bytes
  size       integer not null check (size > 0),         -- bytes
  width      integer,                                   -- images
  height     integer,
  name       varchar(300) not null,                     -- the name it was uploaded with
  alt        varchar(300) not null default '',          -- the default alt text
  sha256     char(64) not null,

  -- Audit: created_by is who uploaded it
  uuid       uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references auth.users (id) on delete set null
);

create index media_library
  on public.media (kind, created_at desc)
  where deleted_at is null;

create index media_by_hash on public.media (sha256);

create trigger media_touch before update on public.media
  for each row execute function public.touch_updated_at();
create trigger media_stamp before insert or update on public.media
  for each row execute function public.stamp_actor();

-- ── The bucket ──────────────────────────────────────────────────────────────
-- Public: published articles and forms show their images to anyone, at an
-- address that never changes. Storage itself refuses a file over the size
-- limit or of another type. There is no policy on storage.objects: only the
-- upload route writes here, with the service role, after reading the file's
-- first bytes. A deleted file stays until a job of yours removes the ones no
-- live document uses.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array[
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'audio/mpeg', 'application/pdf'
]);
