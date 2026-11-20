-- ─────────────────────────────────────────────────────────────────────────────
-- 04 · Forms and their responses
-- ─────────────────────────────────────────────────────────────────────────────

create table public.form (
  id             bigint generated always as identity primary key,

  -- Where it lives. A new form has no address yet: it keeps `draft-<uuid>`
  -- until publishing copies document.meta.slug.
  slug           varchar(80) not null default 'draft-' || gen_random_uuid(),
  name           varchar(120) not null default '',     -- document.meta.name
  status         varchar(16) not null default 'draft'
                 check (status in ('draft', 'published', 'closed')),
  response_count integer not null default 0,           -- kept by record_form_response()

  -- The document
  document       jsonb not null,
  draft_document jsonb,
  saved_at       timestamptz(3) not null default now(),
  version        integer not null default 0,
  published_at   timestamptz,
  published_by   uuid references auth.users (id) on delete set null,
  closed_at      timestamptz,
  closed_by      uuid references auth.users (id) on delete set null,

  -- Audit
  uuid           uuid not null unique default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null,
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users (id) on delete set null,
  deleted_at     timestamptz,
  deleted_by     uuid references auth.users (id) on delete set null
);

-- A deleted form frees its address.
create unique index form_slug
  on public.form (slug)
  where deleted_at is null;

create trigger form_touch before update on public.form
  for each row execute function public.touch_updated_at();
create trigger form_stamp before insert or update on public.form
  for each row execute function public.stamp_actor();

-- The name follows the live document. The slug follows it once the form is
-- published: `document` changes only then, and the publish check has made
-- sure it is not empty.
create function public.form_copy_meta() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.name := left(coalesce(new.document #>> '{meta,name}', ''), 120);
  if tg_op = 'UPDATE' then
    new.slug := coalesce(nullif(new.document #>> '{meta,slug}', ''), new.slug);
  end if;
  return new;
end;
$$;

create trigger form_copy_meta
  before insert or update of document on public.form
  for each row execute function public.form_copy_meta();

create table public.form_revision (
  id         bigint generated always as identity primary key,
  uuid       uuid not null unique default gen_random_uuid(),
  form_id    bigint not null references public.form (id) on delete cascade,
  kind       varchar(16) not null check (kind in ('autosave', 'manual', 'publish')),
  label      varchar(120),
  version    integer not null,                          -- a response's form_version finds it
  document   jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create index form_revision_history
  on public.form_revision (form_id, created_at desc);

-- One row per submission: the answers validateAnswers kept, never the raw body.
create table public.form_response (
  id           bigint generated always as identity primary key,
  form_id      bigint not null references public.form (id) on delete cascade,
  form_version integer not null,                        -- the version answered
  answers      jsonb not null,
  locale       varchar(10),

  -- Your team's own triage
  status       varchar(30) not null default 'new',      -- new, called, done…
  note         text not null default '',

  -- Where it came from
  ip           inet,                                    -- only when settings.privacy.storeIp is on

  -- Audit: created_by is the visitor when signed in; updated_* is your team
  uuid         uuid not null unique default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null,
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users (id) on delete set null,
  deleted_at   timestamptz,
  deleted_by   uuid references auth.users (id) on delete set null
);

-- The inbox: one form's responses, newest first.
create index form_response_inbox
  on public.form_response (form_id, created_at desc)
  where deleted_at is null;

-- The retention job: responses older than settings.privacy.keepMonths are
-- deleted for good — the one place rows are removed, because the law says so.
create index form_response_age on public.form_response (created_at);

create trigger form_response_touch before update on public.form_response
  for each row execute function public.touch_updated_at();
create trigger form_response_stamp before insert or update on public.form_response
  for each row execute function public.stamp_actor();
