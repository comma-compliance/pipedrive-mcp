/**
 * Test helper that bootstraps the Pipedrive MCP server context
 * and provides a callTool helper for integration tests.
 */
import { type Config, resetConfig } from "../../src/config.js";
import { createServer } from "../../src/server.js";
import {
  clearToolRegistry,
  setWriteToolsEnabled,
  getToolByName,
} from "../../src/mcp/register-tools.js";
import { clearFieldCache } from "../../src/services/custom-fields.js";
import { setLogLevel } from "../../src/logging.js";
import type { ToolResult } from "../../src/mcp/tool-result.js";

let _initialized = false;

export const TEST_API_TOKEN = "test-api-token-00000000000000000000";
export const TEST_OAUTH_TOKEN = "test-oauth-access-token-abc123";
export const TEST_COMPANY_DOMAIN = "testcompany";
export const BASE_URL = `https://${TEST_COMPANY_DOMAIN}.pipedrive.com`;

const TEST_CONFIG: Config = {
  apiToken: TEST_API_TOKEN,
  companyDomain: TEST_COMPANY_DOMAIN,
  transport: "stdio",
  sseHost: "0.0.0.0",
  ssePort: 3100,
  requestTimeoutMs: 5000,
  defaultLimit: 25,
  maxLimit: 100,
  rateLimitGeneralPer2s: 100,
  rateLimitSearchPer2s: 50,
  fieldCacheTtlMs: 300000,
  enableWriteTools: true,
  logLevel: "error",
};

const TEST_OAUTH_CONFIG: Config = {
  ...TEST_CONFIG,
  apiToken: undefined as unknown as string,
  oauthToken: TEST_OAUTH_TOKEN,
};

export async function setupTestContext(): Promise<void> {
  if (_initialized) return;

  // Set env vars
  process.env.PIPEDRIVE_API_TOKEN = TEST_API_TOKEN;
  process.env.PIPEDRIVE_COMPANY_DOMAIN = TEST_COMPANY_DOMAIN;

  // Suppress noisy logs during tests
  setLogLevel("error");

  // Reset any cached config and registries
  resetConfig();
  clearToolRegistry();
  clearFieldCache();

  // Import tool modules (they self-register via registerTools when imported)
  await import("../../src/tools/index.js");

  // Create the server context (sets internal _context used by getContext())
  createServer(TEST_CONFIG);

  // Enable write tools for tests
  setWriteToolsEnabled(true);

  _initialized = true;
}

/**
 * Set up test context in OAuth mode.
 * Used in its own test file, do not mix with setupTestContext in the same file.
 */
export async function setupOAuthTestContext(): Promise<void> {
  process.env.PIPEDRIVE_OAUTH_TOKEN = TEST_OAUTH_TOKEN;
  process.env.PIPEDRIVE_COMPANY_DOMAIN = TEST_COMPANY_DOMAIN;
  delete process.env.PIPEDRIVE_API_TOKEN;

  setLogLevel("error");

  resetConfig();
  clearToolRegistry();
  clearFieldCache();

  await import("../../src/tools/index.js");

  createServer(TEST_OAUTH_CONFIG);

  setWriteToolsEnabled(true);

  _initialized = true;
}

/**
 * Call a registered tool by name with the given args.
 * Returns the parsed JSON from the tool result text content.
 */
export async function callTool(
  name: string,
  args: Record<string, unknown> = {},
): Promise<{ result: ToolResult; data: unknown }> {
  const tool = getToolByName(name);
  if (!tool) {
    throw new Error(
      `Tool "${name}" not found in registry. Was setupTestContext() called?`,
    );
  }

  const result = await tool.handler(args);

  // Parse the text content from the result
  let data: unknown = null;
  if (result.content && result.content.length > 0) {
    const textContent = result.content[0];
    if (textContent && "text" in textContent) {
      try {
        data = JSON.parse(textContent.text as string);
      } catch {
        data = textContent.text;
      }
    }
  }

  return { result, data };
}
