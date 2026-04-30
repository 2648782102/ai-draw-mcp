#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { logger } from "./infra/logger.js";

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
