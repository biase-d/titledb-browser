CREATE TYPE "public"."contribution_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" text NOT NULL,
	"game_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "favorites_user_id_game_id_pk" PRIMARY KEY("user_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"has_onboarded" integer DEFAULT 0,
	"preferred_region" text,
	"last_updated" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "graphics_settings" ADD COLUMN "status" "contribution_status" DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "graphics_settings" ADD COLUMN "pr_number" integer;--> statement-breakpoint
ALTER TABLE "performance_profiles" ADD COLUMN "status" "contribution_status" DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "performance_profiles" ADD COLUMN "pr_number" integer;--> statement-breakpoint
ALTER TABLE "youtube_links" ADD COLUMN "status" "contribution_status" DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE "youtube_links" ADD COLUMN "pr_number" integer;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;