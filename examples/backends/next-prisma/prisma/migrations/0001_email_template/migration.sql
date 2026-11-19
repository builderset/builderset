-- CreateTable
CREATE TABLE "email_template" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "document" JSONB NOT NULL,
    "draft_document" JSONB,
    "saved_at" TIMESTAMPTZ(3) NOT NULL,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_template_pkey" PRIMARY KEY ("id")
);

