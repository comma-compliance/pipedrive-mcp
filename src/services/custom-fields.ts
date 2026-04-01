import { TtlCache } from "./cache.js";
import { getContext } from "../server.js";
import { withRetry } from "../pipedrive/retries.js";
import { log } from "../logging.js";

export type FieldEntityType = "deal" | "person" | "organization" | "product" | "activity";

export interface FieldOption {
  id: number;
  label: string;
}

export interface FieldMetadata {
  key: string;
  name: string;
  fieldType: string;
  entityType: FieldEntityType;
  options: FieldOption[] | null;
  optionsByLabelLC: Map<string, number> | null;
  optionsById: Map<number, string> | null;
}

// Cache keyed by entity type
let fieldCache: TtlCache<FieldMetadata[]> | null = null;

function getCache(): TtlCache<FieldMetadata[]> {
  if (!fieldCache) {
    const { config } = getContext();
    fieldCache = new TtlCache<FieldMetadata[]>(config.fieldCacheTtlMs);
  }
  return fieldCache;
}

const ENTITY_TO_ENDPOINT: Record<FieldEntityType, { version: "v1" | "v2"; path: string }> = {
  deal: { version: "v1", path: "/dealFields" },
  person: { version: "v1", path: "/personFields" },
  organization: { version: "v1", path: "/organizationFields" },
  product: { version: "v1", path: "/productFields" },
  activity: { version: "v1", path: "/activityFields" },
};

function parseFieldMetadata(
  raw: Record<string, unknown>,
  entityType: FieldEntityType,
): FieldMetadata {
  const key = raw.key as string;
  const name = raw.name as string;
  const fieldType = raw.field_type as string;
  const rawOptions = raw.options as Array<{ id: number; label: string }> | undefined;

  let options: FieldOption[] | null = null;
  let optionsByLabelLC: Map<string, number> | null = null;
  let optionsById: Map<number, string> | null = null;

  if (rawOptions && (fieldType === "enum" || fieldType === "set")) {
    options = rawOptions.map((o) => ({ id: o.id, label: o.label }));
    optionsByLabelLC = new Map();
    optionsById = new Map();
    for (const o of options) {
      optionsByLabelLC.set(o.label.toLowerCase(), o.id);
      optionsById.set(o.id, o.label);
    }
  }

  return {
    key,
    name,
    fieldType,
    entityType,
    options,
    optionsByLabelLC,
    optionsById,
  };
}

export async function getFieldsForEntity(
  entityType: FieldEntityType,
  refreshCache = false,
): Promise<FieldMetadata[]> {
  const cache = getCache();

  if (!refreshCache) {
    const cached = cache.get(entityType);
    if (cached) return cached;
  }

  const { apiV1, rateLimiters } = getContext();
  const endpoint = ENTITY_TO_ENDPOINT[entityType];
  const allFields: FieldMetadata[] = [];

  // All field endpoints use v1 - returns all fields in one call, no pagination
  const response = await rateLimiters.general.schedule(() =>
    withRetry(() => apiV1.list<Record<string, unknown>>(endpoint.path), {
      label: `GET ${endpoint.path}`,
    }),
  );

  if (response.status !== 200) {
    const errMsg = response.data.error ?? `HTTP ${response.status}`;
    throw new Error(`Failed to fetch ${entityType} fields from ${endpoint.path}: ${errMsg}`);
  }

  const items = response.data.data ?? [];
  for (const item of items) {
    allFields.push(parseFieldMetadata(item, entityType));
  }

  cache.set(entityType, allFields);
  log.debug(`Cached ${allFields.length} fields for ${entityType}`);
  return allFields;
}

export async function resolveFieldByName(
  entityType: FieldEntityType,
  fieldName: string,
): Promise<{ field: FieldMetadata | null; ambiguous: boolean; matches: string[] }> {
  const fields = await getFieldsForEntity(entityType);
  const nameLower = fieldName.toLowerCase();

  // Find all case-insensitive matches
  const matches = fields.filter((f) => f.name.toLowerCase() === nameLower);

  if (matches.length === 0) return { field: null, ambiguous: false, matches: [] };
  if (matches.length === 1) return { field: matches[0], ambiguous: false, matches: [matches[0].name] };

  // Multiple fields with the same name - ambiguous
  return {
    field: null,
    ambiguous: true,
    matches: matches.map((f) => `${f.name} (key: ${f.key})`),
  };
}

export async function resolveCustomFieldsByKey(
  entityType: FieldEntityType,
  fieldsByKey: Record<string, unknown>,
): Promise<{ resolved: Record<string, unknown>; errors: string[] }> {
  const fields = await getFieldsForEntity(entityType);
  const fieldMap = new Map(fields.map((f) => [f.key, f]));
  const resolved: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const [key, value] of Object.entries(fieldsByKey)) {
    const field = fieldMap.get(key);
    if (!field || !field.optionsByLabelLC) {
      // Not an option field or unknown key - pass through as-is
      resolved[key] = value;
      continue;
    }

    const resolvedValue = resolveOptionValue(field, value);
    if (resolvedValue === null && value !== null && value !== undefined) {
      const validOptions = field.options?.map((o) => o.label).join(", ") ?? "none";
      errors.push(
        `Invalid value "${value}" for field key "${key}" (${field.name}, type: ${field.fieldType}). Valid options: ${validOptions}`,
      );
      continue;
    }
    resolved[key] = resolvedValue;
  }

  return { resolved, errors };
}

export async function resolveCustomFieldsByName(
  entityType: FieldEntityType,
  fieldsByName: Record<string, unknown>,
): Promise<{ resolved: Record<string, unknown>; errors: string[] }> {
  const resolved: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const [name, value] of Object.entries(fieldsByName)) {
    const { field, ambiguous, matches } = await resolveFieldByName(entityType, name);
    if (ambiguous) {
      errors.push(
        `Ambiguous field name "${name}" matches multiple fields: ${matches.join(", ")}. Use the field key directly via custom_fields instead.`,
      );
      continue;
    }
    if (!field) {
      const suggestions = await getClosestFieldNames(entityType, name, 10);
      errors.push(
        `Unknown field "${name}". Closest matches: ${suggestions.map((s) => `"${s}"`).join(", ") || "none"}`,
      );
      continue;
    }

    // Resolve enum/set values
    const resolvedValue = resolveOptionValue(field, value);
    if (resolvedValue === null && value !== null && value !== undefined) {
      const validOptions = field.options?.map((o) => o.label).join(", ") ?? "none";
      errors.push(
        `Invalid value "${value}" for field "${name}" (type: ${field.fieldType}). Valid options: ${validOptions}`,
      );
      continue;
    }

    resolved[field.key] = resolvedValue;
  }

  return { resolved, errors };
}

export function resolveOptionValue(field: FieldMetadata, value: unknown): unknown {
  if (value === null || value === undefined) return value;

  // Text fields - pass through
  if (!field.optionsByLabelLC) return value;

  if (typeof value === "string") {
    // For set fields, handle comma-separated ID strings (e.g. "200,201")
    if (field.fieldType === "set" && value.includes(",")) {
      const parts = value.split(",").map((s) => s.trim());
      const ids: number[] = [];
      for (const part of parts) {
        const resolved = resolveOptionValue(field, part);
        if (resolved === null) return null;
        ids.push(resolved as number);
      }
      return ids.join(",");
    }

    // Try to resolve as option label
    const optionId = field.optionsByLabelLC.get(value.toLowerCase());
    if (optionId !== undefined) return optionId;

    // If it's a number string, might be an option ID already
    const asNum = parseInt(value, 10);
    if (!isNaN(asNum) && field.optionsById?.has(asNum)) return asNum;

    return null;
  }

  if (typeof value === "number") {
    if (field.optionsById?.has(value)) return value;
    return null;
  }

  // Array of values for set fields
  if (Array.isArray(value) && field.fieldType === "set") {
    const ids: number[] = [];
    for (const v of value) {
      const resolved = resolveOptionValue(field, v);
      if (resolved === null) return null;
      ids.push(resolved as number);
    }
    return ids.join(",");
  }

  return value;
}

export function reverseResolveFieldValue(
  field: FieldMetadata,
  value: unknown,
): { value: unknown; display_value: string } {
  if (value === null || value === undefined) {
    return { value, display_value: "" };
  }

  if (!field.optionsById) {
    return { value, display_value: String(value) };
  }

  if (typeof value === "number") {
    const label = field.optionsById.get(value);
    return { value, display_value: label ?? String(value) };
  }

  if (typeof value === "string" && field.fieldType === "set") {
    // Comma-separated IDs
    const ids = value.split(",").map((s) => parseInt(s.trim(), 10));
    const labels = ids.map((id) => field.optionsById?.get(id) ?? String(id));
    return { value, display_value: labels.join(", ") };
  }

  return { value, display_value: String(value) };
}

export async function resolveCustomFieldsInResponse(
  entityType: FieldEntityType,
  data: Record<string, unknown>,
): Promise<Array<{ key: string; label: string; value: unknown; display_value: string }>> {
  const fields = await getFieldsForEntity(entityType);
  const customFieldKeys = new Set(fields.filter((f) => f.key.length === 40).map((f) => f.key));
  const result: Array<{ key: string; label: string; value: unknown; display_value: string }> = [];

  // v2 API nests custom fields in a `custom_fields` object; v1 puts them at top level
  const customFieldData = (data.custom_fields as Record<string, unknown>) ?? data;

  for (const [key, value] of Object.entries(customFieldData)) {
    if (!customFieldKeys.has(key)) continue;

    const field = fields.find((f) => f.key === key);
    if (!field) continue;

    const { display_value } = reverseResolveFieldValue(field, value);
    result.push({
      key,
      label: field.name,
      value,
      display_value,
    });
  }

  // Also check top-level keys (v1 responses)
  if (customFieldData !== data) {
    for (const [key, value] of Object.entries(data)) {
      if (!customFieldKeys.has(key)) continue;
      if (result.some((r) => r.key === key)) continue; // already resolved from custom_fields

      const field = fields.find((f) => f.key === key);
      if (!field) continue;

      const { display_value } = reverseResolveFieldValue(field, value);
      result.push({ key, label: field.name, value, display_value });
    }
  }

  return result;
}

async function getClosestFieldNames(
  entityType: FieldEntityType,
  target: string,
  count: number,
): Promise<string[]> {
  const fields = await getFieldsForEntity(entityType);
  const targetLower = target.toLowerCase();

  // Score fields by similarity
  const scored = fields
    .map((f) => ({
      name: f.name,
      score: stringSimilarity(targetLower, f.name.toLowerCase()),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count);

  return scored.filter((s) => s.score > 0).map((s) => s.name);
}

function stringSimilarity(a: string, b: string): number {
  // Simple substring + prefix scoring
  if (a === b) return 1;
  if (b.includes(a) || a.includes(b)) return 0.8;
  if (b.startsWith(a.substring(0, 3)) || a.startsWith(b.substring(0, 3))) return 0.5;

  // Character overlap
  const aChars = new Set(a.split(""));
  const bChars = new Set(b.split(""));
  let overlap = 0;
  for (const c of aChars) {
    if (bChars.has(c)) overlap++;
  }
  return overlap / Math.max(aChars.size, bChars.size) * 0.4;
}

export function clearFieldCache(): void {
  fieldCache?.clear();
}
