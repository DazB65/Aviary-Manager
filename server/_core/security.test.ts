import { afterEach, describe, expect, it, vi } from "vitest";
import { buildContentSecurityPolicyDirectives } from "./security";

describe("security headers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps scripts locked down without allowing inline JavaScript", () => {
    vi.stubEnv("VITE_ANALYTICS_ENDPOINT", "https://analytics.example.com");

    const directives = buildContentSecurityPolicyDirectives();

    expect(directives["default-src"]).toEqual(["'self'"]);
    expect(directives["object-src"]).toEqual(["'none'"]);
    expect(directives["frame-ancestors"]).toEqual(["'none'"]);
    expect(directives["script-src"]).toContain("'self'");
    expect(directives["script-src"]).toContain("https://analytics.example.com");
    expect(directives["script-src"]).not.toContain("'unsafe-inline'");
  });
});
