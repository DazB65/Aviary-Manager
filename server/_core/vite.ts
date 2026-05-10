import express, { type Express, type NextFunction, type Request, type Response } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

const SENSITIVE_PROBE_SEGMENTS = new Set([".git", ".hg", ".svn"]);
const SENSITIVE_PROBE_FILENAMES = new Set([
  ".aws",
  ".dockerignore",
  ".env",
  ".env.bak",
  ".env.backup",
  ".env.dev",
  ".env.dev.local",
  ".env.development",
  ".env.development.local",
  ".env.docker",
  ".env.example",
  ".env.local",
  ".env.prod",
  ".env.production",
  ".env.production.local",
  ".env.save",
  ".env.staging",
  ".npmrc",
  "config.php",
  "phpinfo.php",
  "wp-config.php",
]);
const SENSITIVE_PROBE_PREFIXES = [
  "/.git/",
  "/.hg/",
  "/.svn/",
  "/actuator/",
  "/cgi-bin/",
  "/phpmyadmin",
  "/server-status",
  "/vendor/phpunit/",
  "/wp-admin",
  "/wp-content/",
  "/wp-includes/",
];
const SENSITIVE_PROBE_EXACT_PATHS = new Set([
  "/.git",
  "/.hg",
  "/.svn",
  "/actuator",
  "/phpmyadmin",
  "/server-status",
  "/wp-admin",
  "/wp-login.php",
  "/xmlrpc.php",
]);

function normalizeProbePath(rawPath: string): string {
  const pathOnly = rawPath.split("?")[0] || "/";
  let decoded = pathOnly;
  try {
    decoded = decodeURIComponent(pathOnly);
  } catch {
    decoded = pathOnly;
  }

  const normalized = decoded.replace(/\\/g, "/").replace(/\/{2,}/g, "/").toLowerCase();
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function isSensitiveProbePath(rawPath: string): boolean {
  const normalized = normalizeProbePath(rawPath);
  if (SENSITIVE_PROBE_EXACT_PATHS.has(normalized)) return true;
  if (SENSITIVE_PROBE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;

  const segments = normalized.split("/").filter(Boolean);
  return segments.some((segment) => SENSITIVE_PROBE_SEGMENTS.has(segment) || SENSITIVE_PROBE_FILENAMES.has(segment));
}

function blockSensitiveProbePaths(req: Request, res: Response, next: NextFunction) {
  if (!isSensitiveProbePath(req.path || req.originalUrl)) {
    next();
    return;
  }

  res.status(404).type("text/plain").set("Cache-Control", "no-store").send("Not found");
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(blockSensitiveProbePaths);
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(blockSensitiveProbePaths);
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
