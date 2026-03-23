import { describe, it, expect } from "vitest";
import {
  encodePageToken,
  decodePageToken,
  buildPaginationParams,
  extractNextPageToken,
  buildPaginatedResult,
} from "../../../src/pipedrive/pagination.js";

describe("encodePageToken", () => {
  it("encodes cursor tokens", () => {
    expect(encodePageToken("cursor", "abc123")).toBe("cursor:abc123");
  });

  it("encodes offset tokens", () => {
    expect(encodePageToken("offset", 50)).toBe("offset:50");
  });
});

describe("decodePageToken", () => {
  it("decodes cursor tokens", () => {
    const token = decodePageToken("cursor:abc123");
    expect(token.mode).toBe("cursor");
    expect(token.value).toBe("abc123");
  });

  it("decodes offset tokens", () => {
    const token = decodePageToken("offset:100");
    expect(token.mode).toBe("offset");
    expect(token.value).toBe("100");
  });

  it("handles cursor values containing colons", () => {
    const token = decodePageToken("cursor:eyJ0eXAi:Oixx");
    expect(token.mode).toBe("cursor");
    expect(token.value).toBe("eyJ0eXAi:Oixx");
  });

  it("throws on invalid format (no colon)", () => {
    expect(() => decodePageToken("invalid")).toThrow("Invalid page token format");
  });

  it("throws on invalid mode", () => {
    expect(() => decodePageToken("badmode:123")).toThrow("Invalid page token mode");
  });
});

describe("buildPaginationParams", () => {
  it("builds cursor params without token", () => {
    const params = buildPaginationParams("cursor", 25);
    expect(params).toEqual({ limit: 25 });
  });

  it("builds offset params without token", () => {
    const params = buildPaginationParams("offset", 25);
    expect(params).toEqual({ limit: 25, start: 0 });
  });

  it("builds cursor params with token", () => {
    const params = buildPaginationParams("cursor", 25, "cursor:abc123");
    expect(params).toEqual({ limit: 25, cursor: "abc123" });
  });

  it("builds offset params with token", () => {
    const params = buildPaginationParams("offset", 25, "offset:50");
    expect(params).toEqual({ limit: 25, start: 50 });
  });

  it("throws when token mode mismatches endpoint mode", () => {
    expect(() => buildPaginationParams("cursor", 25, "offset:50")).toThrow(
      "does not match endpoint pagination mode",
    );
  });

  it("throws on NaN offset value", () => {
    expect(() => buildPaginationParams("offset", 25, "offset:notanumber")).toThrow(
      "Invalid offset page token value",
    );
  });
});

describe("extractNextPageToken", () => {
  it("extracts v2 cursor from response", () => {
    const token = extractNextPageToken("cursor", {
      additional_data: { next_cursor: "xyz789" },
    });
    expect(token).toBe("cursor:xyz789");
  });

  it("returns null when no v2 cursor", () => {
    const token = extractNextPageToken("cursor", {
      additional_data: {},
    });
    expect(token).toBeNull();
  });

  it("extracts v1 offset from response", () => {
    const token = extractNextPageToken("offset", {
      additional_data: {
        pagination: { more_items_in_collection: true, next_start: 25 },
      },
    });
    expect(token).toBe("offset:25");
  });

  it("returns null when v1 has no more items", () => {
    const token = extractNextPageToken("offset", {
      additional_data: {
        pagination: { more_items_in_collection: false },
      },
    });
    expect(token).toBeNull();
  });

  it("returns null for 'none' pagination mode", () => {
    const token = extractNextPageToken("none", { additional_data: {} });
    expect(token).toBeNull();
  });
});

describe("buildPaginatedResult", () => {
  it("builds result with truncation info", () => {
    const result = buildPaginatedResult(
      [{ id: 1 }, { id: 2 }],
      "cursor",
      { additional_data: { next_cursor: "next123", estimated_count: 50 } },
    );
    expect(result.items).toHaveLength(2);
    expect(result.next_page_token).toBe("cursor:next123");
    expect(result.approx_count).toBe(50);
    expect(result.truncated).toBe(true);
    expect(result.pagination_mode).toBe("cursor");
  });

  it("builds result without truncation", () => {
    const result = buildPaginatedResult(
      [{ id: 1 }],
      "cursor",
      { additional_data: {} },
    );
    expect(result.truncated).toBe(false);
    expect(result.next_page_token).toBeNull();
  });
});
