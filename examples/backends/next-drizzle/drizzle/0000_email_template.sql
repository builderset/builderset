CREATE TABLE "email_template" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "email_template_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(120) NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"document" jsonb NOT NULL,
	"draft_document" jsonb,
	"saved_at" timestamp (3) with time zone NOT NULL,
	"published_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
