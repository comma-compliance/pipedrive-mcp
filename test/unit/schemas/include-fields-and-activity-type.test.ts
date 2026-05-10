import { describe, it, expect } from "vitest";
import {
  DealsListSchema,
  DealsGetSchema,
  DealsSearchSchema,
} from "../../../src/schemas/deals.js";
import {
  OrganizationsListSchema,
  OrganizationsGetSchema,
  OrganizationsSearchSchema,
} from "../../../src/schemas/organizations.js";
import {
  PersonsListSchema,
  PersonsGetSchema,
  PersonsSearchSchema,
} from "../../../src/schemas/persons.js";
import { LeadsSearchSchema } from "../../../src/schemas/leads.js";
import {
  ActivitiesCreateSchema,
  ActivitiesUpdateSchema,
} from "../../../src/schemas/activities.js";

// Regression coverage for the previously permissive IncludeFieldsSchema (z.array(z.string()))
// that produced Pipedrive 400 "Validation failed: include_fields" errors. Per-endpoint enums
// now constrain values up-front. One positive + one negative per unique enum, plus a few
// edge cases.

describe("Deals include_fields enums", () => {
  it("DealsListSchema accepts a documented value and rejects an unknown one", () => {
    expect(
      DealsListSchema.safeParse({ include_fields: ["next_activity_id"] }).success,
    ).toBe(true);
    expect(
      DealsListSchema.safeParse({ include_fields: ["not_a_real_field"] }).success,
    ).toBe(false);
  });

  it("DealsListSchema rejects mixed valid + invalid values", () => {
    expect(
      DealsListSchema.safeParse({
        include_fields: ["next_activity_id", "not_a_real_field"],
      }).success,
    ).toBe(false);
  });

  it("DealsGetSchema uses the same enum as list", () => {
    expect(
      DealsGetSchema.safeParse({ deal_id: 1, include_fields: ["products_count"] })
        .success,
    ).toBe(true);
    expect(
      DealsGetSchema.safeParse({ deal_id: 1, include_fields: ["bogus"] }).success,
    ).toBe(false);
  });

  it("include_fields is optional", () => {
    expect(DealsListSchema.safeParse({}).success).toBe(true);
    expect(DealsGetSchema.safeParse({ deal_id: 1 }).success).toBe(true);
  });

  it("DealsSearchSchema uses a narrower search-only enum", () => {
    expect(
      DealsSearchSchema.safeParse({
        term: "acme",
        include_fields: ["deal.cc_email"],
      }).success,
    ).toBe(true);
    // list-side value is invalid on search
    expect(
      DealsSearchSchema.safeParse({
        term: "acme",
        include_fields: ["next_activity_id"],
      }).success,
    ).toBe(false);
  });
});

describe("Organizations include_fields enums", () => {
  it("OrganizationsListSchema and GetSchema accept a documented value and reject an unknown one", () => {
    expect(
      OrganizationsListSchema.safeParse({
        include_fields: ["open_deals_count"],
      }).success,
    ).toBe(true);
    expect(
      OrganizationsListSchema.safeParse({ include_fields: ["bogus"] }).success,
    ).toBe(false);
    expect(
      OrganizationsGetSchema.safeParse({
        org_id: 1,
        include_fields: ["open_deals_count"],
      }).success,
    ).toBe(true);
    expect(
      OrganizationsGetSchema.safeParse({ org_id: 1, include_fields: ["bogus"] })
        .success,
    ).toBe(false);
  });

  it("OrganizationsSearchSchema rejects include_fields entirely (no documented values)", () => {
    expect(
      OrganizationsSearchSchema.safeParse({
        term: "acme",
        include_fields: ["open_deals_count"],
      }).success,
    ).toBe(false);
    expect(OrganizationsSearchSchema.safeParse({ term: "acme" }).success).toBe(true);
  });
});

describe("Persons include_fields enums", () => {
  it("PersonsListSchema and GetSchema accept a documented value and reject an unknown one", () => {
    expect(
      PersonsListSchema.safeParse({
        include_fields: ["participant_open_deals_count"],
      }).success,
    ).toBe(true);
    expect(
      PersonsListSchema.safeParse({ include_fields: ["bogus"] }).success,
    ).toBe(false);
    expect(
      PersonsGetSchema.safeParse({
        person_id: 1,
        include_fields: ["marketing_status"],
      }).success,
    ).toBe(true);
    expect(
      PersonsGetSchema.safeParse({ person_id: 1, include_fields: ["bogus"] }).success,
    ).toBe(false);
  });

  it("PersonsSearchSchema accepts person.picture and rejects list-side values", () => {
    expect(
      PersonsSearchSchema.safeParse({
        term: "alice",
        include_fields: ["person.picture"],
      }).success,
    ).toBe(true);
    expect(
      PersonsSearchSchema.safeParse({
        term: "alice",
        include_fields: ["next_activity_id"],
      }).success,
    ).toBe(false);
  });
});

describe("Leads search include_fields enum", () => {
  it("accepts lead.was_seen and rejects unknown values", () => {
    expect(
      LeadsSearchSchema.safeParse({
        term: "acme",
        include_fields: ["lead.was_seen"],
      }).success,
    ).toBe(true);
    expect(
      LeadsSearchSchema.safeParse({
        term: "acme",
        include_fields: ["bogus"],
      }).success,
    ).toBe(false);
  });
});

describe("Activities type field", () => {
  // The type field stays freeform (workspace-defined types). The change here is description-only.
  // These tests pin the contract so a future regression that adds an enum doesn't silently break
  // custom workspace types.

  it("accepts a workspace-custom type string on create and update", () => {
    expect(
      ActivitiesCreateSchema.safeParse({ subject: "x", type: "custom_type" })
        .success,
    ).toBe(true);
    expect(
      ActivitiesUpdateSchema.safeParse({ activity_id: 1, type: "custom_type" })
        .success,
    ).toBe(true);
  });

  it("rejects an empty type on create", () => {
    expect(
      ActivitiesCreateSchema.safeParse({ subject: "x", type: "" }).success,
    ).toBe(false);
  });
});
