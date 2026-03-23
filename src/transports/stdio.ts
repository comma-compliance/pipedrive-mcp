import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { log } from "../logging.js";

export async function createStdioTransport(): Promise<StdioServerTransport> {
  log.info("Starting stdio transport");
  return new StdioServerTransport();
}
