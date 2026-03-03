import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getAllSpecies, createSpecies,
  getBirdsByUser, getBirdById, createBird, updateBird, deleteBird,
  getPairsByUser, getPairById, createPair, updatePair, deletePair,
  getBroodsByUser, getBroodsByPair, createBrood, updateBrood, deleteBrood,
  getEventsByUser, createEvent, updateEvent, deleteEvent, deleteAllEvents, toggleEventComplete,
  getUserSettings, upsertUserSettings,
  getDashboardStats, getSeasonStats, getAllUsers, setUserPlan, deleteUser,
  getPedigree, calcInbreedingCoefficient, getDescendants, getSiblings,
  getEggsByBrood, upsertClutchEgg, deleteEggsByBrood, syncClutchEggs,
} from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

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
    list: publicProcedure.query(() => getAllSpecies()),
    create: protectedProcedure
      .input(z.object({
        commonName: z.string().min(1),
        scientificName: z.string().optional(),
        category: z.string().optional(),
        incubationDays: z.number().int().min(1).default(14),
        clutchSizeMin: z.number().int().optional(),
        clutchSizeMax: z.number().int().optional(),
      }))
      .mutation(({ ctx, input }) =>
        createSpecies({ ...input, isCustom: true, userId: ctx.user.id })
      ),
  }),

  // ─── Birds ─────────────────────────────────────────────────────────────────
  birds: router({
    list: protectedProcedure.query(({ ctx }) => getBirdsByUser(ctx.user.id)),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => getBirdById(input.id, ctx.user.id)),

    create: protectedProcedure
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
        status: z.enum(["alive", "breeding", "resting", "deceased", "sold", "unknown"]).default("alive"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Free plan: max 20 birds
        if (ctx.user.plan === "free") {
          const existing = await getBirdsByUser(ctx.user.id);
          if (existing.length >= 20) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "FREE_LIMIT_REACHED: Free plan is limited to 20 birds. Upgrade to Pro for unlimited birds.",
            });
          }
        }
        return createBird({ ...input, userId: ctx.user.id } as any);
      }),
    update: protectedProcedure
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
        status: z.enum(["alive", "breeding", "resting", "deceased", "sold", "unknown"]).optional(),
        visualMutations: z.string().optional(),
        splitFor: z.string().optional(),
        singleFactor: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return updateBird(id, ctx.user.id, data as any);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => deleteBird(input.id, ctx.user.id)),
    pedigree: protectedProcedure
      .input(z.object({ id: z.number(), generations: z.number().min(1).max(5).default(5) }))
      .query(({ ctx, input }) => getPedigree(input.id, ctx.user.id, input.generations)),
    descendants: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => getDescendants(input.id, ctx.user.id)),
    siblings: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => getSiblings(input.id, ctx.user.id)),
    uploadPhoto: protectedProcedure
      .input(z.object({
        filename: z.string(),
        contentType: z.string(),
        dataBase64: z.string(),
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
    list: protectedProcedure.query(({ ctx }) => getPairsByUser(ctx.user.id)),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => getPairById(input.id, ctx.user.id)),

    create: protectedProcedure
      .input(z.object({
        maleId: z.number(),
        femaleId: z.number(),
        season: z.number().int().min(2000).max(2100).optional(),
        pairingDate: z.string().optional(),
        status: z.enum(["active", "resting", "retired"]).default("active"),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Free plan: max 5 breeding pairs
        if (ctx.user.plan === "free") {
          const existing = await getPairsByUser(ctx.user.id);
          if (existing.length >= 5) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "FREE_LIMIT_REACHED: Free plan is limited to 5 breeding pairs. Upgrade to Pro for unlimited pairs.",
            });
          }
        }
        // Check for duplicate pair in same season
        const existing = await getPairsByUser(ctx.user.id);
        const duplicate = existing.find(
          p => p.maleId === input.maleId && p.femaleId === input.femaleId &&
               (p.season ?? null) === (input.season ?? null)
        );
        if (duplicate) {
          const yearStr = input.season ? ` in ${input.season}` : "";
          throw new TRPCError({ code: "CONFLICT", message: `This pair already exists${yearStr}. You can pair the same birds in a different year.` });
        }
        const pair = await createPair({ ...input, userId: ctx.user.id } as any);
        // Auto-set bird status to "breeding" when an active pair is created
        if ((input.status ?? "active") === "active") {
          await Promise.all([
            updateBird(input.maleId, ctx.user.id, { status: "breeding" }),
            updateBird(input.femaleId, ctx.user.id, { status: "breeding" }),
          ]);
        }
        return pair;
      }),

    update: protectedProcedure
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
        const existing = await getPairById(id, ctx.user.id);
        await updatePair(id, ctx.user.id, data as any);
        // Sync bird statuses when pair status changes
        if (data.status !== undefined && existing) {
          const maleId = data.maleId ?? existing.maleId;
          const femaleId = data.femaleId ?? existing.femaleId;
          const birdStatus = data.status === "active" ? "breeding" : "alive";
          await Promise.all([
            updateBird(maleId, ctx.user.id, { status: birdStatus }),
            updateBird(femaleId, ctx.user.id, { status: birdStatus }),
          ]);
        }
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Revert bird statuses to "alive" before removing the pair
        const pair = await getPairById(input.id, ctx.user.id);
        await deletePair(input.id, ctx.user.id);
        if (pair) {
          await Promise.all([
            updateBird(pair.maleId, ctx.user.id, { status: "alive" }),
            updateBird(pair.femaleId, ctx.user.id, { status: "alive" }),
          ]);
        }
      }),
    inbreeding: protectedProcedure
      .input(z.object({ maleId: z.number(), femaleId: z.number() }))
      .query(({ ctx, input }) => calcInbreedingCoefficient(input.maleId, input.femaleId, ctx.user.id)),
    siblingCheck: protectedProcedure
      .input(z.object({ maleId: z.number(), femaleId: z.number() }))
      .query(async ({ ctx, input }) => {
        const siblings = await getSiblings(input.maleId, ctx.user.id);
        const match = siblings.find(s => s.id === input.femaleId);
        return match ? match.siblingType : null;
      }),
  }),
  // ─── Broodss ────────────────────────────────────────────────────────────────
  broods: router({
    list: protectedProcedure.query(({ ctx }) => getBroodsByUser(ctx.user.id)),

    byPair: protectedProcedure
      .input(z.object({ pairId: z.number() }))
      .query(({ ctx, input }) => getBroodsByPair(input.pairId, ctx.user.id)),

    create: protectedProcedure
      .input(z.object({
        pairId: z.number(),
        season: z.string().optional(),
        eggsLaid: z.number().int().min(0).default(0),
        layDate: z.string().optional(),
        incubationDays: z.number().int().min(1).default(14), // passed from species
        actualHatchDate: z.string().optional(),
        chicksSurvived: z.number().int().min(0).default(0),
        status: z.enum(["incubating", "hatched", "failed", "abandoned"]).default("incubating"),
        notes: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { incubationDays, ...rest } = input;
        const fertilityCheckDate = rest.layDate ? addDays(rest.layDate, 7) : undefined;
        const expectedHatchDate = rest.layDate ? addDays(rest.layDate, incubationDays) : undefined;
        return createBrood({ ...rest, fertilityCheckDate, expectedHatchDate, userId: ctx.user.id } as any);
      }),

    update: protectedProcedure
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
      .mutation(({ ctx, input }) => {
        const { id, incubationDays, ...data } = input;
        if (data.layDate && incubationDays) {
          data.fertilityCheckDate = addDays(data.layDate, 7);
          data.expectedHatchDate = addDays(data.layDate, incubationDays);
        }
        return updateBrood(id, ctx.user.id, data as any);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => deleteBrood(input.id, ctx.user.id)),
  }),

  // ─── Events ────────────────────────────────────────────────────────────────
  events: router({
    list: protectedProcedure.query(({ ctx }) => getEventsByUser(ctx.user.id)),

    create: protectedProcedure
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
        createEvent({ ...input, userId: ctx.user.id } as any)
      ),

    update: protectedProcedure
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
        return updateEvent(id, ctx.user.id, data as any);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => deleteEvent(input.id, ctx.user.id)),
    toggleComplete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => toggleEventComplete(input.id, ctx.user.id)),
    deleteAll: protectedProcedure
      .mutation(({ ctx }) => deleteAllEvents(ctx.user.id)),
  }),

  // ─── Clutch Eggs ──────────────────────────────────────────────────────────
  clutchEggs: router({
    byBrood: protectedProcedure
      .input(z.object({ broodId: z.number() }))
      .query(({ ctx, input }) => getEggsByBrood(input.broodId, ctx.user.id)),
    upsert: protectedProcedure
      .input(z.object({
        broodId: z.number(),
        eggNumber: z.number().int().min(1),
        outcome: z.enum(["unknown", "fertile", "infertile", "cracked", "hatched", "died"]),
        notes: z.string().optional(),
      }))
      .mutation(({ ctx, input }) =>
        upsertClutchEgg(input.broodId, ctx.user.id, input.eggNumber, input.outcome, input.notes)
      ),
    sync: protectedProcedure
      .input(z.object({ broodId: z.number(), eggsLaid: z.number().int().min(0) }))
      .mutation(({ ctx, input }) => syncClutchEggs(input.broodId, ctx.user.id, input.eggsLaid)),
    deleteByBrood: protectedProcedure
      .input(z.object({ broodId: z.number() }))
      .mutation(({ ctx, input }) => deleteEggsByBrood(input.broodId, ctx.user.id)),
  }),
   // ─── Dashboard ──────────────────────────────────────────────────────
  dashboard: router({
    stats: protectedProcedure.query(({ ctx }) => getDashboardStats(ctx.user.id)),
    seasonStats: protectedProcedure
      .input(z.object({ year: z.number().int().min(2000).max(2100) }))
      .query(({ ctx, input }) => getSeasonStats(ctx.user.id, input.year)),
  }),
  // ─── Admin ──────────────────────────────────────────────────────────
  admin: router({
    users: protectedProcedure.query(({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return getAllUsers();
    }),
    setPlan: protectedProcedure
      .input(z.object({ userId: z.number(), plan: z.enum(["free", "pro"]) }))
      .mutation(({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        return setUserPlan(input.userId, input.plan);
      }),
    deleteUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot delete your own account" });
        }
        return deleteUser(input.userId);
      }),
  }),
  // ─── User Settings ────────────────────────────────────────────────────────
  settings: router({
    get: protectedProcedure.query(({ ctx }) => getUserSettings(ctx.user.id)),
    update: protectedProcedure
      .input(z.object({
        favouriteSpeciesIds: z.array(z.number()).optional(),
        defaultSpeciesId: z.number().nullable().optional(),
        breedingYear: z.number().int().min(2000).max(2100).nullable().optional(),
      }))
      .mutation(({ ctx, input }) =>
        upsertUserSettings(ctx.user.id, {
          favouriteSpeciesIds: input.favouriteSpeciesIds,
          defaultSpeciesId: input.defaultSpeciesId ?? null,
          breedingYear: input.breedingYear ?? null,
        })
      ),
  }),
});
export type AppRouter = typeof appRouter;
