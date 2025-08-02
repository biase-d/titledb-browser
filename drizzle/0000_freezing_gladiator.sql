CREATE TYPE "public"."fps_behavior" AS ENUM('Locked', 'Stable', 'Unstable', 'Very Unstable');--> statement-breakpoint
CREATE TYPE "public"."resolution_type" AS ENUM('Fixed', 'Dynamic', 'Multiple Fixed');--> statement-breakpoint
CREATE TABLE "game_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"names" text[] NOT NULL,
	"publisher" text,
	"release_date" integer,
	"size_in_bytes" bigint,
	"icon_url" text,
	"banner_url" text,
	"screenshots" text[],
	"last_updated" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "graphics_settings" (
	"group_id" text PRIMARY KEY NOT NULL,
	"settings" jsonb NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"game_version" text NOT NULL,
	"profiles" jsonb NOT NULL,
	"contributor" text,
	"source_pr_url" text,
	"last_updated" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "youtube_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"url" text NOT NULL,
	"submitted_by" text,
	"submitted_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_group_id_game_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."game_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "graphics_settings" ADD CONSTRAINT "graphics_settings_group_id_game_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."game_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_profiles" ADD CONSTRAINT "performance_profiles_group_id_game_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."game_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youtube_links" ADD CONSTRAINT "youtube_links_group_id_game_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."game_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "groupId_version_unq" ON "performance_profiles" USING btree ("group_id","game_version");