import { type CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export type ToolResult = CallToolResult;

export function successResult(data: unknown): ToolResult {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function errorResult(message: string): ToolResult {
  return {
    content: [
      {
        type: "text",
        text: message,
      },
    ],
    isError: true,
  };
}

export function paginatedResult(data: {
  items: unknown[];
  next_page_token: string | null;
  approx_count: number | null;
  truncated: boolean;
  pagination_mode: string;
  message?: string;
}): ToolResult {
  const output: Record<string, unknown> = {
    items: data.items,
    next_page_token: data.next_page_token,
    truncated: data.truncated,
  };

  if (data.approx_count !== null) {
    output.approx_count = data.approx_count;
  }

  if (data.truncated && data.next_page_token) {
    const countStr = data.approx_count ? ` of ~${data.approx_count}` : "";
    output.message =
      data.message ??
      `Showing ${data.items.length}${countStr} results. Use next_page_token to fetch more.`;
  }

  return successResult(output);
}
