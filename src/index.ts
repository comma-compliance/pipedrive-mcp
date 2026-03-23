import { loadConfig } from "./config.js";
import { setLogLevel } from "./logging.js";
import { log } from "./logging.js";
import { createServer } from "./server.js";
import { createStdioTransport } from "./transports/stdio.js";

async function main(): Promise<void> {
  try {
    const config = loadConfig();
    setLogLevel(config.logLevel);

    log.info("Pipedrive MCP server starting", {
      domain: config.companyDomain,
      transport: config.transport,
    });

    // Register all tool modules (these import and self-register)
    await import("./tools/index.js");

    const { server } = createServer(config);

    if (config.transport === "stdio") {
      const transport = await createStdioTransport();
      await server.connect(transport);
      log.info("Pipedrive MCP server running on stdio");
    } else {
      log.error("SSE transport not yet implemented");
      process.exit(1);
    }

    // Graceful shutdown
    process.on("SIGINT", async () => {
      log.info("Shutting down");
      await server.close();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      log.info("Shutting down");
      await server.close();
      process.exit(0);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("Fatal error", { error: message });
    process.exit(1);
  }
}

main();
