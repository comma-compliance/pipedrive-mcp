import { registerTools, type ToolDefinition } from "../mcp/register-tools.js";
import { successResult, errorResult, paginatedResult, type ToolResult } from "../mcp/tool-result.js";
import { apiErrorResult, validationErrorResult } from "../mcp/errors.js";
import { getContext } from "../server.js";
import { withRetry } from "../pipedrive/retries.js";
import { normalizeApiError, categorizeStatus } from "../pipedrive/error-normalizer.js";
import { buildPaginationParams, buildPaginatedResult } from "../pipedrive/pagination.js";
import { FilesListSchema, FilesGetSchema, FilesUploadSchema } from "../schemas/files.js";
import { zodToJsonSchema } from "../schemas/zod-to-json.js";

async function handleFilesList(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = FilesListSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_files_list", parsed.error.message);

  const { apiV1, rateLimiters, config } = getContext();
  const input = parsed.data;
  const limit = Math.min(input.limit ?? config.defaultLimit, config.maxLimit);
  const paginationParams = buildPaginationParams("offset", limit, input.cursor);

  const params: Record<string, string | number | boolean | undefined> = { ...paginationParams };
  if (input.deal_id) params.deal_id = input.deal_id;
  if (input.person_id) params.person_id = input.person_id;
  if (input.org_id) params.org_id = input.org_id;
  if (input.product_id) params.product_id = input.product_id;
  if (input.activity_id) params.activity_id = input.activity_id;
  if (input.lead_id) params.lead_id = input.lead_id;
  if (input.sort) params.sort = input.sort;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.list<Record<string, unknown>>("/files", params), { label: "pipedrive_files_list" }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_files_list", "GET /files"));
  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "offset", response.data as unknown as Record<string, unknown>);
  const compact = result.items.map((f) => ({
    id: f.id, name: f.name, file_name: f.file_name, file_type: f.file_type, file_size: f.file_size,
    deal_id: f.deal_id, person_id: f.person_id, org_id: f.org_id,
    add_time: f.add_time, update_time: f.update_time,
  }));
  return paginatedResult({ items: compact, next_page_token: result.next_page_token, approx_count: result.approx_count, truncated: result.truncated, pagination_mode: result.pagination_mode });
}

async function handleFilesGet(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = FilesGetSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_files_get", parsed.error.message);

  const { apiV1, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.get<Record<string, unknown>>(`/files/${parsed.data.file_id}`), { label: `pipedrive_files_get ${parsed.data.file_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_files_get", `GET /files/${parsed.data.file_id}`));

  const file = response.data.data as Record<string, unknown>;
  const result: Record<string, unknown> = {
    id: file.id, name: file.name, file_name: file.file_name, file_type: file.file_type,
    file_size: file.file_size, deal_id: file.deal_id, person_id: file.person_id,
    org_id: file.org_id, add_time: file.add_time, update_time: file.update_time,
    description: file.description,
  };
  if (parsed.data.include_download_url && file.url) {
    result.download_url = file.url;
  }
  return successResult(result);
}

async function handleFilesUpload(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = FilesUploadSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_files_upload", parsed.error.message);

  const input = parsed.data;

  // Require at least one entity ID
  if (!input.deal_id && !input.person_id && !input.org_id && !input.product_id && !input.activity_id && !input.lead_id) {
    return validationErrorResult("pipedrive_files_upload", "At least one entity ID (deal_id, person_id, org_id, product_id, activity_id, or lead_id) is required");
  }

  // Validate base64
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  const stripped = input.content_base64.replace(/\s/g, "");
  if (!base64Regex.test(stripped) || stripped.length === 0) {
    return validationErrorResult("pipedrive_files_upload", "content_base64 is not valid base64");
  }

  const { config } = getContext();
  const baseUrl = `https://${config.companyDomain}.pipedrive.com/v1`;

  // Build multipart form data
  const boundary = `----PipedriveMCP${Date.now()}`;
  const fileBuffer = Buffer.from(stripped, "base64");
  const mimeType = input.mime_type ?? "application/octet-stream";

  const parts: string[] = [];

  // File part
  parts.push(`--${boundary}`);
  parts.push(`Content-Disposition: form-data; name="file"; filename="${input.file_name}"`);
  parts.push(`Content-Type: ${mimeType}`);
  parts.push("");

  // Entity ID parts
  const entityFields: [string, string | number][] = [];
  if (input.deal_id) entityFields.push(["deal_id", input.deal_id]);
  if (input.person_id) entityFields.push(["person_id", input.person_id]);
  if (input.org_id) entityFields.push(["org_id", input.org_id]);
  if (input.product_id) entityFields.push(["product_id", input.product_id]);
  if (input.activity_id) entityFields.push(["activity_id", input.activity_id]);
  if (input.lead_id) entityFields.push(["lead_id", input.lead_id]);

  const preamble = Buffer.from(parts.join("\r\n") + "\r\n");

  const fieldParts: Buffer[] = [];
  for (const [name, value] of entityFields) {
    fieldParts.push(Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}`));
  }
  const epilogue = Buffer.from(`\r\n--${boundary}--\r\n`);

  const body = Buffer.concat([preamble, fileBuffer, ...fieldParts, epilogue]);

  const url = `${baseUrl}/files?api_token=${config.apiToken}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResult(`pipedrive_files_upload: network error - ${msg}. Retryable: yes.`);
  }

  let data: Record<string, unknown>;
  try {
    data = await response.json() as Record<string, unknown>;
  } catch {
    return errorResult(`pipedrive_files_upload: ${response.status} - non-JSON response from Pipedrive. Retryable: ${response.status >= 500 ? "yes" : "no"}.`);
  }

  if (!response.ok || !data.success) {
    const status = response.status;
    return apiErrorResult({
      category: categorizeStatus(status), status, tool: "pipedrive_files_upload",
      endpoint: "POST /files", pipedrive_error: (data.error as string) ?? "",
      retryable: status === 429 || status >= 500, guidance: "File upload failed. Check the file data and entity IDs.",
    });
  }

  return successResult({ message: `File "${input.file_name}" uploaded`, file: data.data });
}

const tools: ToolDefinition[] = [
  { name: "pipedrive_files_list", description: "List files, optionally scoped to an entity.", inputSchema: zodToJsonSchema(FilesListSchema), handler: handleFilesList },
  { name: "pipedrive_files_get", description: "Get file metadata and optional download URL.", inputSchema: zodToJsonSchema(FilesGetSchema), handler: handleFilesGet },
  { name: "pipedrive_files_upload", description: "Upload a base64-encoded file and attach to an entity.", inputSchema: zodToJsonSchema(FilesUploadSchema), handler: handleFilesUpload },
];

registerTools(tools);
