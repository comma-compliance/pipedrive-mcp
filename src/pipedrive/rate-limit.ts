import Bottleneck from "bottleneck";
import { type Config } from "../config.js";
import { log } from "../logging.js";

let generalLimiter: Bottleneck | null = null;
let searchLimiter: Bottleneck | null = null;

export function createRateLimiters(config: Config): {
  general: Bottleneck;
  search: Bottleneck;
} {
  generalLimiter = new Bottleneck({
    reservoir: config.rateLimitGeneralPer2s,
    reservoirRefreshAmount: config.rateLimitGeneralPer2s,
    reservoirRefreshInterval: 2000,
    maxConcurrent: 2,
    minTime: 100,
  });

  searchLimiter = new Bottleneck({
    reservoir: config.rateLimitSearchPer2s,
    reservoirRefreshAmount: config.rateLimitSearchPer2s,
    reservoirRefreshInterval: 2000,
    maxConcurrent: 1,
    minTime: 200,
  });

  generalLimiter.on("depleted", () => {
    log.debug("General rate limiter depleted, queuing requests");
  });

  searchLimiter.on("depleted", () => {
    log.debug("Search rate limiter depleted, queuing requests");
  });

  return { general: generalLimiter, search: searchLimiter };
}

export function parseRateLimitHeaders(headers: Record<string, string>): {
  remaining: number | null;
  resetMs: number | null;
  retryAfterMs: number | null;
} {
  const remaining = headers["x-ratelimit-remaining"]
    ? parseInt(headers["x-ratelimit-remaining"], 10)
    : null;
  const reset = headers["x-ratelimit-reset"]
    ? parseInt(headers["x-ratelimit-reset"], 10) * 1000
    : null;
  const retryAfter = headers["retry-after"]
    ? parseInt(headers["retry-after"], 10) * 1000
    : null;

  return { remaining, resetMs: reset, retryAfterMs: retryAfter };
}
