import type { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq, or } from "drizzle-orm";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ENV } from "./_core/env";

const BCRYPT_ROUNDS = 12;
const VERIFY_EXPIRY_MS = 24 * 60 * 60 * 1000;   // 24 hours
const RESET_EXPIRY_MS  =  1 * 60 * 60 * 1000;   //  1 hour

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many accounts created from this IP. Please try again in an hour." },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password reset requests. Please try again in an hour." },
});

export function registerAuthRoutes(app: Express) {

  // ── POST /api/auth/register ───────────────────────────────────────────────
  app.post("/api/auth/register", registerLimiter, async (req: Request, res: Response) => {
    try {
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

      // Check if email already exists
      const existingRows = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      const existing = existingRows[0];

      if (existing) {
        // Legacy Manus OAuth user — no password set yet. Allow them to claim the account.
        if (!existing.passwordHash) {
          const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
          await db.update(users)
            .set({
              passwordHash,
              loginMethod: "email",
              emailVerified: true,
              name: name?.trim() || existing.name || null,
              lastSignedIn: new Date(),
            })
            .where(eq(users.id, existing.id));
          res.status(201).json({ success: true, requiresVerification: false, message: "Account set up! You can now log in." });
          return;
        }
        // Full account already exists with a password
        res.status(409).json({ error: "An account with this email already exists. Please log in instead." });
        return;
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const verifyToken = nanoid(48);
      const verifyTokenExpiry = new Date(Date.now() + VERIFY_EXPIRY_MS);

      await db.insert(users).values({
        name: name?.trim() || null,
        email: email.toLowerCase(),
        passwordHash,
        loginMethod: "email",
        emailVerified: false,
        verifyToken,
        verifyTokenExpiry,
        lastSignedIn: new Date(),
      });

      sendVerificationEmail(email.toLowerCase(), verifyToken).catch(console.error);

      res.status(201).json({ success: true, requiresVerification: true, message: "Account created! Please check your email to verify your account before logging in." });
    } catch (err) {
      console.error("[Register] Unexpected error:", err);
      res.status(500).json({ error: "Registration failed. Please try again." });
    }
  });

  // ── POST /api/auth/login ──────────────────────────────────────────────────
  app.post("/api/auth/login", loginLimiter, async (req: Request, res: Response) => {
    try {
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

      // Email verification gate
      if (!user.emailVerified) {
        res.status(403).json({ error: "Please verify your email before logging in. Check your inbox or request a new verification link." });
        return;
      }

      // Auto-grant admin role to owner email
      const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
      if (ENV.ownerEmail && email.toLowerCase() === ENV.ownerEmail && user.role !== "admin") {
        updateSet.role = "admin";
      }
      await db.update(users).set(updateSet as any).where(eq(users.id, user.id));

      // Create session using the existing SDK (reuses JWT infrastructure)
      const sessionToken = await sdk.createSessionToken(String(user.id), {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, plan: user.plan } });
    } catch (err) {
      console.error("[Login] Unexpected error:", err);
      res.status(500).json({ error: "Login failed. Please try again." });
    }
  });

  // ── GET /api/auth/verify-email ────────────────────────────────────────────
  app.get("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
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
    } catch (err) {
      console.error("[VerifyEmail] Unexpected error:", err);
      res.redirect("/login?verified=error");
    }
  });

  // ── POST /api/auth/forgot-password ───────────────────────────────────────
  app.post("/api/auth/forgot-password", forgotPasswordLimiter, async (req: Request, res: Response) => {
    try {
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
    } catch (err) {
      console.error("[ForgotPassword] Unexpected error:", err);
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // ── POST /api/auth/reset-password ────────────────────────────────────────
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
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
        .set({ passwordHash, resetToken: null, resetTokenExpiry: null, passwordChangedAt: new Date() })
        .where(eq(users.id, user.id));

      res.json({ success: true, message: "Password updated successfully. You can now log in." });
    } catch (err) {
      console.error("[ResetPassword] Unexpected error:", err);
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // ── POST /api/auth/resend-verification ───────────────────────────────────
  app.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
    try {
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
    } catch (err) {
      console.error("[ResendVerification] Unexpected error:", err);
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });
}
