-- ─────────────────────────────────────────────────────────────────────────────
-- 06 · Activity: who did what, and when
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Revisions keep what a document said; this keeps what happened to it. One row
-- per action, written in the same transaction as the action, never edited.
-- It has no foreign key to the subject on purpose: it must outlive what it
-- describes, deleted for good or not.

create table activity (
  id           bigint generated always as identity primary key,
  uuid         uuid not null unique default gen_random_uuid(),

  -- What it happened to
  subject_type varchar(30) not null check (subject_type in (
                 'email_template', 'article', 'form', 'form_response',
                 'card_design', 'card_issue', 'popup', 'popup_submission',
                 'saved_section', 'media')),
  subject_id   bigint not null,

  -- What happened
  action       varchar(30) not null check (action in (
                 'created',         -- a new row
                 'saved',           -- a manual save (autosaves are not logged)
                 'renamed',         -- name, slug or title changed
                 'published',       -- went live, or went live again
                 'scheduled',       -- set to go live later
                 'unpublished',     -- back to draft
                 'closed',          -- a form stopped taking responses
                 'paused',          -- a popup taken off the site, kept as it is
                 'issued',          -- a card made out to a member
                 'revoked',         -- a member's card cancelled
                 'reverted',        -- a revision restored
                 'status_changed',  -- a response's triage
                 'deleted',         -- soft-deleted
                 'restored')),      -- undeleted
  from_status  varchar(30),
  to_status    varchar(30),
  details      jsonb not null default '{}',             -- { "revision": "…", "from": "old-slug" }

  -- Who and when
  actor_id     bigint references app_user (id) on delete set null, -- null: a job, or a visitor
  created_at   timestamptz not null default now()
);

-- One document's timeline.
create index activity_timeline on activity (subject_type, subject_id, created_at desc);

-- One person's work.
create index activity_by_actor on activity (actor_id, created_at desc);
