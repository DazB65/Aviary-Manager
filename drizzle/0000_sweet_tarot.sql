CREATE TYPE "public"."bird_status" AS ENUM('alive', 'deceased', 'sold', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."brood_status" AS ENUM('incubating', 'hatched', 'failed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."egg_outcome" AS ENUM('unknown', 'fertile', 'infertile', 'cracked', 'hatched', 'died');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('vet', 'banding', 'medication', 'weaning', 'sale', 'other');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."pair_status" AS ENUM('active', 'resting', 'retired');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "birds" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"speciesId" integer NOT NULL,
	"ringId" varchar(64),
	"name" varchar(128),
	"gender" "gender" DEFAULT 'unknown' NOT NULL,
	"dateOfBirth" date,
	"cageNumber" varchar(64),
	"colorMutation" varchar(128),
	"photoUrl" text,
	"notes" text,
	"fatherId" integer,
	"motherId" integer,
	"status" "bird_status" DEFAULT 'alive' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "breedingPairs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"maleId" integer NOT NULL,
	"femaleId" integer NOT NULL,
	"season" integer,
	"pairingDate" date,
	"status" "pair_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broods" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"pairId" integer NOT NULL,
	"season" varchar(16),
	"eggsLaid" integer DEFAULT 0,
	"layDate" date,
	"fertilityCheckDate" date,
	"expectedHatchDate" date,
	"actualHatchDate" date,
	"chicksSurvived" integer DEFAULT 0,
	"status" "brood_status" DEFAULT 'incubating' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clutchEggs" (
	"id" serial PRIMARY KEY NOT NULL,
	"broodId" integer NOT NULL,
	"userId" integer NOT NULL,
	"eggNumber" integer NOT NULL,
	"outcome" "egg_outcome" DEFAULT 'unknown' NOT NULL,
	"notes" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(256) NOT NULL,
	"notes" text,
	"eventDate" date NOT NULL,
	"eventType" "event_type" DEFAULT 'other' NOT NULL,
	"birdId" integer,
	"pairId" integer,
	"completed" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "species" (
	"id" serial PRIMARY KEY NOT NULL,
	"commonName" varchar(128) NOT NULL,
	"scientificName" varchar(128),
	"category" varchar(64),
	"incubationDays" integer DEFAULT 14 NOT NULL,
	"clutchSizeMin" integer,
	"clutchSizeMax" integer,
	"fledglingDays" integer,
	"sexualMaturityMonths" integer,
	"nestType" varchar(64),
	"sexingMethod" varchar(64),
	"isCustom" boolean DEFAULT false,
	"userId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "userSettings" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"favouriteSpeciesIds" text,
	"defaultSpeciesId" integer,
	"breedingYear" integer,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "userSettings_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64),
	"name" text,
	"email" varchar(320),
	"passwordHash" varchar(256),
	"loginMethod" varchar(64),
	"emailVerified" boolean DEFAULT false NOT NULL,
	"verifyToken" varchar(128),
	"verifyTokenExpiry" timestamp,
	"resetToken" varchar(128),
	"resetTokenExpiry" timestamp,
	"passwordChangedAt" timestamp,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"stripeCustomerId" varchar(128),
	"stripeSubscriptionId" varchar(128),
	"planExpiresAt" timestamp,
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "breedingPairs_userId_male_female_season_unique" ON "breedingPairs" USING btree ("userId","maleId","femaleId","season");--> statement-breakpoint
CREATE UNIQUE INDEX "clutchEggs_broodId_eggNumber_unique" ON "clutchEggs" USING btree ("broodId","eggNumber");