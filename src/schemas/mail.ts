import { z } from "zod";
import {
  IdSchema,
  LimitSchema,
  PageTokenSchema,
  ConfirmDeleteSchema,
  DryRunSchema,
  ReasonSchema,
} from "./common.js";

export const MailThreadsListSchema = z.object({
  folder: z.enum(["inbox", "drafts", "sent", "archive"]).optional().describe("Mail folder to filter by (defaults to inbox)"),
  cursor: PageTokenSchema,
  limit: LimitSchema,
}).strict();

export const MailThreadsGetSchema = z.object({
  thread_id: IdSchema.describe("The mail thread ID to retrieve"),
}).strict();

export const MailThreadMessagesListSchema = z.object({
  thread_id: IdSchema.describe("The mail thread ID"),
  include_body: z.boolean().optional().default(false).describe("Include full message body in response"),
}).strict();

export const MailMessagesGetSchema = z.object({
  message_id: IdSchema.describe("The mail message ID to retrieve"),
  include_body: z.boolean().optional().default(false).describe("Include full message body in response"),
}).strict();

export const MailThreadsUpdateSchema = z.object({
  thread_id: IdSchema.describe("The mail thread ID to update"),
  deal_id: z.coerce.number().int().positive().optional().describe("Link thread to this deal ID"),
  lead_id: z.string().optional().describe("Link thread to this lead ID"),
  shared_flag: z.boolean().optional().describe("Share thread with company (true) or keep private (false)"),
  read_flag: z.boolean().optional().describe("Mark as read (true) or unread (false)"),
  archived_flag: z.boolean().optional().describe("Archive (true) or unarchive (false) the thread"),
}).strict();

export const MailThreadsDeleteSchema = z.object({
  thread_id: IdSchema.describe("The mail thread ID to delete"),
  confirm: ConfirmDeleteSchema,
  dry_run: DryRunSchema,
  reason: ReasonSchema,
}).strict();

export const DealMailMessagesListSchema = z.object({
  deal_id: IdSchema.describe("The deal ID"),
  cursor: PageTokenSchema,
  limit: LimitSchema,
}).strict();

export const PersonMailMessagesListSchema = z.object({
  person_id: IdSchema.describe("The person ID"),
  cursor: PageTokenSchema,
  limit: LimitSchema,
}).strict();
