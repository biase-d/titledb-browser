DROP TYPE "public"."fps_behavior";--> statement-breakpoint
CREATE TYPE "public"."fps_behavior" AS ENUM('Locked', 'Stable', 'Unstable', 'Very Unstable');