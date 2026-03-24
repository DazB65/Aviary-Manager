ALTER TYPE "public"."egg_outcome" ADD VALUE IF NOT EXISTS 'abandoned';--> statement-breakpoint
ALTER TYPE "public"."pair_status" ADD VALUE IF NOT EXISTS 'breeding' BEFORE 'resting';
