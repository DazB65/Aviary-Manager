import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  storageDelete: vi.fn(),
  storagePut: vi.fn(),
}));

vi.mock("./storage", () => ({
  storageDelete: mocks.storageDelete,
  storagePut: mocks.storagePut,
}));

import { appRouter } from "./routers";
import { BirdService } from "./services/birdService";

function createAuthContext(userId = 42): TrpcContext {
  const now = new Date();
  return {
    user: {
      id: userId,
      openId: String(userId),
      name: "Photo Tester",
      email: `photo-${userId}@example.com`,
      passwordHash: null,
      loginMethod: "password",
      emailVerified: true,
      verifyToken: null,
      verifyTokenExpiry: null,
      resetToken: null,
      resetTokenExpiry: null,
      passwordChangedAt: null,
      plan: "starter",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      planExpiresAt: null,
      role: "user",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("birds.uploadPhoto", () => {
  beforeEach(() => {
    mocks.storageDelete.mockReset();
    mocks.storagePut.mockReset();
    mocks.storagePut.mockResolvedValue({ key: "birds/42/test.jpg", url: "signed-url" });
  });

  it("stores valid image bytes under the authenticated user's photo prefix", async () => {
    const caller = appRouter.createCaller(createAuthContext(42));
    const jpegBase64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]).toString("base64");

    const result = await caller.birds.uploadPhoto({
      filename: "bird.jpg",
      contentType: "image/jpeg",
      dataBase64: jpegBase64,
    });

    expect(result.url).toMatch(/^\/api\/photos\/birds\/42\/.+\.jpg$/);
    expect(mocks.storagePut).toHaveBeenCalledWith(
      expect.stringMatching(/^birds\/42\/.+\.jpg$/),
      expect.any(Buffer),
      "image/jpeg",
    );
  });

  it("rejects bytes that do not match the declared image type", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const fakeImageBase64 = Buffer.from("not really a jpeg").toString("base64");

    await expect(
      caller.birds.uploadPhoto({
        filename: "bird.jpg",
        contentType: "image/jpeg",
        dataBase64: fakeImageBase64,
      }),
    ).rejects.toThrow("Uploaded file does not match the selected image type.");

    expect(mocks.storagePut).not.toHaveBeenCalled();
  });

  it("rejects decoded images over 5 MB", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    const oversizedJpeg = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff]),
      Buffer.alloc(5 * 1024 * 1024 - 2),
    ]);

    await expect(
      caller.birds.uploadPhoto({
        filename: "bird.jpg",
        contentType: "image/jpeg",
        dataBase64: oversizedJpeg.toString("base64"),
      }),
    ).rejects.toThrow("Image must be 5 MB or smaller.");

    expect(mocks.storagePut).not.toHaveBeenCalled();
  });

  it("rejects unsupported image types", async () => {
    const caller = appRouter.createCaller(createAuthContext());

    await expect(
      caller.birds.uploadPhoto({
        filename: "bird.svg",
        contentType: "image/svg+xml",
        dataBase64: Buffer.from("<svg />").toString("base64"),
      }),
    ).rejects.toThrow("Only JPEG, PNG, GIF, and WebP images are allowed.");

    expect(mocks.storagePut).not.toHaveBeenCalled();
  });
});

describe("birds.update photo cleanup", () => {
  beforeEach(() => {
    mocks.storageDelete.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clears the bird photo and deletes the previous managed object", async () => {
    vi.spyOn(BirdService, "getBirdById").mockResolvedValue({
      id: 12,
      userId: 42,
      photoUrl: "/api/photos/birds/42/old-photo.jpg",
    } as any);
    vi.spyOn(BirdService, "updateBird").mockResolvedValue({
      id: 12,
      userId: 42,
      photoUrl: null,
    } as any);

    const caller = appRouter.createCaller(createAuthContext(42));
    await caller.birds.update({ id: 12, photoUrl: null });

    expect(BirdService.updateBird).toHaveBeenCalledWith(12, 42, { photoUrl: null });
    expect(mocks.storageDelete).toHaveBeenCalledWith("birds/42/old-photo.jpg");
  });

  it("does not delete unmanaged or legacy photo values", async () => {
    vi.spyOn(BirdService, "getBirdById").mockResolvedValue({
      id: 12,
      userId: 42,
      photoUrl: "data:image/jpeg;base64,abc123",
    } as any);
    vi.spyOn(BirdService, "updateBird").mockResolvedValue({
      id: 12,
      userId: 42,
      photoUrl: null,
    } as any);

    const caller = appRouter.createCaller(createAuthContext(42));
    await caller.birds.update({ id: 12, photoUrl: null });

    expect(mocks.storageDelete).not.toHaveBeenCalled();
  });
});
