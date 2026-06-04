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
  createdAt: Date | string | number;
};

/**
 * Mirrors the server's requirePro middleware: admins and pro subscribers always
 * pass; free accounts pass while their trial is active; everyone else is blocked.
 */
export function hasProAccess(user: ProAccessUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.plan === "pro") return true;
  if (user.plan === "free") {
    const trialEnd = user.planExpiresAt != null
      ? new Date(user.planExpiresAt)
      : new Date(new Date(user.createdAt).getTime() + TRIAL_MS);
    return trialEnd.getTime() > Date.now();
  }
  return false;
}
