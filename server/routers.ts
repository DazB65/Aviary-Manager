import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { activeProcedure, adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { SpeciesService } from "./services/speciesService";
import { BirdService } from "./services/birdService";
import { PairService } from "./services/pairService";
import { BroodService } from "./services/broodService";
import { EventService } from "./services/eventService";
import { SettingsService } from "./services/settingsService";
import { StatsService } from "./services/statsService";
import { UserService } from "./services/userService";
import { PedigreeService } from "./services/pedigreeService";
import { getChatStats } from "./_core/chat";

import { storagePut } from "./storage";
import { nanoid } from "nanoid";

// ─── Marketing: content idea generator ───────────────────────────────────────
type DashboardStats = Awaited<ReturnType<typeof StatsService.getDashboardStatsByUser>>;

export interface ContentIdea {
  id: string;
  category: "feature" | "milestone" | "tip" | "seasonal";
  emoji: string;
  title: string;
  caption: string;
  hashtags: string;
}

function generateContentIdeas(stats: DashboardStats): ContentIdea[] {
  const ideas: ContentIdea[] = [];
  const month = new Date().getMonth(); // 0-based
  const isSpringSeason = month >= 7 && month <= 10; // Aug–Nov (Southern Hemisphere)

  // ── Data-driven milestones (only when user has relevant data) ───────────────
  if (stats.totalBirds > 0) {
    ideas.push({
      id: "milestone-birds",
      category: "milestone",
      emoji: "🐦",
      title: `${stats.totalBirds} birds tracked`,
      caption: `Managing a flock of ${stats.totalBirds} birds takes dedication — and good record keeping. Aviary Manager keeps every bird's profile, lineage, and health history in one place. Try it free at aviarymanager.app`,
      hashtags: "#AviaryManager #BirdKeeping #FinchBreeder #AviaryLife",
    });
  }

  if (stats.activePairs > 0) {
    ideas.push({
      id: "milestone-pairs",
      category: "milestone",
      emoji: "💑",
      title: `${stats.activePairs} active breeding pairs`,
      caption: `${stats.activePairs} breeding pairs are active in our aviary this season. Aviary Manager tracks every pairing, clutch, and hatch date so nothing slips through the cracks. Learn more at aviarymanager.app`,
      hashtags: "#AviaryManager #BreedingFinches #BirdBreeder #GouldianFinch",
    });
  }

  if (stats.eggsIncubating > 0) {
    ideas.push({
      id: "milestone-eggs",
      category: "milestone",
      emoji: "🥚",
      title: `${stats.eggsIncubating} eggs incubating`,
      caption: `${stats.eggsIncubating} eggs currently incubating! Aviary Manager automatically calculates expected hatch dates and reminds you when to check. No more counting on your fingers. aviarymanager.app`,
      hashtags: "#AviaryManager #EggTracking #BirdBreeding #FinchEggs",
    });
  }

  if (stats.upcomingHatches > 0) {
    ideas.push({
      id: "milestone-hatches",
      category: "milestone",
      emoji: "🐣",
      title: `${stats.upcomingHatches} broods hatching soon`,
      caption: `${stats.upcomingHatches} broods are due to hatch in the next two weeks — exciting times in the aviary! Aviary Manager keeps track of every clutch so you're always prepared. aviarymanager.app`,
      hashtags: "#AviaryManager #HatchDay #BirdBreeding #AviaryLife",
    });
  }

  // ── Feature spotlights (always shown) ──────────────────────────────────────
  ideas.push(
    {
      id: "feature-pedigree",
      category: "feature",
      emoji: "🌳",
      title: "Pedigree tracking & PDF export",
      caption: "Know exactly where every bird in your flock comes from. Aviary Manager builds a full pedigree tree for any bird and lets you export it as a PDF to share with buyers. Perfect for serious breeders. Try it free at aviarymanager.app",
      hashtags: "#AviaryManager #BirdPedigree #FinchBreeder #BirdKeeping",
    },
    {
      id: "feature-pairs",
      category: "feature",
      emoji: "❤️",
      title: "Breeding pair management",
      caption: "Set up a breeding pair, record when eggs were laid, track incubation, and log hatch outcomes — all in one place. Aviary Manager makes breeding record keeping simple. aviarymanager.app",
      hashtags: "#AviaryManager #BreedingRecords #BirdBreeder #Aviculture",
    },
    {
      id: "feature-events",
      category: "feature",
      emoji: "📅",
      title: "Events & reminders",
      caption: "Vet checks, banding dates, medication schedules — Aviary Manager's event reminders keep your aviary running smoothly. Never miss an important date again. aviarymanager.app",
      hashtags: "#AviaryManager #BirdCare #VetReminders #BirdKeeping",
    },
    {
      id: "feature-mutations",
      category: "feature",
      emoji: "🎨",
      title: "Colour mutation tracking",
      caption: "Planning your breeding program for specific colour outcomes? Aviary Manager lets you record each bird's colour mutation so you can plan pairings with confidence. aviarymanager.app",
      hashtags: "#AviaryManager #ColourMutations #GouldianFinch #FinchBreeder",
    },
    {
      id: "feature-mobile",
      category: "feature",
      emoji: "📱",
      title: "Works on any device",
      caption: "Aviary Manager works in your browser on phone, tablet, or desktop — no app download needed. Check on your flock from anywhere. Start your free trial at aviarymanager.app",
      hashtags: "#AviaryManager #BirdKeeping #FinchBreeder #Aviculture",
    }
  );

  // ── Tips ───────────────────────────────────────────────────────────────────
  ideas.push(
    {
      id: "tip-hatch-rate",
      category: "tip",
      emoji: "📊",
      title: "Tip: Track your hatch rate",
      caption: "💡 Breeder tip: Log every egg outcome — hatched, infertile, cracked — and Aviary Manager will calculate your hatch rate over time. Knowing your numbers helps you improve your breeding results. aviarymanager.app",
      hashtags: "#BreederTips #AviaryManager #BirdBreeding #HatchRate",
    },
    {
      id: "tip-ring-id",
      category: "tip",
      emoji: "🔢",
      title: "Tip: Use ring IDs for quick lookup",
      caption: "💡 Breeder tip: Add each bird's leg ring ID in Aviary Manager and you can search your whole flock instantly by ring number. No more flipping through notebooks. aviarymanager.app",
      hashtags: "#BreederTips #AviaryManager #BirdBanding #FinchBreeder",
    },
    {
      id: "tip-notes",
      category: "tip",
      emoji: "📝",
      title: "Tip: Use bird notes for behaviour logs",
      caption: "💡 Breeder tip: The notes field on each bird profile is great for logging behaviour observations, weight checks, or anything unusual. Build a health history over time. aviarymanager.app",
      hashtags: "#BreederTips #AviaryManager #BirdHealth #Aviculture",
    }
  );

  // ── Seasonal ───────────────────────────────────────────────────────────────
  if (isSpringSeason) {
    ideas.push({
      id: "seasonal-spring",
      category: "seasonal",
      emoji: "🌱",
      title: "Spring breeding season is here",
      caption: "Spring is breeding season in Australian aviaries! If you're not already tracking your pairs and clutches digitally, now is the perfect time to start. Aviary Manager is free to try — aviarymanager.app",
      hashtags: "#SpringBreeding #AviaryManager #AustralianBirds #FinchBreeder",
    });
  } else {
    ideas.push({
      id: "seasonal-offseason",
      category: "seasonal",
      emoji: "✨",
      title: "Off-season prep tip",
      caption: "The quiet season is the best time to get your aviary records in order before breeding begins. Aviary Manager lets you set up all your birds and pairs so you're ready to go when the season starts. aviarymanager.app",
      hashtags: "#AviaryManager #BirdKeeping #BreedingPrep #FinchBreeder",
    });
  }

  return ideas;
}

// ─── Helper: add days to a date string ───────────────────────────────────────
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Species ───────────────────────────────────────────────────────────────
  species: router({
    list: activeProcedure.query(({ ctx }) => SpeciesService.getAllSpecies(ctx.user.id)),
    create: activeProcedure
      .input(z.object({
        commonName: z.string().min(1),
        scientificName: z.string().optional(),
        category: z.string().optional(),
        incubationDays: z.number().int().min(1).default(14),
        clutchSizeMin: z.number().int().optional(),
        clutchSizeMax: z.number().int().optional(),
      }))
      .mutation(({ ctx, input }) =>
        SpeciesService.createSpecies({ ...input, isCustom: true, userId: ctx.user.id } as any)
      ),
  }),

  // ─── Birds ─────────────────────────────────────────────────────────────────
  birds: router({
    list: activeProcedure.query(({ ctx }) => BirdService.getBirdsByUser(ctx.user.id)),

    get: activeProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => BirdService.getBirdById(input.id, ctx.user.id)),

    create: activeProcedure
      .input(z.object({
        speciesId: z.number(),
        ringId: z.string().optional(),
        name: z.string().optional(),
        gender: z.enum(["male", "female", "unknown"]).default("unknown"),
        dateOfBirth: z.string().optional(),
        fledgedDate: z.string().optional(),
        cageNumber: z.string().optional(),
        colorMutation: z.string().optional(),
        photoUrl: z.string().optional(),
        notes: z.string().optional(),
        fatherId: z.number().optional(),
        motherId: z.number().optional(),
        status: z.enum(["alive", "breeding", "resting", "fledged", "deceased", "sold", "unknown"]).default("alive"),
        fromBroodId: z.number().optional(),
        fromEggNumber: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return BirdService.createBird({ ...input, userId: ctx.user.id } as any);
      }),
    update: activeProcedure
      .input(z.object({
        id: z.number(),
        speciesId: z.number().optional(),
        ringId: z.string().optional(),
        name: z.string().optional(),
        gender: z.enum(["male", "female", "unknown"]).optional(),
        dateOfBirth: z.string().optional(),
        fledgedDate: z.string().optional(),
        cageNumber: z.string().optional(),
        colorMutation: z.string().optional(),
        photoUrl: z.string().optional(),
        notes: z.string().optional(),
        fatherId: z.number().nullable().optional(),
        motherId: z.number().nullable().optional(),
        status: z.enum(["alive", "breeding", "resting", "fledged", "deceased", "sold", "unknown"]).optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return BirdService.updateBird(id, ctx.user.id, data as any);
      }),

    delete: activeProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => BirdService.deleteBird(input.id, ctx.user.id)),
    pedigree: activeProcedure
      .input(z.object({ id: z.number(), generations: z.number().min(1).max(5).default(5) }))
      .query(({ ctx, input }) => {
        return PedigreeService.getPedigree(input.id, ctx.user.id, input.generations);
      }),
    descendants: activeProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => PedigreeService.getDescendants(input.id, ctx.user.id)),
    siblings: activeProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => PedigreeService.getSiblings(input.id, ctx.user.id)),
    uploadPhoto: activeProcedure
      .input(z.object({
        filename: z.string(),
        contentType: z.string(),
        // 5 MB limit: base64 expands ~33%, so 5 * 1024 * 1024 * (4/3) ≈ 7,000,000 chars
        dataBase64: z.string().max(7_000_000, "Image must be 5 MB or smaller"),
      }))
      .mutation(async ({ ctx, input }) => {
        const MIME_TO_EXT: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/gif": "gif",
          "image/webp": "webp",
        };
        const ext = MIME_TO_EXT[input.contentType];
        if (!ext) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only JPEG, PNG, GIF, and WebP images are allowed.",
          });
        }
        const key = `birds/${ctx.user.id}/${nanoid()}.${ext}`;
        const buffer = Buffer.from(input.dataBase64, "base64");
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url };
      }),
  }),

  // ─── Breeding Pairs ────────────────────────────────────────────────────────
  pairs: router({
    list: activeProcedure.query(({ ctx }) => PairService.getPairsByUser(ctx.user.id)),

    get: activeProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const pairs = await PairService.getPairsByUser(ctx.user.id);
        return pairs.find((p: any) => p.id === input.id);
      }),

    create: activeProcedure
      .input(z.object({
        maleId: z.number(),
        femaleId: z.number(),
        season: z.number().int().min(2000).max(2100).optional(),
        pairingDate: z.string().optional(),
        status: z.enum(["active", "resting", "retired"]).default("active"),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Fetch all pairs once — used for duplicate detection
        const existing = await PairService.getPairsByUser(ctx.user.id);

        const duplicate = existing.find(
          (p: any) => p.maleId === input.maleId && p.femaleId === input.femaleId &&
            (p.season ?? null) === (input.season ?? null)
        );
        if (duplicate) {
          const yearStr = input.season ? ` in ${input.season}` : "";
          throw new TRPCError({ code: "CONFLICT", message: `This pair already exists${yearStr}. You can pair the same birds in a different year.` });
        }

        const pair = await PairService.createPair({ ...input, userId: ctx.user.id } as any);
        // Auto-set bird status to "breeding" when an active pair is created
        if ((input.status ?? "active") === "active") {
          await Promise.all([
            BirdService.updateBird(input.maleId, ctx.user.id, { status: "breeding" }),
            BirdService.updateBird(input.femaleId, ctx.user.id, { status: "breeding" }),
          ]);
        }
        return pair;
      }),

    update: activeProcedure
      .input(z.object({
        id: z.number(),
        maleId: z.number().optional(),
        femaleId: z.number().optional(),
        season: z.number().int().min(2000).max(2100).nullable().optional(),
        pairingDate: z.string().optional(),
        status: z.enum(["active", "resting", "retired"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;

        // Fetch pair first to get maleId/femaleId (may not be in update payload)
        const allPairs = await PairService.getPairsByUser(ctx.user.id);
        const existing = allPairs.find(p => p.id === id);

        await PairService.updatePair(id, ctx.user.id, data as any);

        // Sync bird statuses when pair status changes
        if (data.status !== undefined && existing) {
          const maleId = data.maleId ?? existing.maleId;
          const femaleId = data.femaleId ?? existing.femaleId;
          const birdStatus = data.status === "active" ? "breeding" : "alive";
          await Promise.all([
            BirdService.updateBird(maleId, ctx.user.id, { status: birdStatus }),
            BirdService.updateBird(femaleId, ctx.user.id, { status: birdStatus }),
          ]);
        }
      }),

    delete: activeProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Revert bird statuses to "alive" before removing the pair
        const allPairs = await PairService.getPairsByUser(ctx.user.id);
        const pair = allPairs.find(p => p.id === input.id);

        await PairService.deletePair(input.id, ctx.user.id);

        if (pair) {
          await Promise.all([
            BirdService.updateBird(pair.maleId, ctx.user.id, { status: "alive" }),
            BirdService.updateBird(pair.femaleId, ctx.user.id, { status: "alive" }),
          ]);
        }
      }),
    inbreeding: activeProcedure
      .input(z.object({ maleId: z.number(), femaleId: z.number() }))
      // Simplified simulation of cross-checking paths for now since logic is complex
      .query(({ ctx, input }) => PedigreeService.calcInbreedingCoefficient(input.maleId, input.femaleId, ctx.user.id)),
    siblingCheck: activeProcedure
      .input(z.object({ maleId: z.number(), femaleId: z.number() }))
      .query(async ({ ctx, input }) => {
        const siblings = await PedigreeService.getSiblings(input.maleId, ctx.user.id);
        const match = siblings.find(s => s.id === input.femaleId);
        return match ? match.siblingType : null;
      }),
  }),
  // ─── Broods ─────────────────────────────────────────────────────────────────
  broods: router({
    list: activeProcedure.query(({ ctx }) => BroodService.getBroodsByUser(ctx.user.id)),

    byPair: activeProcedure
      .input(z.object({ pairId: z.number() }))
      .query(async ({ ctx, input }) => {
        const broods = await BroodService.getBroodsByUser(ctx.user.id);
        return broods.filter(b => b.pairId === input.pairId);
      }),

    create: activeProcedure
      .input(z.object({
        pairId: z.number(),
        season: z.string().optional(),
        eggsLaid: z.number().int().min(0).default(0),
        layDate: z.string().optional(),
        incubationDays: z.number().int().min(1).default(14),
        actualHatchDate: z.string().optional(),
        chicksSurvived: z.number().int().min(0).default(0),
        status: z.enum(["incubating", "hatched", "failed", "abandoned"]).default("incubating"),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { incubationDays, ...rest } = input;
        // Default to today if no lay date provided
        const baseDate = rest.layDate || new Date().toISOString().split("T")[0];
        const fertilityCheckDate = addDays(baseDate, 7);
        const expectedHatchDate = addDays(baseDate, incubationDays);

        const brood = await BroodService.createBrood({ ...rest, fertilityCheckDate, expectedHatchDate, userId: ctx.user.id } as any);
        await EventService.syncBroodEvents(ctx.user.id, rest.pairId, brood.id, fertilityCheckDate, expectedHatchDate);
        return brood;
      }),

    update: activeProcedure
      .input(z.object({
        id: z.number(),
        eggsLaid: z.number().int().min(0).optional(),
        layDate: z.string().optional(),
        incubationDays: z.number().int().min(1).optional(),
        fertilityCheckDate: z.string().optional(),
        expectedHatchDate: z.string().optional(),
        actualHatchDate: z.string().optional(),
        chicksSurvived: z.number().int().min(0).optional(),
        status: z.enum(["incubating", "hatched", "failed", "abandoned"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, incubationDays, ...data } = input;

        const allBroods = await BroodService.getBroodsByUser(ctx.user.id);
        const existingBrood = allBroods.find(b => b.id === id);
        if (!existingBrood) throw new TRPCError({ code: "NOT_FOUND" });

        let fDate = existingBrood.fertilityCheckDate ? String(existingBrood.fertilityCheckDate).split("T")[0] : undefined;
        let hDate = existingBrood.expectedHatchDate ? String(existingBrood.expectedHatchDate).split("T")[0] : undefined;

        if (data.layDate !== undefined) {
          if (data.layDate !== "") {
            fDate = addDays(data.layDate, 7);
            hDate = addDays(data.layDate, incubationDays || 14);
            data.fertilityCheckDate = fDate;
            data.expectedHatchDate = hDate;
          } else {
            fDate = undefined;
            hDate = undefined;
            data.fertilityCheckDate = null as any;
            data.expectedHatchDate = null as any;
            data.layDate = null as any;
          }
        }

        const result = await BroodService.updateBrood(id, ctx.user.id, data as any);
        await EventService.syncBroodEvents(ctx.user.id, existingBrood.pairId, id, fDate, hDate);
        return result;
      }),

    delete: activeProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await EventService.syncBroodEvents(ctx.user.id, 0, input.id);
        return BroodService.deleteBrood(input.id, ctx.user.id);
      }),

    backfillEvents: activeProcedure.mutation(async ({ ctx }) => {
      const allBroods = await BroodService.getBroodsByUser(ctx.user.id);
      for (const brood of allBroods) {
        let fDate = brood.fertilityCheckDate ? String(brood.fertilityCheckDate).split("T")[0] : undefined;
        let hDate = brood.expectedHatchDate ? String(brood.expectedHatchDate).split("T")[0] : undefined;
        // Fall back to createdAt if no dates exist
        if (!fDate && !hDate) {
          const base = String(brood.createdAt).split("T")[0];
          fDate = addDays(base, 7);
          hDate = addDays(base, 14);
        }
        await EventService.syncBroodEvents(ctx.user.id, brood.pairId, brood.id, fDate, hDate);
      }
      return { synced: allBroods.length };
    }),
  }),

  // ─── Events ────────────────────────────────────────────────────────────────
  events: router({
    list: activeProcedure.query(({ ctx }) => EventService.getEventsByUser(ctx.user.id)),

    create: activeProcedure
      .input(z.object({
        title: z.string().min(1),
        notes: z.string().optional(),
        eventDate: z.string(),
        eventType: z.enum(["vet", "banding", "medication", "weaning", "sale", "supplements", "other"]).default("other"),
        birdId: z.number().optional(),
        pairId: z.number().optional(),
        allBirds: z.boolean().optional(),
        seriesId: z.string().optional(),
        recurrenceUnit: z.string().optional(),
        recurrenceInterval: z.number().optional(),
        isIndefinite: z.boolean().optional(),
      }))
      .mutation(({ ctx, input }) =>
        EventService.createEvent({ ...input, userId: ctx.user.id } as any)
      ),

    update: activeProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        notes: z.string().optional(),
        eventDate: z.string().optional(),
        eventType: z.enum(["vet", "banding", "medication", "weaning", "sale", "supplements", "other"]).optional(),
        birdId: z.number().nullable().optional(),
        pairId: z.number().nullable().optional(),
        completed: z.boolean().optional(),
        allBirds: z.boolean().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return EventService.updateEvent(id, ctx.user.id, data as any);
      }),

    delete: activeProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => EventService.deleteEvent(input.id, ctx.user.id)),
    toggleComplete: activeProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => EventService.toggleEventComplete(input.id, ctx.user.id)),
    deleteAll: activeProcedure
      .mutation(({ ctx }) => EventService.deleteAllEventsForUser(ctx.user.id)),
  }),

  clutchEggs: router({
    list: activeProcedure.query(({ ctx }) => BroodService.getEggsByUser(ctx.user.id)),
    byBrood: activeProcedure
      .input(z.object({ broodId: z.number() }))
      .query(({ ctx, input }) => BroodService.getEggsByBrood(input.broodId, ctx.user.id)),
    upsert: activeProcedure
      .input(z.object({
        broodId: z.number(),
        eggNumber: z.number().int().min(1),
        outcome: z.enum(["unknown", "fertile", "infertile", "cracked", "hatched", "died", "fledged"]),
        outcomeDate: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      }))
      .mutation(({ ctx, input }) =>
        BroodService.upsertClutchEgg(input.broodId, ctx.user.id, input.eggNumber, input.outcome, input.notes ?? undefined, input.outcomeDate ?? undefined)
      ),
    sync: activeProcedure
      .input(z.object({ broodId: z.number(), eggsLaid: z.number().int().min(0) }))
      .mutation(({ ctx, input }) => BroodService.syncClutchEggs(input.broodId, ctx.user.id, input.eggsLaid)),
    deleteByBrood: activeProcedure
      .input(z.object({ broodId: z.number() }))
      .mutation(({ ctx, input }) => BroodService.deleteEggsByBrood(input.broodId, ctx.user.id)),
    convertToBird: activeProcedure
      .input(z.object({ broodId: z.number(), eggNumber: z.number().int().min(1) }))
      .mutation(({ ctx, input }) => BroodService.convertToBird(input.broodId, ctx.user.id, input.eggNumber)),
  }),
  // ─── Dashboard ──────────────────────────────────────────────────────
  dashboard: router({
    stats: activeProcedure.query(({ ctx }) => StatsService.getDashboardStatsByUser(ctx.user.id)),
    seasonStats: activeProcedure
      .input(z.object({ year: z.number().int().min(2000).max(2100) }))
      .query(({ ctx, input }) => {
        return StatsService.getSeasonStats(ctx.user.id, input.year);
      }),
  }),
  // ─── Admin ──────────────────────────────────────────────────────────
  admin: router({
    users: adminProcedure.query(() => UserService.getAllUsers()),
    chatStats: adminProcedure.query(() => getChatStats()),
    setPlan: adminProcedure
      .input(z.object({ userId: z.number(), plan: z.enum(["free", "pro"]) }))
      .mutation(({ input }) => UserService.setUserPlan(input.userId, input.plan)),
    deleteUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(({ ctx, input }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot delete your own account" });
        }
        return UserService.deleteUser(input.userId);
      }),
  }),
  // ─── Marketing ────────────────────────────────────────────────────────────
  // Content idea generator for Aviary Manager's social media presence (admin-only)
  marketing: router({
    ideas: adminProcedure.query(async ({ ctx }) => {
      const stats = await StatsService.getDashboardStatsByUser(ctx.user.id);
      return generateContentIdeas(stats);
    }),
  }),

  // ─── User Settings ────────────────────────────────────────────────────────
  settings: router({
    get: protectedProcedure.query(({ ctx }) => SettingsService.getUserSettings(ctx.user.id)),
    update: protectedProcedure
      .input(z.object({
        favouriteSpeciesIds: z.array(z.number()).optional(),
        defaultSpeciesId: z.number().nullable().optional(),
        breedingYear: z.number().int().min(2000).max(2100).nullable().optional(),
      }))
      .mutation(({ ctx, input }) =>
        SettingsService.updateUserSettings(ctx.user.id, {
          favouriteSpeciesIds: input.favouriteSpeciesIds,
          defaultSpeciesId: input.defaultSpeciesId ?? null,
          breedingYear: input.breedingYear ?? null,
        })
      ),
  }),
});
export type AppRouter = typeof appRouter;
