import { registerTools, type ToolDefinition } from "../mcp/register-tools.js";
import { successResult, type ToolResult } from "../mcp/tool-result.js";
import { apiErrorResult, validationErrorResult, guardErrorResult } from "../mcp/errors.js";
import { getContext } from "../server.js";
import { withRetry } from "../pipedrive/retries.js";
import { normalizeApiError } from "../pipedrive/error-normalizer.js";
import { validateConfirmation, buildDryRunResult } from "../services/guards.js";
import { WebhooksListSchema, WebhooksCreateSchema, WebhooksDeleteSchema } from "../schemas/webhooks.js";
import { zodToJsonSchema } from "../schemas/zod-to-json.js";

async function handleWebhooksList(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = WebhooksListSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_webhooks_list", parsed.error.message);

  const { apiV1, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.list<Record<string, unknown>>("/webhooks"), { label: "pipedrive_webhooks_list" }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_webhooks_list", "GET /webhooks"));

  const webhooks = (response.data.data ?? []).map((w) => ({
    id: w.id,
    subscription_url: w.subscription_url,
    event_action: w.event_action,
    event_object: w.event_object,
    is_active: w.is_active,
    add_time: w.add_time,
    user_id: w.user_id,
  }));
  return successResult({ webhooks });
}

async function handleWebhooksCreate(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = WebhooksCreateSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_webhooks_create", parsed.error.message);

  const input = parsed.data;
  if (input.dry_run) {
    return successResult(buildDryRunResult("pipedrive_webhooks_create", "create webhook", {
      subscription_url: input.subscription_url, event_action: input.event_action, event_object: input.event_object,
    }, `Would create webhook for ${input.event_action} ${input.event_object} -> ${input.subscription_url}`));
  }

  const confirmError = validateConfirmation(input.confirm, "YES", "pipedrive_webhooks_create", "create webhook");
  if (confirmError) return guardErrorResult(confirmError);

  const { apiV1, rateLimiters } = getContext();
  const body: Record<string, unknown> = {
    subscription_url: input.subscription_url,
    event_action: input.event_action,
    event_object: input.event_object,
  };
  if (input.user_id) body.user_id = input.user_id;
  if (input.http_auth_user) body.http_auth_user = input.http_auth_user;
  if (input.http_auth_password) body.http_auth_password = input.http_auth_password;
  if (input.version) body.version = input.version;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.post<Record<string, unknown>>("/webhooks", body), { label: "pipedrive_webhooks_create" }),
  );

  if (response.status !== 200 && response.status !== 201) return apiErrorResult(normalizeApiError(response, "pipedrive_webhooks_create", "POST /webhooks"));
  return successResult({ message: "Webhook created", webhook: response.data.data });
}

async function handleWebhooksDelete(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = WebhooksDeleteSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_webhooks_delete", parsed.error.message);

  const input = parsed.data;
  if (input.dry_run) return successResult(buildDryRunResult("pipedrive_webhooks_delete", "delete", { webhook_id: input.webhook_id }, `Would delete webhook ${input.webhook_id}`));

  const confirmError = validateConfirmation(input.confirm, "YES", "pipedrive_webhooks_delete", "delete webhook");
  if (confirmError) return guardErrorResult(confirmError);

  const { apiV1, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.del(`/webhooks/${input.webhook_id}`), { label: `pipedrive_webhooks_delete ${input.webhook_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_webhooks_delete", `DELETE /webhooks/${input.webhook_id}`));
  return successResult({ message: `Webhook ${input.webhook_id} deleted` });
}

const tools: ToolDefinition[] = [
  { name: "pipedrive_webhooks_list", description: "List all webhooks.", inputSchema: zodToJsonSchema(WebhooksListSchema), handler: handleWebhooksList },
  { name: "pipedrive_webhooks_create", description: 'Create a webhook subscription. Requires confirm: "YES". Supports dry_run.', inputSchema: zodToJsonSchema(WebhooksCreateSchema), handler: handleWebhooksCreate },
  { name: "pipedrive_webhooks_delete", description: 'Delete a webhook. Requires confirm: "YES". Supports dry_run.', inputSchema: zodToJsonSchema(WebhooksDeleteSchema), handler: handleWebhooksDelete },
];

registerTools(tools);
