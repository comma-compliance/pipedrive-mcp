import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { type Config } from "./config.js";
import { createHttpClient, type HttpClient } from "./pipedrive/http-client.js";
import { createApiV1, type ApiV1 } from "./pipedrive/api-v1.js";
import { createApiV2, type ApiV2 } from "./pipedrive/api-v2.js";
import { createRateLimiters } from "./pipedrive/rate-limit.js";
import { setupToolHandlers, getRegisteredToolCount, setWriteToolsEnabled } from "./mcp/register-tools.js";
import { log } from "./logging.js";
import type Bottleneck from "bottleneck";

export interface ServerContext {
  config: Config;
  httpClient: HttpClient;
  apiV1: ApiV1;
  apiV2: ApiV2;
  rateLimiters: { general: Bottleneck; search: Bottleneck };
}

let _context: ServerContext | null = null;

export function getContext(): ServerContext {
  if (!_context) {
    throw new Error("Server context not initialized. Call createServer first.");
  }
  return _context;
}

export function createServer(config: Config): { server: Server; context: ServerContext } {
  const httpClient = createHttpClient(config);
  const apiV1 = createApiV1(config, httpClient);
  const apiV2 = createApiV2(config, httpClient);
  const rateLimiters = createRateLimiters(config);

  _context = {
    config,
    httpClient,
    apiV1,
    apiV2,
    rateLimiters,
  };

  const server = new Server(
    {
      name: "pipedrive-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Apply write tools flag before registering handlers
  setWriteToolsEnabled(config.enableWriteTools);

  // Register tool handlers
  setupToolHandlers(server);

  log.info("Server created", {
    tools: getRegisteredToolCount(),
    transport: config.transport,
  });

  return { server, context: _context };
}
