-- POST /api/articles/:id/publish, after checkArticle passed with no errors.
--   $1 the article's uuid   $2 the document   $3 the signed-in user's id
--   $4..$7 title, excerpt, cover_key, cover_alt from document.meta
--
-- One statement, so one transaction: the row, its revision and its activity are
-- written together or not at all.
with before as (
  select id, status
    from article
   where uuid = $1
     and deleted_at is null
     for update
),
published as (
  update article a
     set document        = $2,
         draft_document  = null,
         status          = 'published',
         version         = a.version + 1,
         saved_at        = now(),
         published_at    = coalesce(a.published_at, now()),
         published_by_id = $3,
         updated_by_id   = $3,
         title = $4, excerpt = $5, cover_key = $6, cover_alt = $7
    from before b
   where a.id = b.id
  returning a.id, a.version, a.saved_at, a.published_at, b.status as from_status
),
revision as (
  insert into article_revision (article_id, kind, version, document, created_by_id)
  select id, 'publish', version, $2, $3 from published
),
logged as (
  insert into activity (subject_type, subject_id, action, from_status, to_status, actor_id)
  select 'article', id, 'published', from_status, 'published', $3
    from published
)
select saved_at, 'published' as status, published_at from published;
