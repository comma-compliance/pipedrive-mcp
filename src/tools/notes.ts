import { registerTools, type ToolDefinition } from "../mcp/register-tools.js";
import { successResult, paginatedResult, type ToolResult } from "../mcp/tool-result.js";
import { apiErrorResult, validationErrorResult, guardErrorResult } from "../mcp/errors.js";
import { getContext } from "../server.js";
import { withRetry } from "../pipedrive/retries.js";
import { normalizeApiError } from "../pipedrive/error-normalizer.js";
import { buildPaginationParams, buildPaginatedResult } from "../pipedrive/pagination.js";
import { compactNote } from "../presenters/entities.js";
import { validateConfirmation, buildDryRunResult } from "../services/guards.js";
import {
  NotesListSchema,
  NotesGetSchema,
  NotesCreateSchema,
  NotesUpdateSchema,
  NotesDeleteSchema,
} from "../schemas/notes.js";
import { zodToJsonSchema } from "../schemas/zod-to-json.js";

async function handleNotesList(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = NotesListSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_notes_list", parsed.error.message);

  const { apiV1, rateLimiters, config } = getContext();
  const input = parsed.data;
  const limit = Math.min(input.limit ?? config.defaultLimit, config.maxLimit);
  const paginationParams = buildPaginationParams("offset", limit, input.cursor);

  const params: Record<string, string | number | boolean | undefined> = { ...paginationParams };
  if (input.deal_id) params.deal_id = input.deal_id;
  if (input.person_id) params.person_id = input.person_id;
  if (input.org_id) params.org_id = input.org_id;
  if (input.lead_id) params.lead_id = input.lead_id;
  if (input.user_id) params.user_id = input.user_id;
  if (input.sort) params.sort = input.sort;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.list<Record<string, unknown>>("/notes", params), { label: "pipedrive_notes_list" }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_notes_list", "GET /notes"));

  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "offset", response.data as unknown as Record<string, unknown>);
  return paginatedResult({ items: result.items.map(compactNote), next_page_token: result.next_page_token, approx_count: result.approx_count, truncated: result.truncated, pagination_mode: result.pagination_mode });
}

async function handleNotesGet(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = NotesGetSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_notes_get", parsed.error.message);

  const { apiV1, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.get<Record<string, unknown>>(`/notes/${parsed.data.note_id}`), { label: `pipedrive_notes_get ${parsed.data.note_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_notes_get", `GET /notes/${parsed.data.note_id}`));
  return successResult(response.data.data);
}

async function handleNotesCreate(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = NotesCreateSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_notes_create", parsed.error.message);

  const input = parsed.data;

  // Require at least one entity ID
  if (!input.deal_id && !input.person_id && !input.org_id && !input.lead_id) {
    return validationErrorResult("pipedrive_notes_create", "At least one of deal_id, person_id, org_id, or lead_id is required");
  }

  const { apiV1, rateLimiters } = getContext();
  const body: Record<string, unknown> = { content: input.content_html };
  if (input.deal_id) body.deal_id = input.deal_id;
  if (input.person_id) body.person_id = input.person_id;
  if (input.org_id) body.org_id = input.org_id;
  if (input.lead_id) body.lead_id = input.lead_id;
  if (input.pinned_to_deal_flag) body.pinned_to_deal_flag = 1;
  if (input.pinned_to_person_flag) body.pinned_to_person_flag = 1;
  if (input.pinned_to_organization_flag) body.pinned_to_organization_flag = 1;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.post<Record<string, unknown>>("/notes", body), { label: "pipedrive_notes_create" }),
  );

  if (response.status !== 200 && response.status !== 201) return apiErrorResult(normalizeApiError(response, "pipedrive_notes_create", "POST /notes"));
  return successResult({ message: "Note created", note: compactNote(response.data.data as Record<string, unknown>) });
}

async function handleNotesUpdate(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = NotesUpdateSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_notes_update", parsed.error.message);

  const { apiV1, rateLimiters } = getContext();
  const input = parsed.data;
  const body: Record<string, unknown> = { content: input.content_html };
  if (input.pinned_to_deal_flag !== undefined) body.pinned_to_deal_flag = input.pinned_to_deal_flag ? 1 : 0;
  if (input.pinned_to_person_flag !== undefined) body.pinned_to_person_flag = input.pinned_to_person_flag ? 1 : 0;
  if (input.pinned_to_organization_flag !== undefined) body.pinned_to_organization_flag = input.pinned_to_organization_flag ? 1 : 0;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.put<Record<string, unknown>>(`/notes/${input.note_id}`, body), { label: `pipedrive_notes_update ${input.note_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_notes_update", `PUT /notes/${input.note_id}`));
  return successResult({ message: `Note ${input.note_id} updated`, note: compactNote(response.data.data as Record<string, unknown>) });
}

async function handleNotesDelete(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = NotesDeleteSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_notes_delete", parsed.error.message);

  const input = parsed.data;
  if (input.dry_run) return successResult(buildDryRunResult("pipedrive_notes_delete", "delete", { note_id: input.note_id }, `Would delete note ${input.note_id}`));

  const confirmError = validateConfirmation(input.confirm, "DELETE", "pipedrive_notes_delete", "delete note");
  if (confirmError) return guardErrorResult(confirmError);

  const { apiV1, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.del(`/notes/${input.note_id}`), { label: `pipedrive_notes_delete ${input.note_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_notes_delete", `DELETE /notes/${input.note_id}`));
  return successResult({ message: `Note ${input.note_id} deleted` });
}

const tools: ToolDefinition[] = [
  { name: "pipedrive_notes_list", description: "List notes, optionally scoped to a deal, person, org, or lead.", inputSchema: zodToJsonSchema(NotesListSchema), handler: handleNotesList },
  { name: "pipedrive_notes_get", description: "Get a single note by ID.", inputSchema: zodToJsonSchema(NotesGetSchema), handler: handleNotesGet },
  { name: "pipedrive_notes_create", description: "Create a note attached to a deal, person, org, or lead. Content is HTML.", inputSchema: zodToJsonSchema(NotesCreateSchema), handler: handleNotesCreate },
  { name: "pipedrive_notes_update", description: "Update a note's content and pin flags.", inputSchema: zodToJsonSchema(NotesUpdateSchema), handler: handleNotesUpdate },
  { name: "pipedrive_notes_delete", description: 'Delete a note. Requires confirm: "DELETE". Supports dry_run.', inputSchema: zodToJsonSchema(NotesDeleteSchema), handler: handleNotesDelete },
];

registerTools(tools);
