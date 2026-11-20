-- GET /api/articles/:id/activity   $1 the article's uuid   $2 how many
select a.uuid        as id,
       a.action,
       a.from_status,
       a.to_status,
       a.details,
       a.created_at,
       u.uuid        as actor_id,
       u.name        as actor_name           -- null: a job, or someone since removed
  from activity a
  join article  d on d.id = a.subject_id
  left join app_user u on u.id = a.actor_id
 where a.subject_type = 'article'
   and d.uuid = $1
 order by a.created_at desc
 limit $2;
