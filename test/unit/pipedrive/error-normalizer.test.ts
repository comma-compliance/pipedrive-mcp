import { describe, it, expect } from "vitest";
import {
  normalizeApiError,
  normalizeNetworkError,
  formatErrorMessage,
} from "../../../src/pipedrive/error-normalizer.js";
import { HttpClientError } from "../../../src/pipedrive/http-client.js";

describe("normalizeApiError", () => {
  it("categorizes 401 as auth", () => {
    const err = normalizeApiError(
      { status: 401, data: { error: "Unauthorized" }, headers: {}, durationMs: 100 },
      "pipedrive_deals_list",
      "GET /deals",
    );
    expect(err.category).toBe("auth");
    expect(err.retryable).toBe(false);
    expect(err.guidance).toContain("API token");
  });

  it("categorizes 404 as not_found", () => {
    const err = normalizeApiError(
      { status: 404, data: { error: "Not found" }, headers: {}, durationMs: 50 },
      "pipedrive_deals_get",
      "GET /deals/999",
    );
    expect(err.category).toBe("not_found");
    expect(err.retryable).toBe(false);
  });

  it("categorizes 429 as rate_limit with retry_after", () => {
    const err = normalizeApiError(
      { status: 429, data: {}, headers: { "retry-after": "5" }, durationMs: 10 },
      "pipedrive_deals_list",
      "GET /deals",
    );
    expect(err.category).toBe("rate_limit");
    expect(err.retryable).toBe(true);
    expect(err.retry_after_ms).toBe(5000);
    expect(err.guidance).toContain("5 seconds");
  });

  it("categorizes 422 as validation with pipedrive error", () => {
    const err = normalizeApiError(
      { status: 422, data: { error: "Unknown field: bad_field" }, headers: {}, durationMs: 80 },
      "pipedrive_deals_update",
      "PATCH /deals/1",
    );
    expect(err.category).toBe("validation");
    expect(err.pipedrive_error).toBe("Unknown field: bad_field");
  });

  it("categorizes 500 as server and retryable", () => {
    const err = normalizeApiError(
      { status: 500, data: {}, headers: {}, durationMs: 200 },
      "pipedrive_deals_list",
      "GET /deals",
    );
    expect(err.category).toBe("server");
    expect(err.retryable).toBe(true);
  });
});

describe("normalizeNetworkError", () => {
  it("wraps network errors", () => {
    const err = normalizeNetworkError(
      new HttpClientError("network", 0, "ECONNREFUSED", 0),
      "pipedrive_deals_list",
      "GET /deals",
    );
    expect(err.category).toBe("network");
    expect(err.retryable).toBe(true);
    expect(err.guidance).toContain("ECONNREFUSED");
  });
});

describe("formatErrorMessage", () => {
  it("formats a readable error message", () => {
    const msg = formatErrorMessage({
      category: "not_found",
      status: 404,
      tool: "pipedrive_deals_get",
      endpoint: "GET /deals/999",
      pipedrive_error: "Deal not found",
      retryable: false,
      guidance: "Entity not found. Verify the ID is correct.",
    });
    expect(msg).toContain("pipedrive_deals_get failed: 404");
    expect(msg).toContain("Deal not found");
    expect(msg).toContain("Retryable: no");
  });
});
