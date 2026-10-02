import { describe, it, expect, beforeAll, afterEach } from "vitest";
import nock from "nock";
import { readFileSync } from "fs";
import { join } from "path";
import { setupTestContext, callTool, BASE_URL } from "../../helpers/setup.js";

const fixturesV1 = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, "../../fixtures/v1", name), "utf-8"));
const fixturesV2 = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, "../../fixtures/v2", name), "utf-8"));

beforeAll(async () => {
  await setupTestContext();
});

afterEach(() => {
  nock.cleanAll();
});

describe("pipedrive_product_variations_list", () => {
  it("returns a compact list of variations", async () => {
    const fixture = fixturesV2("product-variations-list.json");

    nock(BASE_URL)
      .get("/api/v2/products/29/variations")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_product_variations_list", { product_id: 29 });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    const items = parsed.items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe(201);
    expect(items[0].name).toBe("Power (Annual)");
    expect(items[0].product_id).toBe(29);
    expect(items[0].prices).toBeInstanceOf(Array);
    expect(parsed.truncated).toBe(false);
  });
});

describe("pipedrive_product_variations_create", () => {
  it("creates a variation and returns it", async () => {
    const fixture = fixturesV2("product-variations-create.json");

    nock(BASE_URL)
      .post("/api/v2/products/29/variations", (body) => body.name === "Premium (Annual)")
      .query(true)
      .reply(201, fixture);

    const { result, data } = await callTool("pipedrive_product_variations_create", {
      product_id: 29,
      name: "Premium (Annual)",
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    const variation = parsed.variation as Record<string, unknown>;
    expect(variation.id).toBe(203);
    expect(variation.name).toBe("Premium (Annual)");
  });
});

describe("pipedrive_product_variations_update", () => {
  it("updates a variation name", async () => {
    const fixture = fixturesV2("product-variations-update.json");

    nock(BASE_URL)
      .patch("/api/v2/products/29/variations/203", (body) => body.name === "Premium Plus (Annual)")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_product_variations_update", {
      product_id: 29,
      product_variation_id: 203,
      name: "Premium Plus (Annual)",
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.message).toContain("203 updated");
  });
});

describe("pipedrive_product_variations_delete", () => {
  it("returns dry run result when dry_run is true", async () => {
    const { result, data } = await callTool("pipedrive_product_variations_delete", {
      product_id: 29,
      product_variation_id: 203,
      confirm: "DELETE",
      dry_run: true,
    });

    expect(result.isError).toBeFalsy();
    expect((data as Record<string, unknown>).dry_run).toBe(true);
  });

  it("rejects deletion without the DELETE confirmation", async () => {
    const { result } = await callTool("pipedrive_product_variations_delete", {
      product_id: 29,
      product_variation_id: 203,
      confirm: "nope",
    });

    expect(result.isError).toBe(true);
  });

  it("deletes a variation with confirmation", async () => {
    const fixture = fixturesV2("product-variations-delete.json");

    nock(BASE_URL)
      .delete("/api/v2/products/29/variations/203")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_product_variations_delete", {
      product_id: 29,
      product_variation_id: 203,
      confirm: "DELETE",
    });

    expect(result.isError).toBeFalsy();
    expect((data as Record<string, unknown>).message).toContain("deleted");
  });
});

describe("pipedrive_deal_products_add with variation", () => {
  it("passes product_variation_id through to the API", async () => {
    const fixture = fixturesV2("deal-products-add.json");
    let sentBody: Record<string, unknown> | undefined;

    nock(BASE_URL)
      .post("/api/v2/deals/117/products", (body) => {
        sentBody = body;
        return body.product_variation_id === 201;
      })
      .query(true)
      .reply(201, fixture);

    const { result } = await callTool("pipedrive_deal_products_add", {
      deal_id: 117,
      product_id: 29,
      item_price: 768,
      quantity: 1,
      product_variation_id: 201,
    });

    expect(result.isError).toBeFalsy();
    expect(sentBody?.product_variation_id).toBe(201);
  });
});

describe("pipedrive_deal_products_update with variation", () => {
  it("remaps a deal product's variation", async () => {
    const fixture = fixturesV2("deal-products-update.json");
    let sentBody: Record<string, unknown> | undefined;

    nock(BASE_URL)
      .patch("/api/v2/deals/117/products/9001", (body) => {
        sentBody = body;
        return body.product_variation_id === 202;
      })
      .query(true)
      .reply(200, fixture);

    const { result } = await callTool("pipedrive_deal_products_update", {
      deal_id: 117,
      deal_product_id: 9001,
      product_variation_id: 202,
    });

    expect(result.isError).toBeFalsy();
    expect(sentBody?.product_variation_id).toBe(202);
  });
});

describe("pipedrive_product_deals_list", () => {
  it("lists deals a product is attached to (v1, status filter)", async () => {
    const fixture = fixturesV1("product-deals-list.json");

    nock(BASE_URL)
      .get("/v1/products/29/deals")
      .query((q) => q.status === "won")
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_product_deals_list", {
      product_id: 29,
      status: "won",
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    const items = parsed.items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe(117);
    expect(items[0].status).toBe("won");
    expect(parsed.truncated).toBe(false);
  });
});
