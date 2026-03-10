/**
 * Aviary Manager — Stripe product & price definitions.
 * These are created dynamically in Stripe on first checkout.
 * Update PRICE_MONTHLY_USD to change the subscription price.
 */

export const PRODUCTS = {
  pro: {
    name: "Aviary Manager Pro",
    description: "Unlimited birds, breeding pairs, broods, pedigree tracking, and PDF exports.",
    priceMonthlyUsd: 880,   // $8.80 / month in cents
    priceYearlyUsd: 8800,   // $88.00 / year in cents (~2 months free)
    priceLifetimeUsd: 22000, // $220.00 one-time lifetime payment in cents
  },
} as const;

export const FREE_PLAN_LIMITS = {
  birds: 10,
  pairs: 0,
  broods: 0,
} as const;
