-- DELETE /api/forms/:id        $1 the form's uuid   $2 the signed-in user's id
-- A live form is not deleted: no row back, and the route answers 409.
with deleted as (
  update form
     set deleted_at    = now(),
         deleted_by_id = $2,
         updated_by_id = $2
   where uuid = $1
     and deleted_at is null
     and status <> 'published'
  returning id, status
)
insert into activity (subject_type, subject_id, action, from_status, actor_id)
select 'form', id, 'deleted', status, $2 from deleted;

-- POST /api/forms/:id/restore  $1 the form's uuid   $2 the signed-in user's id
-- A unique violation (23505) means another live form took its slug: 409.
with restored as (
  update form
     set deleted_at    = null,
         deleted_by_id = null,
         updated_by_id = $2
   where uuid = $1
     and deleted_at is not null
  returning id, status
)
insert into activity (subject_type, subject_id, action, to_status, actor_id)
select 'form', id, 'restored', status, $2 from restored;
