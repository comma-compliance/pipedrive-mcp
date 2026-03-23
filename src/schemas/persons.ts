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

export const PersonsListSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).optional().describe("Filter by person IDs"),
  owner_id: OwnerIdSchema,
  org_id: z.coerce.number().int().positive().optional().describe("Filter by organization ID"),
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

export const PersonsGetSchema = z.object({
  person_id: IdSchema.describe("The person ID to retrieve"),
  include_fields: IncludeFieldsSchema,
  custom_field_keys: CustomFieldKeysSchema,
}).strict();

export const PersonsSearchSchema = z.object({
  term: z.string().min(1).describe("Search term"),
  fields: z.string().optional().describe("Fields to search in (e.g. 'name,email,phone,custom_fields')"),
  exact_match: z.boolean().optional().describe("Whether to do an exact match"),
  organization_id: z.coerce.number().int().positive().optional().describe("Filter by organization ID"),
  cursor: PageTokenSchema,
  limit: SearchLimitSchema,
  include_fields: IncludeFieldsSchema,
}).strict();

export const PersonsCreateSchema = z.object({
  name: z.string().min(1).describe("Person name"),
  emails: z.array(z.string().email()).optional().describe("Email addresses"),
  phones: z.array(z.string()).optional().describe("Phone numbers"),
  org_id: z.coerce.number().int().positive().optional(),
  owner_id: OwnerIdSchema,
  visible_to: VisibleToSchema,
  custom_fields: CustomFieldsSchema,
  custom_fields_by_name: CustomFieldsByNameSchema,
}).strict();

export const PersonsUpdateSchema = z.object({
  person_id: IdSchema.describe("The person ID to update"),
  name: z.string().optional(),
  emails: z.array(z.string().email()).optional(),
  phones: z.array(z.string()).optional(),
  org_id: z.coerce.number().int().positive().optional(),
  owner_id: OwnerIdSchema,
  visible_to: VisibleToSchema,
  custom_fields: CustomFieldsSchema,
  custom_fields_by_name: CustomFieldsByNameSchema,
}).strict();

export const PersonsDeleteSchema = z.object({
  person_id: IdSchema.describe("The person ID to delete"),
  confirm: ConfirmDeleteSchema,
  dry_run: DryRunSchema,
  reason: ReasonSchema,
}).strict();

export const PersonsMergeSchema = z.object({
  source_person_id: IdSchema.describe("Person ID to merge FROM (will be deleted)"),
  target_person_id: IdSchema.describe("Person ID to merge INTO (will be kept)"),
  confirm: ConfirmMergeSchema,
  dry_run: DryRunSchema,
}).strict();
