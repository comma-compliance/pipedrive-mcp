import { type PaginationMode } from "./endpoint-policy.js";

export interface PageToken {
  mode: PaginationMode;
  value: string;
}

export interface PaginatedResult<T> {
  items: T[];
  next_page_token: string | null;
  approx_count: number | null;
  truncated: boolean;
  pagination_mode: PaginationMode;
}

export function encodePageToken(mode: PaginationMode, value: string | number): string {
  if (mode === "cursor") {
    return `cursor:${value}`;
  }
  return `offset:${value}`;
}

export function decodePageToken(token: string): PageToken {
  const colonIdx = token.indexOf(":");
  if (colonIdx === -1) {
    throw new Error(`Invalid page token format: ${token}`);
  }
  const mode = token.substring(0, colonIdx) as PaginationMode;
  const value = token.substring(colonIdx + 1);
  if (mode !== "cursor" && mode !== "offset") {
    throw new Error(`Invalid page token mode: ${mode}`);
  }
  return { mode, value };
}

export function buildPaginationParams(
  paginationMode: PaginationMode,
  limit: number,
  pageToken?: string,
): Record<string, string | number> {
  const params: Record<string, string | number> = { limit };

  if (pageToken) {
    const decoded = decodePageToken(pageToken);
    if (decoded.mode !== paginationMode) {
      throw new Error(
        `Page token mode "${decoded.mode}" does not match endpoint pagination mode "${paginationMode}". ` +
        `This token may be from a different endpoint.`,
      );
    }
    if (decoded.mode === "cursor") {
      params.cursor = decoded.value;
    } else {
      const startVal = parseInt(decoded.value, 10);
      if (isNaN(startVal)) {
        throw new Error(`Invalid offset page token value: "${decoded.value}"`);
      }
      params.start = startVal;
    }
  } else if (paginationMode === "offset") {
    params.start = 0;
  }

  return params;
}

export function extractNextPageToken(
  paginationMode: PaginationMode,
  responseData: Record<string, unknown>,
): string | null {
  if (paginationMode === "cursor") {
    const cursor = (responseData.additional_data as Record<string, unknown>)?.next_cursor as
      | string
      | undefined;
    if (cursor) {
      return encodePageToken("cursor", cursor);
    }
    return null;
  }

  if (paginationMode === "offset") {
    const pagination = (responseData.additional_data as Record<string, unknown>)?.pagination as
      | Record<string, unknown>
      | undefined;
    if (pagination?.more_items_in_collection && pagination.next_start != null) {
      return encodePageToken("offset", pagination.next_start as number);
    }
    return null;
  }

  return null;
}

export function buildPaginatedResult<T>(
  items: T[],
  paginationMode: PaginationMode,
  responseData: Record<string, unknown>,
): PaginatedResult<T> {
  const nextToken = extractNextPageToken(paginationMode, responseData);
  const additionalData = responseData.additional_data as Record<string, unknown> | undefined;

  let approxCount: number | null = null;
  if (additionalData?.estimated_count != null) {
    approxCount = additionalData.estimated_count as number;
  } else if (paginationMode === "offset") {
    const pagination = additionalData?.pagination as Record<string, unknown> | undefined;
    if (pagination?.more_items_in_collection) {
      approxCount = null; // v1 offset doesn't provide total count reliably
    }
  }

  return {
    items,
    next_page_token: nextToken,
    approx_count: approxCount,
    truncated: nextToken !== null,
    pagination_mode: paginationMode,
  };
}
