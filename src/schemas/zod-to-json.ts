import { type ZodType } from "zod";

// Convert Zod schema to JSON Schema for MCP tool registration.
// We use a lightweight approach that walks the Zod schema definition.

export function zodToJsonSchema(schema: ZodType): Record<string, unknown> {
  return convertZodType(schema);
}

function convertZodType(schema: ZodType): Record<string, unknown> {
  const def = (schema as unknown as { _def: Record<string, unknown> })._def;
  const typeName = def.typeName as string;

  switch (typeName) {
    case "ZodObject":
      return convertObject(def);
    case "ZodString":
      return convertString(def);
    case "ZodNumber":
      return convertNumber(def);
    case "ZodBoolean":
      return { type: "boolean", ...(def.description ? { description: String(def.description) } : {}) };
    case "ZodEnum":
      return {
        type: "string",
        enum: (def.values as string[]),
        ...(def.description ? { description: String(def.description) } : {}),
      };
    case "ZodLiteral":
      return {
        type: typeof def.value === "number" ? "number" : "string",
        const: def.value,
        ...(def.description ? { description: String(def.description) } : {}),
      };
    case "ZodArray":
      return {
        type: "array",
        items: convertZodType(def.type as ZodType),
        ...(def.description ? { description: String(def.description) } : {}),
      };
    case "ZodOptional":
      return convertZodType(def.innerType as ZodType);
    case "ZodDefault":
      return {
        ...convertZodType(def.innerType as ZodType),
        default: def.defaultValue && typeof def.defaultValue === "function"
          ? (def.defaultValue as () => unknown)()
          : def.defaultValue,
      };
    case "ZodRecord":
      return {
        type: "object",
        additionalProperties: true,
        ...(def.description ? { description: String(def.description) } : {}),
      };
    case "ZodEffects":
      return convertZodType(def.schema as ZodType);
    case "ZodUnion":
      return {
        anyOf: (def.options as ZodType[]).map(convertZodType),
        ...(def.description ? { description: String(def.description) } : {}),
      };
    case "ZodNullable":
      return convertZodType(def.innerType as ZodType);
    case "ZodPipeline":
      return convertZodType(def.in as ZodType);
    default:
      return { type: "string" };
  }
}

function convertObject(def: Record<string, unknown>): Record<string, unknown> {
  const shape = def.shape as (() => Record<string, ZodType>) | Record<string, ZodType>;
  const resolvedShape = typeof shape === "function" ? shape() : shape;

  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(resolvedShape)) {
    properties[key] = convertZodType(value);
    if (!isOptional(value)) {
      required.push(key);
    }
  }

  const result: Record<string, unknown> = {
    type: "object",
    properties,
  };

  if (required.length > 0) {
    result.required = required;
  }

  if (def.description) {
    result.description = String(def.description);
  }

  return result;
}

function convertString(def: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { type: "string" };
  if (def.description) result.description = String(def.description);
  const checks = def.checks as Array<{ kind: string; value?: unknown }> | undefined;
  if (checks) {
    for (const check of checks) {
      if (check.kind === "min") result.minLength = check.value;
      if (check.kind === "max") result.maxLength = check.value;
      if (check.kind === "email") result.format = "email";
    }
  }
  return result;
}

function convertNumber(def: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { type: "number" };
  if (def.description) result.description = String(def.description);
  const checks = def.checks as Array<{ kind: string; value?: number }> | undefined;
  if (checks) {
    for (const check of checks) {
      if (check.kind === "int") result.type = "integer";
      if (check.kind === "min") result.minimum = check.value;
      if (check.kind === "max") result.maximum = check.value;
    }
  }
  return result;
}

function isOptional(schema: ZodType): boolean {
  const def = (schema as unknown as { _def: Record<string, unknown> })._def;
  const typeName = def.typeName as string;
  if (typeName === "ZodOptional") return true;
  if (typeName === "ZodDefault") return true;
  return false;
}
