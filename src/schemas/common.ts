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

export const IncludeFieldsSchema = z
  .array(z.string())
  .optional()
  .describe("Additional fields to include in the response");

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
