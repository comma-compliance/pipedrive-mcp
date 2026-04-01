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

describe("pipedrive_note_comments_list", () => {
  it("returns paginated comment list", async () => {
    const fixture = fixturesV1("note-comments-list.json");

    nock(BASE_URL)
      .get("/v1/notes/501/comments")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_note_comments_list", {
      note_id: 501,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.items).toBeInstanceOf(Array);
    const items = parsed.items as Array<Record<string, unknown>>;
    expect(items.length).toBe(2);
    expect(items[0].uuid).toBe("499fd290-c436-48e7-b8ba-223ec80434a5");
    expect(items[0].user_id).toBe(101);
    expect(items[0].content).toContain("follow up on this next week");
    expect(items[1].uuid).toBe("bf554816-e823-45b7-9c04-21f9aec64121");
    expect(parsed.truncated).toBe(false);
  });

  it("rejects without note_id", async () => {
    const { result } = await callTool("pipedrive_note_comments_list", {});

    expect(result.isError).toBe(true);
  });
});

describe("pipedrive_note_comments_get", () => {
  it("returns a single comment", async () => {
    const fixture = fixturesV1("note-comments-get.json");

    nock(BASE_URL)
      .get("/v1/notes/501/comments/499fd290-c436-48e7-b8ba-223ec80434a5")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_note_comments_get", {
      note_id: 501,
      comment_id: "499fd290-c436-48e7-b8ba-223ec80434a5",
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.uuid).toBe("499fd290-c436-48e7-b8ba-223ec80434a5");
    expect(parsed.user_id).toBe(101);
    expect(parsed.content).toContain("follow up on this next week");
  });

  it("rejects with invalid comment_id format", async () => {
    const { result } = await callTool("pipedrive_note_comments_get", {
      note_id: 501,
      comment_id: "not-a-uuid",
    });

    expect(result.isError).toBe(true);
  });
});

describe("pipedrive_note_comments_create", () => {
  it("creates a comment and returns compact result", async () => {
    const fixture = fixturesV1("note-comments-create.json");

    nock(BASE_URL)
      .post("/v1/notes/501/comments")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_note_comments_create", {
      note_id: 501,
      content_html: "<p>Here are my thoughts on the proposal.</p>",
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.message).toBe("Comment created");
    const comment = parsed.comment as Record<string, unknown>;
    expect(comment.uuid).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    expect(comment.user_id).toBe(101);
  });

  it("rejects with empty content", async () => {
    const { result } = await callTool("pipedrive_note_comments_create", {
      note_id: 501,
      content_html: "",
    });

    expect(result.isError).toBe(true);
  });
});

describe("pipedrive_note_comments_update", () => {
  it("updates a comment and returns compact result", async () => {
    const fixture = fixturesV1("note-comments-update.json");

    nock(BASE_URL)
      .put("/v1/notes/501/comments/499fd290-c436-48e7-b8ba-223ec80434a5")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_note_comments_update", {
      note_id: 501,
      comment_id: "499fd290-c436-48e7-b8ba-223ec80434a5",
      content_html: "<p>Updated: let's follow up on Monday instead.</p>",
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.message).toContain("updated");
    const comment = parsed.comment as Record<string, unknown>;
    expect(comment.uuid).toBe("499fd290-c436-48e7-b8ba-223ec80434a5");
    expect(comment.updater_id).toBe(101);
    expect(comment.content).toContain("Monday instead");
  });
});

describe("pipedrive_note_comments_delete", () => {
  it("returns dry run result when dry_run is true", async () => {
    const { result, data } = await callTool("pipedrive_note_comments_delete", {
      note_id: 501,
      comment_id: "499fd290-c436-48e7-b8ba-223ec80434a5",
      confirm: "DELETE",
      dry_run: true,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.dry_run).toBe(true);
  });

  it("deletes a comment with confirmation", async () => {
    const fixture = fixturesV1("note-comments-delete.json");

    nock(BASE_URL)
      .delete("/v1/notes/501/comments/499fd290-c436-48e7-b8ba-223ec80434a5")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_note_comments_delete", {
      note_id: 501,
      comment_id: "499fd290-c436-48e7-b8ba-223ec80434a5",
      confirm: "DELETE",
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.message).toContain("deleted");
    expect(parsed.message).toContain("499fd290-c436-48e7-b8ba-223ec80434a5");
  });

  it("rejects without confirmation", async () => {
    const { result } = await callTool("pipedrive_note_comments_delete", {
      note_id: 501,
      comment_id: "499fd290-c436-48e7-b8ba-223ec80434a5",
    });

    expect(result.isError).toBe(true);
  });
});
