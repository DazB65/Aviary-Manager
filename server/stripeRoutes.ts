import express, { type Express, type Request, type Response } from "express";
import Stripe from "stripe";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { PRODUCTS } from "./stripeProducts";

type BillingInterval = "monthly" | "yearly";
type PlanTier = keyof typeof PRODUCTS;

function getStripe() {
  // Support both STRIPE_SECRET_KEY and STRIPE_PRIVATE_KEY env var names
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_PRIVATE_KEY;
  if (!key) throw new Error("Stripe secret key not configured (set STRIPE_SECRET_KEY or STRIPE_PRIVATE_KEY)");
  return new Stripe(key, { apiVersion: "2026-01-28.clover" });
}

function normalizePlanTier(plan: unknown, fallback: PlanTier = "pro"): PlanTier {
  return plan === "starter" || plan === "pro" ? plan : fallback;
}

function normalizeBillingInterval(interval: unknown): BillingInterval {
  return interval === "yearly" ? "yearly" : "monthly";
}

export function registerStripeRoutes(app: Express) {

  // ── POST /api/stripe/webhook ──────────────────────────────────────────────
  // MUST be registered before express.json() body parser — uses raw body
  app.post("/api/stripe/webhook",
    express.raw({ type: "application/json", limit: "1mb" }),
    async (req: Request, res: Response) => {
      const stripe = getStripe();
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret!);
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

            const planTier = normalizePlanTier(session.metadata?.plan_tier);
            await db.update(users).set({
              plan: planTier,
              stripeCustomerId: (session.customer as string) || null,
              stripeSubscriptionId: (session.subscription as string) || null,
            }).where(eq(users.id, userId));

            console.log(`[Stripe] User ${userId} subscribed to ${planTier}`);
            break;
          }
          case "customer.subscription.deleted":
          case "customer.subscription.updated": {
            const sub = event.data.object as Stripe.Subscription;
            const customerId = sub.customer as string;
            const isActive = sub.status === "active" || sub.status === "trialing";
            const planTier = normalizePlanTier(sub.metadata?.plan_tier);
            await db.update(users).set({
              plan: isActive ? planTier : "free",
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
        res.status(500).json({ error: "Webhook handler failed" });
        return;
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

    const { interval: requestedInterval, plan: requestedPlan } = req.body as {
      interval?: unknown;
      plan?: unknown;
    };
    const interval = normalizeBillingInterval(requestedInterval);
    if (requestedPlan !== undefined && requestedPlan !== "starter" && requestedPlan !== "pro") {
      res.status(400).json({ error: "Invalid subscription plan" });
      return;
    }
    const plan = normalizePlanTier(requestedPlan);
    const origin = req.headers.origin || "http://localhost:3000";

    let stripe: Stripe;
    try {
      stripe = getStripe();
    } catch (err: any) {
      console.error("[Stripe] Init failed:", err);
      res.status(500).json({ error: err?.message || "Stripe not configured" });
      return;
    }

    const product = PRODUCTS[plan] ?? PRODUCTS.pro;
    const unitAmount = interval === "yearly" ? product.priceYearlyUsd : product.priceMonthlyUsd;

    const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
      currency: "usd",
      unit_amount: unitAmount,
      recurring: { interval: interval === "yearly" ? "year" : "month" },
    };

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        customer_email: user.email || undefined,
        allow_promotion_codes: true,
        client_reference_id: String(user.id),
        metadata: {
          user_id: String(user.id),
          plan_tier: plan,
          customer_email: user.email || "",
          customer_name: user.name || "",
        },
        subscription_data: {
          metadata: { plan_tier: plan },
        },
        line_items: [{
          price_data: {
            ...priceData,
            product_data: {
              name: product.name,
              description: product.description,
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
