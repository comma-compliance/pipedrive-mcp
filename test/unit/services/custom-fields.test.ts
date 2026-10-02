import { describe, it, expect } from "vitest";
import { resolveOptionValue, reverseResolveFieldValue, type FieldMetadata } from "../../../src/services/custom-fields.js";

/** Helper to build a minimal FieldMetadata with options */
function optionField(
  fieldType: "enum" | "set",
  options: Array<{ id: number; label: string }>,
): FieldMetadata {
  const optionsByLabelLC = new Map<string, number>();
  const optionsById = new Map<number, string>();
  for (const o of options) {
    optionsByLabelLC.set(o.label.toLowerCase(), o.id);
    optionsById.set(o.id, o.label);
  }
  return {
    key: "test_field_key",
    name: "Test Field",
    fieldType,
    entityType: "organization",
    options,
    optionsByLabelLC,
    optionsById,
  };
}

function textField(): FieldMetadata {
  return {
    key: "text_field_key",
    name: "Text Field",
    fieldType: "varchar",
    entityType: "organization",
    options: null,
    optionsByLabelLC: null,
    optionsById: null,
  };
}

describe("resolveOptionValue", () => {
  const field = optionField("enum", [
    { id: 200, label: "Advisor" },
    { id: 201, label: "Client" },
    { id: 202, label: "Prospect" },
  ]);

  it("resolves a string label to numeric option ID", () => {
    expect(resolveOptionValue(field, "Advisor")).toBe(200);
  });

  it("resolves case-insensitively", () => {
    expect(resolveOptionValue(field, "advisor")).toBe(200);
    expect(resolveOptionValue(field, "PROSPECT")).toBe(202);
  });

  it("passes through a valid numeric option ID", () => {
    expect(resolveOptionValue(field, 201)).toBe(201);
  });

  it("resolves a numeric string that matches an option ID", () => {
    expect(resolveOptionValue(field, "200")).toBe(200);
  });

  it("returns null for an invalid string label", () => {
    expect(resolveOptionValue(field, "Nonexistent")).toBeNull();
  });

  it("returns null for an invalid numeric option ID", () => {
    expect(resolveOptionValue(field, 999)).toBeNull();
  });

  it("passes through null/undefined", () => {
    expect(resolveOptionValue(field, null)).toBeNull();
    expect(resolveOptionValue(field, undefined)).toBeUndefined();
  });

  it("passes through values for non-option fields", () => {
    const tf = textField();
    expect(resolveOptionValue(tf, "any string")).toBe("any string");
    expect(resolveOptionValue(tf, 42)).toBe(42);
  });

  describe("set fields", () => {
    const setField = optionField("set", [
      { id: 200, label: "Advisor" },
      { id: 201, label: "Client" },
      { id: 202, label: "Prospect" },
    ]);

    // v2 rejects anything but a JSON array of integer ids for set fields
    it("resolves an array of labels to an array of IDs", () => {
      expect(resolveOptionValue(setField, ["Advisor", "Client"])).toEqual([200, 201]);
    });

    it("resolves an array of numeric IDs", () => {
      expect(resolveOptionValue(setField, [200, 202])).toEqual([200, 202]);
    });

    it("wraps a single numeric ID in an array", () => {
      expect(resolveOptionValue(setField, 201)).toEqual([201]);
    });

    it("wraps a single numeric string in an array", () => {
      expect(resolveOptionValue(setField, "201")).toEqual([201]);
    });

    it("wraps a single label in an array", () => {
      expect(resolveOptionValue(setField, "prospect")).toEqual([202]);
    });

    it("resolves a comma-separated ID string to an array", () => {
      expect(resolveOptionValue(setField, "200, 201")).toEqual([200, 201]);
    });

    it("resolves comma-separated labels to an array", () => {
      expect(resolveOptionValue(setField, "Advisor,Client")).toEqual([200, 201]);
    });

    it("resolves numeric strings inside an array", () => {
      expect(resolveOptionValue(setField, ["200", "Client"])).toEqual([200, 201]);
    });

    it("de-duplicates repeated options", () => {
      expect(resolveOptionValue(setField, [200, "Advisor"])).toEqual([200]);
    });

    it("returns an empty array for an empty array (clears the field)", () => {
      expect(resolveOptionValue(setField, [])).toEqual([]);
    });

    it("matches a label that contains a comma before splitting", () => {
      const f = optionField("set", [
        { id: 1, label: "Smith, Jones" },
        { id: 2, label: "Smith" },
      ]);
      expect(resolveOptionValue(f, "Smith, Jones")).toEqual([1]);
    });

    it("resolves real Regulator(s) Confirmed inputs to [271]", () => {
      const f = optionField("set", [
        { id: 271, label: "[US] FINRA - Financial Industry Regulatory Authority" },
        { id: 272, label: "[US] SEC - Securities and Exchange Commission" },
      ]);
      expect(resolveOptionValue(f, [271])).toEqual([271]);
      expect(resolveOptionValue(f, "271")).toEqual([271]);
      expect(resolveOptionValue(f, ["[US] FINRA - Financial Industry Regulatory Authority"])).toEqual([271]);
    });

    it("returns null if any element in comma-separated string is invalid", () => {
      expect(resolveOptionValue(setField, "200,999")).toBeNull();
    });

    it("rejects empty comma segments instead of clearing the field", () => {
      expect(resolveOptionValue(setField, ",")).toBeNull();
      expect(resolveOptionValue(setField, "200,")).toBeNull();
      expect(resolveOptionValue(setField, "200,,201")).toBeNull();
      expect(resolveOptionValue(setField, "")).toBeNull();
    });

    it("returns null if any element in array is invalid", () => {
      expect(resolveOptionValue(setField, ["Advisor", "Nonexistent"])).toBeNull();
    });
  });
});

describe("reverseResolveFieldValue", () => {
  const setField = optionField("set", [
    { id: 200, label: "Advisor" },
    { id: 201, label: "Client" },
  ]);

  it("labels a v2 array value", () => {
    expect(reverseResolveFieldValue(setField, [200, 201]).display_value).toBe("Advisor, Client");
  });

  it("labels a v1 comma-separated value", () => {
    expect(reverseResolveFieldValue(setField, "200,201").display_value).toBe("Advisor, Client");
  });
});
