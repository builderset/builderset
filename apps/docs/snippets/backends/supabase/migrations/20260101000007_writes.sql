-- ─────────────────────────────────────────────────────────────────────────────
-- 07 · The writes, one transaction each
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Every write the Edge Functions make is one of these functions. A call is one
-- transaction, so the row, its revision and its activity are written together
-- or not at all. The functions run the kits' checks first (Postgres cannot),
-- then call these with the service role and pass the signed-in user as
-- p_actor: the service role has no auth.uid() of its own.
--
-- A refusal is raised with a PostgREST status code: PT404 answers 404 and
-- PT409 answers 409, with the message as it is written here.

-- The tables these functions accept, so a wrong name fails loudly.
create domain public.document_table as text
  check (value in ('email_template', 'article', 'form', 'card_design', 'popup'));
create domain public.audited_table as text
  check (value in ('email_template', 'article', 'form', 'form_response',
                   'card_design', 'card_issue', 'popup', 'popup_submission',
                   'saved_section', 'media'));

-- ── Documents ───────────────────────────────────────────────────────────────

-- The live document, locked until the write ends, so two writes to it take turns.
create function public.lock_document(
  p_table public.document_table, p_uuid uuid,
  out id bigint, out status text, out saved_at timestamptz, out version integer
)
language plpgsql set search_path = ''
as $$
begin
  execute format(
    'select id, status, saved_at, version from public.%I
      where uuid = $1 and deleted_at is null
        for update', p_table)
    into id, status, saved_at, version
    using p_uuid;
  if id is null then
    raise exception 'There is no such %.', replace(p_table, '_', ' ') using errcode = 'PT404';
  end if;
end;
$$;

-- A whole document, kept as it was. Revisions are never updated.
create function public.add_revision(
  p_table public.document_table, p_document_id bigint, p_kind text, p_version integer,
  p_document jsonb, p_actor uuid, p_label text default null
) returns uuid
language plpgsql set search_path = ''
as $$
declare
  revision_uuid uuid;
begin
  execute format(
    'insert into public.%I (%I, kind, label, version, document, created_by)
     values ($1, $2, $3, $4, $5, $6)
     returning uuid', p_table || '_revision', p_table || '_id')
    into revision_uuid
    using p_document_id, p_kind, p_label, p_version, p_document, p_actor;
  return revision_uuid;
end;
$$;

-- POST /{kind}: a new draft. Its columns come from the request only where the
-- builder needs them: an email's type, an article's address.
create function public.create_document(
  p_table public.document_table, p_document jsonb, p_actor uuid,
  p_type_key text default null, p_slug text default null, p_locale text default null
) returns uuid
language plpgsql set search_path = ''
as $$
declare
  new_id   bigint;
  new_uuid uuid;
begin
  case p_table
    when 'email_template' then
      insert into public.email_template (type_key, document, created_by, updated_by)
      values (p_type_key, p_document, p_actor, p_actor)
      returning id, uuid into new_id, new_uuid;
    when 'article' then
      insert into public.article (slug, locale, author_id, document, created_by, updated_by)
      values (p_slug, p_locale, p_actor, p_document, p_actor, p_actor)
      returning id, uuid into new_id, new_uuid;
    else
      -- A form, a card design, a popup: the document is all they take. The
      -- tables' triggers copy what the lists show from it.
      execute format(
        'insert into public.%I (document, created_by, updated_by)
         values ($1, $2, $2)
         returning id, uuid', p_table)
        into new_id, new_uuid
        using p_document, p_actor;
  end case;
  perform public.log_activity(p_table, new_id, 'created', p_actor, p_to_status => 'draft');
  return new_uuid;
end;
$$;

-- PUT /{kind}/:id/draft. p_expected_saved_at is the saved_at the editor last
-- saw; another one on the row, or none at all, means it may be a stale copy.
-- p_force is the editor's "keep mine": the save goes in over the other.
-- Autosaves are neither revisions nor activity.
create function public.save_draft(
  p_table public.document_table, p_uuid uuid, p_document jsonb,
  p_expected_saved_at timestamptz, p_force boolean, p_manual boolean, p_actor uuid
) returns timestamptz
language plpgsql set search_path = ''
as $$
declare
  doc      record;
  saved_at timestamptz;
begin
  select * into doc from public.lock_document(p_table, p_uuid);
  if not p_force and doc.saved_at is distinct from p_expected_saved_at then
    raise exception 'Someone else saved this since you opened it.' using errcode = 'PT409';
  end if;

  execute format(
    'update public.%I set draft_document = $2, saved_at = now(), updated_by = $3
      where id = $1
      returning saved_at', p_table)
    into saved_at
    using doc.id, p_document, p_actor;

  if p_manual then
    perform public.add_revision(p_table, doc.id, 'manual', doc.version, p_document, p_actor);
    perform public.log_activity(p_table, doc.id, 'saved', p_actor);
  end if;
  return saved_at;
end;
$$;

-- POST /{kind}/:id/publish, after the strict check. Answers what the editor
-- shows: { saved_at, status, published_at } and an article's scheduled_at.
create function public.publish_document(
  p_table public.document_table, p_uuid uuid, p_document jsonb, p_actor uuid,
  p_scheduled_at timestamptz default null
) returns jsonb
language plpgsql set search_path = ''
as $$
declare
  doc        record;
  -- Only an article is ever given a time: it waits for publish_due_articles().
  waits      boolean := coalesce(p_scheduled_at > now(), false);
  new_status text := case when waits then 'scheduled' else 'published' end;
  old_meta   jsonb;
  renamed    jsonb;
  answer     jsonb;
begin
  select * into doc from public.lock_document(p_table, p_uuid);
  execute format('select document -> ''meta'' from public.%I where id = $1', p_table)
    into old_meta
    using doc.id;

  case p_table
    when 'email_template' then
      -- One active design per email type: the one live before steps back to draft.
      with retired as (
        update public.email_template t
           set status = 'draft', updated_by = p_actor
         where t.type_key = (select type_key from public.email_template where id = doc.id)
           and t.status = 'published' and t.deleted_at is null and t.id <> doc.id
        returning t.id
      )
      insert into public.activity
        (subject_type, subject_id, action, from_status, to_status, details, actor_id)
      select 'email_template', id, 'unpublished', 'published', 'draft',
             jsonb_build_object('replaced_by', p_uuid), p_actor
        from retired;

      update public.email_template
         set document = p_document, draft_document = null, status = 'published',
             version = version + 1, saved_at = now(),
             published_at = now(), published_by = p_actor, updated_by = p_actor
       where id = doc.id
      returning jsonb_build_object(
        'saved_at', saved_at, 'status', status, 'published_at', published_at)
        into answer;

    when 'article' then
      -- An article keeps its first publish date, for its list.
      update public.article
         set document = p_document, draft_document = null, status = new_status,
             version = version + 1, saved_at = now(),
             scheduled_at = case when waits then p_scheduled_at end,
             published_at = case when waits then published_at
                                 else coalesce(published_at, now()) end,
             published_by = p_actor, updated_by = p_actor
       where id = doc.id
      returning jsonb_build_object(
        'saved_at', saved_at, 'status', status, 'published_at', published_at,
        'scheduled_at', scheduled_at)
        into answer;

    when 'form' then
      -- Publishing a closed form opens it again; the trigger copies its slug.
      update public.form
         set document = p_document, draft_document = null, status = 'published',
             version = version + 1, saved_at = now(),
             published_at = now(), published_by = p_actor,
             closed_at = null, closed_by = null, updated_by = p_actor
       where id = doc.id
      returning jsonb_build_object(
        'saved_at', saved_at, 'status', status, 'published_at', published_at)
        into answer;

    else
      -- A card design is approved for print; a popup goes on the site, a
      -- paused one too. Their triggers copy the format and the display rules.
      execute format(
        'update public.%I
            set document = $2, draft_document = null, status = ''published'',
                version = version + 1, saved_at = now(),
                published_at = now(), published_by = $3, updated_by = $3
          where id = $1
         returning jsonb_build_object(
           ''saved_at'', saved_at, ''status'', status, ''published_at'', published_at)', p_table)
        into answer
        using doc.id, p_document, p_actor;
  end case;

  perform public.add_revision(p_table, doc.id, 'publish', doc.version + 1, p_document, p_actor);
  -- The action is named like the new status: published or scheduled.
  perform public.log_activity(p_table, doc.id, new_status, p_actor, doc.status, new_status);

  -- A new name, title or slug gets a line of its own in the timeline.
  select jsonb_object_agg(field, jsonb_build_object(
           'from', old_meta -> field, 'to', p_document -> 'meta' -> field))
    into renamed
    from unnest(array['name', 'title', 'slug']) as field
   where p_document -> 'meta' ? field
     and old_meta -> field is distinct from p_document -> 'meta' -> field;
  if renamed is not null then
    perform public.log_activity(p_table, doc.id, 'renamed', p_actor, p_details => renamed);
  end if;

  return answer;
end;
$$;

-- POST /{kind}/:id/unpublish. A form closes instead: it keeps its link and
-- shows its closed message. A paused popup goes back to draft too. saved_at
-- stays: the document did not change.
create function public.unpublish_document(
  p_table public.document_table, p_uuid uuid, p_actor uuid
) returns jsonb
language plpgsql set search_path = ''
as $$
declare
  doc        record;
  new_status text := case when p_table = 'form' then 'closed' else 'draft' end;
begin
  select * into doc from public.lock_document(p_table, p_uuid);
  if doc.status not in ('published', 'scheduled', 'paused') then
    raise exception 'It is not live.' using errcode = 'PT409';
  end if;

  case p_table
    when 'article' then
      update public.article set status = 'draft', scheduled_at = null, updated_by = p_actor
       where id = doc.id;
    when 'form' then
      update public.form
         set status = 'closed', closed_at = now(), closed_by = p_actor, updated_by = p_actor
       where id = doc.id;
    else
      -- An email template, a card design, a popup: back to draft.
      execute format(
        'update public.%I set status = ''draft'', updated_by = $2 where id = $1', p_table)
        using doc.id, p_actor;
  end case;

  perform public.log_activity(
    p_table, doc.id, case when p_table = 'form' then 'closed' else 'unpublished' end,
    p_actor, doc.status, new_status);
  return jsonb_build_object('saved_at', doc.saved_at, 'status', new_status);
end;
$$;

-- POST /{kind}/:id/revisions: a version the editor saved by name.
create function public.save_revision(
  p_table public.document_table, p_uuid uuid, p_document jsonb, p_label text, p_actor uuid
) returns uuid
language plpgsql set search_path = ''
as $$
declare
  doc           record;
  revision_uuid uuid;
begin
  select * into doc from public.lock_document(p_table, p_uuid);
  revision_uuid := public.add_revision(
    p_table, doc.id, 'manual', doc.version, p_document, p_actor, p_label);
  perform public.log_activity(p_table, doc.id, 'saved', p_actor,
    p_details => jsonb_build_object('revision', revision_uuid, 'label', p_label));
  return revision_uuid;
end;
$$;

-- Scheduled articles whose time has come. A job runs it; with pg_cron:
--   select cron.schedule('publish-due-articles', '* * * * *',
--                        'select public.publish_due_articles()');
create function public.publish_due_articles() returns integer
language sql set search_path = ''
as $$
  with due as (
    update public.article
       set status = 'published', scheduled_at = null, updated_by = null,
           published_at = coalesce(published_at, scheduled_at)
     where status = 'scheduled' and scheduled_at <= now() and deleted_at is null
    returning id
  ),
  logged as (
    -- No actor: a job did it.
    insert into public.activity (subject_type, subject_id, action, from_status, to_status)
    select 'article', id, 'published', 'scheduled', 'published' from due
  )
  select count(*)::integer from due;
$$;

-- ── Delete and restore, for every audited table ─────────────────────────────

-- DELETE: stamps who and when. A live document stays live: unpublishing it is
-- a decision of its own.
create function public.soft_delete(
  p_table public.audited_table, p_uuid uuid, p_actor uuid
) returns void
language plpgsql set search_path = ''
as $$
declare
  row_id     bigint;
  row_status text;
begin
  -- to_jsonb reads status from the tables that have one, null from the others.
  execute format(
    'select id, to_jsonb(t) ->> ''status'' from public.%I t
      where uuid = $1 and deleted_at is null
        for update', p_table)
    into row_id, row_status
    using p_uuid;
  if row_id is null then
    raise exception 'There is no such %.', replace(p_table, '_', ' ') using errcode = 'PT404';
  end if;
  if p_table in ('email_template', 'article', 'form', 'card_design', 'popup')
     and row_status = 'published' then
    raise exception 'It is live: unpublish it first.' using errcode = 'PT409';
  end if;

  execute format(
    'update public.%I set deleted_at = now(), deleted_by = $2, updated_by = $2
      where id = $1', p_table)
    using row_id, p_actor;
  perform public.log_activity(p_table, row_id, 'deleted', p_actor, p_from_status => row_status);
end;
$$;

-- POST …/restore. The partial unique indexes refuse it when another live row
-- took the address meanwhile.
create function public.restore_deleted(
  p_table public.audited_table, p_uuid uuid, p_actor uuid
) returns void
language plpgsql set search_path = ''
as $$
declare
  row_id     bigint;
  row_status text;
begin
  execute format(
    'update public.%I t set deleted_at = null, deleted_by = null, updated_by = $2
      where uuid = $1 and deleted_at is not null
      returning id, to_jsonb(t) ->> ''status''', p_table)
    into row_id, row_status
    using p_uuid, p_actor;
  if row_id is null then
    raise exception 'There is no such % in the trash.', replace(p_table, '_', ' ')
      using errcode = 'PT404';
  end if;
  perform public.log_activity(p_table, row_id, 'restored', p_actor, p_to_status => row_status);
exception
  when unique_violation then
    raise exception 'Its address was taken while it was deleted.' using errcode = 'PT409';
end;
$$;

-- ── The library ─────────────────────────────────────────────────────────────

create function public.create_section(
  p_kit text, p_name text, p_fragment jsonb, p_actor uuid
) returns uuid
language plpgsql set search_path = ''
as $$
declare
  new_id   bigint;
  new_uuid uuid;
begin
  insert into public.saved_section (kit, name, fragment, created_by, updated_by)
  values (p_kit, p_name, p_fragment, p_actor, p_actor)
  returning id, uuid into new_id, new_uuid;
  perform public.log_activity('saved_section', new_id, 'created', p_actor);
  return new_uuid;
end;
$$;

create function public.record_media(
  p_key text, p_kind text, p_mime text, p_size integer, p_width integer, p_height integer,
  p_name text, p_sha256 text, p_actor uuid
) returns uuid
language plpgsql set search_path = ''
as $$
declare
  new_id   bigint;
  new_uuid uuid;
begin
  insert into public.media
    (key, kind, mime, size, width, height, name, sha256, created_by, updated_by)
  values
    (p_key, p_kind, p_mime, p_size, p_width, p_height, p_name, p_sha256, p_actor, p_actor)
  returning id, uuid into new_id, new_uuid;
  perform public.log_activity('media', new_id, 'created', p_actor);
  return new_uuid;
end;
$$;

-- ── Form responses ──────────────────────────────────────────────────────────

-- A visitor's response, after validateAnswers. The count goes up only while
-- the form is published and has room, so two last responses at once cannot
-- both get in: null means closed or full. p_visitor is the signed-in visitor,
-- or null.
create function public.record_form_response(
  p_form uuid, p_form_version integer, p_answers jsonb, p_locale text, p_ip inet,
  p_max_responses integer, p_visitor uuid
) returns uuid
language plpgsql set search_path = ''
as $$
declare
  counted_form  bigint;
  response_id   bigint;
  response_uuid uuid;
begin
  update public.form
     set response_count = response_count + 1
   where uuid = p_form and status = 'published' and deleted_at is null
     and (p_max_responses is null or response_count < p_max_responses)
  returning id into counted_form;
  if counted_form is null then
    return null;
  end if;

  insert into public.form_response
    (form_id, form_version, answers, locale, ip, created_by, updated_by)
  values
    (counted_form, p_form_version, p_answers, p_locale, p_ip, p_visitor, p_visitor)
  returning id, uuid into response_id, response_uuid;
  perform public.log_activity('form_response', response_id, 'created', p_visitor,
    p_to_status => 'new');
  return response_uuid;
end;
$$;

-- PATCH /forms/:id/responses/:rid: your team's triage. A null leaves that
-- field as it is.
create function public.triage_response(
  p_form uuid, p_response uuid, p_status text, p_note text, p_actor uuid
) returns void
language plpgsql set search_path = ''
as $$
declare
  response record;
begin
  select r.id, r.status
    into response
    from public.form_response r
    join public.form f on f.id = r.form_id
   where r.uuid = p_response and f.uuid = p_form
     and r.deleted_at is null and f.deleted_at is null
     for update of r;
  if response.id is null then
    raise exception 'There is no such response.' using errcode = 'PT404';
  end if;

  update public.form_response
     set status = coalesce(p_status, status), note = coalesce(p_note, note),
         updated_by = p_actor
   where id = response.id;

  if p_status is not null and p_status <> response.status then
    perform public.log_activity('form_response', response.id, 'status_changed', p_actor,
      response.status, p_status);
  else
    perform public.log_activity('form_response', response.id, 'saved', p_actor,
      p_details => jsonb_build_object('note', true));
  end if;
end;
$$;
