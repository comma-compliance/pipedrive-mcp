import { z } from "zod";
import { IdSchema } from "./common.js";

export const UsersListSchema = z.object({
  active_flag: z.boolean().optional().describe("Filter by active status"),
}).strict();

export const UsersGetSchema = z.object({
  user_id: IdSchema.describe("The user ID to retrieve"),
}).strict();

export const UsersPermissionsSchema = z.object({
  user_id: IdSchema.describe("The user ID to get permissions for"),
}).strict();
