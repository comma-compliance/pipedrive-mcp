import { z } from "zod";
import {
  IdSchema,
  LimitSchema,
  SearchLimitSchema,
  PageTokenSchema,
  SortDirectionSchema,
  OwnerIdSchema,
  FilterIdSchema,
  IncludeFieldsSchema,
  CustomFieldKeysSchema,
  CustomFieldsSchema,
  CustomFieldsByNameSchema,
  VisibleToSchema,
  ConfirmDeleteSchema,
  DryRunSchema,
  ReasonSchema,
} from "./common.js";

export const ProductsListSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).optional().describe("Filter by product IDs"),
  owner_id: OwnerIdSchema,
  filter_id: FilterIdSchema,
  cursor: PageTokenSchema,
  limit: LimitSchema,
  sort_by: z.enum(["id", "update_time", "add_time", "name"]).optional(),
  sort_direction: SortDirectionSchema,
  custom_field_keys: CustomFieldKeysSchema,
}).strict();

export const ProductsGetSchema = z.object({
  product_id: IdSchema.describe("The product ID to retrieve"),
}).strict();

export const ProductsCreateSchema = z.object({
  name: z.string().min(1).describe("Product name"),
  code: z.string().optional().describe("Product code"),
  description: z.string().optional(),
  unit: z.string().optional().describe("Unit of measurement"),
  tax: z.number().optional().describe("Tax percentage"),
  owner_id: OwnerIdSchema,
  prices: z.array(z.object({
    price: z.number(),
    currency: z.string(),
    cost: z.number().optional(),
    direct_cost: z.number().optional(),
  })).optional().describe("Product prices"),
  visible_to: VisibleToSchema,
  custom_fields: CustomFieldsSchema,
  custom_fields_by_name: CustomFieldsByNameSchema,
}).strict();

export const ProductsUpdateSchema = z.object({
  product_id: IdSchema.describe("The product ID to update"),
  name: z.string().optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
  tax: z.number().optional(),
  owner_id: OwnerIdSchema,
  prices: z.array(z.object({
    price: z.number(),
    currency: z.string(),
    cost: z.number().optional(),
    direct_cost: z.number().optional(),
  })).optional(),
  visible_to: VisibleToSchema,
  custom_fields: CustomFieldsSchema,
  custom_fields_by_name: CustomFieldsByNameSchema,
}).strict();

export const ProductsDeleteSchema = z.object({
  product_id: IdSchema.describe("The product ID to delete"),
  confirm: ConfirmDeleteSchema,
  dry_run: DryRunSchema,
  reason: ReasonSchema,
}).strict();

export const ProductsSearchSchema = z.object({
  term: z.string().min(1).describe("Search term"),
  fields: z.string().optional().describe("Fields to search in"),
  exact_match: z.boolean().optional(),
  cursor: PageTokenSchema,
  limit: SearchLimitSchema,
}).strict();

export const DealProductsListSchema = z.object({
  deal_id: IdSchema.describe("The deal ID"),
  cursor: PageTokenSchema,
  limit: LimitSchema,
  sort_by: z.string().optional(),
  sort_direction: SortDirectionSchema,
}).strict();

export const DealProductsAddSchema = z.object({
  deal_id: IdSchema.describe("The deal ID"),
  product_id: IdSchema.describe("The product ID to attach"),
  item_price: z.number().describe("Price per unit"),
  quantity: z.number().describe("Quantity"),
  discount: z.number().optional(),
  tax_method: z.enum(["exclusive", "inclusive", "none"]).optional(),
  comments: z.string().optional(),
}).strict();

export const DealProductsUpdateSchema = z.object({
  deal_id: IdSchema.describe("The deal ID"),
  deal_product_id: IdSchema.describe("The deal-product attachment ID"),
  item_price: z.number().optional(),
  quantity: z.number().optional(),
  discount: z.number().optional(),
  tax_method: z.enum(["exclusive", "inclusive", "none"]).optional(),
  comments: z.string().optional(),
}).strict();

export const DealProductsDeleteSchema = z.object({
  deal_id: IdSchema.describe("The deal ID"),
  deal_product_id: IdSchema.describe("The deal-product attachment ID to remove"),
  confirm: ConfirmDeleteSchema,
  dry_run: DryRunSchema,
  reason: ReasonSchema,
}).strict();
