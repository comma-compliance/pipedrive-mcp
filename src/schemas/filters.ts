import { z } from "zod";
import { IdSchema, LimitSchema, PageTokenSchema, SortDirectionSchema } from "./common.js";

export const FiltersListSchema = z.object({
  type: z.enum(["deals", "people", "org", "products", "activity", "leads", "projects"]).optional().describe("Filter entity type"),
}).strict();

export const FiltersGetSchema = z.object({
  filter_id: IdSchema.describe("The filter ID to retrieve"),
}).strict();

export const FiltersResultsSchema = z.object({
  filter_id: IdSchema.describe("The filter ID to run"),
  entity_type: z.enum(["deals", "people", "org", "products", "activity"]).describe("Entity type the filter applies to"),
  cursor: PageTokenSchema,
  limit: LimitSchema,
  sort_by: z.string().optional().describe("Field to sort by"),
  sort_direction: SortDirectionSchema,
}).strict();
