import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import nock from "nock";
import { setupTestContext, callTool, BASE_URL } from "../../helpers/setup.js";
import { clearFieldCache } from "../../../src/services/custom-fields.js";

const REGULATORS_KEY = "76239981bcf67ef2f406fb9e6844e5f08e1819bc";
const TIER_KEY = "1ce23e842fd6fa6615cfa401accb5e5d6032c228";

const dealFields = {
  success: true,
  data: [
    { key: "title", name: "Title", field_type: "varchar" },
    {
      key: "label",
      name: "Label",
      field_type: "set",
      options: [
        { id: 367, label: "Test / Internal" },
        { id: 400, label: "Hot" },
      ],
    },
    {
      key: REGULATORS_KEY,
      name: "Regulator(s) Confirmed",
      field_type: "set",
      options: [
        { id: 271, label: "[US] FINRA - Financial Industry Regulatory Authority" },
        { id: 272, label: "[US] SEC - Securities and Exchange Commission" },
      ],
    },
    {
      key: TIER_KEY,
      name: "Tier",
      field_type: "enum",
      options: [
        { id: 138, label: "T1" },
        { id: 139, label: "T2" },
      ],
    },
  ],
};

// Person and org setups expose both the legacy single "label" enum and the
// multi-option "label_ids" set; writes must target label_ids.
const labelFields = (labelId: number) => ({
  success: true,
  data: [
    { key: "name", name: "Name", field_type: "varchar" },
    { key: "label", name: "Label", field_type: "enum", options: [{ id: labelId, label: "Test / Internal" }] },
    { key: "label_ids", name: "Labels", field_type: "set", options: [{ id: labelId, label: "Test / Internal" }] },
  ],
});

function captureBody(method: "post" | "patch", path: string, data: Record<string, unknown>) {
  const captured: { body?: Record<string, unknown> } = {};
  nock(BASE_URL)
    [method](path, (body) => {
      captured.body = body as Record<string, unknown>;
      return true;
    })
    .query(true)
    .reply(200, { success: true, data });
  return captured;
}

function mockFields(path: string, body: unknown) {
  nock(BASE_URL).get(path).query(true).reply(200, body);
}

beforeAll(async () => {
  await setupTestContext();
});

beforeEach(() => {
  clearFieldCache();
});

afterEach(() => {
  nock.cleanAll();
});

describe("multi-option (set) custom fields on v2 writes", () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["array of ids via custom_fields", { custom_fields: { [REGULATORS_KEY]: [271] } }],
    ["numeric string via custom_fields", { custom_fields: { [REGULATORS_KEY]: "271" } }],
    [
      "array of labels via custom_fields_by_name",
      { custom_fields_by_name: { "Regulator(s) Confirmed": ["[US] FINRA - Financial Industry Regulatory Authority"] } },
    ],
  ];

  for (const [name, input] of cases) {
    it(`sends a JSON array of integer ids (${name})`, async () => {
      mockFields("/v1/dealFields", dealFields);
      const captured = captureBody("patch", "/api/v2/deals/227", { id: 227, title: "Test" });

      const { result } = await callTool("pipedrive_deals_update", { deal_id: 227, ...input });

      expect(result.isError).toBeFalsy();
      expect(captured.body).toEqual({ custom_fields: { [REGULATORS_KEY]: [271] } });
    });
  }

  it("sends multiple ids from a comma-separated string", async () => {
    mockFields("/v1/dealFields", dealFields);
    const captured = captureBody("patch", "/api/v2/deals/227", { id: 227 });

    await callTool("pipedrive_deals_update", { deal_id: 227, custom_fields: { [REGULATORS_KEY]: "271,272" } });

    expect(captured.body?.custom_fields).toEqual({ [REGULATORS_KEY]: [271, 272] });
  });

  it("keeps single-option enum fields as a scalar id", async () => {
    mockFields("/v1/dealFields", dealFields);
    const captured = captureBody("patch", "/api/v2/deals/227", { id: 227 });

    await callTool("pipedrive_deals_update", { deal_id: 227, custom_fields_by_name: { Tier: "T2" } });

    expect(captured.body?.custom_fields).toEqual({ [TIER_KEY]: 139 });
  });
});

describe("native label field on v2 writes", () => {
  it("deals_update sends label_ids top-level, not inside custom_fields", async () => {
    mockFields("/v1/dealFields", dealFields);
    const captured = captureBody("patch", "/api/v2/deals/227", { id: 227 });

    const { result } = await callTool("pipedrive_deals_update", {
      deal_id: 227,
      label_ids: [367],
      custom_fields: { [REGULATORS_KEY]: [271] },
    });

    expect(result.isError).toBeFalsy();
    expect(captured.body).toEqual({ label_ids: [367], custom_fields: { [REGULATORS_KEY]: [271] } });
  });

  it("resolves label names to ids", async () => {
    mockFields("/v1/dealFields", dealFields);
    const captured = captureBody("patch", "/api/v2/deals/227", { id: 227 });

    await callTool("pipedrive_deals_update", { deal_id: 227, label_ids: ["test / internal", "Hot"] });

    expect(captured.body).toEqual({ label_ids: [367, 400] });
  });

  it("pulls a 'label' key out of custom_fields into top-level label_ids", async () => {
    mockFields("/v1/dealFields", dealFields);
    const captured = captureBody("patch", "/api/v2/deals/227", { id: 227 });

    await callTool("pipedrive_deals_update", { deal_id: 227, custom_fields: { label_ids: [367] } });

    expect(captured.body).toEqual({ label_ids: [367] });
  });

  it("pulls 'Label' out of custom_fields_by_name into top-level label_ids", async () => {
    mockFields("/v1/dealFields", dealFields);
    const captured = captureBody("patch", "/api/v2/deals/227", { id: 227 });

    await callTool("pipedrive_deals_update", { deal_id: 227, custom_fields_by_name: { Label: "Test / Internal" } });

    expect(captured.body).toEqual({ label_ids: [367] });
  });

  it("passes [] to clear labels", async () => {
    mockFields("/v1/dealFields", dealFields);
    const captured = captureBody("patch", "/api/v2/deals/227", { id: 227 });

    await callTool("pipedrive_deals_update", { deal_id: 227, label_ids: [] });

    expect(captured.body).toEqual({ label_ids: [] });
  });

  it("rejects an unknown label without calling the API", async () => {
    mockFields("/v1/dealFields", dealFields);

    const { result } = await callTool("pipedrive_deals_update", { deal_id: 227, label_ids: [999] });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain("Test / Internal (367)");
  });

  it("deals_create sends label_ids top-level", async () => {
    mockFields("/v1/dealFields", dealFields);
    const captured = captureBody("post", "/api/v2/deals", { id: 1, title: "New" });

    await callTool("pipedrive_deals_create", { title: "New", label_ids: [367] });

    expect(captured.body).toEqual({ title: "New", label_ids: [367] });
  });

  it("persons_create and persons_update send label_ids top-level", async () => {
    mockFields("/v1/personFields", labelFields(369));
    const created = captureBody("post", "/api/v2/persons", { id: 5, name: "P" });
    await callTool("pipedrive_persons_create", { name: "P", label_ids: ["Test / Internal"] });
    expect(created.body).toEqual({ name: "P", label_ids: [369] });

    const updated = captureBody("patch", "/api/v2/persons/5", { id: 5 });
    await callTool("pipedrive_persons_update", { person_id: 5, custom_fields_by_name: { Label: 369 } });
    expect(updated.body).toEqual({ label_ids: [369] });
  });

  it("organizations_create and organizations_update send label_ids top-level", async () => {
    mockFields("/v1/organizationFields", labelFields(368));
    const created = captureBody("post", "/api/v2/organizations", { id: 7, name: "O" });
    await callTool("pipedrive_organizations_create", { name: "O", label_ids: 368 });
    expect(created.body).toEqual({ name: "O", label_ids: [368] });

    const updated = captureBody("patch", "/api/v2/organizations/7", { id: 7 });
    await callTool("pipedrive_organizations_update", { org_id: 7, label_ids: "368" });
    expect(updated.body).toEqual({ label_ids: [368] });
  });

  it("rejects a comma-only label value instead of clearing labels", async () => {
    mockFields("/v1/dealFields", dealFields);

    const { result } = await callTool("pipedrive_deals_update", { deal_id: 227, label_ids: "," });

    expect(result.isError).toBe(true);
  });

  it("sends numeric label ids when the entity has no label field in metadata", async () => {
    mockFields("/v1/organizationFields", { success: true, data: [{ key: "name", name: "Name", field_type: "varchar" }] });
    const captured = captureBody("patch", "/api/v2/organizations/7", { id: 7 });

    const { result } = await callTool("pipedrive_organizations_update", { org_id: 7, label_ids: [368, "369"] });

    expect(result.isError).toBeFalsy();
    expect(captured.body).toEqual({ label_ids: [368, 369] });
  });

  it("sends numeric label ids when the field metadata request fails", async () => {
    nock(BASE_URL).get("/v1/organizationFields").query(true).times(5).reply(500, { success: false, error: "boom" });
    const captured = captureBody("patch", "/api/v2/organizations/7", { id: 7 });

    const { result } = await callTool("pipedrive_organizations_update", { org_id: 7, label_ids: "368" });

    expect(result.isError).toBeFalsy();
    expect(captured.body).toEqual({ label_ids: [368] });
  });

  it("explains that label names need metadata when none is available", async () => {
    mockFields("/v1/organizationFields", { success: true, data: [] });

    const { result } = await callTool("pipedrive_organizations_update", { org_id: 7, label_ids: ["Test / Internal"] });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain("Pass numeric label ids");
  });
});
