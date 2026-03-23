import { describe, it, expect, beforeAll, afterEach } from "vitest";
import nock from "nock";
import { readFileSync } from "fs";
import { join } from "path";
import { setupTestContext, callTool, BASE_URL } from "../../helpers/setup.js";

const fixturesV2 = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, "../../fixtures/v2", name), "utf-8"));

beforeAll(async () => {
  await setupTestContext();
});

afterEach(() => {
  nock.cleanAll();
});

describe("pipedrive_organizations_list", () => {
  it("returns paginated organization list", async () => {
    const fixture = fixturesV2("organizations-list.json");

    nock(BASE_URL)
      .get("/api/v2/organizations")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_organizations_list", {});

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.items).toBeInstanceOf(Array);
    const items = parsed.items as Array<Record<string, unknown>>;
    expect(items.length).toBe(3);
    expect(items[0].id).toBe(6);
    expect(items[0].name).toBe("Acme Corp");
    expect(parsed.truncated).toBe(true);
    expect(parsed.next_page_token).toBeTruthy();
  });
});

describe("pipedrive_organizations_get", () => {
  it("returns a single organization with details", async () => {
    const fixture = fixturesV2("organizations-get.json");
    // organizations_get calls organizationFields for custom field resolution
    // but there's no orgFields fixture, so we'll stub it to prevent errors
    // The v1 orgFields endpoint uses /organizationFields
    nock(BASE_URL)
      .get("/api/v2/organizations/301")
      .query(true)
      .reply(200, fixture);

    nock(BASE_URL)
      .get("/v1/organizationFields")
      .query(true)
      .reply(200, { success: true, data: [] });

    const { result, data } = await callTool("pipedrive_organizations_get", {
      org_id: 301,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.id).toBe(301);
    expect(parsed.name).toBe("Acme Corp");
    expect(parsed._raw).toBeDefined();
  });
});

describe("pipedrive_organizations_create", () => {
  it("creates an organization and returns compact result", async () => {
    const fixture = fixturesV2("organizations-create.json");

    nock(BASE_URL)
      .post("/api/v2/organizations")
      .query(true)
      .reply(201, fixture);

    const { result, data } = await callTool("pipedrive_organizations_create", {
      name: "Acme Corp",
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.message).toBe("Organization created");
    const org = parsed.organization as Record<string, unknown>;
    expect(org.id).toBe(301);
    expect(org.name).toBe("Acme Corp");
  });
});

describe("pipedrive_organizations_delete", () => {
  it("returns dry run result when dry_run is true", async () => {
    const { result, data } = await callTool("pipedrive_organizations_delete", {
      org_id: 301,
      confirm: "DELETE",
      dry_run: true,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.dry_run).toBe(true);
  });

  it("deletes an organization with confirmation", async () => {
    const fixture = fixturesV2("organizations-delete.json");

    nock(BASE_URL)
      .delete("/api/v2/organizations/301")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_organizations_delete", {
      org_id: 301,
      confirm: "DELETE",
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.message).toBe("Organization 301 deleted");
  });

  it("rejects delete without confirmation", async () => {
    const { result } = await callTool("pipedrive_organizations_delete", {
      org_id: 301,
    });

    expect(result.isError).toBe(true);
  });
});
