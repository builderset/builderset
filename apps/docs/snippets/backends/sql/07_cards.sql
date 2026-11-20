-- ─────────────────────────────────────────────────────────────────────────────
-- 07 · Card designs, and the cards issued from them
-- ─────────────────────────────────────────────────────────────────────────────

create table card_design (
  id              bigint generated always as identity primary key,

  -- What it is
  name            varchar(120) not null,               -- document.meta.name
  format          varchar(20) not null default 'membership'
                  check (format in ('membership', 'id', 'bank', 'business',
                                    'badge', 'wallet', 'custom')),
  width_mm        numeric(6, 2) not null,              -- copies of the document's size,
  height_mm       numeric(6, 2) not null,              -- for lists and the print order
  sides           smallint not null default 2 check (sides in (1, 2)),
  status          varchar(16) not null default 'draft'
                  check (status in ('draft', 'published')),

  -- The document
  document        jsonb not null,                      -- live: what new cards are printed from
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
  deleted_by_id   bigint references app_user (id) on delete set null
);

create index card_design_list
  on card_design (updated_at desc)
  where deleted_at is null;

create trigger card_design_touch before update on card_design
  for each row execute function touch_updated_at();

create table card_design_revision (
  id             bigint generated always as identity primary key,
  uuid           uuid not null unique default gen_random_uuid(),
  card_design_id bigint not null references card_design (id) on delete cascade,
  kind           varchar(16) not null check (kind in ('autosave', 'manual', 'publish')),
  label          varchar(120),
  version        integer not null,                     -- a card issue finds its design by it
  document       jsonb not null,
  created_at     timestamptz not null default now(),
  created_by_id  bigint references app_user (id) on delete set null
);

create index card_design_revision_history
  on card_design_revision (card_design_id, created_at desc);

-- One card made out to one member: the record a printed or wallet card points
-- back to. The design version and the data are frozen when it is issued, so a
-- reprint matches the card in the member's hand.
create table card_issue (
  id              bigint generated always as identity primary key,
  card_design_id  bigint not null references card_design (id),
  design_version  integer not null,
  member_ref      varchar(120) not null,               -- your member's id, as your system knows it
  number          varchar(40) not null,                -- printed on the card: MA 0248 1173
  data            jsonb not null,                      -- the fields filled in: { "member.name": … }
  status          varchar(16) not null default 'issued'
                  check (status in ('issued', 'printed', 'revoked')),
  delivery        varchar(16) not null default 'print'
                  check (delivery in ('print', 'wallet')),
  valid_until     date,
  printed_at      timestamptz,
  revoked_at      timestamptz,
  revoked_by_id   bigint references app_user (id) on delete set null,
  revoke_reason   varchar(200),

  -- Audit
  uuid            uuid not null unique default gen_random_uuid(),
  created_at      timestamptz not null default now(),  -- issued at
  created_by_id   bigint references app_user (id) on delete set null,
  updated_at      timestamptz not null default now(),
  updated_by_id   bigint references app_user (id) on delete set null,
  deleted_at      timestamptz,
  deleted_by_id   bigint references app_user (id) on delete set null
);

-- A card number is never reused, not even after a revoke.
create unique index card_issue_number on card_issue (number);

-- A member holds one valid card of a design at a time.
create unique index card_issue_one_valid
  on card_issue (card_design_id, member_ref)
  where status <> 'revoked' and deleted_at is null;

create index card_issue_by_member on card_issue (member_ref, created_at desc);

create trigger card_issue_touch before update on card_issue
  for each row execute function touch_updated_at();
