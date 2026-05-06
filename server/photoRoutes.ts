import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { storageGet } from "./storage";

export function registerPhotoRoutes(app: Express) {
  app.get("/api/photos/*", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const key = String(req.params[0] ?? "").replace(/^\/+/, "");

      if (!key.startsWith(`birds/${user.id}/`)) {
        res.status(404).json({ error: "Photo not found" });
        return;
      }

      const { url } = await storageGet(key);
      res.redirect(302, url);
    } catch {
      res.status(401).json({ error: "Unauthorised" });
    }
  });
}
