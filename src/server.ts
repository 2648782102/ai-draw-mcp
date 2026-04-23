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
import { registerUpdateDiagram } from "./tools/update-diagram.js";

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
    version: "0.2.0",
  });

  const ctx = { store, config, preview };

  registerRenderDiagram(mcp, ctx);
  registerRenderFlowchart(mcp, ctx);
  registerRenderSequence(mcp, ctx);
  registerRenderArchitecture(mcp, ctx);
  registerRenderClassDiagram(mcp, ctx);
  registerRenderMindmap(mcp, ctx);
  registerRenderSvg(mcp, ctx);
  registerUpdateDiagram(mcp, ctx);
  registerListDiagrams(mcp, store, config);
  registerOpenPreview(mcp, store, config);

  logger.info("All 10 MCP tools registered");

  return { mcp, store, preview, config };
}
