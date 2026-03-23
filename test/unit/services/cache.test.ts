import { describe, it, expect, vi, afterEach } from "vitest";
import { TtlCache } from "../../../src/services/cache.js";

describe("TtlCache", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores and retrieves values", () => {
    const cache = new TtlCache<string>(60000);
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  it("returns undefined for missing keys", () => {
    const cache = new TtlCache<string>(60000);
    expect(cache.get("nope")).toBeUndefined();
  });

  it("expires entries after TTL", () => {
    const cache = new TtlCache<string>(100);
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");

    // Advance time past TTL
    vi.useFakeTimers();
    vi.advanceTimersByTime(150);
    expect(cache.get("key1")).toBeUndefined();
    vi.useRealTimers();
  });

  it("deletes entries", () => {
    const cache = new TtlCache<string>(60000);
    cache.set("key1", "value1");
    cache.delete("key1");
    expect(cache.get("key1")).toBeUndefined();
  });

  it("clears all entries", () => {
    const cache = new TtlCache<string>(60000);
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clear();
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeUndefined();
  });

  it("reports size excluding expired entries", () => {
    vi.useFakeTimers();
    const cache = new TtlCache<string>(100);
    cache.set("a", "1");
    cache.set("b", "2");
    expect(cache.size()).toBe(2);
    vi.advanceTimersByTime(150);
    expect(cache.size()).toBe(0);
    vi.useRealTimers();
  });

  it("has() returns false for expired entries", () => {
    vi.useFakeTimers();
    const cache = new TtlCache<string>(50);
    cache.set("x", "y");
    expect(cache.has("x")).toBe(true);
    vi.advanceTimersByTime(100);
    expect(cache.has("x")).toBe(false);
    vi.useRealTimers();
  });
});
