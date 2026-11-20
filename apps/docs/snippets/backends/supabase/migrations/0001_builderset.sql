-- The Builderset tables on Supabase: schema.sql with uuid ids and Supabase's
-- users, Row Level Security on every table, and a Storage bucket for media.
--
-- Who may do what:
--   the team (profiles)  reads every document; writes go through the
--                        `documents` Edge Function, which checks them first
--   the public (anon)    reads published articles and forms, nothing else
--   form responses       only the `form-responses` function inserts them

-- ── The team ────────────────────────────────────────────────────────────────
-- A row here makes a user part of the team. A team edits each other's work, so
-- the rule is "is an editor", not "made this row" (auth.uid() = created_by),
-- which would let nobody but its author fix a typo in a template.
create table public.profiles (
  id   uuid primary key references auth.users on delete cascade,
  -- Publishing is its own permission: a draft and a live page are different trust.
  role text not null check (role in ('editor', 'publisher'))
);
alter table public.profiles enable row level security;
create policy "members read their own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

-- Runs as its owner, so a policy can ask it without reading profiles itself.
create function public.is_editor() returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()))
$$;

-- ── Email templates ─────────────────────────────────────────────────────────
create table public.email_template (
  id             uuid primary key default gen_random_uuid(),
  name           varchar(120) not null,
  type_key       varchar(60),
  status         text not null default 'draft' check (status in ('draft', 'published')),
  document       jsonb not null,
  draft_document jsonb,
  saved_at       timestamptz(3) not null default now(),
  version        integer not null default 0,
  published_at   timestamptz(3),
  created_by     uuid references auth.users on delete set null,
  created_at     timestamptz(3) not null default now()
);
create unique index email_template_active_type
  on public.email_template (type_key) where status = 'published';

-- ── Articles ────────────────────────────────────────────────────────────────
create table public.article (
  id             uuid primary key default gen_random_uuid(),
  slug           varchar(200) not null,
  locale         varchar(10) not null,
  status         text not null default 'draft'
                 check (status in ('draft', 'scheduled', 'published', 'archived')),
  document       jsonb not null,
  draft_document jsonb,
  saved_at       timestamptz(3) not null default now(),
  version        integer not null default 0,
  scheduled_at   timestamptz(3),
  published_at   timestamptz(3),
  title          varchar(300) not null default '',
  excerpt        varchar(600) not null default '',
  cover_key      varchar(300),
  cover_alt      varchar(300),
  author_id      uuid references auth.users on delete set null,
  created_at     timestamptz(3) not null default now(),
  unique (slug, locale)
);
create index article_published on public.article (locale, published_at desc)
  where status = 'published';
create index article_due on public.article (scheduled_at) where status = 'scheduled';

-- ── Forms ───────────────────────────────────────────────────────────────────
create table public.form (
  id             uuid primary key default gen_random_uuid(),
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
  created_by     uuid references auth.users on delete set null,
  created_at     timestamptz(3) not null default now()
);

create table public.form_response (
  id           uuid primary key default gen_random_uuid(),
  form_id      uuid not null references public.form (id) on delete cascade,
  form_version integer not null,
  answers      jsonb not null,
  locale       varchar(10),
  status       varchar(30) not null default 'new',
  ip           inet,
  created_at   timestamptz(3) not null default now()
);
create index form_response_latest on public.form_response (form_id, created_at desc);

-- ── What every builder shares ──────────────────────────────────────────────
create table public.revision (
  id            uuid primary key default gen_random_uuid(),
  document_kind text not null check (document_kind in ('email', 'article', 'form')),
  document_id   uuid not null,
  kind          text not null check (kind in ('autosave', 'manual', 'publish')),
  label         varchar(120),
  document      jsonb not null,
  author_id     uuid references auth.users on delete set null,
  created_at    timestamptz(3) not null default now()
);
create index revision_history on public.revision (document_kind, document_id, created_at desc);

create table public.saved_section (
  id         uuid primary key default gen_random_uuid(),
  kit        text not null check (kit in ('email', 'article', 'form')),
  name       varchar(120) not null,
  fragment   jsonb not null,
  synced     boolean not null default false,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz(3) not null default now()
);

-- There is no media table: Storage's own storage.objects is one. It holds
-- each file's key (name), size and type (metadata) and owner.

-- ── Row Level Security ─────────────────────────────────────────────────────
-- Supabase grants every table to anon and authenticated, and RLS then decides
-- which rows. The team reads everything; nobody writes through the REST API:
-- with no insert or update policy, only the service role (the Edge Functions,
-- after their checks) can. A document written straight to the table would
-- skip the check that keeps an unsafe link out of it.
alter table public.email_template enable row level security;
alter table public.article enable row level security;
alter table public.form enable row level security;
alter table public.form_response enable row level security;
alter table public.revision enable row level security;
alter table public.saved_section enable row level security;

create policy "the team reads email templates" on public.email_template
  for select to authenticated using ((select public.is_editor()));
create policy "the team reads articles" on public.article
  for select to authenticated using ((select public.is_editor()));
create policy "the team reads forms" on public.form
  for select to authenticated using ((select public.is_editor()));
create policy "the team reads responses" on public.form_response
  for select to authenticated using ((select public.is_editor()));
create policy "the team reads revisions" on public.revision
  for select to authenticated using ((select public.is_editor()));
create policy "the team reads saved sections" on public.saved_section
  for select to authenticated using ((select public.is_editor()));

-- The team triages responses (new, called, done): that column and no other.
revoke update on public.form_response from authenticated;
grant update (status) on public.form_response to authenticated;
create policy "the team triages responses" on public.form_response
  for update to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

-- The public reads the live document of published rows, and only these
-- columns: a draft_document is never theirs to see, even of a published row.
revoke all on public.article from anon;
grant select (id, slug, locale, document, title, excerpt, cover_key, cover_alt, published_at)
  on public.article to anon;
create policy "the public reads published articles" on public.article
  for select to anon using (status = 'published');

-- A closed form is read too: its page shows the form's closed message.
revoke all on public.form from anon;
grant select (id, slug, status, document) on public.form to anon;
create policy "the public reads published forms" on public.form
  for select to anon using (status in ('published', 'closed'));

-- Nothing else is the public's. form_response has no policy for anon at all:
-- a response is stored only after the function has checked its answers.
revoke all on public.email_template, public.form_response, public.revision,
  public.saved_section, public.profiles from anon;

-- ── A response, counted and stored in one transaction ──────────────────────
-- Called by the form-responses function with the service role, after
-- validateAnswers. The count goes up only while the form is published and has
-- room, so two last responses at once cannot both get in.
create function public.record_form_response(
  p_form_id uuid, p_form_version integer, p_answers jsonb, p_locale text, p_ip inet,
  p_max_responses integer
) returns uuid
  language plpgsql set search_path = ''
as $$
declare
  new_id uuid;
begin
  update public.form set response_count = response_count + 1
   where id = p_form_id and status = 'published'
     and (p_max_responses is null or response_count < p_max_responses);
  if not found then
    return null;
  end if;
  insert into public.form_response (form_id, form_version, answers, locale, ip)
  values (p_form_id, p_form_version, p_answers, p_locale, p_ip)
  returning id into new_id;
  return new_id;
end
$$;
-- Functions are callable by everyone unless taken back.
revoke execute on function public.record_form_response from public, anon, authenticated;
grant execute on function public.record_form_response to service_role;

-- ── Media ───────────────────────────────────────────────────────────────────
-- A public bucket: published articles and forms show their images to anyone,
-- at a URL that never changes. Its size and type limits are checked by
-- Storage on the server; the editor's own check is for the writer's comfort.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760,
        array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'application/pdf']);

-- The team uploads into its own folder (<user id>/<file>). There is no update
-- or delete policy: a document holds a file's key, and a key never changes.
create policy "the team uploads media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (select public.is_editor())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
