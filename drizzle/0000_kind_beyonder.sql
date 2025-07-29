CREATE TYPE "public"."fps_behavior" AS ENUM('Locked', 'Unlocked');--> statement-breakpoint
CREATE TYPE "public"."resolution_type" AS ENUM('Fixed', 'Dynamic', 'Multiple Fixed');--> statement-breakpoint
CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"groupId" text NOT NULL,
	"names" text[] NOT NULL,
	"publisher" text,
	"releaseDate" integer,
	"sizeInBytes" bigint,
	"iconUrl" text,
	"bannerUrl" text,
	"screenshots" text[],
	"description" text,
	"contributor" text,
	"lastUpdated" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "performance_profiles" (
	"groupId" text PRIMARY KEY NOT NULL,
	"profiles" jsonb NOT NULL,
	"lastUpdated" timestamp with time zone DEFAULT now()
);
