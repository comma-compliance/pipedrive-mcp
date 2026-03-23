import { registerTools, type ToolDefinition } from "../mcp/register-tools.js";
import { successResult, paginatedResult, type ToolResult } from "../mcp/tool-result.js";
import { apiErrorResult, validationErrorResult } from "../mcp/errors.js";
import { getContext } from "../server.js";
import { withRetry } from "../pipedrive/retries.js";
import { normalizeApiError } from "../pipedrive/error-normalizer.js";
import { buildPaginationParams, buildPaginatedResult } from "../pipedrive/pagination.js";
import { FiltersListSchema, FiltersGetSchema, FiltersResultsSchema } from "../schemas/filters.js";
import { zodToJsonSchema } from "../schemas/zod-to-json.js";

async function handleFiltersList(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = FiltersListSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_filters_list", parsed.error.message);

  const { apiV1, rateLimiters } = getContext();
  const params: Record<string, string | number | boolean | undefined> = {};
  if (parsed.data.type) params.type = parsed.data.type;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.list<Record<string, unknown>>("/filters", params), { label: "pipedrive_filters_list" }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_filters_list", "GET /filters"));

  const filters = (response.data.data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    active_flag: f.active_flag,
    visible_to: f.visible_to,
    update_time: f.update_time,
  }));
  return successResult({ filters });
}

async function handleFiltersGet(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = FiltersGetSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_filters_get", parsed.error.message);

  const { apiV1, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.get<Record<string, unknown>>(`/filters/${parsed.data.filter_id}`), { label: `pipedrive_filters_get ${parsed.data.filter_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_filters_get", `GET /filters/${parsed.data.filter_id}`));
  return successResult(response.data.data);
}

const ENTITY_TYPE_TO_V2_PATH: Record<string, string> = {
  deals: "/deals",
  persons: "/persons",
  orgs: "/organizations",
  products: "/products",
  activities: "/activities",
};

async function handleFiltersResults(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = FiltersResultsSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_filters_results", parsed.error.message);

  const { apiV2, rateLimiters, config } = getContext();
  const input = parsed.data;
  const v2Path = ENTITY_TYPE_TO_V2_PATH[input.entity_type];
  if (!v2Path) return validationErrorResult("pipedrive_filters_results", `Unsupported entity type: ${input.entity_type}`);

  const limit = Math.min(input.limit ?? config.defaultLimit, config.maxLimit);
  const paginationParams = buildPaginationParams("cursor", limit, input.cursor);

  const params: Record<string, string | number | boolean | undefined> = {
    filter_id: input.filter_id,
    ...paginationParams,
  };
  if (input.sort_by) params.sort_by = input.sort_by;
  if (input.sort_direction) params.sort_direction = input.sort_direction;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>(v2Path, params), { label: `pipedrive_filters_results ${input.filter_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_filters_results", `GET ${v2Path}?filter_id=${input.filter_id}`));

  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "cursor", response.data as unknown as Record<string, unknown>);
  return paginatedResult({ items: result.items, next_page_token: result.next_page_token, approx_count: result.approx_count, truncated: result.truncated, pagination_mode: result.pagination_mode });
}

const tools: ToolDefinition[] = [
  { name: "pipedrive_filters_list", description: "List all saved filters, optionally by entity type.", inputSchema: zodToJsonSchema(FiltersListSchema), handler: handleFiltersList },
  { name: "pipedrive_filters_get", description: "Get a single filter definition by ID.", inputSchema: zodToJsonSchema(FiltersGetSchema), handler: handleFiltersGet },
  { name: "pipedrive_filters_results", description: "Run a saved filter and return matching entities with pagination.", inputSchema: zodToJsonSchema(FiltersResultsSchema), handler: handleFiltersResults },
];

registerTools(tools);
