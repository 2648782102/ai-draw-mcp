#!/usr/bin/env node

/**
 * ai-draw-mcp — MCP Server entry point.
 *
 * Communicates with the IDE host (Cursor / VS Code / Trae / etc.)
 * via stdio JSON-RPC, and also starts a local HTTP preview server.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { logger } from "./utils/logger.js";

async function main() {
  const { mcp, preview } = await createServer();

  await preview.start();

  const transport = new StdioServerTransport();
  await mcp.connect(transport);

  logger.info("ai-draw-mcp is running (stdio + preview server)");
}

main().catch((err) => {
  logger.error(`Fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
