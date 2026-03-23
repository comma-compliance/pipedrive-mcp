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

describe("pipedrive_activities_list", () => {
  it("returns paginated activity list", async () => {
    const fixture = fixturesV2("activities-list.json");

    nock(BASE_URL)
      .get("/api/v2/activities")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_activities_list", {});

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.items).toBeInstanceOf(Array);
    const items = parsed.items as Array<Record<string, unknown>>;
    expect(items.length).toBe(1);
    expect(items[0].id).toBe(460);
    expect(items[0].subject).toBe("Follow up call with Acme");
    expect(items[0].type).toBe("call");
    expect(items[0].done).toBe(false);
    expect(items[0].due_date).toBe("2026-12-31");
    expect(parsed.truncated).toBe(false);
  });
});

describe("pipedrive_activities_get", () => {
  it("returns a single activity", async () => {
    const fixture = fixturesV2("activities-get.json");

    nock(BASE_URL)
      .get("/api/v2/activities/460")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_activities_get", {
      activity_id: 460,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.id).toBe(460);
    expect(parsed.subject).toBe("Follow up call with Acme");
    expect(parsed.type).toBe("call");
    expect(parsed.deal_id).toBe(8);
  });
});

describe("pipedrive_activities_create", () => {
  it("creates an activity and returns compact result", async () => {
    const fixture = fixturesV2("activities-create.json");

    nock(BASE_URL)
      .post("/api/v2/activities")
      .query(true)
      .reply(201, fixture);

    const { result, data } = await callTool("pipedrive_activities_create", {
      subject: "Follow up call with Acme",
      type: "call",
      deal_id: 8,
      due_date: "2026-12-31",
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.message).toBe("Activity created");
    const activity = parsed.activity as Record<string, unknown>;
    expect(activity.id).toBe(460);
    expect(activity.subject).toBe("Follow up call with Acme");
    expect(activity.type).toBe("call");
  });
});

describe("pipedrive_activities_mark_done", () => {
  it("marks an activity as done", async () => {
    const fixture = fixturesV2("activities-mark-done.json");

    nock(BASE_URL)
      .patch("/api/v2/activities/460")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_activities_mark_done", {
      activity_id: 460,
      done: true,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.message).toBe("Activity 460 marked done");
    const activity = parsed.activity as Record<string, unknown>;
    expect(activity.done).toBe(true);
  });
});

describe("pipedrive_activities_delete", () => {
  it("returns dry run result when dry_run is true", async () => {
    const { result, data } = await callTool("pipedrive_activities_delete", {
      activity_id: 460,
      confirm: "DELETE",
      dry_run: true,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.dry_run).toBe(true);
  });

  it("deletes an activity with confirmation", async () => {
    const fixture = fixturesV2("activities-delete.json");

    nock(BASE_URL)
      .delete("/api/v2/activities/460")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_activities_delete", {
      activity_id: 460,
      confirm: "DELETE",
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.message).toBe("Activity 460 deleted");
  });
});

describe("pipedrive_activity_types_list", () => {
  it("returns list of activity types", async () => {
    const fixture = fixturesV1("activityTypes-list.json");

    nock(BASE_URL)
      .get("/v1/activityTypes")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_activity_types_list", {});

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.activity_types).toBeInstanceOf(Array);
    const types = parsed.activity_types as Array<Record<string, unknown>>;
    expect(types.length).toBeGreaterThan(0);
    expect(types[0].name).toBe("Call");
    expect(types[0].key_string).toBe("call");
  });
});
