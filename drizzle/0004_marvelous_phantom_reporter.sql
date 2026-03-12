DO $$ BEGIN ALTER TYPE "public"."egg_outcome" ADD VALUE 'fledged'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
ALTER TABLE "clutchEggs" ADD COLUMN "outcomeDate" date;