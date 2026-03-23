import { log } from "../logging.js";
import { type Config } from "../config.js";

export interface HttpResponse<T = unknown> {
  status: number;
  data: T;
  headers: Record<string, string>;
  durationMs: number;
}

export interface HttpRequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeoutMs?: number;
}

export function createHttpClient(config: Config) {
  const { apiToken, requestTimeoutMs } = config;

  async function request<T = unknown>(opts: HttpRequestOptions): Promise<HttpResponse<T>> {
    const url = new URL(opts.url);

    // Auth via query parameter
    url.searchParams.set("api_token", apiToken);

    // Add extra query params
    if (opts.params) {
      for (const [key, value] of Object.entries(opts.params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    let bodyStr: string | undefined;
    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
      bodyStr = JSON.stringify(opts.body);
    }

    const timeout = opts.timeoutMs ?? requestTimeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const start = Date.now();
    let response: Response;

    try {
      log.debug("HTTP request", {
        method: opts.method,
        url: url.pathname + url.search.replace(/api_token=[^&]+/, "api_token=***"),
      });

      response = await fetch(url.toString(), {
        method: opts.method,
        headers,
        body: bodyStr,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      const durationMs = Date.now() - start;
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new HttpClientError("network", 0, `Request timed out after ${timeout}ms`, durationMs);
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new HttpClientError("network", 0, message, durationMs);
    }

    clearTimeout(timer);
    const durationMs = Date.now() - start;

    // Extract rate limit headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key.toLowerCase()] = value;
    });

    let data: T;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      data = (await response.json()) as T;
    } else {
      data = (await response.text()) as T;
    }

    log.debug("HTTP response", {
      status: response.status,
      durationMs,
    });

    return {
      status: response.status,
      data,
      headers: responseHeaders,
      durationMs,
    };
  }

  return { request };
}

export class HttpClientError extends Error {
  constructor(
    public readonly category: "network" | "timeout",
    public readonly status: number,
    message: string,
    public readonly durationMs: number,
  ) {
    super(message);
    this.name = "HttpClientError";
  }
}

export type HttpClient = ReturnType<typeof createHttpClient>;
