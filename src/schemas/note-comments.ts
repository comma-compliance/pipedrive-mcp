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
  content_html: z.string().min(1).describe("Plain HTML markup for the comment (e.g. <p>, <br>, <strong>, <em>, <a href>); sanitized server-side. Pass the HTML directly. Do not wrap it in a CDATA section (<![CDATA[ ... ]]>); CDATA is XML syntax, not HTML."),
}).strict();

export const NoteCommentsUpdateSchema = z.object({
  note_id: IdSchema.describe("The note ID"),
  comment_id: z.string().uuid().describe("The comment UUID to update"),
  content_html: z.string().min(1).describe("Updated plain HTML markup for the comment (e.g. <p>, <br>, <strong>, <em>, <a href>); sanitized server-side. Pass the HTML directly. Do not wrap it in a CDATA section (<![CDATA[ ... ]]>); CDATA is XML syntax, not HTML."),
}).strict();

export const NoteCommentsDeleteSchema = z.object({
  note_id: IdSchema.describe("The note ID"),
  comment_id: z.string().uuid().describe("The comment UUID to delete"),
  confirm: ConfirmDeleteSchema,
  dry_run: DryRunSchema,
  reason: ReasonSchema,
}).strict();
