import { registerTools, type ToolDefinition } from "../mcp/register-tools.js";
import { successResult, paginatedResult, type ToolResult } from "../mcp/tool-result.js";
import { apiErrorResult, validationErrorResult, guardErrorResult } from "../mcp/errors.js";
import { getContext } from "../server.js";
import { withRetry } from "../pipedrive/retries.js";
import { normalizeApiError } from "../pipedrive/error-normalizer.js";
import { buildPaginationParams, buildPaginatedResult } from "../pipedrive/pagination.js";
import { compactActivity } from "../presenters/entities.js";
import { validateConfirmation, buildDryRunResult } from "../services/guards.js";
import {
  ActivitiesListSchema,
  ActivitiesGetSchema,
  ActivitiesCreateSchema,
  ActivitiesUpdateSchema,
  ActivitiesMarkDoneSchema,
  ActivitiesDeleteSchema,
} from "../schemas/activities.js";
import { zodToJsonSchema } from "../schemas/zod-to-json.js";

async function handleActivitiesList(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = ActivitiesListSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_activities_list", parsed.error.message);

  const { apiV2, rateLimiters, config } = getContext();
  const input = parsed.data;
  const limit = Math.min(input.limit ?? config.defaultLimit, config.maxLimit);
  const paginationParams = buildPaginationParams("cursor", limit, input.cursor);

  const params: Record<string, string | number | boolean | undefined> = { ...paginationParams };
  // v2 uses owner_id, not user_id - map user_id to owner_id for the API call
  if (input.user_id) params.owner_id = input.user_id;
  if (input.owner_id) params.owner_id = input.owner_id;
  if (input.deal_id) params.deal_id = input.deal_id;
  if (input.person_id) params.person_id = input.person_id;
  if (input.org_id) params.org_id = input.org_id;
  if (input.lead_id) params.lead_id = input.lead_id;
  if (input.done !== undefined) params.done = input.done;
  if (input.sort_by) params.sort_by = input.sort_by;
  if (input.sort_direction) params.sort_direction = input.sort_direction;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>("/activities", params), { label: "pipedrive_activities_list" }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_activities_list", "GET /activities"));

  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "cursor", response.data as unknown as Record<string, unknown>);
  return paginatedResult({ items: result.items.map(compactActivity), next_page_token: result.next_page_token, approx_count: result.approx_count, truncated: result.truncated, pagination_mode: result.pagination_mode });
}

async function handleActivitiesGet(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = ActivitiesGetSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_activities_get", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.get<Record<string, unknown>>(`/activities/${parsed.data.activity_id}`), { label: `pipedrive_activities_get ${parsed.data.activity_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_activities_get", `GET /activities/${parsed.data.activity_id}`));
  return successResult(response.data.data);
}

async function handleActivitiesCreate(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = ActivitiesCreateSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_activities_create", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const input = parsed.data;
  const body: Record<string, unknown> = { subject: input.subject, type: input.type };
  if (input.deal_id) body.deal_id = input.deal_id;
  // v2 uses participants array instead of person_id (which is read-only)
  if (input.person_id) body.participants = [{ person_id: input.person_id, primary: true }];
  if (input.org_id) body.org_id = input.org_id;
  if (input.lead_id) body.lead_id = input.lead_id;
  if (input.user_id) body.owner_id = input.user_id; // v2 uses owner_id
  if (input.due_date) body.due_date = input.due_date;
  if (input.due_time) body.due_time = input.due_time;
  if (input.duration) body.duration = input.duration;
  if (input.note) body.note = input.note;
  if (input.location) body.location = input.location;
  if (input.done !== undefined) body.done = input.done;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.post<Record<string, unknown>>("/activities", body), { label: "pipedrive_activities_create" }),
  );

  if (response.status !== 200 && response.status !== 201) return apiErrorResult(normalizeApiError(response, "pipedrive_activities_create", "POST /activities"));
  return successResult({ message: "Activity created", activity: compactActivity(response.data.data) });
}

async function handleActivitiesUpdate(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = ActivitiesUpdateSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_activities_update", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const input = parsed.data;
  const body: Record<string, unknown> = {};
  if (input.subject) body.subject = input.subject;
  if (input.type) body.type = input.type;
  if (input.deal_id) body.deal_id = input.deal_id;
  if (input.person_id) body.participants = [{ person_id: input.person_id, primary: true }];
  if (input.org_id) body.org_id = input.org_id;
  if (input.lead_id) body.lead_id = input.lead_id;
  if (input.user_id) body.owner_id = input.user_id; // v2 uses owner_id
  if (input.due_date) body.due_date = input.due_date;
  if (input.due_time) body.due_time = input.due_time;
  if (input.duration) body.duration = input.duration;
  if (input.note) body.note = input.note;
  if (input.location) body.location = input.location;
  if (input.done !== undefined) body.done = input.done;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.patch<Record<string, unknown>>(`/activities/${input.activity_id}`, body), { label: `pipedrive_activities_update ${input.activity_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_activities_update", `PATCH /activities/${input.activity_id}`));
  return successResult({ message: `Activity ${input.activity_id} updated`, activity: compactActivity(response.data.data) });
}

async function handleActivitiesMarkDone(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = ActivitiesMarkDoneSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_activities_mark_done", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.patch<Record<string, unknown>>(`/activities/${parsed.data.activity_id}`, { done: parsed.data.done }), { label: `pipedrive_activities_mark_done ${parsed.data.activity_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_activities_mark_done", `PATCH /activities/${parsed.data.activity_id}`));
  return successResult({ message: `Activity ${parsed.data.activity_id} marked ${parsed.data.done ? "done" : "undone"}`, activity: compactActivity(response.data.data) });
}

async function handleActivitiesDelete(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = ActivitiesDeleteSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_activities_delete", parsed.error.message);

  const input = parsed.data;
  if (input.dry_run) return successResult(buildDryRunResult("pipedrive_activities_delete", "delete", { activity_id: input.activity_id }, `Would delete activity ${input.activity_id}`));

  const confirmError = validateConfirmation(input.confirm, "DELETE", "pipedrive_activities_delete", "delete activity");
  if (confirmError) return guardErrorResult(confirmError);

  const { apiV2, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.del(`/activities/${input.activity_id}`), { label: `pipedrive_activities_delete ${input.activity_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_activities_delete", `DELETE /activities/${input.activity_id}`));
  return successResult({ message: `Activity ${input.activity_id} deleted` });
}

async function handleActivityTypesList(args: Record<string, unknown>): Promise<ToolResult> {
  const { apiV1, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.list<Record<string, unknown>>("/activityTypes"), { label: "pipedrive_activity_types_list" }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_activity_types_list", "GET /activityTypes"));

  const types = (response.data.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    key_string: t.key_string,
    icon_key: t.icon_key,
    active_flag: t.active_flag,
  }));
  return successResult({ activity_types: types });
}

const tools: ToolDefinition[] = [
  { name: "pipedrive_activities_list", description: "List activities with filters and pagination.", inputSchema: zodToJsonSchema(ActivitiesListSchema), handler: handleActivitiesList },
  { name: "pipedrive_activities_get", description: "Get a single activity by ID.", inputSchema: zodToJsonSchema(ActivitiesGetSchema), handler: handleActivitiesGet },
  { name: "pipedrive_activities_create", description: "Create a new activity (call, meeting, task, etc).", inputSchema: zodToJsonSchema(ActivitiesCreateSchema), handler: handleActivitiesCreate },
  { name: "pipedrive_activities_update", description: "Update an existing activity.", inputSchema: zodToJsonSchema(ActivitiesUpdateSchema), handler: handleActivitiesUpdate },
  { name: "pipedrive_activities_mark_done", description: "Mark an activity as done or undone.", inputSchema: zodToJsonSchema(ActivitiesMarkDoneSchema), handler: handleActivitiesMarkDone },
  { name: "pipedrive_activities_delete", description: 'Delete an activity. Requires confirm: "DELETE". Supports dry_run.', inputSchema: zodToJsonSchema(ActivitiesDeleteSchema), handler: handleActivitiesDelete },
  { name: "pipedrive_activity_types_list", description: "List all available activity types.", inputSchema: { type: "object", properties: {} }, handler: handleActivityTypesList },
];

registerTools(tools);
