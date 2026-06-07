ALTER TABLE "birds" ADD COLUMN IF NOT EXISTS "showsEnabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shows" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"birdId" integer NOT NULL,
	"showDate" date NOT NULL,
	"venue" varchar(200),
	"species" varchar(160),
	"showGroup" varchar(160),
	"result" varchar(160),
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shows_userId_idx" ON "shows" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shows_birdId_idx" ON "shows" USING btree ("birdId");
