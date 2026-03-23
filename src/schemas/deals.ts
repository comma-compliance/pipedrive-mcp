import { z } from "zod";
import {
  IdSchema,
  LimitSchema,
  SearchLimitSchema,
  PageTokenSchema,
  SortDirectionSchema,
  OwnerIdSchema,
  FilterIdSchema,
  UpdatedSinceSchema,
  UpdatedUntilSchema,
  IncludeFieldsSchema,
  CustomFieldKeysSchema,
  CustomFieldsSchema,
  CustomFieldsByNameSchema,
  FieldModeSchema,
  VisibleToSchema,
  ConfirmDeleteSchema,
  DryRunSchema,
  ReasonSchema,
} from "./common.js";

export const DealsListSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).optional().describe("Filter by deal IDs"),
  owner_id: OwnerIdSchema,
  person_id: z.coerce.number().int().positive().optional().describe("Filter by linked person ID"),
  org_id: z.coerce.number().int().positive().optional().describe("Filter by linked organization ID"),
  pipeline_id: z.coerce.number().int().positive().optional().describe("Filter by pipeline ID"),
  stage_id: z.coerce.number().int().positive().optional().describe("Filter by stage ID"),
  status: z.enum(["open", "won", "lost", "deleted"]).optional().describe("Filter by deal status"),
  filter_id: FilterIdSchema,
  updated_since: UpdatedSinceSchema,
  updated_until: UpdatedUntilSchema,
  cursor: PageTokenSchema,
  limit: LimitSchema,
  sort_by: z.enum(["id", "update_time", "add_time", "title", "value"]).optional().describe("Field to sort by"),
  sort_direction: SortDirectionSchema,
  include_fields: IncludeFieldsSchema,
  custom_field_keys: CustomFieldKeysSchema,
}).strict();

export const DealsGetSchema = z.object({
  deal_id: IdSchema.describe("The deal ID to retrieve"),
  include_fields: IncludeFieldsSchema,
  custom_field_keys: CustomFieldKeysSchema,
}).strict();

export const DealsSearchSchema = z.object({
  term: z.string().min(1).describe("Search term"),
  fields: z.string().optional().describe("Fields to search in (e.g. 'title,custom_fields')"),
  exact_match: z.boolean().optional().describe("Whether to do an exact match"),
  person_id: z.coerce.number().int().positive().optional().describe("Filter by person ID"),
  organization_id: z.coerce.number().int().positive().optional().describe("Filter by organization ID"),
  status: z.enum(["open", "won", "lost"]).optional().describe("Filter by deal status"),
  cursor: PageTokenSchema,
  limit: SearchLimitSchema,
  include_fields: IncludeFieldsSchema,
}).strict();

export const DealsSummarySchema = z.object({
  deal_id: IdSchema.optional().describe("Get summary for a specific deal"),
  owner_id: OwnerIdSchema,
  person_id: z.coerce.number().int().positive().optional(),
  org_id: z.coerce.number().int().positive().optional(),
  pipeline_id: z.coerce.number().int().positive().optional(),
  stage_id: z.coerce.number().int().positive().optional(),
  status: z.enum(["open", "won", "lost"]).optional(),
  include_recent_activities: z.boolean().optional().default(false),
  include_notes: z.boolean().optional().default(false),
  include_products: z.boolean().optional().default(false),
}).strict();

export const DealsMoveStageSchema = z.object({
  deal_id: IdSchema.describe("The deal ID to move"),
  stage_id: IdSchema.describe("The target stage ID"),
  pipeline_id: z.coerce.number().int().positive().optional().describe("Target pipeline ID (if moving across pipelines)"),
}).strict();

export const DealsCreateSchema = z.object({
  title: z.string().min(1).describe("Deal title"),
  person_id: z.coerce.number().int().positive().optional(),
  org_id: z.coerce.number().int().positive().optional(),
  value: z.number().optional(),
  currency: z.string().optional(),
  pipeline_id: z.coerce.number().int().positive().optional(),
  stage_id: z.coerce.number().int().positive().optional(),
  status: z.enum(["open", "won", "lost"]).optional(),
  expected_close_date: z.string().optional(),
  visible_to: VisibleToSchema,
  custom_fields: CustomFieldsSchema,
  custom_fields_by_name: CustomFieldsByNameSchema,
}).strict();

export const DealsUpdateSchema = z.object({
  deal_id: IdSchema.describe("The deal ID to update"),
  title: z.string().optional(),
  person_id: z.coerce.number().int().positive().optional(),
  org_id: z.coerce.number().int().positive().optional(),
  value: z.number().optional(),
  currency: z.string().optional(),
  pipeline_id: z.coerce.number().int().positive().optional(),
  stage_id: z.coerce.number().int().positive().optional(),
  status: z.enum(["open", "won", "lost"]).optional(),
  expected_close_date: z.string().optional(),
  visible_to: VisibleToSchema,
  custom_fields: CustomFieldsSchema,
  custom_fields_by_name: CustomFieldsByNameSchema,
}).strict();

export const DealsDeleteSchema = z.object({
  deal_id: IdSchema.describe("The deal ID to delete"),
  confirm: ConfirmDeleteSchema,
  dry_run: DryRunSchema,
  reason: ReasonSchema,
}).strict();
