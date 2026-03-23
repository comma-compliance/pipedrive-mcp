import { describe, it, expect } from "vitest";
import {
  compactDeal,
  compactPerson,
  compactOrganization,
  compactActivity,
  compactNote,
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
