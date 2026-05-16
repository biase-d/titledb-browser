CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"github_pr_number" integer,
	"group_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"login" text NOT NULL,
	"karma" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_seen_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "game_groups" ADD COLUMN "platform_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "graphics_settings" ADD COLUMN "platform_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "performance_profiles" ADD COLUMN "platform_id" integer DEFAULT 1 NOT NULL;