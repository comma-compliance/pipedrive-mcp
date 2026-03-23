import { registerTools, type ToolDefinition } from "../mcp/register-tools.js";
import { successResult, paginatedResult, type ToolResult } from "../mcp/tool-result.js";
import { apiErrorResult, validationErrorResult, guardErrorResult } from "../mcp/errors.js";
import { getContext } from "../server.js";
import { withRetry } from "../pipedrive/retries.js";
import { normalizeApiError } from "../pipedrive/error-normalizer.js";
import { buildPaginationParams, buildPaginatedResult } from "../pipedrive/pagination.js";
import { resolveCustomFieldsByName } from "../services/custom-fields.js";
import { validateConfirmation, buildDryRunResult } from "../services/guards.js";
import {
  ProductsListSchema, ProductsGetSchema, ProductsCreateSchema, ProductsUpdateSchema,
  ProductsDeleteSchema, ProductsSearchSchema,
  DealProductsListSchema, DealProductsAddSchema, DealProductsUpdateSchema, DealProductsDeleteSchema,
} from "../schemas/products.js";
import { zodToJsonSchema } from "../schemas/zod-to-json.js";

async function handleProductsList(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = ProductsListSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_products_list", parsed.error.message);

  const { apiV2, rateLimiters, config } = getContext();
  const input = parsed.data;
  const limit = Math.min(input.limit ?? config.defaultLimit, config.maxLimit);
  const paginationParams = buildPaginationParams("cursor", limit, input.cursor);

  const params: Record<string, string | number | boolean | undefined> = { ...paginationParams };
  if (input.ids) params.ids = input.ids.join(",");
  if (input.owner_id) params.owner_id = input.owner_id;
  if (input.filter_id) params.filter_id = input.filter_id;
  if (input.sort_by) params.sort_by = input.sort_by;
  if (input.sort_direction) params.sort_direction = input.sort_direction;
  if (input.custom_field_keys) params.custom_fields = input.custom_field_keys.join(",");

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>("/products", params), { label: "pipedrive_products_list" }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_products_list", "GET /products"));
  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "cursor", response.data as unknown as Record<string, unknown>);
  const compact = result.items.map((p) => ({ id: p.id, name: p.name, code: p.code, unit: p.unit, tax: p.tax, owner_id: p.owner_id, active_flag: p.active_flag, update_time: p.update_time }));
  return paginatedResult({ items: compact, next_page_token: result.next_page_token, approx_count: result.approx_count, truncated: result.truncated, pagination_mode: result.pagination_mode });
}

async function handleProductsGet(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = ProductsGetSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_products_get", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.get<Record<string, unknown>>(`/products/${parsed.data.product_id}`), { label: `pipedrive_products_get ${parsed.data.product_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_products_get", `GET /products/${parsed.data.product_id}`));
  return successResult(response.data.data);
}

async function handleProductsCreate(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = ProductsCreateSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_products_create", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const input = parsed.data;
  const body: Record<string, unknown> = { name: input.name };
  if (input.code) body.code = input.code;
  if (input.description) body.description = input.description;
  if (input.unit) body.unit = input.unit;
  if (input.tax !== undefined) body.tax = input.tax;
  if (input.owner_id) body.owner_id = input.owner_id;
  if (input.prices) body.prices = input.prices;
  if (input.visible_to) body.visible_to = input.visible_to;

  const customFieldsObj: Record<string, unknown> = {};
  if (input.custom_fields) Object.assign(customFieldsObj, input.custom_fields);
  if (input.custom_fields_by_name) {
    const { resolved, errors } = await resolveCustomFieldsByName("product", input.custom_fields_by_name);
    if (errors.length > 0) return validationErrorResult("pipedrive_products_create", errors.join("; "));
    Object.assign(customFieldsObj, resolved);
  }
  if (Object.keys(customFieldsObj).length > 0) body.custom_fields = customFieldsObj;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.post<Record<string, unknown>>("/products", body), { label: "pipedrive_products_create" }),
  );

  if (response.status !== 200 && response.status !== 201) return apiErrorResult(normalizeApiError(response, "pipedrive_products_create", "POST /products"));
  return successResult({ message: "Product created", product: response.data.data });
}

async function handleProductsUpdate(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = ProductsUpdateSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_products_update", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const input = parsed.data;
  const body: Record<string, unknown> = {};
  if (input.name) body.name = input.name;
  if (input.code) body.code = input.code;
  if (input.description) body.description = input.description;
  if (input.unit) body.unit = input.unit;
  if (input.tax !== undefined) body.tax = input.tax;
  if (input.owner_id) body.owner_id = input.owner_id;
  if (input.prices) body.prices = input.prices;
  if (input.visible_to) body.visible_to = input.visible_to;

  const customFieldsObj: Record<string, unknown> = {};
  if (input.custom_fields) Object.assign(customFieldsObj, input.custom_fields);
  if (input.custom_fields_by_name) {
    const { resolved, errors } = await resolveCustomFieldsByName("product", input.custom_fields_by_name);
    if (errors.length > 0) return validationErrorResult("pipedrive_products_update", errors.join("; "));
    Object.assign(customFieldsObj, resolved);
  }
  if (Object.keys(customFieldsObj).length > 0) body.custom_fields = customFieldsObj;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.patch<Record<string, unknown>>(`/products/${input.product_id}`, body), { label: `pipedrive_products_update ${input.product_id}` }),
  );

  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_products_update", `PATCH /products/${input.product_id}`));
  return successResult({ message: `Product ${input.product_id} updated`, product: response.data.data });
}

async function handleProductsDelete(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = ProductsDeleteSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_products_delete", parsed.error.message);
  const input = parsed.data;
  if (input.dry_run) return successResult(buildDryRunResult("pipedrive_products_delete", "delete", { product_id: input.product_id }, `Would delete product ${input.product_id}`));
  const confirmError = validateConfirmation(input.confirm, "DELETE", "pipedrive_products_delete", "delete product");
  if (confirmError) return guardErrorResult(confirmError);

  const { apiV2, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.del(`/products/${input.product_id}`), { label: `pipedrive_products_delete ${input.product_id}` }),
  );
  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_products_delete", `DELETE /products/${input.product_id}`));
  return successResult({ message: `Product ${input.product_id} deleted` });
}

async function handleProductsSearch(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = ProductsSearchSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_products_search", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const input = parsed.data;
  const limit = Math.min(input.limit ?? 10, 50);
  const paginationParams = buildPaginationParams("cursor", limit, input.cursor);
  const params: Record<string, string | number | boolean | undefined> = { term: input.term, ...paginationParams };
  if (input.fields) params.fields = input.fields;
  if (input.exact_match !== undefined) params.exact_match = input.exact_match;

  const response = await rateLimiters.search.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>("/products/search", params), { label: "pipedrive_products_search" }),
  );
  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_products_search", "GET /products/search"));
  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "cursor", response.data as unknown as Record<string, unknown>);
  return paginatedResult({ items: result.items, next_page_token: result.next_page_token, approx_count: result.approx_count, truncated: result.truncated, pagination_mode: result.pagination_mode });
}

async function handleDealProductsList(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = DealProductsListSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_deal_products_list", parsed.error.message);

  const { apiV2, rateLimiters, config } = getContext();
  const input = parsed.data;
  const limit = Math.min(input.limit ?? config.defaultLimit, config.maxLimit);
  const paginationParams = buildPaginationParams("cursor", limit, input.cursor);
  const params: Record<string, string | number | boolean | undefined> = { ...paginationParams };
  if (input.sort_by) params.sort_by = input.sort_by;
  if (input.sort_direction) params.sort_direction = input.sort_direction;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.list<Record<string, unknown>>(`/deals/${input.deal_id}/products`, params), { label: `pipedrive_deal_products_list ${input.deal_id}` }),
  );
  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_deal_products_list", `GET /deals/${input.deal_id}/products`));
  const items = response.data.data ?? [];
  const result = buildPaginatedResult(items, "cursor", response.data as unknown as Record<string, unknown>);
  return paginatedResult({ items: result.items, next_page_token: result.next_page_token, approx_count: result.approx_count, truncated: result.truncated, pagination_mode: result.pagination_mode });
}

async function handleDealProductsAdd(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = DealProductsAddSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_deal_products_add", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const input = parsed.data;
  const body: Record<string, unknown> = {
    product_id: input.product_id,
    item_price: input.item_price,
    quantity: input.quantity,
  };
  if (input.discount !== undefined) body.discount = input.discount;
  if (input.tax_method) body.tax_method = input.tax_method;
  if (input.comments) body.comments = input.comments;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.post<Record<string, unknown>>(`/deals/${input.deal_id}/products`, body), { label: `pipedrive_deal_products_add ${input.deal_id}` }),
  );
  if (response.status !== 200 && response.status !== 201) return apiErrorResult(normalizeApiError(response, "pipedrive_deal_products_add", `POST /deals/${input.deal_id}/products`));
  return successResult({ message: `Product ${input.product_id} added to deal ${input.deal_id}`, deal_product: response.data.data });
}

async function handleDealProductsUpdate(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = DealProductsUpdateSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_deal_products_update", parsed.error.message);

  const { apiV2, rateLimiters } = getContext();
  const input = parsed.data;
  const body: Record<string, unknown> = {};
  if (input.item_price !== undefined) body.item_price = input.item_price;
  if (input.quantity !== undefined) body.quantity = input.quantity;
  if (input.discount !== undefined) body.discount = input.discount;
  if (input.tax_method) body.tax_method = input.tax_method;
  if (input.comments) body.comments = input.comments;

  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.patch<Record<string, unknown>>(`/deals/${input.deal_id}/products/${input.deal_product_id}`, body), { label: `pipedrive_deal_products_update ${input.deal_product_id}` }),
  );
  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_deal_products_update", `PATCH /deals/${input.deal_id}/products/${input.deal_product_id}`));
  return successResult({ message: `Deal product ${input.deal_product_id} updated`, deal_product: response.data.data });
}

async function handleDealProductsDelete(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = DealProductsDeleteSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_deal_products_delete", parsed.error.message);
  const input = parsed.data;
  if (input.dry_run) return successResult(buildDryRunResult("pipedrive_deal_products_delete", "delete", { deal_id: input.deal_id, deal_product_id: input.deal_product_id }, `Would remove product ${input.deal_product_id} from deal ${input.deal_id}`));
  const confirmError = validateConfirmation(input.confirm, "DELETE", "pipedrive_deal_products_delete", "remove product from deal");
  if (confirmError) return guardErrorResult(confirmError);

  const { apiV2, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV2.del(`/deals/${input.deal_id}/products/${input.deal_product_id}`), { label: `pipedrive_deal_products_delete ${input.deal_product_id}` }),
  );
  if (response.status !== 200) return apiErrorResult(normalizeApiError(response, "pipedrive_deal_products_delete", `DELETE /deals/${input.deal_id}/products/${input.deal_product_id}`));
  return successResult({ message: `Product ${input.deal_product_id} removed from deal ${input.deal_id}` });
}

const tools: ToolDefinition[] = [
  { name: "pipedrive_products_list", description: "List products with filters and pagination.", inputSchema: zodToJsonSchema(ProductsListSchema), handler: handleProductsList },
  { name: "pipedrive_products_get", description: "Get a single product by ID.", inputSchema: zodToJsonSchema(ProductsGetSchema), handler: handleProductsGet },
  { name: "pipedrive_products_create", description: "Create a new product.", inputSchema: zodToJsonSchema(ProductsCreateSchema), handler: handleProductsCreate },
  { name: "pipedrive_products_update", description: "Update an existing product.", inputSchema: zodToJsonSchema(ProductsUpdateSchema), handler: handleProductsUpdate },
  { name: "pipedrive_products_delete", description: 'Delete a product. Requires confirm: "DELETE". Supports dry_run.', inputSchema: zodToJsonSchema(ProductsDeleteSchema), handler: handleProductsDelete },
  { name: "pipedrive_products_search", description: "Search products by name or code.", inputSchema: zodToJsonSchema(ProductsSearchSchema), handler: handleProductsSearch },
  { name: "pipedrive_deal_products_list", description: "List products attached to a deal.", inputSchema: zodToJsonSchema(DealProductsListSchema), handler: handleDealProductsList },
  { name: "pipedrive_deal_products_add", description: "Attach a product to a deal with price/quantity.", inputSchema: zodToJsonSchema(DealProductsAddSchema), handler: handleDealProductsAdd },
  { name: "pipedrive_deal_products_update", description: "Update a product attachment on a deal.", inputSchema: zodToJsonSchema(DealProductsUpdateSchema), handler: handleDealProductsUpdate },
  { name: "pipedrive_deal_products_delete", description: 'Remove a product from a deal. Requires confirm: "DELETE". Supports dry_run.', inputSchema: zodToJsonSchema(DealProductsDeleteSchema), handler: handleDealProductsDelete },
];

registerTools(tools);
