DO $$ BEGIN ALTER TYPE "public"."egg_outcome" ADD VALUE 'missing'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
