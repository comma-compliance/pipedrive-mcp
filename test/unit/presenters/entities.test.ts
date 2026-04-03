import { describe, it, expect } from "vitest";
import {
  compactDeal,
  compactPerson,
  compactOrganization,
  compactActivity,
  compactNote,
  compactMailThread,
  compactMailMessage,
} from "../../../src/presenters/entities.js";

describe("compactDeal", () => {
  it("extracts key fields from a raw deal", () => {
    const raw = {
      id: 42, title: "Big Deal", status: "open", stage_id: 3, pipeline_id: 1,
      value: 50000, currency: "USD", person_id: 10, org_id: 20, user_id: 5,
      expected_close_date: "2026-06-01", update_time: "2026-03-20T10:00:00Z",
      some_extra_field: "ignored",
    };
    const compact = compactDeal(raw);
    expect(compact.id).toBe(42);
    expect(compact.title).toBe("Big Deal");
    expect(compact.value).toBe(50000);
    expect(compact.owner_id).toBe(5);
    expect(compact).not.toHaveProperty("some_extra_field");
  });

  it("handles missing optional fields", () => {
    const compact = compactDeal({ id: 1, title: "Minimal" });
    expect(compact.stage_id).toBeNull();
    expect(compact.person_id).toBeNull();
    expect(compact.value).toBeNull();
  });
});

describe("compactPerson", () => {
  it("extracts emails and phones from arrays", () => {
    const raw = {
      id: 1, name: "Jane Doe",
      emails: [{ value: "jane@example.com", primary: true }],
      phones: [{ value: "+15551234567", primary: true }],
      org_id: 10, user_id: 5, update_time: "2026-01-01",
    };
    const compact = compactPerson(raw);
    expect(compact.emails).toEqual(["jane@example.com"]);
    expect(compact.phones).toEqual(["+15551234567"]);
  });

  it("handles email/phone as empty arrays", () => {
    const compact = compactPerson({ id: 1, name: "No Contact" });
    expect(compact.emails).toEqual([]);
    expect(compact.phones).toEqual([]);
  });
});

describe("compactOrganization", () => {
  it("extracts key org fields", () => {
    const compact = compactOrganization({
      id: 5, name: "Acme Corp", address: "123 Main St", user_id: 3, update_time: "2026-01-01",
    });
    expect(compact.name).toBe("Acme Corp");
    expect(compact.address).toBe("123 Main St");
    expect(compact.owner_id).toBe(3);
  });
});

describe("compactActivity", () => {
  it("extracts activity fields", () => {
    const compact = compactActivity({
      id: 10, subject: "Call", type: "call", done: true,
      due_date: "2026-04-01", due_time: "14:00",
      deal_id: 1, person_id: 2, org_id: 3, user_id: 4,
      update_time: "2026-03-01",
    });
    expect(compact.subject).toBe("Call");
    expect(compact.done).toBe(true);
    expect(compact.deal_id).toBe(1);
  });
});

describe("compactNote", () => {
  it("extracts note fields", () => {
    const compact = compactNote({
      id: 7, content: "<p>Hello</p>", deal_id: 1, person_id: null,
      org_id: null, lead_id: null, user_id: 5,
      pinned_to_deal_flag: true, pinned_to_person_flag: false,
      pinned_to_organization_flag: false, update_time: "2026-02-01",
    });
    expect(compact.content).toBe("<p>Hello</p>");
    expect(compact.pinned_to_deal_flag).toBe(true);
  });
});

describe("compactMailThread", () => {
  it("extracts thread fields and flattens party emails", () => {
    const raw = {
      id: 701, subject: "Re: Proposal", snippet: "Thanks for the proposal",
      mail_message_count: 3, read_flag: 1, archived_flag: 0, shared_flag: 0,
      has_draft_flag: 0, deal_id: 117, lead_id: null,
      update_time: "2026-03-21T09:15:00Z",
      parties: {
        from: [{ email_address: "jane@example.com", name: "Jane" }],
        to: [{ email_address: "bob@example.com", name: "Bob" }],
      },
      some_extra_field: "ignored",
    };
    const compact = compactMailThread(raw);
    expect(compact.id).toBe(701);
    expect(compact.subject).toBe("Re: Proposal");
    expect(compact.message_count).toBe(3);
    expect(compact.from_emails).toEqual(["jane@example.com"]);
    expect(compact.to_emails).toEqual(["bob@example.com"]);
    expect(compact.read_flag).toBe(true);
    expect(compact.deal_id).toBe(117);
    expect(compact).not.toHaveProperty("some_extra_field");
  });

  it("handles missing parties gracefully", () => {
    const compact = compactMailThread({ id: 1, subject: "No parties" });
    expect(compact.from_emails).toEqual([]);
    expect(compact.to_emails).toEqual([]);
    expect(compact.message_count).toBe(0);
    expect(compact.snippet).toBeNull();
  });
});

describe("compactMailMessage", () => {
  it("extracts message fields with flat email strings", () => {
    const raw = {
      id: 801, subject: "Hello",
      from: [{ name: "Jane", email_address: "jane@example.com" }],
      to: [{ name: "Bob", email_address: "bob@example.com" }],
      cc: [{ name: "Alice", email_address: "alice@example.com" }],
      body: "<p>Hi there</p>", has_body_flag: 1, has_attachments_flag: 0,
      draft_flag: 0, read_flag: 1,
      timestamp: "2026-03-21 09:15:00", message_time: "2026-03-21 09:15:00",
    };
    const compact = compactMailMessage(raw);
    expect(compact.id).toBe(801);
    expect(compact.from_name).toBe("Jane");
    expect(compact.from_email).toBe("jane@example.com");
    expect(compact.to_emails).toEqual(["bob@example.com"]);
    expect(compact.cc_emails).toEqual(["alice@example.com"]);
    expect(compact.body).toBe("<p>Hi there</p>");
    expect(compact.has_body_flag).toBe(true);
    expect(compact.read_flag).toBe(true);
  });

  it("handles missing from/to/cc gracefully", () => {
    const compact = compactMailMessage({ id: 1, subject: "Minimal" });
    expect(compact.from_name).toBeNull();
    expect(compact.from_email).toBe("");
    expect(compact.to_emails).toEqual([]);
    expect(compact.cc_emails).toEqual([]);
    expect(compact.body).toBeNull();
  });
});
