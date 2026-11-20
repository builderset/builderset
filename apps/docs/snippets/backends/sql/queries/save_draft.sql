-- PUT /api/articles/:id/draft
--   $1 the article's uuid        $2 the checked draft document
--   $3 expected_saved_at         $4 the signed-in user's id
--
-- No row back means the article is gone (404) or someone else saved since (409):
-- select its saved_at to tell which. `force: true` ("keep mine") drops the
-- saved_at condition.
update article
   set draft_document = $2,
       saved_at       = now(),
       updated_by_id  = $4
 where uuid = $1
   and deleted_at is null
   and saved_at = $3
returning saved_at;
