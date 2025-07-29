ALTER TABLE "performance_profiles" ADD COLUMN "contributor" text;--> statement-breakpoint
ALTER TABLE "performance_profiles" ADD COLUMN "sourcePrUrl" text;--> statement-breakpoint
ALTER TABLE "games" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "games" DROP COLUMN "contributor";