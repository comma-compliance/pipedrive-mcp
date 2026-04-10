import { z } from "zod";
import {
  IdSchema,
  LimitSchema,
  PageTokenSchema,
  SortDirectionSchema,
  OwnerIdSchema,
  ConfirmDeleteSchema,
  DryRunSchema,
  ReasonSchema,
} from "./common.js";

export const ActivitiesListSchema = z.object({
  user_id: z.coerce.number().int().positive().optional().describe("Filter by user ID"),
  owner_id: OwnerIdSchema,
  deal_id: z.coerce.number().int().positive().optional().describe("Filter by deal ID"),
  person_id: z.coerce.number().int().positive().optional().describe("Filter by person ID"),
  org_id: z.coerce.number().int().positive().optional().describe("Filter by organization ID"),
  lead_id: z.string().optional().describe("Filter by lead ID"),
  done: z.boolean().optional().describe("Filter by done status"),
  cursor: PageTokenSchema,
  limit: LimitSchema,
  sort_by: z.enum(["id", "update_time", "add_time", "due_date"]).optional().describe("Field to sort by"),
  sort_direction: SortDirectionSchema,
}).strict();

export const ActivitiesGetSchema = z.object({
  activity_id: IdSchema.describe("The activity ID to retrieve"),
}).strict();

export const ActivitiesCreateSchema = z.object({
  subject: z.string().min(1).describe("Activity subject"),
  type: z.string().min(1).describe("Activity type (e.g. 'call', 'meeting', 'task', 'email')"),
  deal_id: z.coerce.number().int().positive().optional(),
  person_id: z.coerce.number().int().positive().optional(),
  org_id: z.coerce.number().int().positive().optional(),
  lead_id: z.string().optional(),
  user_id: z.coerce.number().int().positive().optional(),
  due_date: z.string().optional().describe("Due date (YYYY-MM-DD)"),
  due_time: z.string().optional().describe("Due time (HH:MM)"),
  duration: z.string().optional().describe("Duration (HH:MM)"),
  note: z.string().optional().describe("Note content"),
  location: z.string().optional(),
  done: z.boolean().optional().default(false),
}).strict();

export const ActivitiesUpdateSchema = z.object({
  activity_id: IdSchema.describe("The activity ID to update"),
  subject: z.string().optional(),
  type: z.string().optional(),
  deal_id: z.coerce.number().int().positive().optional(),
  person_id: z.coerce.number().int().positive().optional(),
  org_id: z.coerce.number().int().positive().optional(),
  lead_id: z.string().optional(),
  user_id: z.coerce.number().int().positive().optional(),
  due_date: z.string().optional(),
  due_time: z.string().optional(),
  duration: z.string().optional(),
  note: z.string().optional(),
  location: z.string().optional(),
  done: z.boolean().optional(),
}).strict();

export const ActivitiesMarkDoneSchema = z.object({
  activity_id: IdSchema.describe("The activity ID"),
  done: z.boolean().describe("true to mark done, false to mark undone"),
}).strict();

export const ActivitiesDeleteSchema = z.object({
  activity_id: IdSchema.describe("The activity ID to delete"),
  confirm: ConfirmDeleteSchema,
  dry_run: DryRunSchema,
  reason: ReasonSchema,
}).strict();
