-- CreateTable
CREATE TABLE "activity" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject_type" VARCHAR(30) NOT NULL,
    "subject_id" BIGINT NOT NULL,
    "action" VARCHAR(30) NOT NULL,
    "from_status" VARCHAR(30),
    "to_status" VARCHAR(30),
    "details" JSONB NOT NULL DEFAULT '{}',
    "actor_id" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_user" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(254) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_template" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "type_key" VARCHAR(60),
    "status" VARCHAR(16) NOT NULL DEFAULT 'draft',
    "document" JSONB NOT NULL,
    "draft_document" JSONB,
    "saved_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ(6),
    "published_by_id" BIGINT,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" BIGINT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by_id" BIGINT,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by_id" BIGINT,

    CONSTRAINT "email_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_template_revision" (
    "id" BIGSERIAL NOT NULL,
    "uuid" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email_template_id" BIGINT NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "label" VARCHAR(120),
    "version" INTEGER NOT NULL,
    "document" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" BIGINT,

    CONSTRAINT "email_template_revision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activity_uuid_key" ON "activity"("uuid");

-- CreateIndex
CREATE INDEX "activity_timeline" ON "activity"("subject_type", "subject_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "activity_by_actor" ON "activity"("actor_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "app_user_uuid_key" ON "app_user"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_email_key" ON "app_user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "email_template_uuid_key" ON "email_template"("uuid");

-- CreateIndex
CREATE INDEX "email_template_list" ON "email_template"("updated_at" DESC) WHERE ("deleted_at" IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "email_template_one_active_per_type" ON "email_template"("type_key") WHERE (((status)::text = 'published'::text) AND (deleted_at IS NULL));

-- CreateIndex
CREATE UNIQUE INDEX "email_template_revision_uuid_key" ON "email_template_revision"("uuid");

-- CreateIndex
CREATE INDEX "email_template_revision_history" ON "email_template_revision"("email_template_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_template_revision" ADD CONSTRAINT "email_template_revision_email_template_id_fkey" FOREIGN KEY ("email_template_id") REFERENCES "email_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_template_revision" ADD CONSTRAINT "email_template_revision_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Written by hand: a Prisma schema has no check constraints. They keep each
-- text column to its values, as in the SQL schema.
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_status_check"
    CHECK ("status" IN ('draft', 'published'));

ALTER TABLE "email_template_revision" ADD CONSTRAINT "email_template_revision_kind_check"
    CHECK ("kind" IN ('autosave', 'manual', 'publish'));

ALTER TABLE "activity" ADD CONSTRAINT "activity_subject_type_check"
    CHECK ("subject_type" IN ('email_template', 'article', 'form', 'form_response', 'saved_section', 'media'));

ALTER TABLE "activity" ADD CONSTRAINT "activity_action_check"
    CHECK ("action" IN ('created', 'saved', 'renamed', 'published', 'scheduled', 'unpublished',
                        'closed', 'reverted', 'status_changed', 'deleted', 'restored'));
