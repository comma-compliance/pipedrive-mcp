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

// --------------- Mail Threads ---------------

describe("pipedrive_mail_threads_list", () => {
  it("returns paginated thread list", async () => {
    const fixture = fixturesV1("mail-threads-list.json");

    nock(BASE_URL)
      .get("/v1/mailbox/mailThreads")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_mail_threads_list", {
      folder: "inbox",
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.items).toBeInstanceOf(Array);
    const items = parsed.items as Array<Record<string, unknown>>;
    expect(items.length).toBe(1);
    expect(items[0].id).toBe(701);
    expect(items[0].subject).toBe("Re: Proposal for Enterprise Package");
    expect(items[0].message_count).toBe(3);
    expect(items[0].deal_id).toBe(117);
    expect(items[0].from_emails).toEqual(["jane.smith@example.com"]);
    expect(items[0].to_emails).toEqual(["bob@testcompany.com"]);
    expect(parsed.truncated).toBe(false);
  });

  it("defaults folder to inbox when omitted", async () => {
    const fixture = fixturesV1("mail-threads-list.json");

    const scope = nock(BASE_URL)
      .get("/v1/mailbox/mailThreads")
      .query((q) => q.folder === "inbox")
      .reply(200, fixture);

    const { result } = await callTool("pipedrive_mail_threads_list", {});

    expect(result.isError).toBeFalsy();
    expect(scope.isDone()).toBe(true);
  });
});

describe("pipedrive_mail_threads_get", () => {
  it("returns a single mail thread", async () => {
    const fixture = fixturesV1("mail-threads-get.json");

    nock(BASE_URL)
      .get("/v1/mailbox/mailThreads/701")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_mail_threads_get", {
      thread_id: 701,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.id).toBe(701);
    expect(parsed.subject).toBe("Re: Proposal for Enterprise Package");
    expect(parsed.deal_id).toBe(117);
    expect(parsed.message_count).toBe(3);
  });
});

// --------------- Mail Thread Messages ---------------

describe("pipedrive_mail_thread_messages_list", () => {
  it("returns messages in a thread", async () => {
    const fixture = fixturesV1("mail-thread-messages-list.json");

    nock(BASE_URL)
      .get("/v1/mailbox/mailThreads/701/mailMessages")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_mail_thread_messages_list", {
      thread_id: 701,
    });

    expect(result.isError).toBeFalsy();
    const items = data as Array<Record<string, unknown>>;
    expect(items.length).toBe(2);
    expect(items[0].id).toBe(801);
    expect(items[0].from_email).toBe("jane.smith@example.com");
    expect(items[0].to_emails).toEqual(["bob@testcompany.com"]);
  });

  it("preserves body when include_body is true", async () => {
    const fixture = fixturesV1("mail-thread-messages-list.json");

    nock(BASE_URL)
      .get("/v1/mailbox/mailThreads/701/mailMessages")
      .query((q) => q.include_body === "1")
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_mail_thread_messages_list", {
      thread_id: 701,
      include_body: true,
    });

    expect(result.isError).toBeFalsy();
    const items = data as Array<Record<string, unknown>>;
    expect(items[0].body).toContain("review it with the team");
  });

  it("includes cc recipients", async () => {
    const fixture = fixturesV1("mail-thread-messages-list.json");

    nock(BASE_URL)
      .get("/v1/mailbox/mailThreads/701/mailMessages")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_mail_thread_messages_list", {
      thread_id: 701,
    });

    expect(result.isError).toBeFalsy();
    const items = data as Array<Record<string, unknown>>;
    // Second message has a CC
    expect(items[1].cc_emails).toEqual(["alice@testcompany.com"]);
  });
});

// --------------- Mail Messages ---------------

describe("pipedrive_mail_messages_get", () => {
  it("returns a single mail message", async () => {
    const fixture = fixturesV1("mail-messages-get.json");

    nock(BASE_URL)
      .get("/v1/mailbox/mailMessages/801")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_mail_messages_get", {
      message_id: 801,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.id).toBe(801);
    expect(parsed.subject).toBe("Re: Proposal for Enterprise Package");
    expect(parsed.mail_thread_id).toBe(701);
  });

  it("passes include_body as query param", async () => {
    const fixture = fixturesV1("mail-messages-get.json");

    const scope = nock(BASE_URL)
      .get("/v1/mailbox/mailMessages/801")
      .query((q) => q.include_body === "1")
      .reply(200, fixture);

    const { result } = await callTool("pipedrive_mail_messages_get", {
      message_id: 801,
      include_body: true,
    });

    expect(result.isError).toBeFalsy();
    expect(scope.isDone()).toBe(true);
  });
});

// --------------- Mail Threads Update ---------------

describe("pipedrive_mail_threads_update", () => {
  it("updates a thread and returns compact result", async () => {
    const fixture = fixturesV1("mail-threads-update.json");

    nock(BASE_URL)
      .put("/v1/mailbox/mailThreads/701")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_mail_threads_update", {
      thread_id: 701,
      archived_flag: true,
      shared_flag: true,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.message).toContain("701");
    expect(parsed.message).toContain("updated");
    const thread = parsed.thread as Record<string, unknown>;
    expect(thread.id).toBe(701);
    expect(thread.archived_flag).toBe(true);
    expect(thread.shared_flag).toBe(true);
  });

  it("converts boolean flags to 0/1 in request body", async () => {
    const fixture = fixturesV1("mail-threads-update.json");

    const scope = nock(BASE_URL)
      .put("/v1/mailbox/mailThreads/701", (body: Record<string, unknown>) => {
        return body.read_flag === 0 && body.archived_flag === 1;
      })
      .query(true)
      .reply(200, fixture);

    const { result } = await callTool("pipedrive_mail_threads_update", {
      thread_id: 701,
      read_flag: false,
      archived_flag: true,
    });

    expect(result.isError).toBeFalsy();
    expect(scope.isDone()).toBe(true);
  });
});

// --------------- Mail Threads Delete ---------------

describe("pipedrive_mail_threads_delete", () => {
  it("returns dry run result when dry_run is true", async () => {
    const { result, data } = await callTool("pipedrive_mail_threads_delete", {
      thread_id: 701,
      confirm: "DELETE",
      dry_run: true,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.dry_run).toBe(true);
  });

  it("deletes a thread with confirmation", async () => {
    const fixture = fixturesV1("mail-threads-delete.json");

    nock(BASE_URL)
      .delete("/v1/mailbox/mailThreads/701")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_mail_threads_delete", {
      thread_id: 701,
      confirm: "DELETE",
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.message).toContain("701");
    expect(parsed.message).toContain("deleted");
  });

  it("rejects without confirmation", async () => {
    const { result } = await callTool("pipedrive_mail_threads_delete", {
      thread_id: 701,
    });

    expect(result.isError).toBe(true);
  });
});

// --------------- Cross-entity Mail Messages ---------------

describe("pipedrive_deal_mail_messages_list", () => {
  it("returns mail messages for a deal", async () => {
    const fixture = fixturesV1("deal-mail-messages-list.json");

    nock(BASE_URL)
      .get("/v1/deals/117/mailMessages")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_deal_mail_messages_list", {
      deal_id: 117,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.items).toBeInstanceOf(Array);
    const items = parsed.items as Array<Record<string, unknown>>;
    expect(items.length).toBe(1);
    expect(items[0].id).toBe(801);
    expect(items[0].from_email).toBe("jane.smith@example.com");
    expect(parsed.truncated).toBe(false);
  });
});

describe("pipedrive_person_mail_messages_list", () => {
  it("returns mail messages for a person", async () => {
    const fixture = fixturesV1("person-mail-messages-list.json");

    nock(BASE_URL)
      .get("/v1/persons/201/mailMessages")
      .query(true)
      .reply(200, fixture);

    const { result, data } = await callTool("pipedrive_person_mail_messages_list", {
      person_id: 201,
    });

    expect(result.isError).toBeFalsy();
    const parsed = data as Record<string, unknown>;
    expect(parsed.items).toBeInstanceOf(Array);
    const items = parsed.items as Array<Record<string, unknown>>;
    expect(items.length).toBe(1);
    expect(items[0].id).toBe(801);
    expect(items[0].to_emails).toEqual(["bob@testcompany.com"]);
    expect(parsed.truncated).toBe(false);
  });
});
