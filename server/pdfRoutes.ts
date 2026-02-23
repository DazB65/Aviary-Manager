import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getAllSpecies } from "./db";
import { generatePedigreePdf } from "./pedigreePdf";

/**
 * Register REST routes for PDF generation.
 * These sit outside tRPC because they stream binary data.
 */
export function registerPdfRoutes(app: Express) {
  // GET /api/pdf/pedigree/:birdId
  app.get("/api/pdf/pedigree/:birdId", async (req: Request, res: Response) => {
    try {
      // ── Auth: reuse the same session verification as tRPC ────────────────────────────────
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

      // Build species map
      const speciesList = await getAllSpecies();
      const speciesMap: Record<number, { commonName: string }> = {};
      for (const s of speciesList) speciesMap[s.id] = { commonName: s.commonName };

      const pdfBuffer = await generatePedigreePdf(birdId, userId, speciesMap);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="pedigree-bird-${birdId}.pdf"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (err) {
      console.error("[PDF] Error generating pedigree PDF:", err);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });
}
