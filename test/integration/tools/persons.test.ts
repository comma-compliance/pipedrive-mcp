import { describe, it, expect, beforeAll, afterEach } from "vitest";
import nock from "nock";
import { readFileSync } from "fs";
import { join } from "path";
import { setupTestContext, callTool, BASE_URL } from "../../helpers/setup.js";

const fixturesV2 = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, "../../fixtures/v2", name), "utf-8"));

const fixturesV1 = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, "../../fixtures/v1", name), "utf-8"));

beforeAll(async () => {
  await setupTestContext();
});

afterEach(() => {
  nock.cleanAll();
});

describe("pipedrive_persons_list", () => {
  it("returns paginated person list", async () => {
    const fixture = fixturesV2("persons-list.json");

    nock(BASE_URL)
      .get("/api/v2/persons")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_persons_list", {});

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.items).toBeInstanceOf(Array);
    const items = parsed.items as Array<Record<string, unknown>>;
    expect(items.length).toBe(3);
    expect(items[0].id).toBe(9);
    expect(items[0].name).toBe("Jane Smith");
    expect((items[0].emails as string[]).length).toBeGreaterThan(0);
    expect(parsed.truncated).toBe(true);
  });
});

describe("pipedrive_persons_get", () => {
  it("returns a single person with details", async () => {
    const fixture = fixturesV2("persons-get.json");
    const personFieldsFixture = fixturesV1("personFields-list.json");

    nock(BASE_URL)
      .get("/api/v2/persons/201")
      .query(true)
      .reply(200, fixture);

    nock(BASE_URL)
      .get("/v1/personFields")
      .query(true)
      .reply(200, personFieldsFixture);

    const { result, data } = await callTool("pipedrive_persons_get", {
      person_id: 201,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.id).toBe(201);
    expect(parsed.name).toBe("Jane Smith");
    expect(parsed.emails).toContain("jane.smith@example.com");
    expect(parsed._raw).toBeDefined();
  });
});

describe("pipedrive_persons_search", () => {
  it("returns search results", async () => {
    const fixture = fixturesV2("persons-search.json");

    nock(BASE_URL)
      .get("/api/v2/persons/search")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_persons_search", {
      term: "Jane Smith",
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    // Search results are wrapped: items contains the search result objects
    expect(parsed.truncated).toBe(false);
  });
});

describe("pipedrive_persons_create", () => {
  it("creates a person and returns compact result", async () => {
    const fixture = fixturesV2("persons-create.json");

    nock(BASE_URL)
      .post("/api/v2/persons")
      .query(true)
      .reply(201, fixture);

    const { result, data } = await callTool("pipedrive_persons_create", {
      name: "Jane Smith",
      emails: ["jane.smith@example.com"],
      phones: ["+15550000000"],
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.message).toBe("Person created");
    const person = parsed.person as Record<string, unknown>;
    expect(person.id).toBe(201);
    expect(person.name).toBe("Jane Smith");
  });
});

describe("pipedrive_persons_delete", () => {
  it("returns dry run result when dry_run is true", async () => {
    const { result, data } = await callTool("pipedrive_persons_delete", {
      person_id: 201,
      confirm: "DELETE",
      dry_run: true,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.dry_run).toBe(true);
  });

  it("deletes a person with confirmation", async () => {
    const fixture = fixturesV2("persons-delete.json");

    nock(BASE_URL)
      .delete("/api/v2/persons/201")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_persons_delete", {
      person_id: 201,
      confirm: "DELETE",
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.message).toBe("Person 201 deleted");
  });
});
