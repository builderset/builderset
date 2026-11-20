-- ─────────────────────────────────────────────────────────────────────────────
-- 08 · Who may read and write what
-- ─────────────────────────────────────────────────────────────────────────────
--
--   the team (profiles)   reads every row, live and in the trash
--   the public (anon)     reads published articles and forms: some columns
--   everyone but the      writes nothing through the REST API: every write is
--   service role          an Edge Function's, after the kits' checks
--
-- Supabase grants every table to anon and authenticated; Row Level Security
-- then decides which rows. A table with RLS on and no policy for an action
-- refuses it, which is how writes are closed below.

alter table public.profiles                enable row level security;
alter table public.email_template          enable row level security;
alter table public.email_template_revision enable row level security;
alter table public.article                 enable row level security;
alter table public.article_revision        enable row level security;
alter table public.form                    enable row level security;
alter table public.form_revision           enable row level security;
alter table public.form_response           enable row level security;
alter table public.saved_section           enable row level security;
alter table public.media                   enable row level security;
alter table public.activity                enable row level security;

-- ── Nobody writes through the REST API ──────────────────────────────────────
-- A document written straight to its table would skip the check that keeps an
-- unsafe link out of it, and the audit columns would say what the request
-- said. The policies alone would refuse these; taking the grants away too
-- makes the refusal plain.
revoke insert, update, delete, truncate on all tables in schema public
  from anon, authenticated;

-- The history is written once. Not even the functions may change it.
revoke update, delete, truncate on public.activity from service_role;
revoke update, truncate on public.email_template_revision, public.article_revision,
  public.form_revision from service_role;

-- ── The team reads everything ───────────────────────────────────────────────
-- Live rows and the trash alike: a list asks for `deleted_at is null`, the
-- trash for the opposite. The team's own lists may read the tables straight
-- through the REST API; the documents function answers them too.
create policy "the team reads the team" on public.profiles
  for select to authenticated using ((select public.is_team_member()));
create policy "the team reads email templates" on public.email_template
  for select to authenticated using ((select public.is_team_member()));
create policy "the team reads email template revisions" on public.email_template_revision
  for select to authenticated using ((select public.is_team_member()));
create policy "the team reads articles" on public.article
  for select to authenticated using ((select public.is_team_member()));
create policy "the team reads article revisions" on public.article_revision
  for select to authenticated using ((select public.is_team_member()));
create policy "the team reads forms" on public.form
  for select to authenticated using ((select public.is_team_member()));
create policy "the team reads form revisions" on public.form_revision
  for select to authenticated using ((select public.is_team_member()));
create policy "the team reads responses" on public.form_response
  for select to authenticated using ((select public.is_team_member()));
create policy "the team reads saved sections" on public.saved_section
  for select to authenticated using ((select public.is_team_member()));
create policy "the team reads media" on public.media
  for select to authenticated using ((select public.is_team_member()));
create policy "the team reads the activity" on public.activity
  for select to authenticated using ((select public.is_team_member()));

-- ── The public reads live documents, and only some columns ──────────────────
-- Never a draft_document, even of a published row, and never the internal id
-- or who wrote it: anon must name the columns it wants
-- (`select=uuid,slug,document`), and only these are granted.
revoke select on all tables in schema public from anon;

grant select (uuid, slug, locale, document, title, excerpt, cover_key, cover_alt,
              published_at)
  on public.article to anon;
create policy "the public reads published articles" on public.article
  for select to anon
  using (status = 'published' and deleted_at is null);

-- A closed form is read too: its page shows the form's closed message.
grant select (uuid, slug, status, document) on public.form to anon;
create policy "the public reads published forms" on public.form
  for select to anon
  using (status in ('published', 'closed') and deleted_at is null);

-- ── Functions ───────────────────────────────────────────────────────────────
-- Postgres lets everyone call a new function. The write functions are the
-- service role's alone; policies need is_team_member().
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
grant execute on function public.is_team_member() to authenticated;
