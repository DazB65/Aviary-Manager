import { describe, expect, it } from "vitest";
import { hasProAccess, isCompedPro, trialEndsAt, TRIAL_DAYS } from "./access";

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY);
const ahead = (days: number) => new Date(Date.now() + days * DAY);

describe("hasProAccess", () => {
  it("grants admins regardless of plan", () => {
    expect(hasProAccess({ role: "admin", plan: "free", createdAt: ago(90) })).toBe(true);
  });

  it("grants pro subscribers", () => {
    expect(hasProAccess({ plan: "pro", createdAt: ago(90) })).toBe(true);
  });

  it("blocks starter subscribers (Pro-only)", () => {
    expect(hasProAccess({ plan: "starter", createdAt: ago(1) })).toBe(false);
  });

  it("grants free accounts inside their trial window", () => {
    expect(hasProAccess({ plan: "free", createdAt: ago(5) })).toBe(true);
  });

  it("blocks free accounts whose trial has expired", () => {
    expect(hasProAccess({ plan: "free", createdAt: ago(TRIAL_DAYS + 5) })).toBe(false);
  });

  it("honours an explicit future planExpiresAt over createdAt fallback", () => {
    expect(hasProAccess({ plan: "free", planExpiresAt: ahead(3), createdAt: ago(90) })).toBe(true);
  });

  it("returns false for null/undefined users", () => {
    expect(hasProAccess(null)).toBe(false);
    expect(hasProAccess(undefined)).toBe(false);
  });

  it("grants a comped starter user while the comp is active, without changing their plan", () => {
    expect(hasProAccess({ plan: "starter", compedProUntil: ahead(10), createdAt: ago(90) })).toBe(true);
  });

  it("does not grant a comped user once the comp date has passed", () => {
    expect(hasProAccess({ plan: "starter", compedProUntil: ago(1), createdAt: ago(90) })).toBe(false);
  });
});

describe("isCompedPro", () => {
  it("is true only while compedProUntil is in the future", () => {
    expect(isCompedPro({ plan: "starter", compedProUntil: ahead(1), createdAt: ago(1) })).toBe(true);
    expect(isCompedPro({ plan: "starter", compedProUntil: ago(1), createdAt: ago(1) })).toBe(false);
  });

  it("is false when no comp is set", () => {
    expect(isCompedPro({ plan: "starter", createdAt: ago(1) })).toBe(false);
    expect(isCompedPro(null)).toBe(false);
  });
});

describe("trialEndsAt", () => {
  it("returns null for paid plans (no trial clock)", () => {
    expect(trialEndsAt({ plan: "pro", createdAt: ago(1) })).toBeNull();
    expect(trialEndsAt({ plan: "starter", createdAt: ago(1) })).toBeNull();
  });

  it("falls back to createdAt + trial window when planExpiresAt is absent", () => {
    const created = ago(5);
    const end = trialEndsAt({ plan: "free", createdAt: created });
    expect(end?.getTime()).toBe(created.getTime() + TRIAL_DAYS * DAY);
  });

  it("uses planExpiresAt when present", () => {
    const exp = ahead(3);
    const end = trialEndsAt({ plan: "free", planExpiresAt: exp, createdAt: ago(90) });
    expect(end?.getTime()).toBe(exp.getTime());
  });
});
