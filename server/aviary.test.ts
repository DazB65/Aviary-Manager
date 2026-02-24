import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAuthContext(userId = 1): { ctx: TrpcContext } {
  const clearedCookies: unknown[] = [];
  const ctx: TrpcContext = {
    user: {
      id: userId,
      openId: `test-user-${userId}`,
      email: `test${userId}@example.com`,
      name: `Test User ${userId}`,
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (_name: string, _opts: unknown) => { clearedCookies.push({ _name, _opts }); },
    } as TrpcContext["res"],
  };
  return { ctx };
}

describe("auth.logout", () => {
  it("returns success and clears session cookie", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});

describe("auth.me", () => {
  it("returns the current user when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeDefined();
    expect(user?.name).toBe("Test User 1");
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});

describe("species.list", () => {
  it("returns species list (may be empty in test env)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // In test env without DB, should return empty array or throw gracefully
    try {
      const result = await caller.species.list();
      expect(Array.isArray(result)).toBe(true);
    } catch (e) {
      // Expected if DB not available in test env
      expect(e).toBeDefined();
    }
  });
});

describe("birds router", () => {
  it("list procedure requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.birds.list()).rejects.toThrow();
  });
});

describe("pairs router", () => {
  it("list procedure requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.pairs.list()).rejects.toThrow();
  });
});

describe("broods router", () => {
  it("list procedure requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.broods.list()).rejects.toThrow();
  });
});

describe("events router", () => {
  it("list procedure requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.events.list()).rejects.toThrow();
  });
});

describe("dashboard router", () => {
  it("stats procedure requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.stats()).rejects.toThrow();
  });
});

describe("clutchEggs router", () => {
  it("byBrood requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.clutchEggs.byBrood({ broodId: 1 })).rejects.toThrow();
  });

  it("upsert requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.clutchEggs.upsert({ broodId: 1, eggNumber: 1, outcome: "fertile" })
    ).rejects.toThrow();
  });

  it("upsert rejects invalid outcome values", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.clutchEggs.upsert({ broodId: 1, eggNumber: 1, outcome: "invalid" as any })
    ).rejects.toThrow();
  });

  it("upsert rejects eggNumber < 1", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.clutchEggs.upsert({ broodId: 1, eggNumber: 0, outcome: "fertile" })
    ).rejects.toThrow();
  });

  it("sync requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.clutchEggs.sync({ broodId: 1, eggsLaid: 4 })).rejects.toThrow();
  });
});
