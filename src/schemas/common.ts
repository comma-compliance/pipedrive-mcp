import { z } from "zod";

// Shared primitives used across all tool input schemas

export const IdSchema = z.coerce.number().int().positive();

export const ConfirmDeleteSchema = z
  .literal("DELETE")
  .describe('Must be exactly "DELETE" to confirm deletion');

export const ConfirmMergeSchema = z
  .literal("MERGE")
  .describe('Must be exactly "MERGE" to confirm merge');

export const ConfirmYesSchema = z
  .literal("YES")
  .describe('Must be exactly "YES" to confirm');

export const DryRunSchema = z
  .boolean()
  .optional()
  .default(false)
  .describe("If true, returns a preview of what would happen without executing");

export const LimitSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(100)
  .optional()
  .describe("Number of items per page (default 25, max 100)");

export const SearchLimitSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(50)
  .optional()
  .describe("Number of search results per page (default 10, max 50)");

export const PageTokenSchema = z
  .string()
  .optional()
  .describe("Opaque token from previous response to fetch the next page");

export const SortDirectionSchema = z
  .enum(["asc", "desc"])
  .optional()
  .describe("Sort direction");

export const CursorSchema = z
  .string()
  .optional()
  .describe("Cursor for pagination");

export const CustomFieldsSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .describe("Custom fields by API key (e.g. { 'abc123hash': 'value' })");

export const CustomFieldsByNameSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .describe("Custom fields by human-readable name (e.g. { 'Tier': 'Enterprise' })");

export const FieldModeSchema = z
  .enum(["overwrite", "append"])
  .optional()
  .default("overwrite")
  .describe("How to handle existing field values: overwrite (default) or append for set fields");

// Per-endpoint include_fields enums. The Pipedrive API only accepts a fixed enum of
// values per endpoint; previously a shared array(string) schema let invalid values
// through and produced 400s. Source: developers.pipedrive.com/docs/api/v1 (the v2
// sections per entity, which is what this MCP currently calls).

export const DealsIncludeFieldsSchema = z
  .array(
    z.enum([
      "next_activity_id",
      "last_activity_id",
      "first_won_time",
      "products_count",
      "files_count",
      "notes_count",
      "followers_count",
      "email_messages_count",
      "activities_count",
      "done_activities_count",
      "undone_activities_count",
      "participants_count",
      "last_incoming_mail_time",
      "last_outgoing_mail_time",
      "smart_bcc_email",
      "source_lead_id",
    ]),
  )
  .optional();

export const DealsSearchIncludeFieldsSchema = z
  .array(z.enum(["deal.cc_email"]))
  .optional();

export const OrganizationsIncludeFieldsSchema = z
  .array(
    z.enum([
      "next_activity_id",
      "last_activity_id",
      "open_deals_count",
      "related_open_deals_count",
      "closed_deals_count",
      "related_closed_deals_count",
      "email_messages_count",
      "people_count",
      "activities_count",
      "done_activities_count",
      "undone_activities_count",
      "files_count",
      "notes_count",
      "followers_count",
      "won_deals_count",
      "related_won_deals_count",
      "lost_deals_count",
      "related_lost_deals_count",
      "smart_bcc_email",
      "custom_fields",
    ]),
  )
  .optional();

export const PersonsIncludeFieldsSchema = z
  .array(
    z.enum([
      "next_activity_id",
      "last_activity_id",
      "open_deals_count",
      "related_open_deals_count",
      "closed_deals_count",
      "related_closed_deals_count",
      "participant_open_deals_count",
      "participant_closed_deals_count",
      "email_messages_count",
      "activities_count",
      "done_activities_count",
      "undone_activities_count",
      "files_count",
      "notes_count",
      "followers_count",
      "won_deals_count",
      "related_won_deals_count",
      "lost_deals_count",
      "related_lost_deals_count",
      "last_incoming_mail_time",
      "last_outgoing_mail_time",
      "marketing_status",
      "doi_status",
      "smart_bcc_email",
      "custom_fields",
    ]),
  )
  .optional();

export const PersonsSearchIncludeFieldsSchema = z
  .array(z.enum(["person.picture"]))
  .optional();

export const LeadsSearchIncludeFieldsSchema = z
  .array(z.enum(["lead.was_seen"]))
  .optional();

export const CustomFieldKeysSchema = z
  .array(z.string())
  .optional()
  .describe("Custom field keys to include in the response");

export const VisibleToSchema = z
  .enum(["1", "3", "5", "7"])
  .optional()
  .describe("Visibility: 1=owner only, 3=owner's group, 5=owner's group+sub, 7=everyone");

export const OwnerIdSchema = z.coerce
  .number()
  .int()
  .positive()
  .optional()
  .describe("User ID of the owner");

export const ReasonSchema = z
  .string()
  .optional()
  .describe("Optional reason for the operation (logged, not sent to API)");

export const UpdatedSinceSchema = z
  .string()
  .optional()
  .describe("Filter by update time (ISO 8601 format, e.g. 2024-01-15T00:00:00Z)");

export const UpdatedUntilSchema = z
  .string()
  .optional()
  .describe("Filter by update time upper bound (ISO 8601 format)");

export const FilterIdSchema = z.coerce
  .number()
  .int()
  .positive()
  .optional()
  .describe("Pipedrive filter ID to apply");
