import { z } from "zod";
import { LimitSchema, PageTokenSchema } from "./common.js";

export const CustomFieldsListSchema = z.object({
  entity_type: z.enum(["deal", "person", "organization", "product", "activity"]).describe("Entity type to list fields for"),
  refresh_cache: z.boolean().optional().default(false).describe("Force refresh the field metadata cache"),
  include_options: z.boolean().optional().default(true).describe("Include enum/set option values"),
  cursor: PageTokenSchema,
  limit: LimitSchema,
}).strict();
