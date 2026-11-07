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
import {
  MCP_INSTRUCTIONS,
  buildAgentBrief,
  buildAgentCapabilities,
  buildAgentDiagnostics,
  buildAgentSessionProjection,
} from "./infra/agent-context.js";

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
import { registerGetAgentWorkflow } from "./tools/get-agent-workflow.js";
import { registerGetNodeContext } from "./tools/get-node-context.js";
import { registerGetSharedBrief } from "./tools/get-shared-brief.js";
import { registerGetDecisionTrail } from "./tools/get-decision-trail.js";
import { registerGetSourceNavigation } from "./tools/get-source-navigation.js";
import { registerGetCapabilities } from "./tools/get-capabilities.js";
import { registerGetSelectionScope } from "./tools/get-selection-scope.js";
import { registerGetSelectionWorkorder } from "./tools/get-selection-workorder.js";
import { SERVER_TOOL_COUNT } from "./domain/capabilities.js";

const TOOL_COUNT = SERVER_TOOL_COUNT; // keep in sync when adding tools

function registerAgentResources(mcp: McpServer, sessions: SessionStore, config: ReturnType<typeof loadConfig>): void {
  const jsonResource = (uri: string, value: () => unknown) => ({
    contents: [{
      uri,
      mimeType: "application/json",
      text: JSON.stringify(value(), null, 2),
    }],
  });

  mcp.registerResource(
    "Shared board session",
    "ai-draw://board/session",
    {
      title: "Shared board session",
      description: "Credential-free current graph, focus, annotations, messages, graph diffs, downgraded proposal state, and an export manifest.",
      mimeType: "application/json",
      annotations: { audience: ["assistant"], priority: 1 },
    },
    async () => jsonResource("ai-draw://board/session", () => buildAgentSessionProjection(sessions)),
  );

  mcp.registerResource(
    "Shared board brief",
    "ai-draw://board/brief",
    {
      title: "Shared board brief",
      description: "Compact read-only BRIEF_JSON handoff derived from the current session; excludes approval grants.",
      mimeType: "application/json",
      annotations: { audience: ["assistant"], priority: 0.9 },
    },
    async () => jsonResource("ai-draw://board/brief", () => buildAgentBrief(sessions)),
  );

  mcp.registerResource(
    "Shared board capabilities",
    "ai-draw://board/capabilities",
    {
      title: "Shared board capabilities",
      description: "Versioned tool catalogue, JSON contracts, workflow readiness, next action, and the write boundary.",
      mimeType: "application/json",
      annotations: { audience: ["assistant"], priority: 0.8 },
    },
    async () => jsonResource("ai-draw://board/capabilities", () => buildAgentCapabilities(sessions, SERVER_VERSION)),
  );

  mcp.registerResource(
    "Shared board diagnostics",
    "ai-draw://board/diagnostics",
    {
      title: "Shared board diagnostics",
      description: "Read-only session health, signals, next actions, and project-write safety invariants.",
      mimeType: "application/json",
      annotations: { audience: ["assistant"], priority: 0.7 },
    },
    async () => jsonResource("ai-draw://board/diagnostics", () => buildAgentDiagnostics(sessions)),
  );

  mcp.registerResource(
    "Shared board panel",
    "ai-draw://board/panel",
    {
      title: "Shared board panel",
      description: "Optional localhost URL for human review; agents should consume JSON resources instead of opening this URL.",
      mimeType: "text/plain",
      annotations: { audience: ["user", "assistant"], priority: 0.1 },
    },
    async () => ({
      contents: [{
        uri: "ai-draw://board/panel",
        mimeType: "text/plain",
        text: `http://${config.previewHost}:${config.previewPort}/\n`,
      }],
    }),
  );
}

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

  const mcp = new McpServer(
    { name: "ai-draw-mcp", version: SERVER_VERSION },
    { instructions: MCP_INSTRUCTIONS },
  );

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
  registerGetAgentWorkflow(mcp, ctx);
  registerGetNodeContext(mcp, ctx);
  registerGetSharedBrief(mcp, ctx);
  registerGetDecisionTrail(mcp, ctx);
  registerGetSourceNavigation(mcp, ctx);
  registerGetCapabilities(mcp, ctx);
  registerGetSelectionScope(mcp, ctx);
  registerGetSelectionWorkorder(mcp, ctx);

  registerAgentResources(mcp, sessions, config);

  logger.info(`${TOOL_COUNT} MCP tools registered`);

  return { mcp, store, preview, config, sessions, visualSync };
}
