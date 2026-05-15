import { describe, it, expect } from "vitest";
import { DealsListSchema } from "../../../src/schemas/deals.js";
import { OrganizationsListSchema } from "../../../src/schemas/organizations.js";
import { PersonsListSchema } from "../../../src/schemas/persons.js";

// Regression coverage for the Pipedrive 400 "sort_by: The value you selected is not a valid choice"
// errors. v2 list endpoints for deals, orgs, and persons only accept id / update_time / add_time;
// the schemas previously allowed title, value, and name which Pipedrive rejects.

describe("Deals list sort_by", () => {
  it("accepts documented values and rejects undocumented ones", () => {
    expect(DealsListSchema.safeParse({ sort_by: "id" }).success).toBe(true);
    expect(DealsListSchema.safeParse({ sort_by: "update_time" }).success).toBe(true);
    expect(DealsListSchema.safeParse({ sort_by: "add_time" }).success).toBe(true);
    expect(DealsListSchema.safeParse({ sort_by: "title" }).success).toBe(false);
    expect(DealsListSchema.safeParse({ sort_by: "value" }).success).toBe(false);
  });
});

describe("Organizations list sort_by", () => {
  it("accepts documented values and rejects 'name' (not v2-supported)", () => {
    expect(OrganizationsListSchema.safeParse({ sort_by: "id" }).success).toBe(true);
    expect(OrganizationsListSchema.safeParse({ sort_by: "name" }).success).toBe(false);
  });
});

describe("Persons list sort_by", () => {
  it("accepts documented values and rejects 'name' (not v2-supported)", () => {
    expect(PersonsListSchema.safeParse({ sort_by: "id" }).success).toBe(true);
    expect(PersonsListSchema.safeParse({ sort_by: "name" }).success).toBe(false);
  });
});
