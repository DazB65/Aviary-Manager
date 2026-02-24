import type { Express, Request, Response } from "express";
import Stripe from "stripe";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "@shared/const";
import { PRODUCTS } from "./stripeProducts";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2026-01-28.clover" });
}

export function registerStripeRoutes(app: Express) {

  // ── POST /api/stripe/webhook ──────────────────────────────────────────────
  // MUST be registered before express.json() body parser — uses raw body
  app.post("/api/stripe/webhook",
    (req, res, next) => {
      // Parse raw body for signature verification
      let data = "";
      req.setEncoding("utf8");
      req.on("data", chunk => { data += chunk; });
      req.on("end", () => {
        (req as any).rawBody = data;
        next();
      });
    },
    async (req: Request, res: Response) => {
      const stripe = getStripe();
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent((req as any).rawBody, sig, webhookSecret!);
      } catch (err) {
        console.error("[Stripe Webhook] Signature verification failed:", err);
        res.status(400).json({ error: "Webhook signature verification failed" });
        return;
      }

      // Test event passthrough
      if (event.id.startsWith("evt_test_")) {
        console.log("[Webhook] Test event detected, returning verification response");
        res.json({ verified: true });
        return;
      }

      console.log(`[Stripe Webhook] Event: ${event.type} (${event.id})`);

      const db = await getDb();
      if (!db) { res.status(500).json({ error: "DB unavailable" }); return; }

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = parseInt(session.metadata?.user_id || "0", 10);
            if (!userId) break;
            await db.update(users).set({
              plan: "pro",
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
            }).where(eq(users.id, userId));
            console.log(`[Stripe] User ${userId} upgraded to Pro`);
            break;
          }
          case "customer.subscription.deleted":
          case "customer.subscription.updated": {
            const sub = event.data.object as Stripe.Subscription;
            const customerId = sub.customer as string;
            const isActive = sub.status === "active" || sub.status === "trialing";
            await db.update(users).set({
              plan: isActive ? "pro" : "free",
              stripeSubscriptionId: isActive ? sub.id : null,
            }).where(eq(users.stripeCustomerId, customerId));
            console.log(`[Stripe] Subscription ${sub.id} status: ${sub.status}`);
            break;
          }
          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            const customerId = invoice.customer as string;
            await db.update(users).set({ plan: "free" })
              .where(eq(users.stripeCustomerId, customerId));
            console.log(`[Stripe] Payment failed for customer ${customerId}, downgraded to free`);
            break;
          }
        }
      } catch (err) {
        console.error("[Stripe Webhook] Handler error:", err);
      }

      res.json({ received: true });
    }
  );

  // ── POST /api/stripe/checkout ─────────────────────────────────────────────
  app.post("/api/stripe/checkout", async (req: Request, res: Response) => {
    // Authenticate user
    let user: Awaited<ReturnType<typeof sdk.authenticateRequest>>;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Unauthorised" });
      return;
    }

    const { interval = "monthly" } = req.body as { interval?: "monthly" | "yearly" };
    const stripe = getStripe();
    const origin = req.headers.origin || "http://localhost:3000";

    const priceData = interval === "yearly"
      ? { unit_amount: PRODUCTS.pro.priceYearlyUsd, recurring: { interval: "year" as const } }
      : { unit_amount: PRODUCTS.pro.priceMonthlyUsd, recurring: { interval: "month" as const } };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email || undefined,
      allow_promotion_codes: true,
      client_reference_id: String(user.id),
      metadata: {
        user_id: String(user.id),
        customer_email: user.email || "",
        customer_name: user.name || "",
      },
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: PRODUCTS.pro.name,
            description: PRODUCTS.pro.description,
          },
          ...priceData,
        },
        quantity: 1,
      }],
      success_url: `${origin}/billing?success=1`,
      cancel_url: `${origin}/billing?cancelled=1`,
    });

    res.json({ url: session.url });
  });

  // ── POST /api/stripe/portal ───────────────────────────────────────────────
  app.post("/api/stripe/portal", async (req: Request, res: Response) => {
    let user: Awaited<ReturnType<typeof sdk.authenticateRequest>>;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Unauthorised" });
      return;
    }

    if (!user.stripeCustomerId) {
      res.status(400).json({ error: "No active subscription found" });
      return;
    }

    const stripe = getStripe();
    const origin = req.headers.origin || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${origin}/billing`,
    });

    res.json({ url: session.url });
  });
}
