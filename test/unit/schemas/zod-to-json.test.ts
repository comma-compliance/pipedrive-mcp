import { describe, it, expect } from "vitest";
import { z } from "zod";
import { zodToJsonSchema } from "../../../src/schemas/zod-to-json.js";
import { ActivitiesCreateSchema } from "../../../src/schemas/activities.js";
import { DealsUpdateSchema } from "../../../src/schemas/deals.js";

function props(schema: z.ZodType): Record<string, Record<string, unknown>> {
  return zodToJsonSchema(schema).properties as Record<string, Record<string, unknown>>;
}

describe("zodToJsonSchema descriptions", () => {
  it("keeps a description set on an optional wrapper", () => {
    const p = props(z.object({ a: z.string().optional().describe("outer") }));
    expect(p.a).toEqual({ type: "string", description: "outer" });
  });

  it("keeps a description set inside an optional", () => {
    const p = props(z.object({ a: z.string().describe("inner").optional() }));
    expect(p.a.description).toBe("inner");
  });

  it("prefers the inner description when both are set", () => {
    const p = props(z.object({ a: z.string().describe("inner").optional().describe("outer") }));
    expect(p.a.description).toBe("inner");
  });

  it("keeps descriptions on optional records, unions, and defaults", () => {
    const p = props(
      z.object({
        rec: z.record(z.string(), z.unknown()).optional().describe("rec"),
        uni: z.union([z.string(), z.number()]).optional().describe("uni"),
        def: z.boolean().optional().default(false).describe("def"),
      }),
    );
    expect(p.rec.description).toBe("rec");
    expect(p.uni.description).toBe("uni");
    expect(p.def.description).toBe("def");
  });

  it("surfaces real tool field guidance", () => {
    expect(props(ActivitiesCreateSchema).note.description).toContain("CDATA");
    expect(props(DealsUpdateSchema).custom_fields_by_name.description).toContain("human-readable name");
  });
});
