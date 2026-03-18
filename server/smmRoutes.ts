import type { Express, Request, Response } from "express";
import { count, eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { birds, breedingPairs, broods, species } from "../drizzle/schema";
import { ENV } from "./_core/env";

/**
 * Register read-only REST routes for the SMM (Social Media Manager) companion app.
 * Auth: shared secret via the `x-smm-secret` request header.
 */
export function registerSmmRoutes(app: Express) {
  // ── Auth middleware ────────────────────────────────────────────────────────
  function requireSmmSecret(req: Request, res: Response): boolean {
    const secret = ENV.smmApiSecret;
    if (!secret) {
      res.status(503).json({ error: "SMM integration not configured (SMM_API_SECRET not set)" });
      return false;
    }
    if (req.headers["x-smm-secret"] !== secret) {
      res.status(401).json({ error: "Unauthorised" });
      return false;
    }
    return true;
  }

  // ── GET /api/smm/birds ─────────────────────────────────────────────────────
  // All birds with name, species, gender, colour/mutation, status, DOB
  app.get("/api/smm/birds", async (req: Request, res: Response) => {
    if (!requireSmmSecret(req, res)) return;
    try {
      const rows = await getDb()
        .select({
          id: birds.id,
          userId: birds.userId,
          name: birds.name,
          ringId: birds.ringId,
          gender: birds.gender,
          colorMutation: birds.colorMutation,
          status: birds.status,
          dateOfBirth: birds.dateOfBirth,
          cageNumber: birds.cageNumber,
          speciesId: birds.speciesId,
          speciesName: species.commonName,
          speciesCategory: species.category,
        })
        .from(birds)
        .leftJoin(species, eq(birds.speciesId, species.id))
        .orderBy(birds.id);

      res.json(rows);
    } catch (err) {
      console.error("[SMM] /api/smm/birds error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── GET /api/smm/pairs ─────────────────────────────────────────────────────
  // Active breeding pairs
  app.get("/api/smm/pairs", async (req: Request, res: Response) => {
    if (!requireSmmSecret(req, res)) return;
    try {
      const rows = await getDb()
        .select({
          id: breedingPairs.id,
          userId: breedingPairs.userId,
          maleId: breedingPairs.maleId,
          femaleId: breedingPairs.femaleId,
          season: breedingPairs.season,
          pairingDate: breedingPairs.pairingDate,
          status: breedingPairs.status,
          notes: breedingPairs.notes,
        })
        .from(breedingPairs)
        .where(eq(breedingPairs.status, "active"))
        .orderBy(breedingPairs.id);

      res.json(rows);
    } catch (err) {
      console.error("[SMM] /api/smm/pairs error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── GET /api/smm/broods ────────────────────────────────────────────────────
  // Current broods (incubating or hatched) with egg counts
  app.get("/api/smm/broods", async (req: Request, res: Response) => {
    if (!requireSmmSecret(req, res)) return;
    try {
      const rows = await getDb()
        .select({
          id: broods.id,
          userId: broods.userId,
          pairId: broods.pairId,
          season: broods.season,
          status: broods.status,
          eggsLaid: broods.eggsLaid,
          layDate: broods.layDate,
          expectedHatchDate: broods.expectedHatchDate,
          actualHatchDate: broods.actualHatchDate,
          chicksSurvived: broods.chicksSurvived,
          notes: broods.notes,
        })
        .from(broods)
        .where(inArray(broods.status, ["incubating", "hatched"]))
        .orderBy(broods.layDate);

      res.json(rows);
    } catch (err) {
      console.error("[SMM] /api/smm/broods error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── GET /api/smm/stats ─────────────────────────────────────────────────────
  // Summary counts: total birds, active pairs, current broods
  app.get("/api/smm/stats", async (req: Request, res: Response) => {
    if (!requireSmmSecret(req, res)) return;
    try {
      const db = getDb();

      const [birdsCount, pairsCount, broodsCount] = await Promise.all([
        db
          .select({ total: count() })
          .from(birds)
          .where(inArray(birds.status, ["alive", "breeding", "resting"])),
        db
          .select({ total: count() })
          .from(breedingPairs)
          .where(eq(breedingPairs.status, "active")),
        db
          .select({ total: count() })
          .from(broods)
          .where(inArray(broods.status, ["incubating", "hatched"])),
      ]);

      res.json({
        totalBirds: birdsCount[0]?.total ?? 0,
        activePairs: pairsCount[0]?.total ?? 0,
        currentBroods: broodsCount[0]?.total ?? 0,
      });
    } catch (err) {
      console.error("[SMM] /api/smm/stats error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

