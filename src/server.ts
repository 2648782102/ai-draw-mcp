import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DiagramStore } from "./storage/diagram-store.js";
import { PreviewServer } from "./preview/preview-server.js";
import { loadConfig, type AppConfig } from "./utils/config.js";
import { logger } from "./utils/logger.js";
import {
  registerRenderDiagram,
  registerRenderFlowchart,
  registerRenderSequence,
  registerRenderArchitecture,
  registerRenderClassDiagram,
  registerRenderMindmap,
  registerRenderSvg,
  registerListDiagrams,
  registerOpenPreview,
} from "./tools/index.js";

/**
 * Create and configure the MCP server with all tools registered.
 */
export async function createServer() {
  const config: AppConfig = loadConfig();

  const store = new DiagramStore(config.outputDir);
  await store.init();

  const preview = new PreviewServer(store, config);

  const mcp = new McpServer({
    name: "ai-draw-mcp",
    version: "0.1.0",
  });

  registerRenderDiagram(mcp, store, config);
  registerRenderFlowchart(mcp, store, config);
  registerRenderSequence(mcp, store, config);
  registerRenderArchitecture(mcp, store, config);
  registerRenderClassDiagram(mcp, store, config);
  registerRenderMindmap(mcp, store, config);
  registerRenderSvg(mcp, store, config);
  registerListDiagrams(mcp, store, config);
  registerOpenPreview(mcp, store, config);

  logger.info("All 9 MCP tools registered");

  return { mcp, store, preview, config };
}
