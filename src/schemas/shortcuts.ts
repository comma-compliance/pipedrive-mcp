import { z } from "zod";
import { LimitSchema, PageTokenSchema } from "./common.js";

export const AsUserSchema = z
  .string()
  .optional()
  .describe("Optional user name or email to act as. Defaults to the API token owner. Use this when multiple people share one API token.");

export const MeSchema = z.object({
  as_user: AsUserSchema,
}).strict();

export const MyOpenDealsSchema = z.object({
  as_user: AsUserSchema,
  pipeline_id: z.coerce.number().int().positive().optional().describe("Filter to a specific pipeline"),
  cursor: PageTokenSchema,
  limit: LimitSchema,
}).strict();

export const MyOverdueActivitiesSchema = z.object({
  as_user: AsUserSchema,
  cursor: PageTokenSchema,
  limit: LimitSchema,
}).strict();

export const MyUpcomingActivitiesSchema = z.object({
  as_user: AsUserSchema,
  days: z.coerce.number().int().positive().max(90).optional().default(7).describe("Number of days ahead to look (default 7, max 90)"),
  cursor: PageTokenSchema,
  limit: LimitSchema,
}).strict();

export const RecentlyUpdatedSchema = z.object({
  entity_type: z.enum(["deals", "persons", "organizations"]).describe("Entity type to check"),
  days: z.coerce.number().int().positive().max(90).optional().default(7).describe("Number of days back to look (default 7)"),
  as_user: AsUserSchema,
  cursor: PageTokenSchema,
  limit: LimitSchema,
}).strict();

export const MyPipelineSummarySchema = z.object({
  as_user: AsUserSchema,
  pipeline_id: z.coerce.number().int().positive().optional().describe("Specific pipeline (defaults to all)"),
}).strict();

export const StaleDealsSchema = z.object({
  days: z.coerce.number().int().positive().max(365).optional().default(30).describe("Days since last update to consider stale (default 30)"),
  as_user: AsUserSchema,
  pipeline_id: z.coerce.number().int().positive().optional(),
  cursor: PageTokenSchema,
  limit: LimitSchema,
}).strict();

export const PeopleNeedingFollowupSchema = z.object({
  as_user: AsUserSchema,
  cursor: PageTokenSchema,
  limit: LimitSchema,
}).strict();
