import { registerTools, type ToolDefinition } from "../mcp/register-tools.js";
import { successResult, type ToolResult } from "../mcp/tool-result.js";
import { apiErrorResult, validationErrorResult } from "../mcp/errors.js";
import { getContext } from "../server.js";
import { withRetry } from "../pipedrive/retries.js";
import { normalizeApiError } from "../pipedrive/error-normalizer.js";
import { UsersListSchema, UsersGetSchema, UsersPermissionsSchema } from "../schemas/users.js";
import { zodToJsonSchema } from "../schemas/zod-to-json.js";

async function handleUsersList(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = UsersListSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_users_list", parsed.error.message);

  const { apiV1, rateLimiters } = getContext();
  const params: Record<string, string | number | boolean | undefined> = {};
  if (parsed.data.active_flag !== undefined) params.active_flag = parsed.data.active_flag ? 1 : 0;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.list<Record<string, unknown>>("/users", params), { label: "pipedrive_users_list" }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_users_list", "GET /users"));

  const users = (response.data.data ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    active_flag: u.active_flag,
    role_id: u.role_id,
    created: u.created,
    modified: u.modified,
  }));
  return successResult({ users });
}

async function handleUsersGet(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = UsersGetSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_users_get", parsed.error.message);

  const { apiV1, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.get<Record<string, unknown>>(`/users/${parsed.data.user_id}`), { label: `pipedrive_users_get ${parsed.data.user_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_users_get", `GET /users/${parsed.data.user_id}`));
  return successResult(response.data.data);
}

async function handleUsersPermissions(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = UsersPermissionsSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_users_permissions", parsed.error.message);

  const { apiV1, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.get<Record<string, unknown>>(`/users/${parsed.data.user_id}/permissions`), { label: `pipedrive_users_permissions ${parsed.data.user_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_users_permissions", `GET /users/${parsed.data.user_id}/permissions`));
  return successResult(response.data.data);
}

const tools: ToolDefinition[] = [
  { name: "pipedrive_users_list", description: "List all Pipedrive users in the account.", inputSchema: zodToJsonSchema(UsersListSchema), handler: handleUsersList },
  { name: "pipedrive_users_get", description: "Get a single user by ID.", inputSchema: zodToJsonSchema(UsersGetSchema), handler: handleUsersGet },
  { name: "pipedrive_users_permissions", description: "Get permissions for a specific user.", inputSchema: zodToJsonSchema(UsersPermissionsSchema), handler: handleUsersPermissions },
];

registerTools(tools);
