/**
 * server.ts — Composition root
 *
 * Creates all instances and registers all 11 MCP tools.
 * To add a new tool: see AGENTS.md → "如何添加新工具（3 步）"
 *
 * Quick summary:
 *   1. Create src/tools/render-xxx.ts  (copy template from AGENTS.md)
 *   2. Add import below  ← ADD NEW TOOL IMPORT HERE
 *   3. Add registration  ← ADD NEW TOOL REGISTRATION HERE
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig, ensureOutputDirWritable } from "./infra/config.js";
import { DiagramStore } from "./infra/store.js";
import { PreviewServer } from "./infra/preview-server.js";
import { logger } from "./infra/logger.js";

// ── Tool imports ──────────────────────────────────────────────────────────────
// ← ADD NEW TOOL IMPORT HERE
import { registerRenderDiagram }       from "./tools/render-diagram.js";
import { registerRenderFlowchart }     from "./tools/render-flowchart.js";
import { registerRenderSequence }      from "./tools/render-sequence.js";
import { registerRenderArchitecture }  from "./tools/render-architecture.js";
import { registerRenderClassDiagram }  from "./tools/render-class.js";
import { registerRenderMindmap }       from "./tools/render-mindmap.js";
import { registerRenderSvg }           from "./tools/render-svg.js";
import { registerUpdateDiagram }       from "./tools/update-diagram.js";
import { registerDeleteDiagram }       from "./tools/delete-diagram.js";
import { registerListDiagrams }        from "./tools/list-diagrams.js";
import { registerOpenPreview }         from "./tools/open-preview.js";

const TOOL_COUNT = 11; // keep in sync when adding tools

// ─────────────────────────────────────────────────────────────────────────────

export async function createServer() {
  const config = loadConfig();
  await ensureOutputDirWritable(config.outputDir);

  const store = new DiagramStore(config.outputDir);
  await store.init();

  const preview = new PreviewServer(store, config);

  const mcp = new McpServer({ name: "ai-draw-mcp", version: "0.2.0" });

  const ctx = { store, config, preview };

  // ── Tool registrations ────────────────────────────────────────────────────
  // ← ADD NEW TOOL REGISTRATION HERE
  registerRenderDiagram(mcp, ctx);
  registerRenderFlowchart(mcp, ctx);
  registerRenderSequence(mcp, ctx);
  registerRenderArchitecture(mcp, ctx);
  registerRenderClassDiagram(mcp, ctx);
  registerRenderMindmap(mcp, ctx);
  registerRenderSvg(mcp, ctx);
  registerUpdateDiagram(mcp, ctx);
  registerDeleteDiagram(mcp, ctx);
  registerListDiagrams(mcp, ctx);
  registerOpenPreview(mcp, ctx);

  logger.info(`${TOOL_COUNT} MCP tools registered`);

  return { mcp, store, preview, config };
}
