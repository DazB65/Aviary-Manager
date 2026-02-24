import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq, or } from "drizzle-orm";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const BCRYPT_ROUNDS = 12;
const VERIFY_EXPIRY_MS = 24 * 60 * 60 * 1000;   // 24 hours
const RESET_EXPIRY_MS  =  1 * 60 * 60 * 1000;   //  1 hour

export function registerAuthRoutes(app: Express) {

  // ── POST /api/auth/register ───────────────────────────────────────────────
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { name, email, password } = req.body as { name?: string; email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const db = await getDb();
    if (!db) { res.status(500).json({ error: "Database unavailable" }); return; }

    // Check duplicate email
    const existing = await db.select({ id: users.id })
      .from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const verifyToken  = nanoid(48);
    const verifyTokenExpiry = new Date(Date.now() + VERIFY_EXPIRY_MS);

    await db.insert(users).values({
      name: name?.trim() || null,
      email: email.toLowerCase(),
      passwordHash,
      loginMethod: "email",
      emailVerified: true, // Auto-verified for beta; set to false when RESEND_API_KEY is configured
      verifyToken: null,
      verifyTokenExpiry: null,
      lastSignedIn: new Date(),
    });

    // Email verification disabled for beta — enable when RESEND_API_KEY is set:
    // sendVerificationEmail(email.toLowerCase(), verifyToken).catch(console.error);

    res.status(201).json({ success: true, message: "Account created! You can now log in." });
  });

  // ── POST /api/auth/login ──────────────────────────────────────────────────
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const db = await getDb();
    if (!db) { res.status(500).json({ error: "Database unavailable" }); return; }

    const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    const user = rows[0];

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Email verification gate — disabled for beta (re-enable when RESEND_API_KEY is configured):
    // if (!user.emailVerified) {
    //   res.status(403).json({ error: "Please verify your email before logging in." });
    //   return;
    // }

    // Update lastSignedIn
    await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

    // Create session using the existing SDK (reuses JWT infrastructure)
    const sessionToken = await sdk.createSessionToken(String(user.id), {
      name: user.name || "",
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, plan: user.plan } });
  });

  // ── GET /api/auth/verify-email ────────────────────────────────────────────
  app.get("/api/auth/verify-email", async (req: Request, res: Response) => {
    const token = typeof req.query.token === "string" ? req.query.token : null;
    if (!token) { res.redirect("/?verified=error"); return; }

    const db = await getDb();
    if (!db) { res.redirect("/?verified=error"); return; }

    const rows = await db.select().from(users).where(eq(users.verifyToken, token)).limit(1);
    const user = rows[0];

    if (!user || !user.verifyTokenExpiry || user.verifyTokenExpiry < new Date()) {
      res.redirect("/login?verified=expired");
      return;
    }

    await db.update(users)
      .set({ emailVerified: true, verifyToken: null, verifyTokenExpiry: null })
      .where(eq(users.id, user.id));

    res.redirect("/login?verified=success");
  });

  // ── POST /api/auth/forgot-password ───────────────────────────────────────
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };
    if (!email) { res.status(400).json({ error: "Email is required" }); return; }

    const db = await getDb();
    if (!db) { res.status(500).json({ error: "Database unavailable" }); return; }

    const rows = await db.select({ id: users.id, email: users.email })
      .from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    const user = rows[0];

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({ success: true, message: "If an account with that email exists, a reset link has been sent." });
      return;
    }

    const resetToken = nanoid(48);
    const resetTokenExpiry = new Date(Date.now() + RESET_EXPIRY_MS);

    await db.update(users)
      .set({ resetToken, resetTokenExpiry })
      .where(eq(users.id, user.id));

    sendPasswordResetEmail(user.email!, resetToken).catch(console.error);

    res.json({ success: true, message: "If an account with that email exists, a reset link has been sent." });
  });

  // ── POST /api/auth/reset-password ────────────────────────────────────────
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    const { token, password } = req.body as { token?: string; password?: string };
    if (!token || !password) {
      res.status(400).json({ error: "Token and new password are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const db = await getDb();
    if (!db) { res.status(500).json({ error: "Database unavailable" }); return; }

    const rows = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);
    const user = rows[0];

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      res.status(400).json({ error: "This reset link has expired or is invalid. Please request a new one." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await db.update(users)
      .set({ passwordHash, resetToken: null, resetTokenExpiry: null })
      .where(eq(users.id, user.id));

    res.json({ success: true, message: "Password updated successfully. You can now log in." });
  });

  // ── POST /api/auth/resend-verification ───────────────────────────────────
  app.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };
    if (!email) { res.status(400).json({ error: "Email is required" }); return; }

    const db = await getDb();
    if (!db) { res.status(500).json({ error: "Database unavailable" }); return; }

    const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    const user = rows[0];

    if (!user || user.emailVerified) {
      res.json({ success: true }); // silent — don't reveal account status
      return;
    }

    const verifyToken = nanoid(48);
    const verifyTokenExpiry = new Date(Date.now() + VERIFY_EXPIRY_MS);

    await db.update(users)
      .set({ verifyToken, verifyTokenExpiry })
      .where(eq(users.id, user.id));

    sendVerificationEmail(user.email!, verifyToken).catch(console.error);
    res.json({ success: true, message: "Verification email resent." });
  });
}
