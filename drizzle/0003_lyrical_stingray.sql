ALTER TABLE "games" RENAME COLUMN "groupId" TO "group_id";--> statement-breakpoint
ALTER TABLE "games" RENAME COLUMN "releaseDate" TO "release_date";--> statement-breakpoint
ALTER TABLE "games" RENAME COLUMN "sizeInBytes" TO "size_in_bytes";--> statement-breakpoint
ALTER TABLE "games" RENAME COLUMN "iconUrl" TO "icon_url";--> statement-breakpoint
ALTER TABLE "games" RENAME COLUMN "bannerUrl" TO "banner_url";--> statement-breakpoint
ALTER TABLE "games" RENAME COLUMN "lastUpdated" TO "last_updated";--> statement-breakpoint
ALTER TABLE "graphics_settings" RENAME COLUMN "groupId" TO "group_id";--> statement-breakpoint
ALTER TABLE "graphics_settings" RENAME COLUMN "lastUpdated" TO "last_updated";--> statement-breakpoint
ALTER TABLE "performance_profiles" RENAME COLUMN "groupId" TO "group_id";--> statement-breakpoint
ALTER TABLE "performance_profiles" RENAME COLUMN "sourcePrUrl" TO "source_pr_url";--> statement-breakpoint
ALTER TABLE "performance_profiles" RENAME COLUMN "lastUpdated" TO "last_updated";--> statement-breakpoint
ALTER TABLE "youtube_links" RENAME COLUMN "groupId" TO "group_id";--> statement-breakpoint
ALTER TABLE "youtube_links" RENAME COLUMN "submittedBy" TO "submitted_by";--> statement-breakpoint
ALTER TABLE "youtube_links" RENAME COLUMN "submittedAt" TO "submitted_at";--> statement-breakpoint
ALTER TABLE "graphics_settings" DROP CONSTRAINT "graphics_settings_groupId_performance_profiles_groupId_fk";
--> statement-breakpoint
ALTER TABLE "youtube_links" DROP CONSTRAINT "youtube_links_groupId_performance_profiles_groupId_fk";
--> statement-breakpoint
ALTER TABLE "graphics_settings" ADD CONSTRAINT "graphics_settings_group_id_performance_profiles_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."performance_profiles"("group_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youtube_links" ADD CONSTRAINT "youtube_links_group_id_performance_profiles_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."performance_profiles"("group_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "youtube_links" DROP COLUMN "description";