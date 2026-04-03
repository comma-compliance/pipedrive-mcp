import { registerTools, type ToolDefinition } from "../mcp/register-tools.js";
import { successResult, paginatedResult, type ToolResult } from "../mcp/tool-result.js";
import { apiErrorResult, validationErrorResult, guardErrorResult } from "../mcp/errors.js";
import { getContext } from "../server.js";
import { withRetry } from "../pipedrive/retries.js";
import { normalizeApiError } from "../pipedrive/error-normalizer.js";
import { buildPaginationParams, buildPaginatedResult } from "../pipedrive/pagination.js";
import { compactNoteComment } from "../presenters/entities.js";
import { validateConfirmation, buildDryRunResult } from "../services/guards.js";
import {
  NoteCommentsListSchema,
  NoteCommentsGetSchema,
  NoteCommentsCreateSchema,
  NoteCommentsUpdateSchema,
  NoteCommentsDeleteSchema,
} from "../schemas/note-comments.js";
import { zodToJsonSchema } from "../schemas/zod-to-json.js";

async function handleNoteCommentsList(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = NoteCommentsListSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_note_comments_list", parsed.error.message);

  const { apiV1, rateLimiters, config } = getContext();
  const input = parsed.data;
  const limit = Math.min(input.limit ?? config.defaultLimit, config.maxLimit);
  const paginationParams = buildPaginationParams("offset", limit, input.cursor);

  const params: Record<string, string | number | boolean | undefined> = { ...paginationParams };

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.list<Record<string, unknown>>(`/notes/${input.note_id}/comments`, params), { label: `pipedrive_note_comments_list ${input.note_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_note_comments_list", `GET /notes/${input.note_id}/comments`));

  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "offset", response.data as unknown as Record<string, unknown>);
  return paginatedResult({ items: result.items.map(compactNoteComment), next_page_token: result.next_page_token, approx_count: result.approx_count, truncated: result.truncated, pagination_mode: result.pagination_mode });
}

async function handleNoteCommentsGet(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = NoteCommentsGetSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_note_comments_get", parsed.error.message);

  const { apiV1, rateLimiters } = getContext();
  const { note_id, comment_id } = parsed.data;
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.get<Record<string, unknown>>(`/notes/${note_id}/comments/${comment_id}`), { label: `pipedrive_note_comments_get ${comment_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_note_comments_get", `GET /notes/${note_id}/comments/${comment_id}`));
  return successResult(compactNoteComment(response.data.data as Record<string, unknown>));
}

async function handleNoteCommentsCreate(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = NoteCommentsCreateSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_note_comments_create", parsed.error.message);

  const { apiV1, rateLimiters } = getContext();
  const input = parsed.data;
  const body = { content: input.content_html };

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.post<Record<string, unknown>>(`/notes/${input.note_id}/comments`, body), { label: `pipedrive_note_comments_create ${input.note_id}` }),
  );

  if (response.status !== 200 && response.status !== 201) return apiErrorResult(normalizeApiError(response, "pipedrive_note_comments_create", `POST /notes/${input.note_id}/comments`));
  return successResult({ message: "Comment created", comment: compactNoteComment(response.data.data as Record<string, unknown>) });
}

async function handleNoteCommentsUpdate(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = NoteCommentsUpdateSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_note_comments_update", parsed.error.message);

  const { apiV1, rateLimiters } = getContext();
  const { note_id, comment_id, content_html } = parsed.data;
  const body = { content: content_html };

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.put<Record<string, unknown>>(`/notes/${note_id}/comments/${comment_id}`, body), { label: `pipedrive_note_comments_update ${comment_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_note_comments_update", `PUT /notes/${note_id}/comments/${comment_id}`));
  return successResult({ message: `Comment ${comment_id} updated`, comment: compactNoteComment(response.data.data as Record<string, unknown>) });
}

async function handleNoteCommentsDelete(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = NoteCommentsDeleteSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_note_comments_delete", parsed.error.message);

  const { note_id, comment_id, confirm, dry_run } = parsed.data;
  if (dry_run) return successResult(buildDryRunResult("pipedrive_note_comments_delete", "delete", { note_id, comment_id }, `Would delete comment ${comment_id} on note ${note_id}`));

  const confirmError = validateConfirmation(confirm, "DELETE", "pipedrive_note_comments_delete", "delete comment");
  if (confirmError) return guardErrorResult(confirmError);

  const { apiV1, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.del(`/notes/${note_id}/comments/${comment_id}`), { label: `pipedrive_note_comments_delete ${comment_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_note_comments_delete", `DELETE /notes/${note_id}/comments/${comment_id}`));
  return successResult({ message: `Comment ${comment_id} deleted from note ${note_id}` });
}

const tools: ToolDefinition[] = [
  { name: "pipedrive_note_comments_list", description: "List comments on a note.", inputSchema: zodToJsonSchema(NoteCommentsListSchema), handler: handleNoteCommentsList },
  { name: "pipedrive_note_comments_get", description: "Get a single comment by UUID on a note.", inputSchema: zodToJsonSchema(NoteCommentsGetSchema), handler: handleNoteCommentsGet },
  { name: "pipedrive_note_comments_create", description: "Add a comment to a note. Content is HTML.", inputSchema: zodToJsonSchema(NoteCommentsCreateSchema), handler: handleNoteCommentsCreate },
  { name: "pipedrive_note_comments_update", description: "Update a comment on a note.", inputSchema: zodToJsonSchema(NoteCommentsUpdateSchema), handler: handleNoteCommentsUpdate },
  { name: "pipedrive_note_comments_delete", description: 'Delete a comment from a note. Requires confirm: "DELETE". Supports dry_run.', inputSchema: zodToJsonSchema(NoteCommentsDeleteSchema), handler: handleNoteCommentsDelete },
];

registerTools(tools);
