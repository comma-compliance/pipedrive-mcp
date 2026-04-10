import { describe, it, expect, vi, beforeEach } from "vitest";

// Each test re-imports sentry.ts to get a fresh module with _sentry = null
async function freshImport() {
  // Clear any cached module so _sentry resets
  const modulePath = "../../src/sentry.js";
  // vitest re-evaluates dynamic imports when we use vi.resetModules()
  vi.resetModules();
  return await import("../../src/sentry.js");
}

describe("sentry", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.SENTRY_DSN;
    delete process.env.SENTRY_ENVIRONMENT;
    delete process.env.SENTRY_RELEASE;
  });

  describe("initSentry", () => {
    it("returns false when SENTRY_DSN is not set", async () => {
      const { initSentry } = await freshImport();
      expect(await initSentry()).toBe(false);
    });

    it("returns false gracefully when @sentry/node import fails", async () => {
      process.env.SENTRY_DSN = "https://test@sentry.io/123";

      // Mock the dynamic import to fail (simulates package not installed)
      vi.doMock("@sentry/node", () => {
        throw new Error("Cannot find module '@sentry/node'");
      });

      const { initSentry } = await freshImport();

      // Capture stderr to verify warning
      const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
      const result = await initSentry();

      expect(result).toBe(false);
      expect(stderrSpy).toHaveBeenCalledWith(
        expect.stringContaining("SENTRY_DSN is set but @sentry/node is not installed"),
      );

      stderrSpy.mockRestore();
      vi.doUnmock("@sentry/node");
    });
  });

  describe("no-op behavior when uninitialized", () => {
    it("captureError is a safe no-op", async () => {
      const { captureError } = await freshImport();
      // Should not throw
      captureError(new Error("test"), { tool: "test_tool" });
    });

    it("addBreadcrumb is a safe no-op", async () => {
      const { addBreadcrumb } = await freshImport();
      addBreadcrumb({ message: "test breadcrumb" });
    });

    it("flushSentry is a safe no-op", async () => {
      const { flushSentry } = await freshImport();
      await flushSentry();
    });

    it("setSentryContext is a safe no-op", async () => {
      const { setSentryContext } = await freshImport();
      setSentryContext({ companyDomain: "test", transport: "stdio" });
    });
  });
});
