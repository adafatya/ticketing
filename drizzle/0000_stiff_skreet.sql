CREATE TYPE "public"."target_role" AS ENUM('pm', 'qa', 'be', 'fe', 'ai', 'devops', 'all');--> statement-breakpoint
CREATE TYPE "public"."ticket_event_type" AS ENUM('created', 'taken', 'assigned', 'resolved', 'validated', 'reopened', 'cancelled', 'released');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."ticket_source" AS ENUM('web', 'discord');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'resolved', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."ticket_type" AS ENUM('bug', 'request', 'task', 'question');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'pm', 'qa', 'be', 'fe', 'ai', 'devops', 'inactive');--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discord_interaction_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interaction_id" varchar(64) NOT NULL,
	"command" varchar(64) NOT NULL,
	"user_id" uuid,
	"discord_user_id" varchar(64) NOT NULL,
	"status" varchar(32) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discord_interaction_log_interaction_id_unique" UNIQUE("interaction_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(16) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"owner_id" uuid,
	"discord_channel_id" varchar(64),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "ticket_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"source" "ticket_source" DEFAULT 'web' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"actor_id" uuid,
	"event_type" "ticket_event_type" NOT NULL,
	"from_value" text,
	"to_value" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"seq_no" integer NOT NULL,
	"number" varchar(32) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"type" "ticket_type" NOT NULL,
	"priority" "ticket_priority" NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"target_role" "target_role" NOT NULL,
	"reporter_id" uuid NOT NULL,
	"assignee_id" uuid,
	"validator_id" uuid,
	"reopen_count" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone,
	"source" "ticket_source" DEFAULT 'web' NOT NULL,
	"discord_channel_id" varchar(64),
	"discord_message_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	CONSTRAINT "tickets_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "user_role_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"changed_by" uuid,
	"from_role" "user_role" NOT NULL,
	"to_role" "user_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discord_id" varchar(64) NOT NULL,
	"username" varchar(100),
	"avatar" text,
	"email" varchar(255),
	"role" "user_role" DEFAULT 'inactive' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_discord_id_unique" UNIQUE("discord_id")
);
--> statement-breakpoint
ALTER TABLE "discord_interaction_log" ADD CONSTRAINT "discord_interaction_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_validator_id_users_id_fk" FOREIGN KEY ("validator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_events" ADD CONSTRAINT "user_role_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role_events" ADD CONSTRAINT "user_role_events_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_interactions_id" ON "discord_interaction_log" USING btree ("interaction_id");--> statement-breakpoint
CREATE INDEX "idx_interactions_created" ON "discord_interaction_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_projects_code" ON "projects" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_comments_ticket_created" ON "ticket_comments" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_events_ticket_created" ON "ticket_events" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tickets_number" ON "tickets" USING btree ("number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tickets_project_seq" ON "tickets" USING btree ("project_id","seq_no");--> statement-breakpoint
CREATE INDEX "idx_tickets_project_status" ON "tickets" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "idx_tickets_assignee_status" ON "tickets" USING btree ("assignee_id","status");--> statement-breakpoint
CREATE INDEX "idx_tickets_status_target_role" ON "tickets" USING btree ("status","target_role");--> statement-breakpoint
CREATE INDEX "idx_tickets_created_at" ON "tickets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_user_role_events_user_id" ON "user_role_events" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_discord_id" ON "users" USING btree ("discord_id");