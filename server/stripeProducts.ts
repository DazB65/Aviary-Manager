/**
 * Aviary Manager — Stripe product & price definitions.
 * These are created dynamically in Stripe on first checkout.
 */

export const PRODUCTS = {
  starter: {
    name: "Aviary Manager Starter",
    description: "Unlimited birds, breeding pairs, broods, pedigree tracking, and PDF exports.",
    priceMonthlyUsd: 499,   // $4.99 / month in cents
    priceYearlyUsd: 4900,   // $49.00 / year in cents (~2 months free)
  },
  pro: {
    name: "Aviary Manager Pro",
    description: "Everything in Starter plus AI Assistant — pair birds, record clutches, and manage your aviary by chat.",
    priceMonthlyUsd: 1299,  // $12.99 / month in cents
    priceYearlyUsd: 12900,  // $129.00 / year in cents (~2 months free)
  },
} as const;
