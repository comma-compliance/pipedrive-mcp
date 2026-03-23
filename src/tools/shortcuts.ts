import { registerTools, type ToolDefinition } from "../mcp/register-tools.js";
import { successResult, paginatedResult, type ToolResult } from "../mcp/tool-result.js";
import { apiErrorResult, validationErrorResult } from "../mcp/errors.js";
import { getContext } from "../server.js";
import { withRetry } from "../pipedrive/retries.js";
import { normalizeApiError } from "../pipedrive/error-normalizer.js";
import { buildPaginationParams, buildPaginatedResult } from "../pipedrive/pagination.js";
import { resolveOwnerId, getCurrentUser } from "../services/current-user.js";
import { compactDeal, compactActivity, compactPerson } from "../presenters/entities.js";
import {
  MeSchema,
  MyOpenDealsSchema,
  MyOverdueActivitiesSchema,
  MyUpcomingActivitiesSchema,
  RecentlyUpdatedSchema,
  MyPipelineSummarySchema,
  StaleDealsSchema,
  PeopleNeedingFollowupSchema,
} from "../schemas/shortcuts.js";
import { zodToJsonSchema } from "../schemas/zod-to-json.js";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().replace(/\.\d+Z$/, "Z");
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// --- pipedrive_me ---
async function handleMe(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = MeSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_me", parsed.error.message);

  const resolved = await resolveOwnerId(parsed.data.as_user);
  if (resolved.error) return validationErrorResult("pipedrive_me", resolved.error);

  if (parsed.data.as_user) {
    // Return resolved user info
    return successResult({
      user_id: resolved.ownerId,
      name: resolved.userName,
      note: `Resolved "${parsed.data.as_user}" to user ${resolved.userName} (ID: ${resolved.ownerId}). Use this ID with owner_id filters.`,
    });
  }

  // Full /users/me response
  const { apiV1, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.get<Record<string, unknown>>("/users/me"), { label: "GET /users/me" }),
  );
  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_me", "GET /users/me"));
  return successResult(response.data.data);
}

// --- pipedrive_my_open_deals ---
async function handleMyOpenDeals(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = MyOpenDealsSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_my_open_deals", parsed.error.message);

  const resolved = await resolveOwnerId(parsed.data.as_user);
  if (resolved.error) return validationErrorResult("pipedrive_my_open_deals", resolved.error);

  const { apiV2, rateLimiters, config } = getContext();
  const limit = Math.min(parsed.data.limit ?? config.defaultLimit, config.maxLimit);
  const paginationParams = buildPaginationParams("cursor", limit, parsed.data.cursor);

  const params: Record<string, string | number | boolean | undefined> = {
    owner_id: resolved.ownerId,
    status: "open",
    sort_by: "update_time",
    sort_direction: "desc",
    ...paginationParams,
  };
  if (parsed.data.pipeline_id) params.pipeline_id = parsed.data.pipeline_id;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>("/deals", params), { label: "pipedrive_my_open_deals" }),
  );
  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_my_open_deals", "GET /deals"));

  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "cursor", response.data as unknown as Record<string, unknown>);
  return paginatedResult({
    items: result.items.map(compactDeal),
    next_page_token: result.next_page_token,
    approx_count: result.approx_count,
    truncated: result.truncated,
    pagination_mode: result.pagination_mode,
    message: `${resolved.userName}'s open deals`,
  });
}

// --- pipedrive_my_overdue_activities ---
async function handleMyOverdueActivities(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = MyOverdueActivitiesSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_my_overdue_activities", parsed.error.message);

  const resolved = await resolveOwnerId(parsed.data.as_user);
  if (resolved.error) return validationErrorResult("pipedrive_my_overdue_activities", resolved.error);

  const { apiV2, rateLimiters } = getContext();
  // Fetch undone activities sorted by due_date, then filter server-side for overdue
  const limit = 100; // fetch more to filter
  const params: Record<string, string | number | boolean | undefined> = {
    owner_id: resolved.ownerId,
    done: false,
    sort_by: "due_date",
    sort_direction: "asc",
    limit,
  };

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>("/activities", params), { label: "pipedrive_my_overdue_activities" }),
  );
  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_my_overdue_activities", "GET /activities"));

  const todayStr = today();
  const overdue = (response.data.data ?? [])
    .filter((a) => {
      const dueDate = a.due_date as string | null;
      return dueDate && dueDate < todayStr;
    })
    .map(compactActivity);

  const requestedLimit = Math.min(parsed.data.limit ?? 25, 100);
  const page = overdue.slice(0, requestedLimit);

  return successResult({
    items: page,
    total_overdue: overdue.length,
    truncated: page.length < overdue.length,
    user: resolved.userName,
    message: overdue.length === 0
      ? `${resolved.userName} has no overdue activities.`
      : `${resolved.userName} has ${overdue.length} overdue activit${overdue.length === 1 ? "y" : "ies"}.`,
  });
}

// --- pipedrive_my_upcoming_activities ---
async function handleMyUpcomingActivities(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = MyUpcomingActivitiesSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_my_upcoming_activities", parsed.error.message);

  const resolved = await resolveOwnerId(parsed.data.as_user);
  if (resolved.error) return validationErrorResult("pipedrive_my_upcoming_activities", resolved.error);

  const { apiV2, rateLimiters } = getContext();
  const days = parsed.data.days ?? 7;
  const todayStr = today();
  const endStr = daysFromNow(days);

  const params: Record<string, string | number | boolean | undefined> = {
    owner_id: resolved.ownerId,
    done: false,
    sort_by: "due_date",
    sort_direction: "asc",
    limit: 100,
  };

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>("/activities", params), { label: "pipedrive_my_upcoming_activities" }),
  );
  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_my_upcoming_activities", "GET /activities"));

  const upcoming = (response.data.data ?? [])
    .filter((a) => {
      const dueDate = a.due_date as string | null;
      return dueDate && dueDate >= todayStr && dueDate <= endStr;
    })
    .map(compactActivity);

  const requestedLimit = Math.min(parsed.data.limit ?? 25, 100);
  const page = upcoming.slice(0, requestedLimit);

  return successResult({
    items: page,
    total_upcoming: upcoming.length,
    truncated: page.length < upcoming.length,
    date_range: `${todayStr} to ${endStr}`,
    user: resolved.userName,
    message: upcoming.length === 0
      ? `${resolved.userName} has no activities in the next ${days} days.`
      : `${resolved.userName} has ${upcoming.length} activit${upcoming.length === 1 ? "y" : "ies"} in the next ${days} days.`,
  });
}

// --- pipedrive_recently_updated ---
async function handleRecentlyUpdated(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = RecentlyUpdatedSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_recently_updated", parsed.error.message);

  const input = parsed.data;
  const { apiV2, rateLimiters, config } = getContext();
  const limit = Math.min(input.limit ?? config.defaultLimit, config.maxLimit);
  const paginationParams = buildPaginationParams("cursor", limit, input.cursor);
  const since = daysAgo(input.days ?? 7);

  const entityPaths: Record<string, string> = {
    deals: "/deals",
    persons: "/persons",
    organizations: "/organizations",
  };
  const path = entityPaths[input.entity_type];

  const params: Record<string, string | number | boolean | undefined> = {
    updated_since: since,
    sort_by: "update_time",
    sort_direction: "desc",
    ...paginationParams,
  };

  if (input.as_user) {
    const resolved = await resolveOwnerId(input.as_user);
    if (resolved.error) return validationErrorResult("pipedrive_recently_updated", resolved.error);
    params.owner_id = resolved.ownerId;
  }

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>(path, params), { label: `pipedrive_recently_updated ${input.entity_type}` }),
  );
  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_recently_updated", `GET ${path}`));

  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "cursor", response.data as unknown as Record<string, unknown>);

  return paginatedResult({
    items: result.items,
    next_page_token: result.next_page_token,
    approx_count: result.approx_count,
    truncated: result.truncated,
    pagination_mode: result.pagination_mode,
    message: `${input.entity_type} updated in the last ${input.days ?? 7} days`,
  });
}

// --- pipedrive_my_pipeline_summary ---
async function handleMyPipelineSummary(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = MyPipelineSummarySchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_my_pipeline_summary", parsed.error.message);

  const resolved = await resolveOwnerId(parsed.data.as_user);
  if (resolved.error) return validationErrorResult("pipedrive_my_pipeline_summary", resolved.error);

  const { apiV2, rateLimiters } = getContext();

  // Get pipelines
  const pipelinesResp = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>("/pipelines", { limit: 100 }), { label: "GET pipelines" }),
  );
  if (pipelinesResp.status !== 200) return apiErrorResult(normalizeApiError(pipelinesResp, "pipedrive_my_pipeline_summary", "GET /pipelines"));

  let pipelines = pipelinesResp.data.data ?? [];
  if (parsed.data.pipeline_id) {
    pipelines = pipelines.filter((p) => (p.id as number) === parsed.data.pipeline_id);
  }

  // Get stages
  const stagesResp = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>("/stages", {
      limit: 100,
      ...(parsed.data.pipeline_id ? { pipeline_id: parsed.data.pipeline_id } : {}),
    }), { label: "GET stages" }),
  );
  if (stagesResp.status !== 200) return apiErrorResult(normalizeApiError(stagesResp, "pipedrive_my_pipeline_summary", "GET /stages"));

  const stages = stagesResp.data.data ?? [];

  // For each stage, get deal count + total value for this owner
  const stageResults: Array<{
    stage_id: number;
    stage_name: string;
    pipeline_id: number;
    order_nr: number;
    deal_count: number;
    total_value: number;
  }> = [];

  for (const stage of stages) {
    const stageId = stage.id as number;
    const dealsResp = await rateLimiters.general.schedule(() =>
      withRetry(() => apiV2.list<Record<string, unknown>>("/deals", {
        stage_id: stageId,
        owner_id: resolved.ownerId,
        status: "open",
        limit: 100,
      }), { label: `GET deals stage ${stageId}` }),
    );

    const deals = dealsResp.data.data ?? [];
    const totalValue = deals.reduce((sum, d) => sum + ((d.value as number) ?? 0), 0);

    stageResults.push({
      stage_id: stageId,
      stage_name: (stage.name as string) ?? "",
      pipeline_id: stage.pipeline_id as number,
      order_nr: (stage.order_nr as number) ?? 0,
      deal_count: deals.length,
      total_value: totalValue,
    });
  }

  const totalDeals = stageResults.reduce((s, r) => s + r.deal_count, 0);
  const totalValue = stageResults.reduce((s, r) => s + r.total_value, 0);

  return successResult({
    user: resolved.userName,
    pipelines: pipelines.map((p) => ({ id: p.id, name: p.name })),
    stages: stageResults.sort((a, b) => a.pipeline_id - b.pipeline_id || a.order_nr - b.order_nr),
    totals: { deals: totalDeals, value: totalValue },
    message: `${resolved.userName}'s pipeline: ${totalDeals} open deals worth ${totalValue}`,
  });
}

// --- pipedrive_stale_deals ---
async function handleStaleDeals(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = StaleDealsSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_stale_deals", parsed.error.message);

  const input = parsed.data;
  const { apiV2, rateLimiters, config } = getContext();
  const limit = Math.min(input.limit ?? config.defaultLimit, config.maxLimit);
  const paginationParams = buildPaginationParams("cursor", limit, input.cursor);
  const cutoff = daysAgo(input.days ?? 30);

  const params: Record<string, string | number | boolean | undefined> = {
    status: "open",
    updated_until: cutoff,
    sort_by: "update_time",
    sort_direction: "asc",
    ...paginationParams,
  };

  if (input.as_user) {
    const resolved = await resolveOwnerId(input.as_user);
    if (resolved.error) return validationErrorResult("pipedrive_stale_deals", resolved.error);
    params.owner_id = resolved.ownerId;
  }
  if (input.pipeline_id) params.pipeline_id = input.pipeline_id;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>("/deals", params), { label: "pipedrive_stale_deals" }),
  );
  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_stale_deals", "GET /deals"));

  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "cursor", response.data as unknown as Record<string, unknown>);

  return paginatedResult({
    items: result.items.map(compactDeal),
    next_page_token: result.next_page_token,
    approx_count: result.approx_count,
    truncated: result.truncated,
    pagination_mode: result.pagination_mode,
    message: `Open deals not updated in ${input.days ?? 30}+ days`,
  });
}

// --- pipedrive_people_needing_followup ---
async function handlePeopleNeedingFollowup(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = PeopleNeedingFollowupSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_people_needing_followup", parsed.error.message);

  const resolved = await resolveOwnerId(parsed.data.as_user);
  if (resolved.error) return validationErrorResult("pipedrive_people_needing_followup", resolved.error);

  const { apiV2, rateLimiters } = getContext();

  // Fetch persons with next_activity_id included
  const params: Record<string, string | number | boolean | undefined> = {
    owner_id: resolved.ownerId,
    include_fields: "next_activity_id",
    sort_by: "update_time",
    sort_direction: "desc",
    limit: 100,
  };

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>("/persons", params), { label: "pipedrive_people_needing_followup" }),
  );
  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_people_needing_followup", "GET /persons"));

  // Filter to those with no next activity
  const noFollowup = (response.data.data ?? [])
    .filter((p) => !p.next_activity_id)
    .map(compactPerson);

  const requestedLimit = Math.min(parsed.data.limit ?? 25, 100);
  const page = noFollowup.slice(0, requestedLimit);

  return successResult({
    items: page,
    total_needing_followup: noFollowup.length,
    truncated: page.length < noFollowup.length,
    user: resolved.userName,
    message: noFollowup.length === 0
      ? `All of ${resolved.userName}'s contacts have follow-up activities scheduled.`
      : `${noFollowup.length} of ${resolved.userName}'s contacts have no next activity scheduled.`,
  });
}

const tools: ToolDefinition[] = [
  {
    name: "pipedrive_me",
    description: 'Show the current Pipedrive user (API token owner). Pass as_user to resolve a different team member by name or email.',
    inputSchema: zodToJsonSchema(MeSchema),
    handler: handleMe,
  },
  {
    name: "pipedrive_my_open_deals",
    description: "List open deals owned by the current user (or as_user). Sorted by most recently updated.",
    inputSchema: zodToJsonSchema(MyOpenDealsSchema),
    handler: handleMyOpenDeals,
  },
  {
    name: "pipedrive_my_overdue_activities",
    description: "Show activities that are past due and not yet done for the current user (or as_user).",
    inputSchema: zodToJsonSchema(MyOverdueActivitiesSchema),
    handler: handleMyOverdueActivities,
  },
  {
    name: "pipedrive_my_upcoming_activities",
    description: "Show upcoming activities for the next N days (default 7) for the current user (or as_user).",
    inputSchema: zodToJsonSchema(MyUpcomingActivitiesSchema),
    handler: handleMyUpcomingActivities,
  },
  {
    name: "pipedrive_recently_updated",
    description: "Show deals, persons, or organizations updated in the last N days (default 7). Optionally filter by user.",
    inputSchema: zodToJsonSchema(RecentlyUpdatedSchema),
    handler: handleRecentlyUpdated,
  },
  {
    name: "pipedrive_my_pipeline_summary",
    description: "Pipeline snapshot for the current user (or as_user) showing deal counts and values by stage.",
    inputSchema: zodToJsonSchema(MyPipelineSummarySchema),
    handler: handleMyPipelineSummary,
  },
  {
    name: "pipedrive_stale_deals",
    description: "Find open deals that haven't been updated in N days (default 30). Optionally filter by user or pipeline.",
    inputSchema: zodToJsonSchema(StaleDealsSchema),
    handler: handleStaleDeals,
  },
  {
    name: "pipedrive_people_needing_followup",
    description: "Find contacts owned by the current user (or as_user) that have no next activity scheduled.",
    inputSchema: zodToJsonSchema(PeopleNeedingFollowupSchema),
    handler: handlePeopleNeedingFollowup,
  },
];

registerTools(tools);
