-- ─────────────────────────────────────────────────────────────────────────────
-- 09 · Card designs, and the cards issued from them
-- ─────────────────────────────────────────────────────────────────────────────
--
-- The tables, the two writes that are a card's own, and who may read them.
-- The writes every document shares (07_writes.sql) take card_design like the
-- others: a design's publish is its approval for print.

create table public.card_design (
  id             bigint generated always as identity primary key,

  -- What it is: copies of the document, kept by card_design_copy_meta()
  name           varchar(120) not null,                -- document.meta.name
  format         varchar(20) not null default 'membership'
                 check (format in ('membership', 'id', 'bank', 'business',
                                   'badge', 'wallet', 'custom')),
  width_mm       numeric(6, 2) not null,               -- for lists and the print order
  height_mm      numeric(6, 2) not null,
  sides          smallint not null default 2 check (sides in (1, 2)),
  status         varchar(16) not null default 'draft'
                 check (status in ('draft', 'published')),

  -- The document
  document       jsonb not null,                       -- live: what new cards are printed from
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
  deleted_by     uuid references auth.users (id) on delete set null
);

create index card_design_list
  on public.card_design (updated_at desc)
  where deleted_at is null;

create trigger card_design_touch before update on public.card_design
  for each row execute function public.touch_updated_at();
create trigger card_design_stamp before insert or update on public.card_design
  for each row execute function public.stamp_actor();

-- The card keeps its format on the root node's props: its kind, its size in
-- millimetres and its printed sides.
create function public.card_design_copy_meta() returns trigger
language plpgsql set search_path = ''
as $$
declare
  card jsonb := new.document -> 'nodes' -> (new.document ->> 'root') -> 'props';
begin
  new.name      := left(coalesce(new.document #>> '{meta,name}', ''), 120);
  new.format    := card ->> 'format';
  new.width_mm  := (card ->> 'width')::numeric;
  new.height_mm := (card ->> 'height')::numeric;
  new.sides     := (card ->> 'sides')::smallint;
  return new;
end;
$$;

create trigger card_design_copy_meta
  before insert or update of document on public.card_design
  for each row execute function public.card_design_copy_meta();

create table public.card_design_revision (
  id             bigint generated always as identity primary key,
  uuid           uuid not null unique default gen_random_uuid(),
  card_design_id bigint not null references public.card_design (id) on delete cascade,
  kind           varchar(16) not null check (kind in ('autosave', 'manual', 'publish')),
  label          varchar(120),
  version        integer not null,                     -- a card issue finds its design by it
  document       jsonb not null,
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null
);

create index card_design_revision_history
  on public.card_design_revision (card_design_id, created_at desc);

-- One card made out to one member: the record a printed or wallet card points
-- back to. The design version and the data are frozen when it is issued, so a
-- reprint matches the card in the member's hand.
create table public.card_issue (
  id             bigint generated always as identity primary key,
  card_design_id bigint not null references public.card_design (id),
  design_version integer not null,
  member_ref     varchar(120) not null,                -- your member's id, as your system knows it
  number         varchar(40) not null,                 -- printed on the card: 0248 1173 5521
  data           jsonb not null,                       -- the fields filled in: { "member.name": … }
  status         varchar(16) not null default 'issued'
                 check (status in ('issued', 'printed', 'revoked')),
  delivery       varchar(16) not null default 'print'
                 check (delivery in ('print', 'wallet')),
  valid_until    date,
  printed_at     timestamptz,
  revoked_at     timestamptz,
  revoked_by     uuid references auth.users (id) on delete set null,
  revoke_reason  varchar(200),

  -- Audit
  uuid           uuid not null unique default gen_random_uuid(),
  created_at     timestamptz not null default now(), -- issued at
  created_by     uuid references auth.users (id) on delete set null,
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users (id) on delete set null,
  deleted_at     timestamptz,
  deleted_by     uuid references auth.users (id) on delete set null
);

-- A card number is never reused, not even after a revoke.
create unique index card_issue_number on public.card_issue (number);

-- A member holds one valid card of a design at a time.
create unique index card_issue_one_valid
  on public.card_issue (card_design_id, member_ref)
  where status <> 'revoked' and deleted_at is null;

create index card_issue_by_member on public.card_issue (member_ref, created_at desc);

create trigger card_issue_touch before update on public.card_issue
  for each row execute function public.touch_updated_at();
create trigger card_issue_stamp before insert or update on public.card_issue
  for each row execute function public.stamp_actor();

-- ── The writes ──────────────────────────────────────────────────────────────

-- POST /cards/:id/issues, after the function checked the member's data against
-- the design. The card takes the design's version as it is in this
-- transaction, so a design withdrawn meanwhile is refused. The number is drawn
-- by the function; the rare one already given out fails on card_issue_number,
-- and the function draws again.
create function public.issue_card(
  p_design uuid, p_member_ref text, p_number text, p_data jsonb, p_delivery text,
  p_valid_until date, p_actor uuid
) returns uuid
language plpgsql set search_path = ''
as $$
declare
  design     record;
  issue_id   bigint;
  issue_uuid uuid;
  index_name text;
begin
  select * into design from public.lock_document('card_design', p_design);
  if design.status <> 'published' then
    raise exception 'The design is a draft: approve it for print first.' using errcode = 'PT422';
  end if;

  insert into public.card_issue
    (card_design_id, design_version, member_ref, number, data, delivery, valid_until,
     created_by, updated_by)
  values
    (design.id, design.version, p_member_ref, p_number, p_data, p_delivery, p_valid_until,
     p_actor, p_actor)
  returning id, uuid into issue_id, issue_uuid;
  perform public.log_activity('card_issue', issue_id, 'issued', p_actor,
    p_to_status => 'issued',
    p_details => jsonb_build_object(
      'design', p_design, 'version', design.version, 'number', p_number));
  return issue_uuid;
exception
  when unique_violation then
    get stacked diagnostics index_name = constraint_name;
    if index_name = 'card_issue_one_valid' then
      raise exception 'This member already holds a card of this design: revoke it first.'
        using errcode = 'PT409';
    end if;
    raise;
end;
$$;

-- POST /cards/:id/issues/:issueId/revoke. The row stays: the number printed
-- on the card still points at it.
create function public.revoke_card(
  p_design uuid, p_issue uuid, p_reason text, p_actor uuid
) returns void
language plpgsql set search_path = ''
as $$
declare
  issue record;
begin
  select i.id, i.status
    into issue
    from public.card_issue i
    join public.card_design d on d.id = i.card_design_id
   where i.uuid = p_issue and d.uuid = p_design
     and i.deleted_at is null and d.deleted_at is null
     for update of i;
  if issue.id is null then
    raise exception 'There is no such card.' using errcode = 'PT404';
  end if;
  if issue.status = 'revoked' then
    raise exception 'This card is revoked already.' using errcode = 'PT409';
  end if;

  update public.card_issue
     set status = 'revoked', revoked_at = now(), revoked_by = p_actor,
         revoke_reason = p_reason, updated_by = p_actor
   where id = issue.id;
  perform public.log_activity('card_issue', issue.id, 'revoked', p_actor,
    issue.status, 'revoked',
    case when p_reason is null then '{}' else jsonb_build_object('reason', p_reason) end);
end;
$$;

-- ── Who may read and write ──────────────────────────────────────────────────
-- Cards are your team's alone: a member's card is read through your own app,
-- never by the public. As in 08_security.sql, only the functions write.

alter table public.card_design          enable row level security;
alter table public.card_design_revision enable row level security;
alter table public.card_issue           enable row level security;

revoke insert, update, delete, truncate
  on public.card_design, public.card_design_revision, public.card_issue
  from anon, authenticated;
revoke select
  on public.card_design, public.card_design_revision, public.card_issue
  from anon;
revoke update, truncate on public.card_design_revision from service_role;

create policy "the team reads card designs" on public.card_design
  for select to authenticated using ((select public.is_team_member()));
create policy "the team reads card design revisions" on public.card_design_revision
  for select to authenticated using ((select public.is_team_member()));
create policy "the team reads card issues" on public.card_issue
  for select to authenticated using ((select public.is_team_member()));

revoke execute on function
  public.card_design_copy_meta(),
  public.issue_card(uuid, text, text, jsonb, text, date, uuid),
  public.revoke_card(uuid, uuid, text, uuid)
  from public, anon, authenticated;
