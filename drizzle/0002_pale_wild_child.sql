CREATE TABLE "graphics_settings" (
	"groupId" text PRIMARY KEY NOT NULL,
	"settings" jsonb NOT NULL,
	"lastUpdated" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "youtube_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"groupId" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"submittedBy" text,
	"submittedAt" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "graphics_settings" ADD CONSTRAINT "graphics_settings_groupId_performance_profiles_groupId_fk" FOREIGN KEY ("groupId") REFERENCES "public"."performance_profiles"("groupId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youtube_links" ADD CONSTRAINT "youtube_links_groupId_performance_profiles_groupId_fk" FOREIGN KEY ("groupId") REFERENCES "public"."performance_profiles"("groupId") ON DELETE no action ON UPDATE no action;