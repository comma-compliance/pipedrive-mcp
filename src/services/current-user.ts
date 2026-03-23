import { TtlCache } from "./cache.js";
import { getContext } from "../server.js";
import { withRetry } from "../pipedrive/retries.js";
import { log } from "../logging.js";

interface PipedriveUser {
  id: number;
  name: string;
  email: string;
  active_flag: boolean;
}

// Cache the "me" user and the full users list
const meCache = new TtlCache<PipedriveUser>(300000); // 5 min
const usersCache = new TtlCache<PipedriveUser[]>(300000);

export async function getCurrentUser(): Promise<PipedriveUser> {
  const cached = meCache.get("me");
  if (cached) return cached;

  const { apiV1, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.get<Record<string, unknown>>("/users/me"), {
      label: "GET /users/me",
    }),
  );

  if (response.status !== 200 || !response.data.data) {
    throw new Error(`Failed to get current user: HTTP ${response.status}`);
  }

  const data = response.data.data as Record<string, unknown>;
  const user: PipedriveUser = {
    id: data.id as number,
    name: data.name as string,
    email: data.email as string,
    active_flag: (data.active_flag as boolean) ?? true,
  };

  meCache.set("me", user);
  log.debug(`Current user resolved: ${user.name} (${user.id})`);
  return user;
}

async function getAllUsers(): Promise<PipedriveUser[]> {
  const cached = usersCache.get("all");
  if (cached) return cached;

  const { apiV1, rateLimiters } = getContext();
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.list<Record<string, unknown>>("/users"), {
      label: "GET /users",
    }),
  );

  if (response.status !== 200) {
    throw new Error(`Failed to list users: HTTP ${response.status}`);
  }

  const users: PipedriveUser[] = (response.data.data ?? []).map((u) => ({
    id: u.id as number,
    name: u.name as string,
    email: u.email as string,
    active_flag: (u.active_flag as boolean) ?? true,
  }));

  usersCache.set("all", users);
  return users;
}

/**
 * Resolve the owner ID for "my" tools.
 * - No as_user: returns the API token owner via /users/me
 * - as_user provided: matches by name or email against the users list
 */
export async function resolveOwnerId(asUser?: string): Promise<{
  ownerId: number;
  userName: string;
  error?: string;
}> {
  if (!asUser) {
    const me = await getCurrentUser();
    return { ownerId: me.id, userName: me.name };
  }

  const users = await getAllUsers();
  const needle = asUser.toLowerCase().trim();

  // Try exact email match first
  const byEmail = users.find((u) => u.email.toLowerCase() === needle);
  if (byEmail) return { ownerId: byEmail.id, userName: byEmail.name };

  // Try exact name match
  const byName = users.find((u) => u.name.toLowerCase() === needle);
  if (byName) return { ownerId: byName.id, userName: byName.name };

  // Try partial name match
  const byPartial = users.find((u) => u.name.toLowerCase().includes(needle));
  if (byPartial) return { ownerId: byPartial.id, userName: byPartial.name };

  const available = users.map((u) => `${u.name} (${u.email})`).join(", ");
  return {
    ownerId: 0,
    userName: "",
    error: `No user matching "${asUser}". Available users: ${available}`,
  };
}
