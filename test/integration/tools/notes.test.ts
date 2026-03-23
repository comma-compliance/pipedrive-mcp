import { describe, it, expect, beforeAll, afterEach } from "vitest";
import nock from "nock";
import { readFileSync } from "fs";
import { join } from "path";
import { setupTestContext, callTool, BASE_URL } from "../../helpers/setup.js";

const fixturesV1 = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, "../../fixtures/v1", name), "utf-8"));

beforeAll(async () => {
  await setupTestContext();
});

afterEach(() => {
  nock.cleanAll();
});

describe("pipedrive_notes_list", () => {
  it("returns paginated note list", async () => {
    const fixture = fixturesV1("notes-list.json");

    nock(BASE_URL)
      .get("/v1/notes")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_notes_list", {
      deal_id: 117,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.items).toBeInstanceOf(Array);
    const items = parsed.items as Array<Record<string, unknown>>;
    expect(items.length).toBe(1);
    expect(items[0].id).toBe(501);
    expect(items[0].deal_id).toBe(117);
    expect(items[0].content).toContain("Discussed pricing and next steps");
    expect(parsed.truncated).toBe(false);
  });
});

describe("pipedrive_notes_get", () => {
  it("returns a single note", async () => {
    const fixture = fixturesV1("notes-get.json");

    nock(BASE_URL)
      .get("/v1/notes/501")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_notes_get", {
      note_id: 501,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.id).toBe(501);
    expect(parsed.deal_id).toBe(117);
    expect(parsed.person_id).toBe(201);
    expect(parsed.org_id).toBe(301);
    expect(parsed.content).toContain("Discussed pricing and next steps");
  });
});

describe("pipedrive_notes_create", () => {
  it("creates a note and returns compact result", async () => {
    const fixture = fixturesV1("notes-create.json");

    nock(BASE_URL)
      .post("/v1/notes")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_notes_create", {
      content_html: "<p>Discussed pricing and next steps.</p>",
      deal_id: 117,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.message).toBe("Note created");
    const note = parsed.note as Record<string, unknown>;
    expect(note.id).toBe(501);
    expect(note.deal_id).toBe(117);
  });

  it("rejects creating a note without any entity id", async () => {
    const { result } = await callTool("pipedrive_notes_create", {
      content_html: "<p>Orphan note</p>",
    });

    expect(result.isError).toBe(true);
  });
});

describe("pipedrive_notes_delete", () => {
  it("returns dry run result when dry_run is true", async () => {
    const { result, data } = await callTool("pipedrive_notes_delete", {
      note_id: 501,
      confirm: "DELETE",
      dry_run: true,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.dry_run).toBe(true);
  });

  it("deletes a note with confirmation", async () => {
    const fixture = fixturesV1("notes-delete.json");

    nock(BASE_URL)
      .delete("/v1/notes/501")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_notes_delete", {
      note_id: 501,
      confirm: "DELETE",
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.message).toBe("Note 501 deleted");
  });
});
