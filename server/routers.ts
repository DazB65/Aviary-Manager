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
  category: "milestone" | "tip" | "seasonal";
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
      title: `${stats.totalBirds} birds in the flock`,
      caption: `${stats.totalBirds} birds and counting! 🐦 Every single one has their own personality and it's so rewarding watching them thrive. Loving every moment of this hobby — there's nothing quite like the sound of a happy aviary in the morning.`,
      hashtags: "#AviaryLife #BirdKeeping #FinchBreeder #BackyardAviary #AviaryManager",
    });
  }

  if (stats.activePairs > 0) {
    ideas.push({
      id: "milestone-pairs",
      category: "milestone",
      emoji: "💑",
      title: `${stats.activePairs} active breeding pairs this season`,
      caption: `We have ${stats.activePairs} breeding pairs active this season — fingers crossed for lots of healthy chicks! 🤞 Keeping detailed records of each pairing so we can track what's working and plan future pairings. Breeding season is always the most exciting time of year in the aviary.`,
      hashtags: "#BreedingSeason #FinchBreeder #BirdBreeder #AviaryLife #AviaryManager",
    });
  }

  if (stats.eggsIncubating > 0) {
    ideas.push({
      id: "milestone-eggs",
      category: "milestone",
      emoji: "🥚",
      title: `${stats.eggsIncubating} eggs incubating right now`,
      caption: `${stats.eggsIncubating} eggs currently incubating in the aviary! 🥚 The waiting game is always the hardest part. Checking on them every day and counting down to hatch day. There's nothing more exciting than seeing those first little cracks appear!`,
      hashtags: "#EggWatch #BirdBreeding #FinchEggs #HatchDay #AviaryLife #AviaryManager",
    });
  }

  if (stats.upcomingHatches > 0) {
    ideas.push({
      id: "milestone-hatches",
      category: "milestone",
      emoji: "🐣",
      title: `${stats.upcomingHatches} broods due to hatch soon`,
      caption: `${stats.upcomingHatches} broods due to hatch in the next two weeks — the aviary is about to get a lot busier! 🐣 Making sure everything is ready for the new arrivals. Hatch day is honestly one of the best days as a breeder.`,
      hashtags: "#HatchDay #BirdBreeding #NewChicks #AviaryLife #FinchBreeder #AviaryManager",
    });
  }

  // ── Personal aviary stories (always shown) ─────────────────────────────────
  ideas.push(
    {
      id: "story-morning",
      category: "milestone",
      emoji: "🌅",
      title: "Morning in the aviary",
      caption: "There's something special about the first hour in the aviary each morning. Checking in on every bird, spotting who's active, who's sitting tight on eggs, and who might need a little extra attention. These quiet morning checks are honestly one of the best parts of keeping birds. 🐦",
      hashtags: "#AviaryLife #BirdKeeping #FinchBreeder #MorningRoutine #AviaryManager",
    },
    {
      id: "story-mutations",
      category: "milestone",
      emoji: "🎨",
      title: "The joy of colour mutations",
      caption: "Colour mutations are one of the most fascinating parts of breeding finches. Planning pairings to produce specific colour outcomes takes patience, good records, and a bit of genetics knowledge — but when you get that stunning chick you've been working towards, it makes it all worth it! 🎨",
      hashtags: "#ColourMutations #GouldianFinch #FinchBreeder #BirdBreeder #AviaryManager",
    },
    {
      id: "story-lineage",
      category: "milestone",
      emoji: "🌳",
      title: "Knowing your birds' lineage",
      caption: "One of the most important parts of a serious breeding program is knowing exactly where each bird comes from. Tracking lineage helps avoid inbreeding, plan better pairings, and produce healthier, stronger chicks. The history behind each bird makes them even more special. 🐦",
      hashtags: "#BirdPedigree #FinchBreeder #BreedingProgram #AviaryLife #AviaryManager",
    },
    {
      id: "story-nestbox",
      category: "milestone",
      emoji: "🏠",
      title: "Nest box check day",
      caption: "Nest box check day! 🏠 Always a mix of excitement and nerves — you never quite know what you'll find. New eggs, tiny chicks, or a pair that's decided they're not ready yet. Every check tells a story. This is the part of the hobby that keeps me coming back season after season.",
      hashtags: "#NestBox #BirdBreeding #FinchBreeder #AviaryLife #AviaryManager",
    }
  );

  // ── Tips ───────────────────────────────────────────────────────────────────
  ideas.push(
    {
      id: "tip-hatch-rate",
      category: "tip",
      emoji: "📊",
      title: "Tip: Know your hatch rate",
      caption: "💡 Breeder tip: Log every egg outcome — hatched, infertile, cracked, or abandoned. Once you start tracking this, you'll spot patterns quickly. Are certain pairs consistently producing infertile eggs? Is the humidity in your nest boxes right? Knowing your numbers is the first step to improving them.",
      hashtags: "#BreederTips #BirdBreeding #HatchRate #AviaryLife #AviaryManager",
    },
    {
      id: "tip-ring-id",
      category: "tip",
      emoji: "🔢",
      title: "Tip: Band all your birds",
      caption: "💡 Breeder tip: Leg banding is one of the best things you can do for your flock management. A unique ring ID means you can tell birds apart at a glance, track each bird's history, and prove provenance when selling. Do you band all your birds, or just the breeding stock?",
      hashtags: "#BreederTips #BirdBanding #FinchBreeder #AviaryLife #AviaryManager",
    },
    {
      id: "tip-notes",
      category: "tip",
      emoji: "📝",
      title: "Tip: Log behaviour observations",
      caption: "💡 Breeder tip: Keep notes on individual birds — not just health issues, but behaviour too. Is a bird becoming more aggressive? Has a hen started spending more time in the nest box? Small observations recorded over time can help you catch problems early and make smarter breeding decisions.",
      hashtags: "#BreederTips #BirdHealth #AviaryLife #FinchBreeder #AviaryManager",
    },
    {
      id: "tip-diet",
      category: "tip",
      emoji: "🌿",
      title: "Tip: Breeding condition diet",
      caption: "💡 Breeder tip: Diet plays a huge role in breeding success. Introducing egg food, live food, and sprouted seed a few weeks before pairing up can make a real difference to fertility and chick survival rates. What do you feed your birds during breeding season?",
      hashtags: "#BreederTips #BirdDiet #FinchBreeder #AviaryLife #AviaryManager",
    }
  );

  // ── Seasonal ───────────────────────────────────────────────────────────────
  if (isSpringSeason) {
    ideas.push({
      id: "seasonal-spring",
      category: "seasonal",
      emoji: "🌱",
      title: "Spring breeding season is here!",
      caption: "Spring has arrived and the aviary is buzzing with energy! 🌱 The birds are in full breeding condition and the nest boxes are going in this week. There's nothing quite like the excitement of a new breeding season — so much to look forward to over the coming months!",
      hashtags: "#SpringBreeding #BreedingSeason #AustralianBirds #FinchBreeder #AviaryManager",
    });
  } else {
    ideas.push({
      id: "seasonal-offseason",
      category: "seasonal",
      emoji: "✨",
      title: "Off-season aviary prep",
      caption: "The quiet season is the perfect time to get the aviary ready for breeding. Cleaning out nest boxes, checking cage condition, reviewing last season's records, and planning pairings for the year ahead. What does your off-season prep look like?",
      hashtags: "#AviaryLife #BirdKeeping #BreedingPrep #FinchBreeder #AviaryManager",
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
        incubationDays: z.number().int().min(1).max(365).default(14),
        clutchSizeMin: z.number().int().min(0).max(50).optional(),
        clutchSizeMax: z.number().int().min(0).max(50).optional(),
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
        genotype: z.string().optional(),
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
        genotype: z.string().nullable().optional(),
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
    breedingHistory: activeProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => BroodService.getBreedingHistoryByBird(input.id, ctx.user.id)),
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
      .query(({ ctx, input }) => PairService.getPairById(input.id, ctx.user.id)),

    create: activeProcedure
      .input(z.object({
        maleId: z.number(),
        femaleId: z.number(),
        season: z.number().int().min(2000).max(2100).optional(),
        pairingDate: z.string().optional(),
        status: z.enum(["active", "breeding", "resting", "retired"]).default("active"),
        cageNumber: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const [male, female] = await Promise.all([
          BirdService.getBirdById(input.maleId, ctx.user.id),
          BirdService.getBirdById(input.femaleId, ctx.user.id),
        ]);
        if (!male) throw new TRPCError({ code: "BAD_REQUEST", message: "Male bird not found" });
        if (!female) throw new TRPCError({ code: "BAD_REQUEST", message: "Female bird not found" });

        const { cageNumber, ...pairData } = input;
        let pair;
        try {
          pair = await PairService.createPair({ ...pairData, userId: ctx.user.id } as any);
        } catch (err: any) {
          // Unique constraint on (userId, maleId, femaleId, season) catches duplicates
          if (err?.code === "23505" || err?.constraint) {
            const yearStr = input.season ? ` in ${input.season}` : "";
            throw new TRPCError({ code: "CONFLICT", message: `This pair already exists${yearStr}. You can pair the same birds in a different year.` });
          }
          throw err;
        }
        // Auto-set bird status to "breeding" when an active/breeding pair is created
        const birdUpdate: Record<string, any> = {};
        if (["active", "breeding"].includes(input.status ?? "active")) {
          birdUpdate.status = "breeding";
        }
        if (cageNumber !== undefined) {
          birdUpdate.cageNumber = cageNumber || null;
        }
        if (Object.keys(birdUpdate).length > 0) {
          await Promise.all([
            BirdService.updateBird(input.maleId, ctx.user.id, birdUpdate),
            BirdService.updateBird(input.femaleId, ctx.user.id, birdUpdate),
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
        status: z.enum(["active", "breeding", "resting", "retired"]).optional(),
        cageNumber: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, cageNumber, ...data } = input;

        // Fetch pair to get maleId/femaleId for bird status sync
        const existing = await PairService.getPairById(id, ctx.user.id);

        await PairService.updatePair(id, ctx.user.id, data as any);

        if (existing) {
          const maleId = data.maleId ?? existing.maleId;
          const femaleId = data.femaleId ?? existing.femaleId;

          const birdUpdate: Record<string, any> = {};
          if (data.status !== undefined) {
            birdUpdate.status = ["active", "breeding"].includes(data.status!) ? "breeding" : "alive";
          }
          if (cageNumber !== undefined) {
            birdUpdate.cageNumber = cageNumber || null;
          }
          if (Object.keys(birdUpdate).length > 0) {
            await Promise.all([
              BirdService.updateBird(maleId, ctx.user.id, birdUpdate),
              BirdService.updateBird(femaleId, ctx.user.id, birdUpdate),
            ]);
          }
        }
      }),

    delete: activeProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Revert bird statuses to "alive" before removing the pair
        const pair = await PairService.getPairById(input.id, ctx.user.id);

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
      .query(({ ctx, input }) => BroodService.getBroodsByPair(input.pairId, ctx.user.id)),

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
        await EventService.syncBroodEvents(ctx.user.id, null, input.id);
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
        outcome: z.enum(["unknown", "fertile", "infertile", "cracked", "hatched", "died", "fledged", "missing", "abandoned"]),
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
      .input(z.object({ userId: z.number(), plan: z.enum(["free", "starter", "pro"]) }))
      .mutation(({ input }) => UserService.setUserPlan(input.userId, input.plan)),
    deleteUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(({ ctx, input }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot delete your own account" });
        }
        return UserService.deleteUser(input.userId);
      }),
    setRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(({ ctx, input }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot change your own role" });
        }
        return UserService.setUserRole(input.userId, input.role);
      }),
  }),
  // ─── Marketing ────────────────────────────────────────────────────────────
  // Content idea generator for social media content based on user's aviary data
  marketing: router({
    ideas: activeProcedure.query(async ({ ctx }) => {
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
