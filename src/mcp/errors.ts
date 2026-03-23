import { type NormalizedError, formatErrorMessage } from "../pipedrive/error-normalizer.js";
import { errorResult, type ToolResult } from "./tool-result.js";

export function apiErrorResult(err: NormalizedError): ToolResult {
  return errorResult(formatErrorMessage(err));
}

export function validationErrorResult(tool: string, message: string): ToolResult {
  return errorResult(`${tool}: validation error. ${message}`);
}

export function guardErrorResult(message: string): ToolResult {
  return errorResult(message);
}
