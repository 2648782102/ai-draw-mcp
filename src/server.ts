/**
 * server.ts — Composition root
 *
 * Creates all instances and registers all MCP tools.
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
import { SessionStore } from "./infra/session-store.js";
import { VisualSyncService } from "./infra/visual-sync-service.js";
import { logger } from "./infra/logger.js";
import { SERVER_VERSION } from "./infra/version.js";

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
import { registerScanProject }         from "./tools/scan-project.js";
import { registerGetVisualContext }   from "./tools/get-visual-context.js";
import { registerCreateVisualProposal } from "./tools/create-visual-proposal.js";
import { registerApplyVisualProposal } from "./tools/apply-visual-proposal.js";
import { registerReplyToVisualContext } from "./tools/reply-to-visual-context.js";
import { registerPreflightVisualProposal } from "./tools/preflight-visual-proposal.js";
import { registerListChangeTemplates } from "./tools/list-change-templates.js";

const TOOL_COUNT = 18; // keep in sync when adding tools

// ─────────────────────────────────────────────────────────────────────────────

export async function createServer() {
  const config = loadConfig();
  await ensureOutputDirWritable(config.outputDir);

  const store = new DiagramStore(config.outputDir);
  await store.init();

  const sessions = await SessionStore.create({
    outputDir: config.outputDir,
    workspaceRoot: config.workspaceRoot,
  });

  let preview: PreviewServer;
  const visualSync = new VisualSyncService({
    store,
    config,
    sessions,
    get preview() { return preview; },
  });
  preview = new PreviewServer(store, config, sessions, visualSync);

  const mcp = new McpServer({ name: "ai-draw-mcp", version: SERVER_VERSION });

  const ctx = { store, config, preview, sessions, visualSync };

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
  registerScanProject(mcp, ctx);
  registerGetVisualContext(mcp, ctx);
  registerCreateVisualProposal(mcp, ctx);
  registerApplyVisualProposal(mcp, ctx);
  registerReplyToVisualContext(mcp, ctx);
  registerPreflightVisualProposal(mcp, ctx);
  registerListChangeTemplates(mcp, ctx);

  logger.info(`${TOOL_COUNT} MCP tools registered`);

  return { mcp, store, preview, config, sessions, visualSync };
}
