import { describe, it, expect } from "vitest";
import { validateConfirmation, buildDryRunResult } from "../../../src/services/guards.js";

describe("validateConfirmation", () => {
  it("returns null when confirm matches expected", () => {
    expect(validateConfirmation("DELETE", "DELETE", "test_tool", "delete")).toBeNull();
    expect(validateConfirmation("MERGE", "MERGE", "test_tool", "merge")).toBeNull();
    expect(validateConfirmation("YES", "YES", "test_tool", "action")).toBeNull();
  });

  it("returns error when confirm is missing", () => {
    const err = validateConfirmation(undefined, "DELETE", "test_tool", "delete thing");
    expect(err).toContain('requires confirm: "DELETE"');
    expect(err).toContain("destructive operation");
  });

  it("returns error when confirm is wrong value", () => {
    const err = validateConfirmation("WRONG", "DELETE", "test_tool", "delete");
    expect(err).toContain('requires confirm: "DELETE"');
    expect(err).toContain('received "WRONG"');
  });
});

describe("buildDryRunResult", () => {
  it("builds dry run preview", () => {
    const result = buildDryRunResult("test_tool", "delete", { id: 42 }, "Would delete record 42");
    expect(result.dry_run).toBe(true);
    expect(result.tool).toBe("test_tool");
    expect(result.action).toBe("delete");
    expect(result.target).toEqual({ id: 42 });
    expect(result.would_happen).toBe("Would delete record 42");
  });
});
