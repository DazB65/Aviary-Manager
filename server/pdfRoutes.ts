import type { Express, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { SpeciesService } from "./services/speciesService";
import { StatsService } from "./services/statsService";
import { SettingsService } from "./services/settingsService";
import { generatePedigreePdf } from "./pedigreePdf";
import { generateSeasonScorecardPdf } from "./seasonReportPdf";
import { getDb } from "./db";
import { birds } from "../drizzle/schema";

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
      let userId: number | null = null;
      let userEmail: string | null = null;
      try {
        const user = await sdk.authenticateRequest(req as any);
        if (user) {
          userId = user.id;
          userEmail = user.email ?? null;
        }
      } catch {
        // token invalid — fall through to 401
      }

      if (!userId) {
        res.status(401).json({ error: "Unauthorised" });
        return;
      }

      // ── Resolve season year: ?year= → userSettings.breedingYear → current ──
      const currentYear = new Date().getFullYear();
      const queryYear = parseInt(String(req.query.year ?? ""), 10);
      let year = Number.isFinite(queryYear) && queryYear >= 2000 && queryYear <= 2100
        ? queryYear
        : NaN;
      if (Number.isNaN(year)) {
        const settings = await SettingsService.getUserSettings(userId);
        year = settings?.breedingYear ?? currentYear;
      }

      const stats = await StatsService.getSeasonStats(userId, year);

      const pdfBuffer = await generateSeasonScorecardPdf(stats, {
        year,
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
}
