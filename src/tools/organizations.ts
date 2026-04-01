import { registerTools, type ToolDefinition } from "../mcp/register-tools.js";
import { successResult, paginatedResult, type ToolResult } from "../mcp/tool-result.js";
import { apiErrorResult, validationErrorResult, guardErrorResult } from "../mcp/errors.js";
import { getContext } from "../server.js";
import { withRetry } from "../pipedrive/retries.js";
import { normalizeApiError } from "../pipedrive/error-normalizer.js";
import { buildPaginationParams, buildPaginatedResult } from "../pipedrive/pagination.js";
import { resolveCustomFieldsByKey, resolveCustomFieldsByName, resolveCustomFieldsInResponse } from "../services/custom-fields.js";
import { compactOrganization } from "../presenters/entities.js";
import { validateConfirmation, buildDryRunResult } from "../services/guards.js";
import {
  OrganizationsListSchema,
  OrganizationsGetSchema,
  OrganizationsSearchSchema,
  OrganizationsCreateSchema,
  OrganizationsUpdateSchema,
  OrganizationsDeleteSchema,
  OrganizationsMergeSchema,
} from "../schemas/organizations.js";
import { zodToJsonSchema } from "../schemas/zod-to-json.js";

async function handleOrgsList(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = OrganizationsListSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_organizations_list", parsed.error.message);

  const { apiV2, rateLimiters, config } = getContext();
  const input = parsed.data;
  const limit = Math.min(input.limit ?? config.defaultLimit, config.maxLimit);
  const paginationParams = buildPaginationParams("cursor", limit, input.cursor);

  const params: Record<string, string | number | boolean | undefined> = { ...paginationParams };
  if (input.ids) params.ids = input.ids.join(",");
  if (input.owner_id) params.owner_id = input.owner_id;
  if (input.filter_id) params.filter_id = input.filter_id;
  if (input.updated_since) params.updated_since = input.updated_since;
  if (input.updated_until) params.updated_until = input.updated_until;
  if (input.sort_by) params.sort_by = input.sort_by;
  if (input.sort_direction) params.sort_direction = input.sort_direction;
  if (input.include_fields) params.include_fields = input.include_fields.join(",");
  if (input.custom_field_keys) params.custom_fields = input.custom_field_keys.join(",");

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>("/organizations", params), { label: "pipedrive_organizations_list" }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_organizations_list", "GET /organizations"));

  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "cursor", response.data as unknown as Record<string, unknown>);
  return paginatedResult({ items: result.items.map(compactOrganization), next_page_token: result.next_page_token, approx_count: result.approx_count, truncated: result.truncated, pagination_mode: result.pagination_mode });
}

async function handleOrgsGet(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = OrganizationsGetSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_organizations_get", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const input = parsed.data;
  const params: Record<string, string | number | boolean | undefined> = {};
  if (input.include_fields) params.include_fields = input.include_fields.join(",");
  if (input.custom_field_keys) params.custom_fields = input.custom_field_keys.join(",");

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.get<Record<string, unknown>>(`/organizations/${input.org_id}`, params), { label: `pipedrive_organizations_get ${input.org_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_organizations_get", `GET /organizations/${input.org_id}`));

  const org = response.data.data;
  const customFields = await resolveCustomFieldsInResponse("organization", org);
  return successResult({ ...compactOrganization(org), custom_fields_resolved: customFields.length > 0 ? customFields : undefined, _raw: org });
}

async function handleOrgsSearch(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = OrganizationsSearchSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_organizations_search", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const input = parsed.data;
  const limit = Math.min(input.limit ?? 10, 50);
  const paginationParams = buildPaginationParams("cursor", limit, input.cursor);

  const params: Record<string, string | number | boolean | undefined> = { term: input.term, ...paginationParams };
  if (input.fields) params.fields = input.fields;
  if (input.exact_match !== undefined) params.exact_match = input.exact_match;
  if (input.include_fields) params.include_fields = input.include_fields.join(",");

  const response = await rateLimiters.search.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>("/organizations/search", params), { label: "pipedrive_organizations_search" }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_organizations_search", "GET /organizations/search"));

  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "cursor", response.data as unknown as Record<string, unknown>);
  return paginatedResult({ items: result.items, next_page_token: result.next_page_token, approx_count: result.approx_count, truncated: result.truncated, pagination_mode: result.pagination_mode });
}

async function handleOrgsCreate(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = OrganizationsCreateSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_organizations_create", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const input = parsed.data;
  const body: Record<string, unknown> = { name: input.name };
  if (input.owner_id) body.owner_id = input.owner_id;
  if (input.address) body.address = input.address;
  if (input.visible_to) body.visible_to = input.visible_to;

  const customFieldsObj: Record<string, unknown> = {};
  if (input.custom_fields) {
    const { resolved, errors } = await resolveCustomFieldsByKey("organization", input.custom_fields);
    if (errors.length > 0) return validationErrorResult("pipedrive_organizations_create", errors.join("; "));
    Object.assign(customFieldsObj, resolved);
  }
  if (input.custom_fields_by_name) {
    const { resolved, errors } = await resolveCustomFieldsByName("organization", input.custom_fields_by_name);
    if (errors.length > 0) return validationErrorResult("pipedrive_organizations_create", errors.join("; "));
    Object.assign(customFieldsObj, resolved);
  }
  if (Object.keys(customFieldsObj).length > 0) body.custom_fields = customFieldsObj;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.post<Record<string, unknown>>("/organizations", body), { label: "pipedrive_organizations_create" }),
  );

  if (response.status !== 200 && response.status !== 201) return apiErrorResult(normalizeApiError(response, "pipedrive_organizations_create", "POST /organizations"));
  return successResult({ message: "Organization created", organization: compactOrganization(response.data.data) });
}

async function handleOrgsUpdate(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = OrganizationsUpdateSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_organizations_update", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const input = parsed.data;
  const body: Record<string, unknown> = {};
  if (input.name) body.name = input.name;
  if (input.owner_id) body.owner_id = input.owner_id;
  if (input.address) body.address = input.address;
  if (input.visible_to) body.visible_to = input.visible_to;

  const customFieldsObj: Record<string, unknown> = {};
  if (input.custom_fields) {
    const { resolved, errors } = await resolveCustomFieldsByKey("organization", input.custom_fields);
    if (errors.length > 0) return validationErrorResult("pipedrive_organizations_update", errors.join("; "));
    Object.assign(customFieldsObj, resolved);
  }
  if (input.custom_fields_by_name) {
    const { resolved, errors } = await resolveCustomFieldsByName("organization", input.custom_fields_by_name);
    if (errors.length > 0) return validationErrorResult("pipedrive_organizations_update", errors.join("; "));
    Object.assign(customFieldsObj, resolved);
  }
  if (Object.keys(customFieldsObj).length > 0) body.custom_fields = customFieldsObj;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.patch<Record<string, unknown>>(`/organizations/${input.org_id}`, body), { label: `pipedrive_organizations_update ${input.org_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_organizations_update", `PATCH /organizations/${input.org_id}`));
  return successResult({ message: `Organization ${input.org_id} updated`, organization: compactOrganization(response.data.data) });
}

async function handleOrgsDelete(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = OrganizationsDeleteSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_organizations_delete", parsed.error.message);

  const input = parsed.data;
  if (input.dry_run) return successResult(buildDryRunResult("pipedrive_organizations_delete", "delete", { org_id: input.org_id }, `Would delete organization ${input.org_id}`));

  const confirmError = validateConfirmation(input.confirm, "DELETE", "pipedrive_organizations_delete", "delete organization");
  if (confirmError) return guardErrorResult(confirmError);

  const { apiV2, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.del(`/organizations/${input.org_id}`), { label: `pipedrive_organizations_delete ${input.org_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_organizations_delete", `DELETE /organizations/${input.org_id}`));
  return successResult({ message: `Organization ${input.org_id} deleted` });
}

async function handleOrgsMerge(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = OrganizationsMergeSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_organizations_merge", parsed.error.message);

  const input = parsed.data;
  if (input.dry_run) return successResult(buildDryRunResult("pipedrive_organizations_merge", "merge", { source: input.source_org_id, target: input.target_org_id }, `Would merge org ${input.source_org_id} into ${input.target_org_id}`));

  const confirmError = validateConfirmation(input.confirm, "MERGE", "pipedrive_organizations_merge", "merge organizations");
  if (confirmError) return guardErrorResult(confirmError);

  const { apiV1, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.put(`/organizations/${input.target_org_id}/merge`, { merge_with_id: input.source_org_id }), { label: `pipedrive_organizations_merge ${input.source_org_id}->${input.target_org_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_organizations_merge", `PUT /organizations/${input.target_org_id}/merge`));
  return successResult({ message: `Organization ${input.source_org_id} merged into ${input.target_org_id}`, organization: response.data.data });
}

const tools: ToolDefinition[] = [
  { name: "pipedrive_organizations_list", description: "List organizations with filters and pagination.", inputSchema: zodToJsonSchema(OrganizationsListSchema), handler: handleOrgsList },
  { name: "pipedrive_organizations_get", description: "Get a single organization by ID with full details including resolved custom fields.", inputSchema: zodToJsonSchema(OrganizationsGetSchema), handler: handleOrgsGet },
  { name: "pipedrive_organizations_search", description: "Search organizations by name, address, or custom fields.", inputSchema: zodToJsonSchema(OrganizationsSearchSchema), handler: handleOrgsSearch },
  { name: "pipedrive_organizations_create", description: "Create a new organization. Supports custom fields by name or key.", inputSchema: zodToJsonSchema(OrganizationsCreateSchema), handler: handleOrgsCreate },
  { name: "pipedrive_organizations_update", description: "Update an existing organization. Supports custom fields by name or key.", inputSchema: zodToJsonSchema(OrganizationsUpdateSchema), handler: handleOrgsUpdate },
  { name: "pipedrive_organizations_delete", description: 'Delete an organization. Requires confirm: "DELETE". Supports dry_run.', inputSchema: zodToJsonSchema(OrganizationsDeleteSchema), handler: handleOrgsDelete },
  { name: "pipedrive_organizations_merge", description: 'Merge two organizations. Source is merged into target. Requires confirm: "MERGE". Supports dry_run.', inputSchema: zodToJsonSchema(OrganizationsMergeSchema), handler: handleOrgsMerge },
];

registerTools(tools);
