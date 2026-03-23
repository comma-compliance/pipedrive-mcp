import { z } from "zod";
import {
  IdSchema,
  LimitSchema,
  PageTokenSchema,
  ConfirmDeleteSchema,
  DryRunSchema,
  ReasonSchema,
} from "./common.js";

export const NotesListSchema = z.object({
  deal_id: z.coerce.number().int().positive().optional().describe("Filter by deal ID"),
  person_id: z.coerce.number().int().positive().optional().describe("Filter by person ID"),
  org_id: z.coerce.number().int().positive().optional().describe("Filter by organization ID"),
  lead_id: z.string().optional().describe("Filter by lead ID"),
  user_id: z.coerce.number().int().positive().optional().describe("Filter by user ID"),
  cursor: PageTokenSchema,
  limit: LimitSchema,
  sort: z.enum(["add_time ASC", "add_time DESC", "update_time ASC", "update_time DESC"]).optional().describe("Sort order"),
}).strict();

export const NotesGetSchema = z.object({
  note_id: IdSchema.describe("The note ID to retrieve"),
}).strict();

export const NotesCreateSchema = z.object({
  content_html: z.string().min(1).describe("Note content in HTML"),
  deal_id: z.coerce.number().int().positive().optional().describe("Attach to this deal"),
  person_id: z.coerce.number().int().positive().optional().describe("Attach to this person"),
  org_id: z.coerce.number().int().positive().optional().describe("Attach to this organization"),
  lead_id: z.string().optional().describe("Attach to this lead"),
  pinned_to_deal_flag: z.boolean().optional().default(false),
  pinned_to_person_flag: z.boolean().optional().default(false),
  pinned_to_organization_flag: z.boolean().optional().default(false),
}).strict();

export const NotesUpdateSchema = z.object({
  note_id: IdSchema.describe("The note ID to update"),
  content_html: z.string().min(1).describe("Updated note content in HTML"),
  pinned_to_deal_flag: z.boolean().optional(),
  pinned_to_person_flag: z.boolean().optional(),
  pinned_to_organization_flag: z.boolean().optional(),
}).strict();

export const NotesDeleteSchema = z.object({
  note_id: IdSchema.describe("The note ID to delete"),
  confirm: ConfirmDeleteSchema,
  dry_run: DryRunSchema,
  reason: ReasonSchema,
}).strict();
