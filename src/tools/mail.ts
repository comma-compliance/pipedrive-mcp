import { registerTools, type ToolDefinition } from "../mcp/register-tools.js";
import { successResult, paginatedResult, type ToolResult } from "../mcp/tool-result.js";
import { apiErrorResult, validationErrorResult, guardErrorResult } from "../mcp/errors.js";
import { getContext } from "../server.js";
import { withRetry } from "../pipedrive/retries.js";
import { normalizeApiError } from "../pipedrive/error-normalizer.js";
import { buildPaginationParams, buildPaginatedResult } from "../pipedrive/pagination.js";
import { compactMailThread, compactMailMessage } from "../presenters/entities.js";
import { validateConfirmation, buildDryRunResult } from "../services/guards.js";
import {
  MailThreadsListSchema,
  MailThreadsGetSchema,
  MailThreadMessagesListSchema,
  MailMessagesGetSchema,
  MailThreadsUpdateSchema,
  MailThreadsDeleteSchema,
  DealMailMessagesListSchema,
  PersonMailMessagesListSchema,
} from "../schemas/mail.js";
import { zodToJsonSchema } from "../schemas/zod-to-json.js";

async function handleMailThreadsList(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = MailThreadsListSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_mail_threads_list", parsed.error.message);

  const { apiV1, rateLimiters, config } = getContext();
  const input = parsed.data;
  const limit = Math.min(input.limit ?? config.defaultLimit, config.maxLimit);
  const paginationParams = buildPaginationParams("offset", limit, input.cursor);

  const params: Record<string, string | number | boolean | undefined> = {
    ...paginationParams,
    folder: input.folder ?? "inbox",
  };

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.list<Record<string, unknown>>("/mailbox/mailThreads", params), { label: "pipedrive_mail_threads_list" }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_mail_threads_list", "GET /mailbox/mailThreads"));

  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "offset", response.data as unknown as Record<string, unknown>);
  return paginatedResult({ items: result.items.map(compactMailThread), next_page_token: result.next_page_token, approx_count: result.approx_count, truncated: result.truncated, pagination_mode: result.pagination_mode });
}

async function handleMailThreadsGet(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = MailThreadsGetSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_mail_threads_get", parsed.error.message);

  const { apiV1, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.get<Record<string, unknown>>(`/mailbox/mailThreads/${parsed.data.thread_id}`), { label: `pipedrive_mail_threads_get ${parsed.data.thread_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_mail_threads_get", `GET /mailbox/mailThreads/${parsed.data.thread_id}`));
  return successResult(response.data.data);
}

async function handleMailThreadMessagesList(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = MailThreadMessagesListSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_mail_thread_messages_list", parsed.error.message);

  const { apiV1, rateLimiters } = getContext();
  const input = parsed.data;
  const params: Record<string, string | number | boolean | undefined> = {
    include_body: input.include_body ? 1 : 0,
  };

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.list<Record<string, unknown>>(`/mailbox/mailThreads/${input.thread_id}/mailMessages`, params), { label: `pipedrive_mail_thread_messages_list ${input.thread_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_mail_thread_messages_list", `GET /mailbox/mailThreads/${input.thread_id}/mailMessages`));

  const items = response.data.data ?? [];
  return successResult(items.map(compactMailMessage));
}

async function handleMailMessagesGet(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = MailMessagesGetSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_mail_messages_get", parsed.error.message);

  const { apiV1, rateLimiters } = getContext();
  const params: Record<string, string | number | boolean | undefined> = {
    include_body: parsed.data.include_body ? 1 : 0,
  };

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.get<Record<string, unknown>>(`/mailbox/mailMessages/${parsed.data.message_id}`, params), { label: `pipedrive_mail_messages_get ${parsed.data.message_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_mail_messages_get", `GET /mailbox/mailMessages/${parsed.data.message_id}`));
  return successResult(response.data.data);
}

async function handleMailThreadsUpdate(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = MailThreadsUpdateSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_mail_threads_update", parsed.error.message);

  const { apiV1, rateLimiters } = getContext();
  const input = parsed.data;
  const body: Record<string, unknown> = {};
  if (input.deal_id !== undefined) body.deal_id = input.deal_id;
  if (input.lead_id !== undefined) body.lead_id = input.lead_id;
  if (input.shared_flag !== undefined) body.shared_flag = input.shared_flag ? 1 : 0;
  if (input.read_flag !== undefined) body.read_flag = input.read_flag ? 1 : 0;
  if (input.archived_flag !== undefined) body.archived_flag = input.archived_flag ? 1 : 0;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.put<Record<string, unknown>>(`/mailbox/mailThreads/${input.thread_id}`, body), { label: `pipedrive_mail_threads_update ${input.thread_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_mail_threads_update", `PUT /mailbox/mailThreads/${input.thread_id}`));
  return successResult({ message: `Mail thread ${input.thread_id} updated`, thread: compactMailThread(response.data.data as Record<string, unknown>) });
}

async function handleMailThreadsDelete(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = MailThreadsDeleteSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_mail_threads_delete", parsed.error.message);

  const input = parsed.data;
  if (input.dry_run) return successResult(buildDryRunResult("pipedrive_mail_threads_delete", "delete", { thread_id: input.thread_id }, `Would delete mail thread ${input.thread_id}`));

  const confirmError = validateConfirmation(input.confirm, "DELETE", "pipedrive_mail_threads_delete", "delete mail thread");
  if (confirmError) return guardErrorResult(confirmError);

  const { apiV1, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.del(`/mailbox/mailThreads/${input.thread_id}`), { label: `pipedrive_mail_threads_delete ${input.thread_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_mail_threads_delete", `DELETE /mailbox/mailThreads/${input.thread_id}`));
  return successResult({ message: `Mail thread ${input.thread_id} deleted` });
}

async function handleDealMailMessagesList(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = DealMailMessagesListSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_deal_mail_messages_list", parsed.error.message);

  const { apiV1, rateLimiters, config } = getContext();
  const input = parsed.data;
  const limit = Math.min(input.limit ?? config.defaultLimit, config.maxLimit);
  const paginationParams = buildPaginationParams("offset", limit, input.cursor);

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.list<Record<string, unknown>>(`/deals/${input.deal_id}/mailMessages`, paginationParams), { label: `pipedrive_deal_mail_messages_list ${input.deal_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_deal_mail_messages_list", `GET /deals/${input.deal_id}/mailMessages`));

  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "offset", response.data as unknown as Record<string, unknown>);
  return paginatedResult({ items: result.items.map(compactMailMessage), next_page_token: result.next_page_token, approx_count: result.approx_count, truncated: result.truncated, pagination_mode: result.pagination_mode });
}

async function handlePersonMailMessagesList(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = PersonMailMessagesListSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_person_mail_messages_list", parsed.error.message);

  const { apiV1, rateLimiters, config } = getContext();
  const input = parsed.data;
  const limit = Math.min(input.limit ?? config.defaultLimit, config.maxLimit);
  const paginationParams = buildPaginationParams("offset", limit, input.cursor);

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.list<Record<string, unknown>>(`/persons/${input.person_id}/mailMessages`, paginationParams), { label: `pipedrive_person_mail_messages_list ${input.person_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_person_mail_messages_list", `GET /persons/${input.person_id}/mailMessages`));

  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "offset", response.data as unknown as Record<string, unknown>);
  return paginatedResult({ items: result.items.map(compactMailMessage), next_page_token: result.next_page_token, approx_count: result.approx_count, truncated: result.truncated, pagination_mode: result.pagination_mode });
}

const tools: ToolDefinition[] = [
  { name: "pipedrive_mail_threads_list", description: "List mail threads, optionally filtered by folder (inbox, drafts, sent, archive).", inputSchema: zodToJsonSchema(MailThreadsListSchema), handler: handleMailThreadsList },
  { name: "pipedrive_mail_threads_get", description: "Get a single mail thread by ID with full details.", inputSchema: zodToJsonSchema(MailThreadsGetSchema), handler: handleMailThreadsGet },
  { name: "pipedrive_mail_thread_messages_list", description: "List messages within a mail thread. Use include_body for full content.", inputSchema: zodToJsonSchema(MailThreadMessagesListSchema), handler: handleMailThreadMessagesList },
  { name: "pipedrive_mail_messages_get", description: "Get a single mail message by ID. Set include_body to true for full content.", inputSchema: zodToJsonSchema(MailMessagesGetSchema), handler: handleMailMessagesGet },
  { name: "pipedrive_mail_threads_update", description: "Update a mail thread: link to deal/lead, mark read/unread, archive/unarchive, share.", inputSchema: zodToJsonSchema(MailThreadsUpdateSchema), handler: handleMailThreadsUpdate },
  { name: "pipedrive_mail_threads_delete", description: 'Delete a mail thread. Requires confirm: "DELETE". Supports dry_run.', inputSchema: zodToJsonSchema(MailThreadsDeleteSchema), handler: handleMailThreadsDelete },
  { name: "pipedrive_deal_mail_messages_list", description: "List mail messages linked to a deal.", inputSchema: zodToJsonSchema(DealMailMessagesListSchema), handler: handleDealMailMessagesList },
  { name: "pipedrive_person_mail_messages_list", description: "List mail messages linked to a person.", inputSchema: zodToJsonSchema(PersonMailMessagesListSchema), handler: handlePersonMailMessagesList },
];

registerTools(tools);
