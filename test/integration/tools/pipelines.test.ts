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

describe("pipedrive_pipelines_list", () => {
  it("returns list of pipelines", async () => {
    const fixture = fixturesV2("pipelines-list.json");

    nock(BASE_URL)
      .get("/api/v2/pipelines")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_pipelines_list", {});

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.items).toBeInstanceOf(Array);
    const items = parsed.items as Array<Record<string, unknown>>;
    expect(items.length).toBe(2);
    expect(items[0].id).toBe(1);
    expect(items[0].name).toBe("Sales Pipeline");
    expect(items[1].name).toBe("Partner Pipeline");
    expect(parsed.truncated).toBe(false);
  });
});

describe("pipedrive_stages_list", () => {
  it("returns list of stages", async () => {
    const fixture = fixturesV2("stages-list.json");

    nock(BASE_URL)
      .get("/api/v2/stages")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_stages_list", {});

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.items).toBeInstanceOf(Array);
    const items = parsed.items as Array<Record<string, unknown>>;
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].id).toBe(1);
    expect(items[0].name).toBe("Lead In");
    expect(items[0].pipeline_id).toBe(1);
    // Check a stage from pipeline 2
    const pipeline2Stages = items.filter(
      (s) => s.pipeline_id === 2,
    );
    expect(pipeline2Stages.length).toBeGreaterThan(0);
    expect(parsed.truncated).toBe(false);
  });

  it("filters stages by pipeline_id", async () => {
    const fixture = fixturesV2("stages-list.json");

    nock(BASE_URL)
      .get("/api/v2/stages")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_stages_list", {
      pipeline_id: 1,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.items).toBeInstanceOf(Array);
  });
});
