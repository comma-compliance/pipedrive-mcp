import { z } from "zod";
import {
  IdSchema,
  LimitSchema,
  PageTokenSchema,
  ConfirmDeleteSchema,
  DryRunSchema,
  ReasonSchema,
} from "./common.js";

export const NoteCommentsListSchema = z.object({
  note_id: IdSchema.describe("The note ID whose comments to list"),
  cursor: PageTokenSchema,
  limit: LimitSchema,
}).strict();

export const NoteCommentsGetSchema = z.object({
  note_id: IdSchema.describe("The note ID"),
  comment_id: z.string().uuid().describe("The comment UUID"),
}).strict();

export const NoteCommentsCreateSchema = z.object({
  note_id: IdSchema.describe("The note ID to comment on"),
  content_html: z.string().min(1).describe("Comment content in HTML (sanitized server-side)"),
}).strict();

export const NoteCommentsUpdateSchema = z.object({
  note_id: IdSchema.describe("The note ID"),
  comment_id: z.string().uuid().describe("The comment UUID to update"),
  content_html: z.string().min(1).describe("Updated comment content in HTML"),
}).strict();

export const NoteCommentsDeleteSchema = z.object({
  note_id: IdSchema.describe("The note ID"),
  comment_id: z.string().uuid().describe("The comment UUID to delete"),
  confirm: ConfirmDeleteSchema,
  dry_run: DryRunSchema,
  reason: ReasonSchema,
}).strict();
