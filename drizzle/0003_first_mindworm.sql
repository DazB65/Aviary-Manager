DO $$ BEGIN ALTER TYPE "public"."bird_status" ADD VALUE 'fledged' BEFORE 'deceased'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TYPE "public"."event_type" ADD VALUE 'supplements' BEFORE 'other'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "allBirds" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "seriesId" varchar(64);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "recurrenceUnit" varchar(16);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "recurrenceInterval" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "isIndefinite" boolean DEFAULT false;