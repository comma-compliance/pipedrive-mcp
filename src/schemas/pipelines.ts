import { z } from "zod";
import { IdSchema, LimitSchema, PageTokenSchema, SortDirectionSchema } from "./common.js";

export const PipelinesListSchema = z.object({
  cursor: PageTokenSchema,
  limit: LimitSchema,
}).strict();

export const PipelinesGetSchema = z.object({
  pipeline_id: IdSchema.describe("The pipeline ID to retrieve"),
}).strict();

export const StagesListSchema = z.object({
  pipeline_id: z.coerce.number().int().positive().optional().describe("Filter by pipeline ID"),
  cursor: PageTokenSchema,
  limit: LimitSchema,
  sort_by: z.enum(["id", "order_nr", "name"]).optional().describe("Field to sort by"),
  sort_direction: SortDirectionSchema,
}).strict();

export const StagesGetSchema = z.object({
  stage_id: IdSchema.describe("The stage ID to retrieve"),
}).strict();
