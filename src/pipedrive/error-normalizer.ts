import { type HttpResponse } from "./http-client.js";
import { HttpClientError } from "./http-client.js";
import { parseRateLimitHeaders } from "./rate-limit.js";

export type ErrorCategory =
  | "validation"
  | "auth"
  | "not_found"
  | "conflict"
  | "rate_limit"
  | "server"
  | "network";

export interface NormalizedError {
  category: ErrorCategory;
  status: number;
  tool: string;
  endpoint: string;
  pipedrive_error: string;
  retryable: boolean;
  guidance: string;
  retry_after_ms?: number;
}

function categorizeStatus(status: number): ErrorCategory {
  if (status === 401) return "auth";
  if (status === 403) return "auth";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 422 || status === 400) return "validation";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "server";
  return "validation";
}

function getGuidance(status: number, pipedriveError: string): string {
  switch (status) {
    case 401:
      return "API token is invalid or expired. Check PIPEDRIVE_API_TOKEN.";
    case 403:
      return "User lacks permission for this operation.";
    case 404:
      return "Entity not found. Verify the ID is correct.";
    case 409:
      return "Conflict - entity was modified by another process. Re-fetch and retry.";
    case 429:
      return "Rate limited. Try again after the retry period.";
    case 400:
    case 422:
      return pipedriveError || "Invalid request. Check the field names and values.";
    default:
      if (status >= 500) {
        return "Pipedrive server error. This is retryable after a short wait.";
      }
      return pipedriveError || "Unexpected error.";
  }
}

export function normalizeApiError(
  response: HttpResponse,
  tool: string,
  endpoint: string,
): NormalizedError {
  const status = response.status;
  const category = categorizeStatus(status);
  const data = response.data as Record<string, unknown> | undefined;
  const pipedriveError = (data?.error as string) ?? (data?.error_info as string) ?? "";

  const result: NormalizedError = {
    category,
    status,
    tool,
    endpoint,
    pipedrive_error: pipedriveError,
    retryable: status === 429 || status >= 500,
    guidance: getGuidance(status, pipedriveError),
  };

  if (status === 429) {
    const { retryAfterMs } = parseRateLimitHeaders(response.headers);
    if (retryAfterMs) {
      result.retry_after_ms = retryAfterMs;
      result.guidance = `Rate limited. Try again in ${Math.ceil(retryAfterMs / 1000)} seconds.`;
    }
  }

  return result;
}

export function normalizeNetworkError(
  err: HttpClientError,
  tool: string,
  endpoint: string,
): NormalizedError {
  return {
    category: "network",
    status: 0,
    tool,
    endpoint,
    pipedrive_error: err.message,
    retryable: true,
    guidance: `Network error: ${err.message}. Check connectivity and retry.`,
  };
}

export function formatErrorMessage(err: NormalizedError): string {
  let msg = `${err.tool} failed: ${err.status} from ${err.endpoint}.`;
  if (err.pipedrive_error) {
    msg += ` ${err.pipedrive_error}.`;
  }
  msg += ` ${err.guidance}`;
  msg += ` Retryable: ${err.retryable ? "yes" : "no"}.`;
  return msg;
}
