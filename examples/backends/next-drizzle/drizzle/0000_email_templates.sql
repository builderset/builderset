CREATE TABLE "app_user" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "app_user_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_user_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "app_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "email_template" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "email_template_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" varchar(120) NOT NULL,
	"type_key" varchar(60),
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"document" jsonb NOT NULL,
	"draft_document" jsonb,
	"saved_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"published_by_id" bigint,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" bigint,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_id" bigint,
	"deleted_at" timestamp with time zone,
	"deleted_by_id" bigint,
	CONSTRAINT "email_template_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "email_template_status_check" CHECK ("email_template"."status" in ('draft', 'published'))
);
--> statement-breakpoint
CREATE TABLE "email_template_revision" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "email_template_revision_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"email_template_id" bigint NOT NULL,
	"kind" varchar(16) NOT NULL,
	"label" varchar(120),
	"version" integer NOT NULL,
	"document" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" bigint,
	CONSTRAINT "email_template_revision_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "email_template_revision_kind_check" CHECK ("email_template_revision"."kind" in ('autosave', 'manual', 'publish'))
);
--> statement-breakpoint
CREATE TABLE "activity" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "activity_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"subject_type" varchar(30) NOT NULL,
	"subject_id" bigint NOT NULL,
	"action" varchar(30) NOT NULL,
	"from_status" varchar(30),
	"to_status" varchar(30),
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actor_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "activity_subject_type_check" CHECK ("activity"."subject_type" in ('email_template', 'article', 'form', 'form_response', 'saved_section', 'media')),
	CONSTRAINT "activity_action_check" CHECK ("activity"."action" in ('created', 'saved', 'renamed', 'published', 'scheduled', 'unpublished', 'closed', 'reverted', 'status_changed', 'deleted', 'restored'))
);
--> statement-breakpoint
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_published_by_id_app_user_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_created_by_id_app_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_updated_by_id_app_user_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_template" ADD CONSTRAINT "email_template_deleted_by_id_app_user_id_fk" FOREIGN KEY ("deleted_by_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_template_revision" ADD CONSTRAINT "email_template_revision_email_template_id_email_template_id_fk" FOREIGN KEY ("email_template_id") REFERENCES "public"."email_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_template_revision" ADD CONSTRAINT "email_template_revision_created_by_id_app_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_actor_id_app_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "email_template_one_active_per_type" ON "email_template" USING btree ("type_key") WHERE status = 'published' and deleted_at is null;--> statement-breakpoint
CREATE INDEX "email_template_list" ON "email_template" USING btree ("updated_at" DESC NULLS FIRST) WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "email_template_revision_history" ON "email_template_revision" USING btree ("email_template_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "activity_timeline" ON "activity" USING btree ("subject_type","subject_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "activity_by_actor" ON "activity" USING btree ("actor_id","created_at" DESC NULLS FIRST);