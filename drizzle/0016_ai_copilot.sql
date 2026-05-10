CREATE TABLE IF NOT EXISTS "aiConversations" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "clientKey" varchar(160),
  "title" varchar(160) DEFAULT 'Aviary AI Chat' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aiMessages" (
  "id" serial PRIMARY KEY NOT NULL,
  "conversationId" integer NOT NULL,
  "userId" integer NOT NULL,
  "messageId" varchar(128),
  "role" varchar(32) NOT NULL,
  "parts" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aiMemories" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "category" varchar(64) NOT NULL,
  "content" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "aiUsageEvents" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "eventType" varchar(64) NOT NULL,
  "toolName" varchar(128),
  "status" varchar(32) NOT NULL,
  "latencyMs" integer,
  "model" varchar(128),
  "tokenCount" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aiConversations_userId_idx" ON "aiConversations" USING btree ("userId");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "aiConversations_userId_clientKey_unique" ON "aiConversations" USING btree ("userId", "clientKey");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aiMessages_conversationId_idx" ON "aiMessages" USING btree ("conversationId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aiMessages_userId_idx" ON "aiMessages" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aiMemories_userId_idx" ON "aiMemories" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aiUsageEvents_userId_idx" ON "aiUsageEvents" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aiUsageEvents_eventType_idx" ON "aiUsageEvents" USING btree ("eventType");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "aiUsageEvents_createdAt_idx" ON "aiUsageEvents" USING btree ("createdAt");
