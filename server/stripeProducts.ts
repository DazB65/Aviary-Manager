/**
 * Aviary Manager — Stripe product & price definitions.
 * These are created dynamically in Stripe on first checkout.
 * Update PRICE_MONTHLY_USD to change the subscription price.
 */

export const PRODUCTS = {
  pro: {
    name: "Aviary Manager Pro",
    description: "Unlimited birds, breeding pairs, broods, pedigree tracking, and PDF exports.",
    priceMonthlyUsd: 799,   // $7.99 / month in cents
    priceYearlyUsd: 7900,   // $79.00 / year in cents (~2 months free)
  },
} as const;

export const FREE_PLAN_LIMITS = {
  birds: 20,
  pairs: 5,
  broods: 10,
} as const;
