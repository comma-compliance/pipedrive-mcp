import { type Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { type ToolResult } from "./tool-result.js";
import { validationErrorResult } from "./errors.js";
import { errorResult } from "./tool-result.js";
import { HttpClientError } from "../pipedrive/http-client.js";
import { log } from "../logging.js";
import { captureError } from "../sentry.js";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<ToolResult>;
  isWriteTool?: boolean;
}

const toolRegistry = new Map<string, ToolDefinition>();

const WRITE_TOOL_PATTERNS = /_create$|_update$|_delete$|_merge$|_move_stage$|_mark_done$|_add$|_upload$/;

export function registerTool(tool: ToolDefinition): void {
  if (toolRegistry.has(tool.name)) {
    throw new Error(`Tool already registered: ${tool.name}`);
  }
  const isWrite = tool.isWriteTool ?? WRITE_TOOL_PATTERNS.test(tool.name);
  toolRegistry.set(tool.name, { ...tool, isWriteTool: isWrite });
  log.debug(`Registered tool: ${tool.name}${isWrite ? " (write)" : ""}`);
}

export function registerTools(tools: ToolDefinition[]): void {
  for (const tool of tools) {
    registerTool(tool);
  }
}

let _writeToolsEnabled = true;

export function setWriteToolsEnabled(enabled: boolean): void {
  _writeToolsEnabled = enabled;
  if (!enabled) {
    log.info("Write tools disabled by PIPEDRIVE_ENABLE_WRITE_TOOLS=false");
  }
}

export function setupToolHandlers(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = Array.from(toolRegistry.values())
      .filter((t) => _writeToolsEnabled || !t.isWriteTool)
      .map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      }));
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = toolRegistry.get(name);

    if (!tool) {
      return validationErrorResult(name, `Unknown tool: ${name}`);
    }

    if (!_writeToolsEnabled && tool.isWriteTool) {
      return errorResult(
        `${name}: write tools are disabled (PIPEDRIVE_ENABLE_WRITE_TOOLS=false). Only read tools are available.`,
      );
    }

    try {
      log.info(`Calling tool: ${name}`, { args: Object.keys(args ?? {}) });
      const result = await tool.handler((args as Record<string, unknown>) ?? {});
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error(`Tool ${name} threw unexpectedly`, { error: message });

      captureError(err, {
        tool: name,
        category: err instanceof HttpClientError ? "network" : "internal",
        extra: { args_keys: Object.keys(args ?? {}) },
      });

      // Distinguish network/API errors from validation errors
      if (err instanceof HttpClientError) {
        return errorResult(`${name}: network error - ${message}. Retryable: yes.`);
      }
      return errorResult(`${name}: internal error - ${message}`);
    }
  });
}

export function getRegisteredToolCount(): number {
  return toolRegistry.size;
}

export function getToolByName(name: string): ToolDefinition | undefined {
  return toolRegistry.get(name);
}

export function clearToolRegistry(): void {
  toolRegistry.clear();
}
