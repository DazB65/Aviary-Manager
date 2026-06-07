import type { Express, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { SpeciesService } from "./services/speciesService";
import { StatsService } from "./services/statsService";
import { SettingsService } from "./services/settingsService";
import { BirdService } from "./services/birdService";
import { ShowService } from "./services/showService";
import { generatePedigreePdf } from "./pedigreePdf";
import { generateSeasonScorecardPdf } from "./seasonReportPdf";
import { generateFlockReportPdf, type FlockComposition } from "./flockReportPdf";
import { getDb } from "./db";
import { birds } from "../drizzle/schema";
import { hasProAccess } from "@shared/access";

// Bird statuses counted as part of the "live flock" (mirrors StatsService dashboard counts).
const ACTIVE_BIRD_STATUSES = new Set(["alive", "breeding", "resting", "fledged"]);

/** Build the flock-composition summary (sex split + top species) from raw birds. */
function buildComposition(
  birdList: { status: string | null; gender: string | null; speciesId: number }[],
  speciesName: Map<number, string>,
): FlockComposition {
  const active = birdList.filter(b => ACTIVE_BIRD_STATUSES.has(b.status ?? ""));
  let males = 0, females = 0, unknown = 0;
  const speciesCount = new Map<number, number>();
  for (const b of active) {
    if (b.gender === "male") males++;
    else if (b.gender === "female") females++;
    else unknown++;
    speciesCount.set(b.speciesId, (speciesCount.get(b.speciesId) ?? 0) + 1);
  }
  const topSpecies = Array.from(speciesCount.entries())
    .map(([id, count]) => ({ name: speciesName.get(id) ?? `Species #${id}`, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  return { males, females, unknown, topSpecies, totalSpecies: speciesCount.size };
}

/**
 * Register REST routes for PDF generation.
 * These sit outside tRPC because they stream binary data.
 */
export function registerPdfRoutes(app: Express) {
  // GET /api/pdf/pedigree/:birdId
  app.get("/api/pdf/pedigree/:birdId", async (req: Request, res: Response) => {
    try {
      // ── Auth ──────────────────────────────────────────────────────────────
      let userId: number | null = null;
      try {
        const user = await sdk.authenticateRequest(req as any);
        if (user) userId = user.id;
      } catch {
        // token invalid — fall through to 401
      }

      if (!userId) {
        res.status(401).json({ error: "Unauthorised" });
        return;
      }

      const birdId = parseInt(req.params.birdId, 10);
      if (isNaN(birdId)) {
        res.status(400).json({ error: "Invalid bird ID" });
        return;
      }

      // ── Fetch full bird record (for profile page) ─────────────────────────
      const [fullBird] = await getDb()
        .select()
        .from(birds)
        .where(and(eq(birds.id, birdId), eq(birds.userId, userId)))
        .limit(1);

      // ── Build species map ─────────────────────────────────────────────────
      const speciesList = await SpeciesService.getAllSpecies(userId);
      const speciesMap: Record<number, { commonName: string }> = {};
      for (const s of speciesList) speciesMap[s.id] = { commonName: s.commonName };

      const pdfBuffer = await generatePedigreePdf(birdId, userId, speciesMap, fullBird ?? undefined);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="pedigree-bird-${birdId}.pdf"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      console.error("[PDF] Error generating pedigree PDF:", err);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // GET /api/pdf/season-report?year=YYYY
  // Premium "Breeding Season Scorecard" — single-page POC for the Flock Report.
  app.get("/api/pdf/season-report", async (req: Request, res: Response) => {
    try {
      // ── Auth ──────────────────────────────────────────────────────────────
      let user: Awaited<ReturnType<typeof sdk.authenticateRequest>> | null = null;
      try {
        user = await sdk.authenticateRequest(req as any);
      } catch {
        // token invalid — fall through to 401
      }

      if (!user) {
        res.status(401).json({ error: "Unauthorised" });
        return;
      }

      // ── Pro gate ──────────────────────────────────────────────────────────
      // The Season Scorecard is a Pro feature (the free data export stays free).
      if (!hasProAccess(user)) {
        res.status(403).json({ error: "PRO_REQUIRED" });
        return;
      }

      const userId = user.id;
      const userEmail = user.email ?? null;

      // ── Resolve season year: ?year= → userSettings.breedingYear → current ──
      const currentYear = new Date().getFullYear();
      const queryYear = parseInt(String(req.query.year ?? ""), 10);
      const settings = await SettingsService.getUserSettings(userId);
      let year = Number.isFinite(queryYear) && queryYear >= 2000 && queryYear <= 2100
        ? queryYear
        : NaN;
      if (Number.isNaN(year)) {
        year = settings?.breedingYear ?? currentYear;
      }

      const stats = await StatsService.getSeasonStats(userId, year);

      const pdfBuffer = await generateSeasonScorecardPdf(stats, {
        year,
        aviaryName: settings?.aviaryName ?? null,
        preparedFor: userEmail,
        generatedAt: new Date(),
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="season-scorecard-${year}.pdf"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      console.error("[PDF] Error generating season scorecard PDF:", err);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // GET /api/pdf/flock-report?year=YYYY
  // Premium multi-page Flock Report: cover + flock-at-a-glance + season scorecard.
  app.get("/api/pdf/flock-report", async (req: Request, res: Response) => {
    try {
      // ── Auth ──────────────────────────────────────────────────────────────
      let user: Awaited<ReturnType<typeof sdk.authenticateRequest>> | null = null;
      try {
        user = await sdk.authenticateRequest(req as any);
      } catch {
        // token invalid — fall through to 401
      }
      if (!user) {
        res.status(401).json({ error: "Unauthorised" });
        return;
      }

      // ── Pro gate ──────────────────────────────────────────────────────────
      if (!hasProAccess(user)) {
        res.status(403).json({ error: "PRO_REQUIRED" });
        return;
      }

      const userId = user.id;
      const userEmail = user.email ?? null;

      // ── Resolve season year: ?year= → userSettings.breedingYear → current ──
      const currentYear = new Date().getFullYear();
      const queryYear = parseInt(String(req.query.year ?? ""), 10);
      const settings = await SettingsService.getUserSettings(userId);
      const year = Number.isFinite(queryYear) && queryYear >= 2000 && queryYear <= 2100
        ? queryYear
        : (settings?.breedingYear ?? currentYear);

      // ── Gather data ───────────────────────────────────────────────────────
      const [summary, seasonStats, birdList, allSpecies, shows] = await Promise.all([
        StatsService.getDashboardStatsByUser(userId),
        StatsService.getSeasonStats(userId, year),
        BirdService.getBirdsByUser(userId),
        SpeciesService.getAllSpecies(userId),
        ShowService.getSeasonShowStats(userId, year),
      ]);

      const speciesName = new Map<number, string>();
      for (const s of allSpecies) speciesName.set(s.id, s.commonName);
      const composition = buildComposition(birdList, speciesName);

      const pdfBuffer = await generateFlockReportPdf({
        meta: { year, aviaryName: settings?.aviaryName ?? null, preparedFor: userEmail, generatedAt: new Date() },
        summary,
        composition,
        seasonStats,
        shows,
      });

      const slug = (settings?.aviaryName?.trim() || "")
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const filename = `${slug ? `${slug}-` : ""}flock-report-${year}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      console.error("[PDF] Error generating flock report PDF:", err);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });
}
