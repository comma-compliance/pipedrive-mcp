import { registerTools, type ToolDefinition } from "../mcp/register-tools.js";
import { successResult, paginatedResult, type ToolResult } from "../mcp/tool-result.js";
import { apiErrorResult, validationErrorResult } from "../mcp/errors.js";
import { getContext } from "../server.js";
import { withRetry } from "../pipedrive/retries.js";
import { normalizeApiError } from "../pipedrive/error-normalizer.js";
import { buildPaginationParams, buildPaginatedResult } from "../pipedrive/pagination.js";
import {
  PipelinesListSchema,
  PipelinesGetSchema,
  StagesListSchema,
  StagesGetSchema,
} from "../schemas/pipelines.js";
import { zodToJsonSchema } from "../schemas/zod-to-json.js";

async function handlePipelinesList(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = PipelinesListSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_pipelines_list", parsed.error.message);

  const { apiV2, rateLimiters, config } = getContext();
  const input = parsed.data;
  const limit = Math.min(input.limit ?? config.defaultLimit, config.maxLimit);
  const paginationParams = buildPaginationParams("cursor", limit, input.cursor);

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>("/pipelines", paginationParams), { label: "pipedrive_pipelines_list" }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_pipelines_list", "GET /pipelines"));

  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "cursor", response.data as unknown as Record<string, unknown>);
  const compact = result.items.map((p) => ({ id: p.id, name: p.name, active: p.active, deal_probability: p.deal_probability, update_time: p.update_time }));
  return paginatedResult({ items: compact, next_page_token: result.next_page_token, approx_count: result.approx_count, truncated: result.truncated, pagination_mode: result.pagination_mode });
}

async function handlePipelinesGet(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = PipelinesGetSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_pipelines_get", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.get<Record<string, unknown>>(`/pipelines/${parsed.data.pipeline_id}`), { label: `pipedrive_pipelines_get ${parsed.data.pipeline_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_pipelines_get", `GET /pipelines/${parsed.data.pipeline_id}`));
  return successResult(response.data.data);
}

async function handleStagesList(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = StagesListSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_stages_list", parsed.error.message);

  const { apiV2, rateLimiters, config } = getContext();
  const input = parsed.data;
  const limit = Math.min(input.limit ?? config.defaultLimit, config.maxLimit);
  const paginationParams = buildPaginationParams("cursor", limit, input.cursor);

  const params: Record<string, string | number | boolean | undefined> = { ...paginationParams };
  if (input.pipeline_id) params.pipeline_id = input.pipeline_id;
  if (input.sort_by) params.sort_by = input.sort_by;
  if (input.sort_direction) params.sort_direction = input.sort_direction;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>("/stages", params), { label: "pipedrive_stages_list" }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_stages_list", "GET /stages"));

  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "cursor", response.data as unknown as Record<string, unknown>);
  const compact = result.items.map((s) => ({ id: s.id, name: s.name, pipeline_id: s.pipeline_id, order_nr: s.order_nr, deal_probability: s.deal_probability }));
  return paginatedResult({ items: compact, next_page_token: result.next_page_token, approx_count: result.approx_count, truncated: result.truncated, pagination_mode: result.pagination_mode });
}

async function handleStagesGet(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = StagesGetSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_stages_get", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.get<Record<string, unknown>>(`/stages/${parsed.data.stage_id}`), { label: `pipedrive_stages_get ${parsed.data.stage_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_stages_get", `GET /stages/${parsed.data.stage_id}`));
  return successResult(response.data.data);
}

const tools: ToolDefinition[] = [
  { name: "pipedrive_pipelines_list", description: "List all pipelines.", inputSchema: zodToJsonSchema(PipelinesListSchema), handler: handlePipelinesList },
  { name: "pipedrive_pipelines_get", description: "Get a single pipeline by ID.", inputSchema: zodToJsonSchema(PipelinesGetSchema), handler: handlePipelinesGet },
  { name: "pipedrive_stages_list", description: "List stages, optionally filtered by pipeline.", inputSchema: zodToJsonSchema(StagesListSchema), handler: handleStagesList },
  { name: "pipedrive_stages_get", description: "Get a single stage by ID.", inputSchema: zodToJsonSchema(StagesGetSchema), handler: handleStagesGet },
];

registerTools(tools);
