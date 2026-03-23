import { registerTools, type ToolDefinition } from "../mcp/register-tools.js";
import { successResult, paginatedResult, type ToolResult } from "../mcp/tool-result.js";
import { apiErrorResult, validationErrorResult, guardErrorResult } from "../mcp/errors.js";
import { getContext } from "../server.js";
import { withRetry } from "../pipedrive/retries.js";
import { normalizeApiError } from "../pipedrive/error-normalizer.js";
import { buildPaginationParams, buildPaginatedResult } from "../pipedrive/pagination.js";
import { resolveCustomFieldsByName, resolveCustomFieldsInResponse } from "../services/custom-fields.js";
import { compactPerson } from "../presenters/entities.js";
import { validateConfirmation, buildDryRunResult } from "../services/guards.js";
import {
  PersonsListSchema,
  PersonsGetSchema,
  PersonsSearchSchema,
  PersonsCreateSchema,
  PersonsUpdateSchema,
  PersonsDeleteSchema,
  PersonsMergeSchema,
} from "../schemas/persons.js";
import { zodToJsonSchema } from "../schemas/zod-to-json.js";

async function handlePersonsList(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = PersonsListSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_persons_list", parsed.error.message);

  const { apiV2, rateLimiters, config } = getContext();
  const input = parsed.data;
  const limit = Math.min(input.limit ?? config.defaultLimit, config.maxLimit);
  const paginationParams = buildPaginationParams("cursor", limit, input.cursor);

  const params: Record<string, string | number | boolean | undefined> = { ...paginationParams };
  if (input.ids) params.ids = input.ids.join(",");
  if (input.owner_id) params.owner_id = input.owner_id;
  if (input.org_id) params.org_id = input.org_id;
  if (input.filter_id) params.filter_id = input.filter_id;
  if (input.updated_since) params.updated_since = input.updated_since;
  if (input.updated_until) params.updated_until = input.updated_until;
  if (input.sort_by) params.sort_by = input.sort_by;
  if (input.sort_direction) params.sort_direction = input.sort_direction;
  if (input.include_fields) params.include_fields = input.include_fields.join(",");
  if (input.custom_field_keys) params.custom_fields = input.custom_field_keys.join(",");

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>("/persons", params), { label: "pipedrive_persons_list" }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_persons_list", "GET /persons"));

  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "cursor", response.data as unknown as Record<string, unknown>);
  return paginatedResult({ items: result.items.map(compactPerson), next_page_token: result.next_page_token, approx_count: result.approx_count, truncated: result.truncated, pagination_mode: result.pagination_mode });
}

async function handlePersonsGet(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = PersonsGetSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_persons_get", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const input = parsed.data;
  const params: Record<string, string | number | boolean | undefined> = {};
  if (input.include_fields) params.include_fields = input.include_fields.join(",");
  if (input.custom_field_keys) params.custom_fields = input.custom_field_keys.join(",");

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.get<Record<string, unknown>>(`/persons/${input.person_id}`, params), { label: `pipedrive_persons_get ${input.person_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_persons_get", `GET /persons/${input.person_id}`));

  const person = response.data.data;
  const customFields = await resolveCustomFieldsInResponse("person", person);
  return successResult({ ...compactPerson(person), custom_fields_resolved: customFields.length > 0 ? customFields : undefined, _raw: person });
}

async function handlePersonsSearch(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = PersonsSearchSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_persons_search", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const input = parsed.data;
  const limit = Math.min(input.limit ?? 10, 50);
  const paginationParams = buildPaginationParams("cursor", limit, input.cursor);

  const params: Record<string, string | number | boolean | undefined> = { term: input.term, ...paginationParams };
  if (input.fields) params.fields = input.fields;
  if (input.exact_match !== undefined) params.exact_match = input.exact_match;
  if (input.organization_id) params.organization_id = input.organization_id;
  if (input.include_fields) params.include_fields = input.include_fields.join(",");

  const response = await rateLimiters.search.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>("/persons/search", params), { label: "pipedrive_persons_search" }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_persons_search", "GET /persons/search"));

  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "cursor", response.data as unknown as Record<string, unknown>);
  return paginatedResult({ items: result.items, next_page_token: result.next_page_token, approx_count: result.approx_count, truncated: result.truncated, pagination_mode: result.pagination_mode });
}

async function handlePersonsCreate(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = PersonsCreateSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_persons_create", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const input = parsed.data;
  const body: Record<string, unknown> = { name: input.name };
  if (input.emails) body.emails = input.emails.map((e) => ({ value: e, primary: false, label: "work" }));
  if (input.phones) body.phones = input.phones.map((p) => ({ value: p, primary: false, label: "work" }));
  if (input.org_id) body.org_id = input.org_id;
  if (input.owner_id) body.owner_id = input.owner_id;
  if (input.visible_to) body.visible_to = input.visible_to;

  const customFieldsObj: Record<string, unknown> = {};
  if (input.custom_fields) Object.assign(customFieldsObj, input.custom_fields);
  if (input.custom_fields_by_name) {
    const { resolved, errors } = await resolveCustomFieldsByName("person", input.custom_fields_by_name);
    if (errors.length > 0) return validationErrorResult("pipedrive_persons_create", errors.join("; "));
    Object.assign(customFieldsObj, resolved);
  }
  if (Object.keys(customFieldsObj).length > 0) body.custom_fields = customFieldsObj;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.post<Record<string, unknown>>("/persons", body), { label: "pipedrive_persons_create" }),
  );

  if (response.status !== 200 && response.status !== 201) return apiErrorResult(normalizeApiError(response, "pipedrive_persons_create", "POST /persons"));
  return successResult({ message: "Person created", person: compactPerson(response.data.data) });
}

async function handlePersonsUpdate(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = PersonsUpdateSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_persons_update", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const input = parsed.data;
  const body: Record<string, unknown> = {};
  if (input.name) body.name = input.name;
  if (input.emails) body.emails = input.emails.map((e) => ({ value: e, primary: false, label: "work" }));
  if (input.phones) body.phones = input.phones.map((p) => ({ value: p, primary: false, label: "work" }));
  if (input.org_id) body.org_id = input.org_id;
  if (input.owner_id) body.owner_id = input.owner_id;
  if (input.visible_to) body.visible_to = input.visible_to;

  const customFieldsObj: Record<string, unknown> = {};
  if (input.custom_fields) Object.assign(customFieldsObj, input.custom_fields);
  if (input.custom_fields_by_name) {
    const { resolved, errors } = await resolveCustomFieldsByName("person", input.custom_fields_by_name);
    if (errors.length > 0) return validationErrorResult("pipedrive_persons_update", errors.join("; "));
    Object.assign(customFieldsObj, resolved);
  }
  if (Object.keys(customFieldsObj).length > 0) body.custom_fields = customFieldsObj;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.patch<Record<string, unknown>>(`/persons/${input.person_id}`, body), { label: `pipedrive_persons_update ${input.person_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_persons_update", `PATCH /persons/${input.person_id}`));
  return successResult({ message: `Person ${input.person_id} updated`, person: compactPerson(response.data.data) });
}

async function handlePersonsDelete(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = PersonsDeleteSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_persons_delete", parsed.error.message);

  const input = parsed.data;
  if (input.dry_run) return successResult(buildDryRunResult("pipedrive_persons_delete", "delete", { person_id: input.person_id }, `Would delete person ${input.person_id}`));

  const confirmError = validateConfirmation(input.confirm, "DELETE", "pipedrive_persons_delete", "delete person");
  if (confirmError) return guardErrorResult(confirmError);

  const { apiV2, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.del(`/persons/${input.person_id}`), { label: `pipedrive_persons_delete ${input.person_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_persons_delete", `DELETE /persons/${input.person_id}`));
  return successResult({ message: `Person ${input.person_id} deleted` });
}

async function handlePersonsMerge(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = PersonsMergeSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_persons_merge", parsed.error.message);

  const input = parsed.data;
  if (input.dry_run) return successResult(buildDryRunResult("pipedrive_persons_merge", "merge", { source: input.source_person_id, target: input.target_person_id }, `Would merge person ${input.source_person_id} into ${input.target_person_id}`));

  const confirmError = validateConfirmation(input.confirm, "MERGE", "pipedrive_persons_merge", "merge persons");
  if (confirmError) return guardErrorResult(confirmError);

  const { apiV1, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.put(`/persons/${input.target_person_id}/merge`, { merge_with_id: input.source_person_id }), { label: `pipedrive_persons_merge ${input.source_person_id}->${input.target_person_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_persons_merge", `PUT /persons/${input.target_person_id}/merge`));
  return successResult({ message: `Person ${input.source_person_id} merged into ${input.target_person_id}`, person: response.data.data });
}

const tools: ToolDefinition[] = [
  { name: "pipedrive_persons_list", description: "List persons with filters and pagination.", inputSchema: zodToJsonSchema(PersonsListSchema), handler: handlePersonsList },
  { name: "pipedrive_persons_get", description: "Get a single person by ID with full details including resolved custom fields.", inputSchema: zodToJsonSchema(PersonsGetSchema), handler: handlePersonsGet },
  { name: "pipedrive_persons_search", description: "Search persons by name, email, phone, or custom fields.", inputSchema: zodToJsonSchema(PersonsSearchSchema), handler: handlePersonsSearch },
  { name: "pipedrive_persons_create", description: "Create a new person. Supports custom fields by name or key.", inputSchema: zodToJsonSchema(PersonsCreateSchema), handler: handlePersonsCreate },
  { name: "pipedrive_persons_update", description: "Update an existing person. Supports custom fields by name or key.", inputSchema: zodToJsonSchema(PersonsUpdateSchema), handler: handlePersonsUpdate },
  { name: "pipedrive_persons_delete", description: 'Delete a person. Requires confirm: "DELETE". Supports dry_run.', inputSchema: zodToJsonSchema(PersonsDeleteSchema), handler: handlePersonsDelete },
  { name: "pipedrive_persons_merge", description: 'Merge two persons. Source is merged into target. Requires confirm: "MERGE". Supports dry_run.', inputSchema: zodToJsonSchema(PersonsMergeSchema), handler: handlePersonsMerge },
];

registerTools(tools);
