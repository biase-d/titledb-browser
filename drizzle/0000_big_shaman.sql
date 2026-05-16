CREATE TYPE "public"."contribution_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."fps_behavior" AS ENUM('Locked', 'Stable', 'Unstable', 'Very Unstable');--> statement-breakpoint
CREATE TYPE "public"."resolution_type" AS ENUM('Fixed', 'Dynamic', 'Multiple Fixed');--> statement-breakpoint
CREATE TABLE "data_requests" (
	"game_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "data_requests_game_id_user_id_pk" PRIMARY KEY("game_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" text NOT NULL,
	"game_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "favorites_user_id_game_id_pk" PRIMARY KEY("user_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "game_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"platform_id" integer DEFAULT 1 NOT NULL,
	"youtube_contributors" text[],
	"last_updated" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"names" text[] NOT NULL,
	"regions" text[],
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
	"platform_id" integer DEFAULT 1 NOT NULL,
	"settings" jsonb NOT NULL,
	"contributor" text[],
	"status" "contribution_status" DEFAULT 'approved' NOT NULL,
	"pr_number" integer,
	"last_updated" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"platform_id" integer DEFAULT 1 NOT NULL,
	"game_version" text NOT NULL,
	"suffix" text,
	"profiles" jsonb NOT NULL,
	"contributor" text[],
	"source_pr_url" text,
	"status" "contribution_status" DEFAULT 'approved' NOT NULL,
	"pr_number" integer,
	"last_updated" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
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
CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"has_onboarded" integer DEFAULT 0,
	"preferred_region" text,
	"featured_game_id" text,
	"last_updated" timestamp with time zone DEFAULT now()
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
CREATE TABLE "youtube_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"url" text NOT NULL,
	"notes" text,
	"submitted_by" text,
	"status" "contribution_status" DEFAULT 'approved' NOT NULL,
	"pr_number" integer,
	"submitted_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "groupId_version_unq" ON "performance_profiles" USING btree ("group_id","game_version","suffix");