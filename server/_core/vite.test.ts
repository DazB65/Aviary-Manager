import { describe, expect, it } from "vitest";
import { isSensitiveProbePath } from "./vite";

describe("isSensitiveProbePath", () => {
  it("blocks common secret and scanner paths before the SPA fallback", () => {
    expect(isSensitiveProbePath("/.env")).toBe(true);
    expect(isSensitiveProbePath("/app/.env")).toBe(true);
    expect(isSensitiveProbePath("/.env.development.local")).toBe(true);
    expect(isSensitiveProbePath("/.git/config")).toBe(true);
    expect(isSensitiveProbePath("/wp-login.php")).toBe(true);
    expect(isSensitiveProbePath("/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php")).toBe(true);
  });

  it("allows normal application routes to use the SPA fallback", () => {
    expect(isSensitiveProbePath("/admin/users")).toBe(false);
    expect(isSensitiveProbePath("/birds/123")).toBe(false);
    expect(isSensitiveProbePath("/api/chat")).toBe(false);
    expect(isSensitiveProbePath("/assets/index.js")).toBe(false);
  });
});
