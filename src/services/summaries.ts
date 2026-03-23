import { getContext } from "../server.js";
import { withRetry } from "../pipedrive/retries.js";

export interface DealSummary {
  deal: Record<string, unknown>;
  activities?: Record<string, unknown>[];
  notes?: Record<string, unknown>[];
  products?: Record<string, unknown>[];
  person?: Record<string, unknown> | null;
  organization?: Record<string, unknown> | null;
}

export interface DealSummaryOptions {
  dealId: number;
  includeRecentActivities?: boolean;
  includeNotes?: boolean;
  includeProducts?: boolean;
}

export async function buildDealSummary(opts: DealSummaryOptions): Promise<DealSummary> {
  const { apiV2, apiV1, rateLimiters } = getContext();

  // Fetch the deal
  const dealResponse = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.get<Record<string, unknown>>(`/deals/${opts.dealId}`), {
      label: `GET deal ${opts.dealId}`,
    }),
  );

  const deal = dealResponse.data.data;
  const summary: DealSummary = { deal };

  // Parallel fetches for related data
  const promises: Promise<void>[] = [];

  if (opts.includeRecentActivities) {
    promises.push(
      rateLimiters.general
        .schedule(() =>
          withRetry(
            () =>
              apiV2.list<Record<string, unknown>>("/activities", {
                deal_id: opts.dealId,
                limit: 10,
                sort_by: "due_date",
                sort_direction: "desc",
              }),
            { label: `GET activities for deal ${opts.dealId}` },
          ),
        )
        .then((r) => {
          summary.activities = r.data.data ?? [];
        }),
    );
  }

  if (opts.includeNotes) {
    promises.push(
      rateLimiters.general
        .schedule(() =>
          withRetry(
            () =>
              apiV1.list<Record<string, unknown>>("/notes", {
                deal_id: opts.dealId,
                limit: 10,
                sort: "update_time DESC",
              }),
            { label: `GET notes for deal ${opts.dealId}` },
          ),
        )
        .then((r) => {
          summary.notes = r.data.data ?? [];
        }),
    );
  }

  if (opts.includeProducts) {
    promises.push(
      rateLimiters.general
        .schedule(() =>
          withRetry(
            () =>
              apiV2.list<Record<string, unknown>>(`/deals/${opts.dealId}/products`, {
                limit: 50,
              }),
            { label: `GET products for deal ${opts.dealId}` },
          ),
        )
        .then((r) => {
          summary.products = r.data.data ?? [];
        }),
    );
  }

  // Fetch linked person/org
  const personId = deal.person_id as number | undefined;
  const orgId = deal.org_id as number | undefined;

  if (personId) {
    promises.push(
      rateLimiters.general
        .schedule(() =>
          withRetry(() => apiV2.get<Record<string, unknown>>(`/persons/${personId}`), {
            label: `GET person ${personId}`,
          }),
        )
        .then((r) => {
          summary.person = r.data.data;
        }),
    );
  }

  if (orgId) {
    promises.push(
      rateLimiters.general
        .schedule(() =>
          withRetry(() => apiV2.get<Record<string, unknown>>(`/organizations/${orgId}`), {
            label: `GET org ${orgId}`,
          }),
        )
        .then((r) => {
          summary.organization = r.data.data;
        }),
    );
  }

  await Promise.all(promises);
  return summary;
}

export interface PipelineSummaryOptions {
  pipelineId?: number;
  ownerId?: number;
  status?: string;
}

export async function buildPipelineSummary(opts: PipelineSummaryOptions): Promise<{
  pipelines: Record<string, unknown>[];
  stages: Record<string, unknown>[];
  deal_counts: Record<string, number>;
}> {
  const { apiV2, rateLimiters } = getContext();

  // Fetch pipelines
  const pipelinesResponse = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>("/pipelines", { limit: 100 }), {
      label: "GET pipelines",
    }),
  );

  let pipelines = pipelinesResponse.data.data ?? [];
  if (opts.pipelineId) {
    pipelines = pipelines.filter((p) => (p.id as number) === opts.pipelineId);
  }

  // Fetch stages
  const stagesResponse = await rateLimiters.general.schedule(() =>
    withRetry(
      () =>
        apiV2.list<Record<string, unknown>>("/stages", {
          limit: 100,
          ...(opts.pipelineId ? { pipeline_id: opts.pipelineId } : {}),
        }),
      { label: "GET stages" },
    ),
  );

  const stages = stagesResponse.data.data ?? [];

  // Count deals per stage
  const dealCounts: Record<string, number> = {};
  for (const stage of stages) {
    const stageId = stage.id as number;
    const params: Record<string, string | number | boolean | undefined> = {
      stage_id: stageId,
      limit: 1, // Just need the count
      status: opts.status ?? "open",
    };
    if (opts.ownerId) params.owner_id = opts.ownerId;

    const dealsResponse = await rateLimiters.general.schedule(() =>
      withRetry(() => apiV2.list<Record<string, unknown>>("/deals", params), {
        label: `GET deals count for stage ${stageId}`,
      }),
    );

    const count =
      (dealsResponse.data.additional_data?.estimated_count as number) ??
      (dealsResponse.data.data?.length ?? 0);
    dealCounts[String(stageId)] = count;
  }

  return { pipelines, stages, deal_counts: dealCounts };
}
