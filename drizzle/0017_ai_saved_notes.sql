CREATE TABLE IF NOT EXISTS "aiSavedNotes" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "title" varchar(160) NOT NULL,
  "content" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aiSavedNotes_userId_idx" ON "aiSavedNotes" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aiSavedNotes_createdAt_idx" ON "aiSavedNotes" USING btree ("createdAt");
