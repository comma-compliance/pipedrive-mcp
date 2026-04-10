import { type NormalizedError, formatErrorMessage } from "../pipedrive/error-normalizer.js";
import { errorResult, type ToolResult } from "./tool-result.js";
import { captureError } from "../sentry.js";

export function apiErrorResult(err: NormalizedError): ToolResult {
  if (err.category !== "rate_limit") {
    captureError(new Error(`Pipedrive ${err.status}: ${err.pipedrive_error}`), {
      tool: err.tool,
      endpoint: err.endpoint,
      category: err.category,
      status: err.status,
      level: err.status >= 500 ? "error" : "warning",
      extra: { guidance: err.guidance, retryable: err.retryable },
    });
  }
  return errorResult(formatErrorMessage(err));
}

export function validationErrorResult(tool: string, message: string): ToolResult {
  return errorResult(`${tool}: validation error. ${message}`);
}

export function guardErrorResult(message: string): ToolResult {
  return errorResult(message);
}
