import express, { type Express, type Request, type Response } from "express";
import Stripe from "stripe";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "@shared/const";
import { PRODUCTS } from "./stripeProducts";

function getStripe() {
  // Support both STRIPE_SECRET_KEY and STRIPE_PRIVATE_KEY env var names
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_PRIVATE_KEY;
  if (!key) throw new Error("Stripe secret key not configured (set STRIPE_SECRET_KEY or STRIPE_PRIVATE_KEY)");
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

      console.log(`[Stripe Webhook] Event: ${event.type} (${event.id})`);

      const db = await getDb();
      if (!db) { res.status(500).json({ error: "DB unavailable" }); return; }

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const userId = parseInt(session.metadata?.user_id || "0", 10);
            if (!userId) break;

            // If it's a subscription, we save both. If it's a lifetime payment, subscription is null
            await db.update(users).set({
              plan: "pro",
              stripeCustomerId: (session.customer as string) || null,
              stripeSubscriptionId: (session.subscription as string) || null,
            }).where(eq(users.id, userId));

            const isLifetime = session.mode === "payment";
            console.log(`[Stripe] User ${userId} upgraded to Pro${isLifetime ? " (Lifetime)" : ""}`);
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
  // express.json() is added inline because this route is registered BEFORE the
  // global express.json() middleware (webhook must come first for raw body access)
  app.post("/api/stripe/checkout", express.json(), async (req: Request, res: Response) => {
    console.log("[Stripe] /checkout hit — body:", req.body, "| user cookie present:", !!req.headers.cookie);
    // Authenticate user
    let user: Awaited<ReturnType<typeof sdk.authenticateRequest>>;
    try {
      user = await sdk.authenticateRequest(req);
    } catch (err) {
      console.error("[Stripe] Auth failed:", err);
      res.status(401).json({ error: "Unauthorised" });
      return;
    }

    const { interval = "monthly" } = req.body as { interval?: "monthly" | "yearly" | "lifetime" };
    const origin = req.headers.origin || "http://localhost:3000";

    let stripe: Stripe;
    try {
      stripe = getStripe();
    } catch (err: any) {
      console.error("[Stripe] Init failed:", err);
      res.status(500).json({ error: err?.message || "Stripe not configured" });
      return;
    }

    let priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData;

    if (interval === "lifetime") {
      priceData = { currency: "aud", unit_amount: PRODUCTS.pro.priceLifetimeUsd };
    } else if (interval === "yearly") {
      priceData = { currency: "aud", unit_amount: PRODUCTS.pro.priceYearlyUsd, recurring: { interval: "year" as const } };
    } else {
      priceData = { currency: "aud", unit_amount: PRODUCTS.pro.priceMonthlyUsd, recurring: { interval: "month" as const } };
    }

    const isSubscription = interval !== "lifetime";

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: isSubscription ? "subscription" : "payment",
        payment_method_types: ["card"],
        customer_email: user.email || undefined,
        // Always create a customer record so we can find them later via the billing portal fallback
        ...(!isSubscription ? { customer_creation: "always" } : {}),
        allow_promotion_codes: true,
        client_reference_id: String(user.id),
        metadata: {
          user_id: String(user.id),
          customer_email: user.email || "",
          customer_name: user.name || "",
        },
        line_items: [{
          price_data: {
            ...priceData,
            product_data: {
              name: PRODUCTS.pro.name + (!isSubscription ? " (Lifetime)" : ""),
              description: PRODUCTS.pro.description,
            },
          },
          quantity: 1,
        }],
        success_url: `${origin}/billing?success=1`,
        cancel_url: `${origin}/billing?cancelled=1`,
      });
    } catch (err: any) {
      console.error("[Stripe] Checkout session creation failed:", err);
      res.status(500).json({ error: err?.message || "Failed to create checkout session" });
      return;
    }

    res.json({ url: session.url });
  });

  // ── POST /api/stripe/portal ───────────────────────────────────────────────
  app.post("/api/stripe/portal", express.json(), async (req: Request, res: Response) => {
    let user: Awaited<ReturnType<typeof sdk.authenticateRequest>>;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Unauthorised" });
      return;
    }

    const stripe = getStripe();
    const origin = req.headers.origin || "http://localhost:3000";

    let customerId = user.stripeCustomerId;

    // Fallback: if we don't have a stored customerId (e.g. webhook failed on an earlier purchase),
    // look the customer up in Stripe by email and save it for next time.
    if (!customerId && user.email) {
      console.log(`[Stripe] No stripeCustomerId for user ${user.id}, searching Stripe by email: ${user.email}`);
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        console.log(`[Stripe] Found customer ${customerId} by email, saving to DB`);
        const db = await getDb();
        if (db) {
          await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, user.id));
        }
      }
    }

    if (!customerId) {
      console.warn(`[Stripe] No customer found for user ${user.id} (email: ${user.email})`);
      res.status(400).json({ error: "No active subscription found" });
      return;
    }

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/billing`,
      });
      res.json({ url: session.url });
    } catch (err: any) {
      console.error("[Stripe] Portal session creation failed:", err);
      res.status(500).json({ error: err?.message || "Failed to create portal session" });
    }
  });
}
