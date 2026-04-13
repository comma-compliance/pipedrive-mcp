import { describe, it, expect } from "vitest";
import { ConfigSchema } from "../../src/config.js";

const BASE = {
  companyDomain: "testcompany",
};

describe("ConfigSchema auth validation", () => {
  it("accepts apiToken mode", () => {
    const result = ConfigSchema.safeParse({
      ...BASE,
      apiToken: "test-api-token",
    });
    expect(result.success).toBe(true);
  });

  it("accepts oauthToken mode", () => {
    const result = ConfigSchema.safeParse({
      ...BASE,
      oauthToken: "test-oauth-token",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when neither apiToken nor oauthToken is provided", () => {
    const result = ConfigSchema.safeParse(BASE);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join(" ");
      expect(messages).toContain("PIPEDRIVE_API_TOKEN");
      expect(messages).toContain("PIPEDRIVE_OAUTH_TOKEN");
    }
  });

  it("rejects when both apiToken and oauthToken are provided", () => {
    const result = ConfigSchema.safeParse({
      ...BASE,
      apiToken: "api-token",
      oauthToken: "oauth-token",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join(" ");
      expect(messages).toContain("exactly one");
    }
  });

  it("still requires companyDomain", () => {
    const result = ConfigSchema.safeParse({
      apiToken: "test-api-token",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("companyDomain");
    }
  });

  it("applies defaults for optional numeric fields", () => {
    const result = ConfigSchema.safeParse({
      ...BASE,
      apiToken: "test-api-token",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defaultLimit).toBe(25);
      expect(result.data.maxLimit).toBe(100);
      expect(result.data.rateLimitGeneralPer2s).toBe(8);
      expect(result.data.transport).toBe("stdio");
      expect(result.data.enableWriteTools).toBe(true);
    }
  });
});
