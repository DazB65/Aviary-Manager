ALTER TYPE "public"."bird_status" ADD VALUE 'fledged' BEFORE 'deceased';--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'supplements' BEFORE 'other';--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "allBirds" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "seriesId" varchar(64);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "recurrenceUnit" varchar(16);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "recurrenceInterval" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "isIndefinite" boolean DEFAULT false;