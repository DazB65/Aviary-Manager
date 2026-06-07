// Single source of truth for the "does this account have Pro access?" rule,
// shared by the server (REST routes, tRPC requirePro) and the client (gating
// Pro-only UI). Pro features are available to admins, paid Pro subscribers, and
// free accounts still inside their trial window. Starter and expired accounts
// are blocked.

export const TRIAL_DAYS = 30;
const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

export type ProAccessUser = {
  role?: string | null;
  plan?: string | null;
  planExpiresAt?: Date | string | number | null;
  /** Admin-granted Pro access until this date, independent of the paid plan. */
  compedProUntil?: Date | string | number | null;
  createdAt: Date | string | number;
};

/**
 * True when an admin has comped this account Pro access through a future date.
 * Independent of the user's paid plan and Stripe billing — they keep their
 * existing subscription, this just unlocks Pro features for the comped window.
 */
export function isCompedPro(user: ProAccessUser | null | undefined): boolean {
  if (!user?.compedProUntil) return false;
  return new Date(user.compedProUntil).getTime() > Date.now();
}

/**
 * Mirrors the server's requirePro middleware: admins and pro subscribers always
 * pass; comped accounts pass while their comp is active; free accounts pass
 * while their trial is active; everyone else is blocked.
 */
export function hasProAccess(user: ProAccessUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.plan === "pro") return true;
  if (isCompedPro(user)) return true;
  if (user.plan === "free") {
    const end = trialEndsAt(user);
    return end != null && end.getTime() > Date.now();
  }
  return false;
}

/**
 * The moment this account's free trial ends, or null for paid plans (pro /
 * starter) which have no trial clock. Uses planExpiresAt when present, else
 * falls back to createdAt + the trial window. Single source of truth for
 * "days left in trial" displays and trial-expiry redirects.
 */
export function trialEndsAt(user: ProAccessUser | null | undefined): Date | null {
  if (!user) return null;
  if (user.plan === "pro" || user.plan === "starter") return null;
  return user.planExpiresAt != null
    ? new Date(user.planExpiresAt)
    : new Date(new Date(user.createdAt).getTime() + TRIAL_MS);
}
