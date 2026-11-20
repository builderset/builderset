-- ─────────────────────────────────────────────────────────────────────────────
-- 06 · Activity: who did what, and when
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Revisions keep what a document said; this keeps what happened to it. One row
-- per action, written in the same transaction as the action, never edited
-- (08_security.sql takes update and delete away even from the service role).
-- It has no foreign key to the subject on purpose: it must outlive what it
-- describes, deleted for good or not.

create table public.activity (
  id           bigint generated always as identity primary key,
  uuid         uuid not null unique default gen_random_uuid(),

  -- What it happened to
  subject_type varchar(30) not null check (subject_type in (
                 'email_template', 'article', 'form', 'form_response',
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
                 'reverted',        -- a revision restored
                 'status_changed',  -- a response's triage
                 'deleted',         -- soft-deleted
                 'restored')),      -- undeleted
  from_status  varchar(30),
  to_status    varchar(30),
  details      jsonb not null default '{}',             -- { "revision": "…", "label": "…" }

  -- Who and when
  actor_id     uuid references auth.users (id) on delete set null, -- null: a job, or a visitor
  created_at   timestamptz not null default now()
);

-- One document's timeline.
create index activity_timeline on public.activity (subject_type, subject_id, created_at desc);

-- One person's work.
create index activity_by_actor on public.activity (actor_id, created_at desc);

-- One line in the log. Called by the write functions, inside their transaction.
create function public.log_activity(
  p_subject_type text,
  p_subject_id   bigint,
  p_action       text,
  p_actor        uuid,
  p_from_status  text  default null,
  p_to_status    text  default null,
  p_details      jsonb default '{}'
) returns void
language sql set search_path = ''
as $$
  insert into public.activity
    (subject_type, subject_id, action, from_status, to_status, details, actor_id)
  values
    (p_subject_type, p_subject_id, p_action, p_from_status, p_to_status, p_details, p_actor);
$$;
