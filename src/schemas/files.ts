import { z } from "zod";
import { IdSchema, LimitSchema, PageTokenSchema } from "./common.js";

export const FilesListSchema = z.object({
  deal_id: z.coerce.number().int().positive().optional().describe("Filter by deal ID"),
  person_id: z.coerce.number().int().positive().optional().describe("Filter by person ID"),
  org_id: z.coerce.number().int().positive().optional().describe("Filter by organization ID"),
  product_id: z.coerce.number().int().positive().optional().describe("Filter by product ID"),
  activity_id: z.coerce.number().int().positive().optional().describe("Filter by activity ID"),
  lead_id: z.string().optional().describe("Filter by lead ID"),
  cursor: PageTokenSchema,
  limit: LimitSchema,
  sort: z.enum(["id", "name", "add_time", "update_time"]).optional(),
}).strict();

export const FilesGetSchema = z.object({
  file_id: IdSchema.describe("The file ID to retrieve"),
  include_download_url: z.boolean().optional().default(true).describe("Include a temporary download URL"),
}).strict();

export const FilesUploadSchema = z.object({
  file_name: z.string().min(1).describe("File name with extension"),
  content_base64: z.string().min(1).describe("File content as base64-encoded string"),
  deal_id: z.coerce.number().int().positive().optional().describe("Attach to this deal"),
  person_id: z.coerce.number().int().positive().optional().describe("Attach to this person"),
  org_id: z.coerce.number().int().positive().optional().describe("Attach to this organization"),
  product_id: z.coerce.number().int().positive().optional().describe("Attach to this product"),
  activity_id: z.coerce.number().int().positive().optional().describe("Attach to this activity"),
  lead_id: z.string().optional().describe("Attach to this lead"),
  mime_type: z.string().optional().describe("MIME type (auto-detected if omitted)"),
}).strict();
