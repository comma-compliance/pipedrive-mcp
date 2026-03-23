import { z } from "zod";
import { IdSchema, ConfirmYesSchema, DryRunSchema, ReasonSchema } from "./common.js";

export const WebhooksListSchema = z.object({}).strict();

export const WebhooksCreateSchema = z.object({
  subscription_url: z.string().url().describe("URL to receive webhook events"),
  event_action: z.enum(["create", "change", "delete", "*"]).describe("Action that triggers the webhook"),
  event_object: z.enum(["deal", "person", "organization", "activity", "note", "product", "lead", "pipeline", "stage", "user", "*"]).describe("Object type that triggers the webhook"),
  confirm: ConfirmYesSchema,
  dry_run: DryRunSchema,
  user_id: z.coerce.number().int().positive().optional().describe("User ID to scope events to"),
  http_auth_user: z.string().optional().describe("HTTP basic auth username for the webhook URL"),
  http_auth_password: z.string().optional().describe("HTTP basic auth password for the webhook URL"),
  version: z.enum(["1.0", "2.0"]).optional().default("2.0").describe("Webhook payload version"),
}).strict();

export const WebhooksDeleteSchema = z.object({
  webhook_id: IdSchema.describe("The webhook ID to delete"),
  confirm: ConfirmYesSchema,
  dry_run: DryRunSchema,
  reason: ReasonSchema,
}).strict();
