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
  ConfirmMergeSchema,
  DryRunSchema,
  ReasonSchema,
} from "./common.js";

export const OrganizationsListSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).optional().describe("Filter by organization IDs"),
  owner_id: OwnerIdSchema,
  filter_id: FilterIdSchema,
  updated_since: UpdatedSinceSchema,
  updated_until: UpdatedUntilSchema,
  cursor: PageTokenSchema,
  limit: LimitSchema,
  sort_by: z.enum(["id", "update_time", "add_time", "name"]).optional().describe("Field to sort by"),
  sort_direction: SortDirectionSchema,
  include_fields: IncludeFieldsSchema,
  custom_field_keys: CustomFieldKeysSchema,
}).strict();

export const OrganizationsGetSchema = z.object({
  org_id: IdSchema.describe("The organization ID to retrieve"),
  include_fields: IncludeFieldsSchema,
  custom_field_keys: CustomFieldKeysSchema,
}).strict();

export const OrganizationsSearchSchema = z.object({
  term: z.string().min(1).describe("Search term"),
  fields: z.string().optional().describe("Fields to search in (e.g. 'name,address,custom_fields')"),
  exact_match: z.boolean().optional().describe("Whether to do an exact match"),
  cursor: PageTokenSchema,
  limit: SearchLimitSchema,
  include_fields: IncludeFieldsSchema,
}).strict();

export const OrganizationsCreateSchema = z.object({
  name: z.string().min(1).describe("Organization name"),
  owner_id: OwnerIdSchema,
  address: z.string().optional().describe("Organization address"),
  visible_to: VisibleToSchema,
  custom_fields: CustomFieldsSchema,
  custom_fields_by_name: CustomFieldsByNameSchema,
}).strict();

export const OrganizationsUpdateSchema = z.object({
  org_id: IdSchema.describe("The organization ID to update"),
  name: z.string().optional(),
  owner_id: OwnerIdSchema,
  address: z.string().optional(),
  visible_to: VisibleToSchema,
  custom_fields: CustomFieldsSchema,
  custom_fields_by_name: CustomFieldsByNameSchema,
}).strict();

export const OrganizationsDeleteSchema = z.object({
  org_id: IdSchema.describe("The organization ID to delete"),
  confirm: ConfirmDeleteSchema,
  dry_run: DryRunSchema,
  reason: ReasonSchema,
}).strict();

export const OrganizationsMergeSchema = z.object({
  source_org_id: IdSchema.describe("Organization ID to merge FROM (will be deleted)"),
  target_org_id: IdSchema.describe("Organization ID to merge INTO (will be kept)"),
  confirm: ConfirmMergeSchema,
  dry_run: DryRunSchema,
}).strict();
