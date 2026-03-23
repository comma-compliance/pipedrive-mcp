import { describe, it, expect, beforeAll, afterEach } from "vitest";
import nock from "nock";
import { readFileSync } from "fs";
import { join } from "path";
import { setupTestContext, callTool, BASE_URL, TEST_API_TOKEN } from "../../helpers/setup.js";

const fixturesV2 = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, "../../fixtures/v2", name), "utf-8"));

beforeAll(async () => {
  await setupTestContext();
});

afterEach(() => {
  nock.cleanAll();
});

describe("pipedrive_deals_list", () => {
  it("returns paginated deal list", async () => {
    const fixture = fixturesV2("deals-list.json");

    nock(BASE_URL)
      .get("/api/v2/deals")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_deals_list", {});

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.items).toBeInstanceOf(Array);
    const items = parsed.items as Array<Record<string, unknown>>;
    expect(items.length).toBe(3);
    expect(items[0].id).toBe(8);
    expect(items[0].title).toBe("Acme Corp - Enterprise Package");
    expect(items[0].status).toBe("open");
    expect(items[0].currency).toBe("USD");
    expect(items[0].pipeline_id).toBe(1);
    expect(parsed.truncated).toBe(true);
    expect(parsed.next_page_token).toBeTruthy();
  });
});

describe("pipedrive_deals_get", () => {
  it("returns a single deal with details", async () => {
    const fixture = fixturesV2("deals-get.json");
    // deals_get also calls dealFields for custom field resolution
    const dealFieldsFixture = JSON.parse(
      readFileSync(join(__dirname, "../../fixtures/v1/dealFields-list.json"), "utf-8"),
    );

    nock(BASE_URL)
      .get("/api/v2/deals/117")
      .query(true)
      .reply(200, fixture);

    nock(BASE_URL)
      .get("/v1/dealFields")
      .query(true)
      .reply(200, dealFieldsFixture);

    const { result, data } = await callTool("pipedrive_deals_get", { deal_id: 117 });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.id).toBe(117);
    expect(parsed.title).toBe("Acme Corp - Enterprise Package");
    expect(parsed.value).toBe(10000);
    expect(parsed.status).toBe("open");
    expect(parsed._raw).toBeDefined();
  });
});

describe("pipedrive_deals_search", () => {
  it("returns search results (empty)", async () => {
    const fixture = fixturesV2("deals-search.json");

    nock(BASE_URL)
      .get("/api/v2/deals/search")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_deals_search", {
      term: "nonexistent",
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    // Search returns items wrapped in an object when API returns { items: [] }
    expect(parsed.truncated).toBe(false);
  });
});

describe("pipedrive_deals_create", () => {
  it("creates a deal and returns compact result", async () => {
    const fixture = fixturesV2("deals-create.json");

    nock(BASE_URL)
      .post("/api/v2/deals")
      .query(true)
      .reply(201, fixture);

    const { result, data } = await callTool("pipedrive_deals_create", {
      title: "Acme Corp - Enterprise Package",
      value: 10000,
      currency: "USD",
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.message).toBe("Deal created successfully");
    const deal = parsed.deal as Record<string, unknown>;
    expect(deal.id).toBe(117);
    expect(deal.title).toBe("Acme Corp - Enterprise Package");
    expect(deal.value).toBe(10000);
  });
});

describe("pipedrive_deals_update", () => {
  it("updates a deal and returns compact result", async () => {
    const fixture = fixturesV2("deals-update.json");

    nock(BASE_URL)
      .patch("/api/v2/deals/117")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_deals_update", {
      deal_id: 117,
      title: "Acme Corp - Enterprise Package Updated",
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.message).toBe("Deal 117 updated");
    const deal = parsed.deal as Record<string, unknown>;
    expect(deal.id).toBe(117);
    expect(deal.title).toBe("Acme Corp - Enterprise Package Updated");
  });
});

describe("pipedrive_deals_delete", () => {
  it("returns dry run result when dry_run is true", async () => {
    const { result, data } = await callTool("pipedrive_deals_delete", {
      deal_id: 117,
      confirm: "DELETE",
      dry_run: true,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.dry_run).toBe(true);
    expect(parsed.tool).toBe("pipedrive_deals_delete");
  });

  it("deletes a deal with confirmation", async () => {
    const fixture = fixturesV2("deals-delete.json");

    nock(BASE_URL)
      .delete("/api/v2/deals/117")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_deals_delete", {
      deal_id: 117,
      confirm: "DELETE",
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.message).toBe("Deal 117 deleted");
  });

  it("rejects delete without confirmation", async () => {
    const { result } = await callTool("pipedrive_deals_delete", {
      deal_id: 117,
    });

    expect(result.isError).toBe(true);
  });
});
