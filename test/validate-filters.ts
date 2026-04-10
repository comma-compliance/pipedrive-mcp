/**
 * Validates that every filter parameter on list endpoints is accepted by the
 * live Pipedrive API.  Read-only - only issues GET requests.
 *
 * Usage:
 *   PIPEDRIVE_API_TOKEN=xxx PIPEDRIVE_COMPANY_DOMAIN=xxx npx tsx test/validate-filters.ts
 */

const API_TOKEN = process.env.PIPEDRIVE_API_TOKEN;
const DOMAIN = process.env.PIPEDRIVE_COMPANY_DOMAIN;
if (!API_TOKEN || !DOMAIN) {
  console.error("Set PIPEDRIVE_API_TOKEN and PIPEDRIVE_COMPANY_DOMAIN");
  process.exit(1);
}

const V1 = `https://${DOMAIN}.pipedrive.com/v1`;
const V2 = `https://${DOMAIN}.pipedrive.com/api/v2`;

interface FilterTest {
  tool: string;
  base: string;
  path: string;
  params: Record<string, string>;
}

interface SeedIds {
  ownerId: string;
  dealId?: string;
  personId?: string;
  orgId?: string;
  leadId?: string;
}

function buildTests(ids: SeedIds): FilterTest[] {
  const { ownerId, dealId, personId, orgId, leadId } = ids;
  return [
    // ---- v2 activities ----
    { tool: "activities_list", base: V2, path: "/activities", params: { limit: "1", done: "true" } },
    { tool: "activities_list", base: V2, path: "/activities", params: { limit: "1", sort_by: "update_time" } },
    { tool: "activities_list", base: V2, path: "/activities", params: { limit: "1", sort_direction: "desc" } },
    { tool: "activities_list", base: V2, path: "/activities", params: { limit: "1", owner_id: ownerId } },
    ...(dealId ? [{ tool: "activities_list", base: V2, path: "/activities", params: { limit: "1", deal_id: dealId } }] : []),
    ...(personId ? [{ tool: "activities_list", base: V2, path: "/activities", params: { limit: "1", person_id: personId } }] : []),
    ...(orgId ? [{ tool: "activities_list", base: V2, path: "/activities", params: { limit: "1", org_id: orgId } }] : []),
    ...(leadId ? [{ tool: "activities_list", base: V2, path: "/activities", params: { limit: "1", lead_id: leadId } }] : []),

    // ---- v2 deals ----
    { tool: "deals_list", base: V2, path: "/deals", params: { limit: "1", status: "open" } },
    { tool: "deals_list", base: V2, path: "/deals", params: { limit: "1", sort_by: "update_time" } },
    { tool: "deals_list", base: V2, path: "/deals", params: { limit: "1", sort_direction: "desc" } },
    { tool: "deals_list", base: V2, path: "/deals", params: { limit: "1", owner_id: ownerId } },
    { tool: "deals_list", base: V2, path: "/deals", params: { limit: "1", pipeline_id: "1" } },
    { tool: "deals_list", base: V2, path: "/deals", params: { limit: "1", stage_id: "1" } },
    { tool: "deals_list", base: V2, path: "/deals", params: { limit: "1", updated_since: "2025-01-01T00:00:00Z" } },
    { tool: "deals_list", base: V2, path: "/deals", params: { limit: "1", updated_until: "2026-12-31T00:00:00Z" } },
    { tool: "deals_list", base: V2, path: "/deals", params: { limit: "1", filter_id: "0" } },

    // ---- v2 persons ----
    { tool: "persons_list", base: V2, path: "/persons", params: { limit: "1", owner_id: ownerId } },
    { tool: "persons_list", base: V2, path: "/persons", params: { limit: "1", sort_by: "update_time" } },
    { tool: "persons_list", base: V2, path: "/persons", params: { limit: "1", sort_direction: "desc" } },
    { tool: "persons_list", base: V2, path: "/persons", params: { limit: "1", updated_since: "2025-01-01T00:00:00Z" } },
    { tool: "persons_list", base: V2, path: "/persons", params: { limit: "1", updated_until: "2026-12-31T00:00:00Z" } },
    { tool: "persons_list", base: V2, path: "/persons", params: { limit: "1", filter_id: "0" } },

    // ---- v2 organizations ----
    { tool: "orgs_list", base: V2, path: "/organizations", params: { limit: "1", owner_id: ownerId } },
    { tool: "orgs_list", base: V2, path: "/organizations", params: { limit: "1", sort_by: "update_time" } },
    { tool: "orgs_list", base: V2, path: "/organizations", params: { limit: "1", sort_direction: "desc" } },
    { tool: "orgs_list", base: V2, path: "/organizations", params: { limit: "1", updated_since: "2025-01-01T00:00:00Z" } },
    { tool: "orgs_list", base: V2, path: "/organizations", params: { limit: "1", updated_until: "2026-12-31T00:00:00Z" } },
    { tool: "orgs_list", base: V2, path: "/organizations", params: { limit: "1", filter_id: "0" } },

    // ---- v2 products ----
    { tool: "products_list", base: V2, path: "/products", params: { limit: "1", owner_id: ownerId } },
    { tool: "products_list", base: V2, path: "/products", params: { limit: "1", sort_by: "update_time" } },
    { tool: "products_list", base: V2, path: "/products", params: { limit: "1", sort_direction: "desc" } },
    { tool: "products_list", base: V2, path: "/products", params: { limit: "1", filter_id: "0" } },

    // ---- v2 pipelines ----
    { tool: "pipelines_list", base: V2, path: "/pipelines", params: { limit: "1" } },

    // ---- v2 stages ----
    { tool: "stages_list", base: V2, path: "/stages", params: { limit: "1", pipeline_id: "1" } },
    { tool: "stages_list", base: V2, path: "/stages", params: { limit: "1", sort_by: "order_nr" } },
    { tool: "stages_list", base: V2, path: "/stages", params: { limit: "1", sort_direction: "asc" } },

    // ---- v1 leads ----
    { tool: "leads_list", base: V1, path: "/leads", params: { limit: "1", archived_status: "not_archived" } },
    { tool: "leads_list", base: V1, path: "/leads", params: { limit: "1", owner_id: ownerId } },
    { tool: "leads_list", base: V1, path: "/leads", params: { limit: "1", sort: "add_time ASC" } },

    // ---- v1 notes ----
    { tool: "notes_list", base: V1, path: "/notes", params: { limit: "1", sort: "add_time ASC" } },
    { tool: "notes_list", base: V1, path: "/notes", params: { limit: "1", user_id: ownerId } },

    // ---- v1 files ----
    { tool: "files_list", base: V1, path: "/files", params: { limit: "1", sort: "add_time" } },

    // ---- v1 users ----
    { tool: "users_list", base: V1, path: "/users", params: {} },

    // ---- v1 filters ----
    { tool: "filters_list", base: V1, path: "/filters", params: { type: "deals" } },
    { tool: "filters_list", base: V1, path: "/filters", params: { type: "people" } },
    { tool: "filters_list", base: V1, path: "/filters", params: { type: "org" } },
    { tool: "filters_list", base: V1, path: "/filters", params: { type: "products" } },
    { tool: "filters_list", base: V1, path: "/filters", params: { type: "activity" } },
    { tool: "filters_list", base: V1, path: "/filters", params: { type: "leads" } },
    { tool: "filters_list", base: V1, path: "/filters", params: { type: "projects" } },

    // ---- v1 mail threads ----
    { tool: "mail_threads_list", base: V1, path: "/mailbox/mailThreads", params: { limit: "1", folder: "inbox" } },
    { tool: "mail_threads_list", base: V1, path: "/mailbox/mailThreads", params: { limit: "1", folder: "sent" } },
  ];
}

async function runTest(t: FilterTest): Promise<{ tool: string; params: string; status: number; ok: boolean; error?: string }> {
  const url = new URL(`${t.base}${t.path}`);
  url.searchParams.set("api_token", API_TOKEN!);
  for (const [k, v] of Object.entries(t.params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const paramStr = Object.entries(t.params)
    .filter(([k]) => k !== "limit")
    .map(([k, v]) => `${k}=${v}`)
    .join("&") || "(baseline)";

  let error: string | undefined;
  if (res.status >= 400) {
    try {
      const body = await res.json();
      error = body.error || body.message || JSON.stringify(body).slice(0, 200);
    } catch {
      error = await res.text().then((t) => t.slice(0, 200));
    }
  }

  return { tool: t.tool, params: paramStr, status: res.status, ok: res.status < 400, error };
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  return res.json();
}

async function discoverSeedIds(): Promise<SeedIds> {
  // User
  const usersBody = await fetchJson(`${V1}/users?api_token=${API_TOKEN}`) as { data?: { id: number; name: string }[] };
  const firstUser = usersBody.data?.[0];
  if (!firstUser) throw new Error("No users found in Pipedrive account");
  console.log(`  owner_id=${firstUser.id} (${firstUser.name})`);

  // Deal (also gives us person_id and org_id)
  const dealsBody = await fetchJson(`${V2}/deals?api_token=${API_TOKEN}&limit=1`) as { data?: { id: number; person_id?: number; org_id?: number }[] };
  const deal = dealsBody.data?.[0];
  if (deal) console.log(`  deal_id=${deal.id}  person_id=${deal.person_id ?? "none"}  org_id=${deal.org_id ?? "none"}`);

  // Lead
  const leadsBody = await fetchJson(`${V1}/leads?api_token=${API_TOKEN}&limit=1`) as { data?: { id: string }[] };
  const lead = leadsBody.data?.[0];
  if (lead) console.log(`  lead_id=${lead.id}`);

  return {
    ownerId: String(firstUser.id),
    dealId: deal ? String(deal.id) : undefined,
    personId: deal?.person_id ? String(deal.person_id) : undefined,
    orgId: deal?.org_id ? String(deal.org_id) : undefined,
    leadId: lead?.id,
  };
}

async function main() {
  console.log("Discovering seed IDs...");
  const ids = await discoverSeedIds();
  console.log();

  const tests = buildTests(ids);
  console.log(`Validating ${tests.length} filter combinations against ${DOMAIN}.pipedrive.com\n`);

  const results = [];
  // Run sequentially to stay within rate limits
  for (const t of tests) {
    const r = await runTest(t);
    const icon = r.ok ? "\x1b[32mOK\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
    console.log(`  [${icon}] ${r.tool}  ${r.params}  (${r.status})`);
    if (r.error) console.log(`        ${r.error}`);
    results.push(r);
  }

  const failures = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failures.length}/${results.length} passed`);

  if (failures.length > 0) {
    console.log("\nFailed filters:");
    for (const f of failures) {
      console.log(`  ${f.tool}  ${f.params}  -> ${f.status}: ${f.error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
