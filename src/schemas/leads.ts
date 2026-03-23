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
  CustomFieldsSchema,
  CustomFieldsByNameSchema,
  VisibleToSchema,
  ConfirmDeleteSchema,
  DryRunSchema,
  ReasonSchema,
} from "./common.js";

export const LeadsListSchema = z.object({
  owner_id: OwnerIdSchema,
  person_id: z.coerce.number().int().positive().optional().describe("Filter by person ID"),
  organization_id: z.coerce.number().int().positive().optional().describe("Filter by organization ID"),
  filter_id: FilterIdSchema,
  cursor: PageTokenSchema,
  limit: LimitSchema,
  sort: z.string().optional().describe("Sort field and direction (e.g. 'add_time ASC')"),
  archived_status: z.enum(["archived", "not_archived", "all"]).optional().describe("Filter by archived status"),
}).strict();

export const LeadsGetSchema = z.object({
  lead_id: z.string().min(1).describe("The lead ID (UUID format)"),
}).strict();

export const LeadsCreateSchema = z.object({
  title: z.string().min(1).describe("Lead title"),
  person_id: z.coerce.number().int().positive().optional().describe("Linked person ID"),
  organization_id: z.coerce.number().int().positive().optional().describe("Linked organization ID"),
  owner_id: OwnerIdSchema,
  label_ids: z.array(z.string()).optional().describe("Lead label UUIDs"),
  value: z.object({
    amount: z.number(),
    currency: z.string(),
  }).optional().describe("Lead value"),
  expected_close_date: z.string().optional().describe("Expected close date (YYYY-MM-DD)"),
  visible_to: VisibleToSchema,
}).strict();

export const LeadsUpdateSchema = z.object({
  lead_id: z.string().min(1).describe("The lead ID to update"),
  title: z.string().optional(),
  person_id: z.coerce.number().int().positive().optional(),
  organization_id: z.coerce.number().int().positive().optional(),
  owner_id: OwnerIdSchema,
  label_ids: z.array(z.string()).optional(),
  value: z.object({
    amount: z.number(),
    currency: z.string(),
  }).optional(),
  expected_close_date: z.string().optional(),
  visible_to: VisibleToSchema,
}).strict();

export const LeadsDeleteSchema = z.object({
  lead_id: z.string().min(1).describe("The lead ID to delete"),
  confirm: ConfirmDeleteSchema,
  dry_run: DryRunSchema,
  reason: ReasonSchema,
}).strict();

export const LeadsSearchSchema = z.object({
  term: z.string().min(1).describe("Search term"),
  fields: z.string().optional(),
  exact_match: z.boolean().optional(),
  person_id: z.coerce.number().int().positive().optional(),
  organization_id: z.coerce.number().int().positive().optional(),
  cursor: PageTokenSchema,
  limit: SearchLimitSchema,
  include_fields: IncludeFieldsSchema,
}).strict();
