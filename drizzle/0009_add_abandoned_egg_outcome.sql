DO $$ BEGIN
  ALTER TYPE "public"."egg_outcome" ADD VALUE 'abandoned';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
