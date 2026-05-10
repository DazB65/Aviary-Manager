import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerChatRoutes } from "./chat";
import { securityHeaders } from "./security";
import { registerPdfRoutes } from "../pdfRoutes";
import { registerAuthRoutes } from "../authRoutes";
import { registerStripeRoutes } from "../stripeRoutes";
import { registerPhotoRoutes } from "../photoRoutes";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { runMigrations } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Trust Railway's proxy so express-rate-limit can read X-Forwarded-For correctly
  app.set("trust proxy", 1);
  // Security headers — applied before all routes
  app.use(securityHeaders());
  // Stripe webhook MUST be registered BEFORE express.json() to get raw body for signature verification
  registerStripeRoutes(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Email/password auth routes
  registerAuthRoutes(app);
  // Chat API with streaming and tool calling
  registerChatRoutes(app);
  // PDF generation routes
  registerPdfRoutes(app);
  // Stable authenticated photo URLs backed by Tigris signed URLs
  registerPhotoRoutes(app);

  // Run pending database migrations
  try {
    await runMigrations();
  } catch (dbError) {
    console.error("[DB] Migration failed:", dbError);
    if (process.env.NODE_ENV === "production") {
      throw dbError;
    }
    console.warn("[DB] Continuing after migration failure outside production.");
  }

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
