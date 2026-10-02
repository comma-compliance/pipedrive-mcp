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
    if (!field || !field.optionsByLabelLC || NATIVE_LABEL_KEYS.includes(key)) {
      // Not an option field, unknown key, or native label (resolved later by buildFieldsPayload) - pass through as-is
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

    // Native labels are resolved later by buildFieldsPayload
    if (NATIVE_LABEL_KEYS.includes(field.key)) {
      resolved[field.key] = value;
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

  // v2 rejects anything but a JSON array of integer option ids for multi-option fields
  if (field.fieldType === "set") return resolveSetValue(field, value);

  return resolveSingleOption(field, value);
}

function resolveSingleOption(field: FieldMetadata, value: unknown): number | null {
  if (typeof value === "string") {
    const optionId = field.optionsByLabelLC?.get(value.trim().toLowerCase());
    if (optionId !== undefined) return optionId;

    // A numeric string might be an option ID already
    if (/^\s*\d+\s*$/.test(value)) {
      const asNum = parseInt(value, 10);
      if (field.optionsById?.has(asNum)) return asNum;
    }
    return null;
  }

  if (typeof value === "number") {
    return field.optionsById?.has(value) ? value : null;
  }

  return null;
}

/**
 * Resolve a multi-option (set) value to an array of option ids.
 * Accepts an id, a numeric string, an option label, a comma-separated string
 * of ids or labels, or an array of any of those.
 */
function resolveSetValue(field: FieldMetadata, value: unknown): number[] | null {
  const items = Array.isArray(value) ? value : [value];
  const ids: number[] = [];

  for (const item of items) {
    const single = resolveSingleOption(field, item);
    if (single !== null) {
      ids.push(single);
      continue;
    }

    // Comma-separated ids or labels (e.g. "200,201"); tried after the whole
    // string so labels that contain commas still match
    if (typeof item === "string" && item.includes(",")) {
      for (const part of item.split(",")) {
        // Reject empty segments so a typo like "," can't clear the field
        if (part.trim() === "") return null;
        const resolved = resolveSingleOption(field, part);
        if (resolved === null) return null;
        ids.push(resolved);
      }
      continue;
    }

    return null;
  }

  return [...new Set(ids)];
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

  if (Array.isArray(value)) {
    const labels = value.map((id) => field.optionsById?.get(Number(id)) ?? String(id));
    return { value, display_value: labels.join(", ") };
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

// Native label field keys. v1 field metadata calls it "label" (deals, older
// person/org setups) or "label_ids"; the v2 write API only accepts top-level
// `label_ids`, never a key inside custom_fields.
const NATIVE_LABEL_KEYS = ["label_ids", "label"];

export async function getLabelField(entityType: FieldEntityType): Promise<FieldMetadata | null> {
  const fields = await getFieldsForEntity(entityType);
  for (const key of NATIVE_LABEL_KEYS) {
    const field = fields.find((f) => f.key === key && f.fieldType === "set");
    if (field) return field;
  }
  for (const key of NATIVE_LABEL_KEYS) {
    const field = fields.find((f) => f.key === key);
    if (field) return field;
  }
  return null;
}

/** Resolve label ids, numeric strings, or label names to an array of label option ids. */
export async function resolveLabelIds(
  entityType: FieldEntityType,
  value: unknown,
): Promise<{ ids: number[] | null; error: string | null }> {
  let field: FieldMetadata | null = null;
  let lookupError: string | null = null;
  try {
    field = await getLabelField(entityType);
  } catch (err) {
    lookupError = err instanceof Error ? err.message : String(err);
  }

  if (!field || !field.options) {
    // Numeric ids need no name lookup - send them and let Pipedrive validate
    const numericIds = parseNumericIds(value);
    if (numericIds !== null) return { ids: numericIds, error: null };
    return {
      ids: null,
      error: `Cannot resolve label names for ${entityType}: ${lookupError ?? "no label field found"}. Pass numeric label ids instead.`,
    };
  }

  const setField: FieldMetadata = { ...field, fieldType: "set" };
  const ids = resolveOptionValue(setField, value) as number[] | null;
  if (ids === null) {
    const validOptions = field.options.map((o) => `${o.label} (${o.id})`).join(", ") || "none";
    return {
      ids: null,
      error: `Invalid label value ${JSON.stringify(value)} for ${entityType}. Valid labels: ${validOptions}`,
    };
  }
  return { ids, error: null };
}

/** Parse ids, numeric strings, comma-separated id strings, or arrays of those. Null if anything is not an id. */
function parseNumericIds(value: unknown): number[] | null {
  const items = Array.isArray(value) ? value : [value];
  const ids: number[] = [];
  for (const item of items) {
    if (typeof item === "number" && Number.isInteger(item) && item > 0) {
      ids.push(item);
      continue;
    }
    if (typeof item !== "string") return null;
    for (const part of item.split(",")) {
      if (!/^\s*\d+\s*$/.test(part)) return null;
      const id = parseInt(part, 10);
      if (id <= 0) return null;
      ids.push(id);
    }
  }
  return [...new Set(ids)];
}

/**
 * Build the custom_fields and label_ids parts of a v2 create/update body.
 * Native label keys passed through custom_fields or custom_fields_by_name are
 * pulled out and sent as top-level label_ids instead.
 */
export async function buildFieldsPayload(
  entityType: FieldEntityType,
  input: {
    custom_fields?: Record<string, unknown>;
    custom_fields_by_name?: Record<string, unknown>;
    label_ids?: unknown;
  },
): Promise<{ payload: Record<string, unknown>; errors: string[] }> {
  const customFieldsObj: Record<string, unknown> = {};
  const errors: string[] = [];
  let labelValue: unknown = input.label_ids;

  if (input.custom_fields) {
    const { resolved, errors: keyErrors } = await resolveCustomFieldsByKey(entityType, input.custom_fields);
    errors.push(...keyErrors);
    Object.assign(customFieldsObj, resolved);
  }
  if (input.custom_fields_by_name) {
    const { resolved, errors: nameErrors } = await resolveCustomFieldsByName(entityType, input.custom_fields_by_name);
    errors.push(...nameErrors);
    Object.assign(customFieldsObj, resolved);
  }

  for (const key of NATIVE_LABEL_KEYS) {
    if (!(key in customFieldsObj)) continue;
    if (labelValue === undefined) labelValue = customFieldsObj[key];
    delete customFieldsObj[key];
  }

  const payload: Record<string, unknown> = {};
  if (labelValue !== undefined) {
    const { ids, error } = await resolveLabelIds(entityType, labelValue === null ? [] : labelValue);
    if (error) errors.push(error);
    else payload.label_ids = ids;
  }
  if (Object.keys(customFieldsObj).length > 0) payload.custom_fields = customFieldsObj;

  return { payload, errors };
}
