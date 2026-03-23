import { registerTools, type ToolDefinition } from "../mcp/register-tools.js";
import { successResult, type ToolResult } from "../mcp/tool-result.js";
import { validationErrorResult } from "../mcp/errors.js";
import { getFieldsForEntity, type FieldEntityType } from "../services/custom-fields.js";
import { CustomFieldsListSchema } from "../schemas/custom-fields.js";
import { zodToJsonSchema } from "../schemas/zod-to-json.js";

async function handleCustomFieldsList(args: Record<string, unknown>): Promise<ToolResult> {
  const parsed = CustomFieldsListSchema.safeParse(args);
  if (!parsed.success) return validationErrorResult("pipedrive_custom_fields_list", parsed.error.message);

  const input = parsed.data;
  const fields = await getFieldsForEntity(input.entity_type as FieldEntityType, input.refresh_cache);

  const formatted = fields.map((f) => {
    const entry: Record<string, unknown> = {
      key: f.key,
      name: f.name,
      field_type: f.fieldType,
      entity_type: f.entityType,
    };

    if (input.include_options && f.options) {
      entry.options = f.options;
    }

    return entry;
  });

  return successResult({
    entity_type: input.entity_type,
    field_count: formatted.length,
    fields: formatted,
  });
}

const tools: ToolDefinition[] = [
  {
    name: "pipedrive_custom_fields_list",
    description: "List field metadata for an entity type. Returns field keys, names, types, and options for enum/set fields. Use this to discover available custom fields before using custom_fields_by_name.",
    inputSchema: zodToJsonSchema(CustomFieldsListSchema),
    handler: handleCustomFieldsList,
  },
];

registerTools(tools);
