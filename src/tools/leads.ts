import { registerTools, type ToolDefinition } from "../mcp/register-tools.js";
import { successResult, paginatedResult, type ToolResult } from "../mcp/tool-result.js";
import { apiErrorResult, validationErrorResult, guardErrorResult } from "../mcp/errors.js";
import { getContext } from "../server.js";
import { withRetry } from "../pipedrive/retries.js";
import { normalizeApiError } from "../pipedrive/error-normalizer.js";
import { buildPaginationParams, buildPaginatedResult } from "../pipedrive/pagination.js";
import { validateConfirmation, buildDryRunResult } from "../services/guards.js";
import {
  LeadsListSchema, LeadsGetSchema, LeadsCreateSchema, LeadsUpdateSchema,
  LeadsDeleteSchema, LeadsSearchSchema,
} from "../schemas/leads.js";
import { zodToJsonSchema } from "../schemas/zod-to-json.js";

async function handleLeadsList(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = LeadsListSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_leads_list", parsed.error.message);

  const { apiV1, rateLimiters, config } = getContext();
  const input = parsed.data;
  const limit = Math.min(input.limit ?? config.defaultLimit, config.maxLimit);
  const paginationParams = buildPaginationParams("offset", limit, input.cursor);

  const params: Record<string, string | number | boolean | undefined> = { ...paginationParams };
  if (input.owner_id) params.owner_id = input.owner_id;
  if (input.person_id) params.person_id = input.person_id;
  if (input.organization_id) params.organization_id = input.organization_id;
  if (input.filter_id) params.filter_id = input.filter_id;
  if (input.sort) params.sort = input.sort;
  if (input.archived_status) params.archived_status = input.archived_status;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.list<Record<string, unknown>>("/leads", params), { label: "pipedrive_leads_list" }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_leads_list", "GET /leads"));
  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "offset", response.data as unknown as Record<string, unknown>);
  const compact = result.items.map((l) => ({
    id: l.id, title: l.title, owner_id: l.owner_id, person_id: l.person_id,
    organization_id: l.organization_id, value: l.value, expected_close_date: l.expected_close_date,
    is_archived: l.is_archived, add_time: l.add_time, update_time: l.update_time,
  }));
  return paginatedResult({ items: compact, next_page_token: result.next_page_token, approx_count: result.approx_count, truncated: result.truncated, pagination_mode: result.pagination_mode });
}

async function handleLeadsGet(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = LeadsGetSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_leads_get", parsed.error.message);

  const { apiV1, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.get<Record<string, unknown>>(`/leads/${parsed.data.lead_id}`), { label: `pipedrive_leads_get ${parsed.data.lead_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_leads_get", `GET /leads/${parsed.data.lead_id}`));
  return successResult(response.data.data);
}

async function handleLeadsCreate(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = LeadsCreateSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_leads_create", parsed.error.message);

  const input = parsed.data;
  if (!input.person_id && !input.organization_id) {
    return validationErrorResult("pipedrive_leads_create", "At least one of person_id or organization_id is required");
  }

  const { apiV1, rateLimiters } = getContext();
  const body: Record<string, unknown> = { title: input.title };
  if (input.person_id) body.person_id = input.person_id;
  if (input.organization_id) body.organization_id = input.organization_id;
  if (input.owner_id) body.owner_id = input.owner_id;
  if (input.label_ids) body.label_ids = input.label_ids;
  if (input.value) body.value = input.value;
  if (input.expected_close_date) body.expected_close_date = input.expected_close_date;
  if (input.visible_to) body.visible_to = input.visible_to;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.post<Record<string, unknown>>("/leads", body), { label: "pipedrive_leads_create" }),
  );

  if (response.status !== 200 && response.status !== 201) return apiErrorResult(normalizeApiError(response, "pipedrive_leads_create", "POST /leads"));
  return successResult({ message: "Lead created", lead: response.data.data });
}

async function handleLeadsUpdate(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = LeadsUpdateSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_leads_update", parsed.error.message);

  const { apiV1, rateLimiters } = getContext();
  const input = parsed.data;
  const body: Record<string, unknown> = {};
  if (input.title) body.title = input.title;
  if (input.person_id) body.person_id = input.person_id;
  if (input.organization_id) body.organization_id = input.organization_id;
  if (input.owner_id) body.owner_id = input.owner_id;
  if (input.label_ids) body.label_ids = input.label_ids;
  if (input.value) body.value = input.value;
  if (input.expected_close_date) body.expected_close_date = input.expected_close_date;
  if (input.visible_to) body.visible_to = input.visible_to;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() =>
      apiV1.patch<Record<string, unknown>>(`/leads/${input.lead_id}`, body),
      { label: `pipedrive_leads_update ${input.lead_id}` },
    ),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_leads_update", `PATCH /leads/${input.lead_id}`));
  return successResult({ message: `Lead ${input.lead_id} updated`, lead: response.data.data });
}

async function handleLeadsDelete(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = LeadsDeleteSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_leads_delete", parsed.error.message);
  const input = parsed.data;
  if (input.dry_run) return successResult(buildDryRunResult("pipedrive_leads_delete", "delete", { lead_id: input.lead_id }, `Would delete lead ${input.lead_id}`));
  const confirmError = validateConfirmation(input.confirm, "DELETE", "pipedrive_leads_delete", "delete lead");
  if (confirmError) return guardErrorResult(confirmError);

  const { apiV1, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.del(`/leads/${input.lead_id}`), { label: `pipedrive_leads_delete ${input.lead_id}` }),
  );
  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_leads_delete", `DELETE /leads/${input.lead_id}`));
  return successResult({ message: `Lead ${input.lead_id} deleted` });
}

async function handleLeadsSearch(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = LeadsSearchSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_leads_search", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const input = parsed.data;
  const limit = Math.min(input.limit ?? 10, 50);
  const paginationParams = buildPaginationParams("cursor", limit, input.cursor);
  const params: Record<string, string | number | boolean | undefined> = { term: input.term, ...paginationParams };
  if (input.fields) params.fields = input.fields;
  if (input.exact_match !== undefined) params.exact_match = input.exact_match;
  if (input.person_id) params.person_id = input.person_id;
  if (input.organization_id) params.organization_id = input.organization_id;
  if (input.include_fields) params.include_fields = input.include_fields.join(",");

  const response = await rateLimiters.search.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>("/leads/search", params), { label: "pipedrive_leads_search" }),
  );
  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_leads_search", "GET /leads/search"));
  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "cursor", response.data as unknown as Record<string, unknown>);
  return paginatedResult({ items: result.items, next_page_token: result.next_page_token, approx_count: result.approx_count, truncated: result.truncated, pagination_mode: result.pagination_mode });
}

const tools: ToolDefinition[] = [
  { name: "pipedrive_leads_list", description: "List leads with filters and pagination.", inputSchema: zodToJsonSchema(LeadsListSchema), handler: handleLeadsList },
  { name: "pipedrive_leads_get", description: "Get a single lead by ID.", inputSchema: zodToJsonSchema(LeadsGetSchema), handler: handleLeadsGet },
  { name: "pipedrive_leads_create", description: "Create a new lead. Requires at least person_id or organization_id.", inputSchema: zodToJsonSchema(LeadsCreateSchema), handler: handleLeadsCreate },
  { name: "pipedrive_leads_update", description: "Update an existing lead.", inputSchema: zodToJsonSchema(LeadsUpdateSchema), handler: handleLeadsUpdate },
  { name: "pipedrive_leads_delete", description: 'Delete a lead. Requires confirm: "DELETE". Supports dry_run.', inputSchema: zodToJsonSchema(LeadsDeleteSchema), handler: handleLeadsDelete },
  { name: "pipedrive_leads_search", description: "Search leads by term (uses v2 search API).", inputSchema: zodToJsonSchema(LeadsSearchSchema), handler: handleLeadsSearch },
];

registerTools(tools);
