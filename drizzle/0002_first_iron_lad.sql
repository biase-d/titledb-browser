DROP INDEX "groupId_version_unq";--> statement-breakpoint
ALTER TABLE "performance_profiles" ADD COLUMN "suffix" text;--> statement-breakpoint
CREATE UNIQUE INDEX "groupId_version_unq" ON "performance_profiles" USING btree ("group_id","game_version","suffix");