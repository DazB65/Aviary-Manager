/**
 * Aviary Manager — Stripe product & price definitions.
 * Stripe owns live products/prices; checkout uses configured Price IDs.
 */

export const PRODUCTS = {
  starter: {
    name: "Aviary Manager Starter",
    description: "Unlimited birds, breeding pairs, broods, pedigree tracking, and PDF exports.",
  },
  pro: {
    name: "Aviary Manager Pro",
    description: "Everything in Starter plus AI Assistant — pair birds, record clutches, and manage your aviary by chat.",
  },
} as const;
