import { describe, it, expect } from "vitest";
import { resolveOptionValue, type FieldMetadata } from "../../../src/services/custom-fields.js";

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

    it("resolves an array of labels to comma-separated IDs", () => {
      expect(resolveOptionValue(setField, ["Advisor", "Client"])).toBe("200,201");
    });

    it("resolves an array of numeric IDs", () => {
      expect(resolveOptionValue(setField, [200, 202])).toBe("200,202");
    });

    it("preserves a comma-separated ID string without corruption", () => {
      expect(resolveOptionValue(setField, "200,201")).toBe("200,201");
    });

    it("resolves comma-separated labels to comma-separated IDs", () => {
      expect(resolveOptionValue(setField, "Advisor,Client")).toBe("200,201");
    });

    it("returns null if any element in comma-separated string is invalid", () => {
      expect(resolveOptionValue(setField, "200,999")).toBeNull();
    });

    it("returns null if any element in array is invalid", () => {
      expect(resolveOptionValue(setField, ["Advisor", "Nonexistent"])).toBeNull();
    });
  });
});
