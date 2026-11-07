#!/usr/bin/env node
/**
 * Offline maintenance checks for files that frequently drift in an open-source repo.
 * This script never calls the network and never needs credentials.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

const read = (relativePath) => fs.readFile(path.join(root, relativePath), "utf8");
const assetExists = async (relativePath) => {
  try {
    await fs.access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
};
const packageJson = JSON.parse(await read("package.json"));
const vitestConfig = await read("vitest.config.ts");
const launchKit = await read("docs/LAUNCH_KIT.md");
const githubMaintenance = await read("scripts/github-maintenance.mjs");
const readme = await read("README.md");
const agents = await read("AGENTS.md");
const changelog = await read("CHANGELOG.md");
const architecture = await read("docs/ARCHITECTURE.md");
const panel = await read("src/infra/templates/index.html");
const previewServer = await read("src/infra/preview-server.ts");
const types = await read("src/domain/types.ts");
const sessionBundle = await read("src/domain/session-bundle.ts");
const sessionStore = await read("src/infra/session-store.ts");
const getVisualContext = await read("src/tools/get-visual-context.ts");
const replyTool = await read("src/tools/reply-to-visual-context.ts");
const preflightTool = await read("src/tools/preflight-visual-proposal.ts");
const annotationThread = await read("src/domain/annotation-thread.ts");
const activityTimeline = await read("src/domain/activity-timeline.ts");
const sessionBundleSource = await read("src/domain/session-bundle.ts");
const pathSafety = await read("src/domain/path-safety.ts");
const approval = await read("src/domain/approval.ts");
const domainContractsTest = await read("test/domain-contracts.test.mjs");
const mcpTest = await read("test/mcp.test.mjs");
const dependabotConfig = await read(".github/dependabot.yml");
const dependencyMaintenance = await read("docs/DEPENDENCY_MAINTENANCE.md");
const englishQuickstart = await read("README.en.md");
const troubleshooting = await read("docs/TROUBLESHOOTING.md");
const documentationMap = await read("docs/README.md");
const docAssetGenerator = await read("scripts/generate-doc-assets.mjs");
const governance = await read("docs/GOVERNANCE.md");
const goalMode = await read("docs/GOAL_MODE.md");
const collaborationTest = await read("test/collab.integration.test.mjs");
const panelUiTest = await read("test/panel-ui.test.mjs");
const canvasFocusTest = await read("test/canvas-focus.test.mjs");
const capturePanelScript = await read("scripts/capture-panel.mjs");
const adrIndex = await read("docs/ADR/README.md");
const releasing = await read("RELEASING.md");
const changeTemplateDomain = await read("src/domain/change-templates.ts");
const projectScanner = await read("src/infra/project-scanner.ts");
const visualSyncService = await read("src/infra/visual-sync-service.ts");
const visualGraphMerge = await read("src/domain/visual-graph-merge.ts");
const scanTool = await read("src/tools/scan-project.ts");
const server = await read("src/server.ts");
const agentWorkflowDomain = await read("src/domain/agent-workflow.ts");
const getAgentWorkflowTool = await read("src/tools/get-agent-workflow.ts");
const agentWorkflowExample = await read("examples/agent-workflow.mjs");
const agentWorkflowTest = await read("test/agent-workflow.test.mjs");
const nodeContextDomain = await read("src/domain/node-context.ts");
const getNodeContextTool = await read("src/tools/get-node-context.ts");
const nodeContextTest = await read("test/node-context.test.mjs");
const sharedBriefDomain = await read("src/domain/shared-brief.ts");
const sharedBriefTool = await read("src/tools/get-shared-brief.ts");
const sharedBriefTest = await read("test/shared-brief.test.mjs");
const sharedBriefAdr = await read("docs/ADR/0011-shared-brief-is-a-read-only-projection.md");
const decisionTrailDomain = await read("src/domain/decision-trail.ts");
const getDecisionTrailTool = await read("src/tools/get-decision-trail.ts");
const decisionTrailTest = await read("test/decision-trail.test.mjs");
const decisionTrailAdr = await read("docs/ADR/0013-decision-trail-is-a-read-only-projection.md");
const exportManifestAdr = await read("docs/ADR/0014-export-manifest-is-a-derived-inventory.md");
const reviewReadinessAdr = await read("docs/ADR/0015-review-readiness-is-a-derived-diagnostic.md");
const reviewReadinessDomain = await read("src/domain/review-readiness.ts");
const sourceNavigationDomain = await read("src/domain/source-navigation.ts");
const getSourceNavigationTool = await read("src/tools/get-source-navigation.ts");
const sourceNavigationTest = await read("test/source-navigation.test.mjs");
const sourceNavigationAdr = await read("docs/ADR/0016-source-navigation-is-copyable-context.md");
const capabilitiesDomain = await read("src/domain/capabilities.ts");
const getCapabilitiesTool = await read("src/tools/get-capabilities.ts");
const capabilitiesTest = await read("test/capabilities.test.mjs");
const capabilitiesAdr = await read("docs/ADR/0017-capability-catalogue-is-read-only-discovery.md");
const selectionAdr = await read("docs/ADR/0018-human-selection-is-read-only-scope.md");
const selectionDomain = await read("src/domain/selection.ts");
const getSelectionScopeTool = await read("src/tools/get-selection-scope.ts");
const selectionTest = await read("test/selection.test.mjs");
const selectionWorkorderAdr = await read("docs/ADR/0019-selection-workorder-is-read-only-preflight.md");
const mcpToolAdr = await read("docs/ADR/0020-mcp-tool-is-the-primary-product.md");
const restrainedVisualAdr = await read("docs/ADR/0021-restrained-visual-system.md");
const boardModulesAdr = await read("docs/ADR/0023-board-modules-and-library-boundary.md");
const selectionWorkorderDomain = await read("src/domain/selection-workorder.ts");
const getSelectionWorkorderTool = await read("src/tools/get-selection-workorder.ts");
const selectionWorkorderTest = await read("test/selection-workorder.test.mjs");
const reviewReadinessTest = await read("test/review-readiness.test.mjs");
const sessionDiagnosticsDomain = await read("src/domain/session-diagnostics.ts");
const sessionDiagnosticsTest = await read("test/session-diagnostics.test.mjs");
const viewportDomain = await read("src/domain/viewport.ts");
const viewportTest = await read("test/viewport.test.mjs");
const viewportAdr = await read("docs/ADR/0012-viewport-is-read-only-attention-context.md");
const nodeContextAdr = await read("docs/ADR/0010-node-context-is-a-read-only-projection.md");
const workflowAdr = await read("docs/ADR/0007-agent-workflow-is-a-read-only-contract.md");
const visualHistoryAdr = await read("docs/ADR/0008-visual-undo-is-not-project-undo.md");
const sourceEvidenceAdr = await read("docs/ADR/0009-source-evidence-is-read-only-context.md");
const graphHistoryDomain = await read("src/domain/graph-history.ts");
const graphHistoryTest = await read("test/graph-history.test.mjs");
const sourceEvidenceTest = await read("test/source-evidence.test.mjs");
const examplesReadme = await read("examples/README.md");
const collaborationWorkflow = await read("examples/collaboration-workflow.md");
const security = await read("SECURITY.md");
const roadmap = await read("ROADMAP.md");
const research = await read("docs/COMPETITIVE_RESEARCH.md");
const productDirection = await read("docs/PRODUCT_DIRECTION.md");
const sharedBoardAdr = await read("docs/ADR/0022-shared-visual-board-is-the-product.md");
const englishReadme = englishQuickstart;
const ci = await read(".github/workflows/ci.yml");
const metadataWorkflow = await read(".github/workflows/maintain-github-metadata.yml");
const releaseWorkflow = await read(".github/workflows/release.yml");
const contributing = await read("CONTRIBUTING.md");
const pullRequestTemplate = await read(".github/PULL_REQUEST_TEMPLATE.md");
const featureRequestTemplate = await read(".github/ISSUE_TEMPLATE/feature_request.yml");
const agentContext = await read("src/infra/agent-context.ts");
const agentContextTest = await read("test/agent-context.test.mjs");
const agentFirstAdr = await read("docs/ADR/0024-agent-first-mcp-surface.md");
const serverSource = await read("src/server.ts");
const configSource = await read("src/infra/config.ts");
const sharedTools = await read("src/tools/_shared.ts");
const openPreviewTool = await read("src/tools/open-preview.ts");
const codexMcpExample = await read("examples/mcp-config/codex.toml");

const expectedDescription = "Local-first visual communication board where people and AI share and refine a software project model; code changes remain human-approved.";
const expectedHomepage = "https://github.com/2648782102/ai-draw-mcp#readme";
const expectedTopics = [
  "mcp",
  "model-context-protocol",
  "ai",
  "diagram",
  "mermaid",
  "visualization",
  "developer-tools",
  "human-in-the-loop",
  "cursor",
  "vscode",
  "typescript",
  "local-first",
];

check(packageJson.description === expectedDescription, "package.json description does not match docs/LAUNCH_KIT.md");
check(agents.includes("ai-draw://board/{session,brief,capabilities,diagnostics,panel}"), "AGENTS.md does not document the agent-first MCP resources");
check(architecture.includes("MCP 初始化指令与 5 个只读 `ai-draw://board/*` 资源"), "ARCHITECTURE.md does not document agent-first MCP resources");
check(productDirection.includes("Keep the agent in the agent"), "PRODUCT_DIRECTION.md is missing the agent-first experience principle");
check(englishQuickstart.includes("tools do not open a browser by default"), "README.en.md does not document the headless MCP default");
check(readme.includes("工具调用不再自动弹出浏览器"), "README.md does not document the headless MCP default");
check(roadmap.includes("ai-draw://board/*"), "ROADMAP.md does not document MCP resources");
check(documentationMap.includes("0024-agent-first-mcp-surface.md"), "docs/README.md does not link ADR 0024");
check(agentFirstAdr.includes("MCP stdio is the default AI-facing product surface"), "ADR 0024 is missing the agent-first decision");
check(agentContext.includes("buildAgentSessionProjection"), "agent-context.ts is missing the session resource projection");
check(agentContext.includes("scrubProposalMetadata"), "agent-context.ts does not scrub credential-like metadata");
check(agentContextTest.includes("credential-free bundles"), "agent-context.test.mjs is missing the credential-free resource assertion");
check(serverSource.includes("instructions: MCP_INSTRUCTIONS"), "server.ts does not publish MCP instructions");
check(serverSource.includes('"ai-draw://board/session"'), "server.ts is missing the session resource");
check(serverSource.includes('"ai-draw://board/panel"'), "server.ts is missing the optional panel resource");
check(configSource.includes("autoOpenPanel"), "config.ts is missing the auto-open opt-in");
check(configSource.includes('process.env.AI_DRAW_AUTO_OPEN_PANEL'), "config.ts is missing the AI_DRAW_AUTO_OPEN_PANEL env var");
check(sharedTools.includes("if (config.autoOpenPanel) await openPanelInIDE(panelUrl)"), "render pipelines are not opt-in for panel opening");
check(scanTool.includes("Open the preview panel for a human (default false)"), "scan_project still describes browser opening as the default");
check(openPreviewTool.includes("仅当人明确想查看共享画板时"), "open_preview does not describe the human-facing opt-in");
check(codexMcpExample.includes('AI_DRAW_AUTO_OPEN_PANEL = "0"'), "Codex example does not disable legacy auto-open behavior");
check(changelog.includes("Agent 内部优先的 MCP 表面"), "CHANGELOG.md is missing the agent-first MCP entry");
check(launchKit.includes("Agent-first 短帖"), "LAUNCH_KIT.md is missing the agent-first launch copy");
check(troubleshooting.includes("no browser is required"), "TROUBLESHOOTING.md does not state the headless MCP default");
check(contributing.includes("普通生成/扫描工具默认不打开浏览器"), "CONTRIBUTING.md does not state the headless tool convention");
check(mcpTest.includes("agent-first instructions and credential-free read-only resources"), "mcp.test.mjs is missing MCP resource regression");
check(agentWorkflowExample.includes("agent-first MCP instructions"), "agent-workflow.mjs does not verify MCP instructions");
check(examplesReadme.includes("mcp-config/codex.toml"), "examples/README.md does not list the Codex MCP example");
check(await assetExists("docs/collaboration-loop.svg"), "README is missing the shared-board concept diagram");
check(await assetExists("docs/shared-board-panel.png"), "README is missing the canonical shared-board screenshot");
const docsPngs = (await fs.readdir(path.join(root, "docs")))
  .filter((name) => name.endsWith(".png"))
  .sort();
check(
  docsPngs.length === 1 && docsPngs[0] === "shared-board-panel.png",
  "docs must keep only the one canonical shared-board screenshot",
);
check(launchKit.includes(expectedDescription), "docs/LAUNCH_KIT.md is missing the GitHub description");
check(launchKit.includes(expectedHomepage), "docs/LAUNCH_KIT.md is missing the GitHub homepage");
check(launchKit.includes("25 MCP tools"), "docs/LAUNCH_KIT.md historical 0.3.3 release notes preserve the published 25 MCP tools");
check(launchKit.includes("沉浸工作区"), "docs/LAUNCH_KIT.md is missing the UI iteration launch copy");
check(githubMaintenance.includes(expectedDescription), "scripts/github-maintenance.mjs is missing the GitHub description");
check(githubMaintenance.includes(expectedHomepage), "scripts/github-maintenance.mjs is missing the GitHub homepage");
for (const topic of expectedTopics) {
  check(launchKit.includes(topic), `docs/LAUNCH_KIT.md is missing topic: ${topic}`);
  check(githubMaintenance.includes(`"${topic}"`), `scripts/github-maintenance.mjs is missing topic: ${topic}`);
}

for (const [id, needle] of [
  ["btnSaveGraph", 'id="btnSaveGraph"'],
  ["btnSaveBoardNote", 'id="btnSaveBoardNote"'],
  ["annotationList", 'id="annotationList"'],
  ["btnExportSession", 'id="btnExportSession"'],
  ["btnImportSession", 'id="btnImportSession"'],
  ["boardNoteInput", 'id="boardNoteInput"'],
  ["focusSummary", 'id="focusSummary"'],
  ["btnCopyAiContext", 'id="btnCopyAiContext"'],
  ["btnCopySourceNavigation", 'id="btnCopySourceNavigation"'],
  ["btnCopyCapabilities", 'id="btnCopyCapabilities"'],
  ["btnClearSelection", 'id="btnClearSelection"'],
  ["btnCopySelectionScope", 'id="btnCopySelectionScope"'],
  ["btnCopySelectionWorkorder", 'id="btnCopySelectionWorkorder"'],
  ["selectionSummary", 'id="selectionSummary"'],
  ["selectionScopeList", 'id="selectionScopeList"'],
  ["selectionWorkorderSummary", 'id="selectionWorkorderSummary"'],
  ["selectionWorkorderList", 'id="selectionWorkorderList"'],
  ["capabilitiesList", 'id="capabilitiesList"'],
  ["rescanSummary", 'id="rescanSummary"'],
  ["btnRescan", 'id="btnRescan"'],
  ["node-x editor", 'class="node-x"'],
  ["node-y editor", 'class="node-y"'],
]) {
  check(panel.includes(needle), `Collaboration panel is missing ${id}`);
}
for (const endpoint of [
  "/api/collab/source-evidence",
  "/api/collab/decision-trail",
  "/api/collab/bundle/manifest",
  "/api/collab/review-readiness",
  "/api/collab/source-navigation",
  "/api/collab/capabilities",
  "/api/collab/selection",
  "/api/collab/selection-scope",
  "/api/collab/selection-workorder",
  "/api/collab/node-context",
  "/api/collab/graph/history",
  "/api/collab/graph/undo",
  "/api/collab/graph/redo",
  "/api/collab/annotations/:id/reply",
  "/api/collab/annotations/:id/status",
  "/api/collab/annotations/:id/anchor",
  "/api/collab/focus",
  "/api/collab/activity",
  "/api/collab/diagnostics",
  "/api/collab/graph/diffs",
  "/api/collab/rescan",
  "/api/collab/bundle/import",
  "/api/collab/proposals/:id/impact",
]) {
  check(previewServer.includes(endpoint), `preview-server.ts is missing route ${endpoint}`);
}
for (const [label, file, needle] of [
  ["AnnotationReply", types, "export interface AnnotationReply"],
  ["parseAnnotationReplies", annotationThread, "export function parseAnnotationReplies"],
  ["annotation thread serialization", sessionBundle, "serializeReplies"],
  ["annotation thread validation", sessionStore, "parseAnnotationReplies"],
  ["annotationThreads context", getVisualContext, "summarizeAnnotationThreads"],
  ["stale annotation threads context", getVisualContext, "staleThreads"],
  ["annotation_replies tool argument", replyTool, "annotation_replies"],
  ["proposal preflight tool", preflightTool, "preflight_visual_proposal"],
  ["proposal preflight read-only contract", preflightTool, "不写项目文件、不创建提案"],
  ["proposal preflight domain function", await read("src/domain/proposal-preflight.ts"), "inspectProposalChanges"],
  ["activity timeline derivation", activityTimeline, "export function buildActivityTimeline"],
  ["activity timeline context", getVisualContext, "activityTimeline"],
  ["session diagnostics endpoint", previewServer, "buildSessionDiagnostics"],
  ["session diagnostics context", getVisualContext, "buildSessionDiagnostics"],
  ["session diagnostics panel", panel, "diagnosticsSummary"],
  ["session diagnostics signal list", panel, "diagnosticsList"],
  ["session diagnostics domain", await read("src/domain/session-diagnostics.ts"), "buildSessionDiagnostics"],
  ["graph diff domain", await read("src/domain/graph-diff.ts"), "diffVisualGraph"],
  ["graph diff context", getVisualContext, "graphDiffs"],
  ["graph diff panel", panel, "graphDiffSummary"],
  ["graph diff panel details", panel, "graphDiffList"],
  ["graph diff bundle parser", sessionBundle, "parseGraphDiffs"],
  ["graph diff timeline event", activityTimeline, "graph_diff"],
  ["human focus endpoint", previewServer, "/api/collab/focus"],
  ["human focus panel", panel, "publishFocus"],
  ["human focus context", getVisualContext, "focus"],
  ["human focus bundle parser", sessionBundle, "parseFocus"],
  ["copyable AI context prompt", panel, "buildAiContextPrompt"],
  ["copyable graph diff detail", panel, "latestGraphDiff"],
  ["CI reproducible docs assets", ci, "npm run docs:assets:check"],
  ["CI offline repository check", ci, "npm run repo:check"],
  ["stable scanner IDs", projectScanner, "stableId"],
  ["visual sync service", visualSyncService, "export class VisualSyncService"],
  ["visual graph merge", visualGraphMerge, "export function mergeScannedGraph"],
  ["scan preservation contract", scanTool, "PRESERVATION_JSON"],
  ["headless scan parameter", scanTool, "render"],
  ["typed human rescan render switch", previewServer, "render must be a boolean"],
  ["panel keeps full rescan rendering", panel, "confirmedBy: 'human', render: true"],
  ["bounded CI rescan test", collaborationTest, "15_000"],
  ["human rescan panel", panel, "rescanProject"],
  ["human rescan endpoint", previewServer, "/api/collab/rescan"],
  ["finite coordinate validation", sessionStore, "finiteCoordinate"],
  ["annotation anchor status", types, "anchorStatus"],
  ["annotation anchor activity", activityTimeline, "annotation_anchor"],
  ["human re-anchor confirmation", previewServer, "Human confirmation is required"],
  ["annotation re-anchor UI", panel, "data-annotation-anchor"],
  ["graph node path editor", panel, "node-path"],
  ["graph node group editor", panel, "node-group"],
  ["graph edge kind editor", panel, "edge-kind"],
  ["approval downgrade in bundle", sessionBundleSource, 'status: proposal.status === "approved" ? "pending" : proposal.status'],
  ["protected path checks", pathSafety, "DENIED_SEGMENTS"],
  ["one-time approval validation", approval, "grant.usedAt"],
  ["domain contract tests", domainContractsTest, "describe(\"session bundle contract\""],
]) {
  check(file.includes(needle), `${label} is missing or drifted`);
}

for (const document of ["README.en.md", "docs/TROUBLESHOOTING.md", "docs/GOVERNANCE.md", "docs/ADR/README.md", "ROADMAP.md", "docs/ARCHITECTURE.md", "docs/COMPETITIVE_RESEARCH.md", "docs/LAUNCH_KIT.md"]) {
  check(readme.includes(document) || readme.includes(document.replace(/\.md$/, ".md")), `README.md does not link ${document}`);
}
for (const document of ["../README.en.md", "TROUBLESHOOTING.md", "GOVERNANCE.md", "ADR/README.md"]) {
  check(documentationMap.includes(document), `docs/README.md does not link ${document}`);
}
for (const [label, file, needle] of [
  ["Chinese README loop diagram", readme, "docs/collaboration-loop.svg"],
  ["Chinese README canonical shared board", readme, "docs/shared-board-panel.png"],
  ["Chinese README single screenshot", readme, "仓库只保留这一张可复现界面截图"],
  ["English quickstart loop diagram", englishQuickstart, "docs/collaboration-loop.svg"],
  ["English quickstart workbench diagram", englishQuickstart, "docs/collaboration-workbench.svg"],
  ["Chinese README troubleshooting link", readme, "docs/TROUBLESHOOTING.md"],
  ["English quickstart troubleshooting link", englishQuickstart, "docs/TROUBLESHOOTING.md"],
  ["English quickstart human approval boundary", englishQuickstart, "explicit human approval"],
  ["English quickstart single screenshot", englishQuickstart, "It is the only UI screenshot kept in the repository"],
  ["one-time receipt FAQ", troubleshooting, "one-time receipt"],
  ["bilingual stale workorder FAQ", troubleshooting, "What does a stale selection workorder mean?"],
  ["stale workorder FAQ Chinese action", troubleshooting, "重新勾选目标节点"],
  ["single canonical screenshot guard", agents, "docs/shared-board-panel.png   唯一当前界面基线截图"],
  ["single canonical screenshot capture", agents, "生成唯一 canonical 界面截图"],
  ["legacy screenshot cleanup changelog", changelog, "清理旧界面截图与本机图库"],
  ["readable scan changelog", changelog, "可读首屏扫描"],
  ["bounded scan defaults", architecture, "默认 2 层、最多 40 个节点"],
  ["scan group summary option", scanTool, "group_summary"],
  ["scan group summary service", visualSyncService, "groupSummary: options.groupSummary"],
  ["readable board layout", visualSyncService, "flowchart TB"],
  ["readable board spacing", panel, "nodeSpacing: 18"],
  ["bounded board scan regression", sourceEvidenceTest, "bounds large workspace scans into grouped board nodes"],
  ["legacy screenshot cleanup roadmap", roadmap, "Legacy UI screenshots were removed"],
  ["stale workorder FAQ Chinese clear button", troubleshooting, "清空选择范围"],
  ["stale workorder FAQ Chinese stale-path warning", troubleshooting, "不要沿用旧候选路径起草 changes"],
  ["stale workorder FAQ English action", troubleshooting, "Clear selection"],
  ["stale workorder FAQ English stale-path warning", troubleshooting, "do not draft changes from the old candidate paths"],
  ["stale workorder FAQ safety", troubleshooting, "never auto-refreshes or clears"],
  ["stale workorder FAQ CI evidence", troubleshooting, "42135660499"],
  ["English stale workorder FAQ", englishQuickstart, 'freshness.status: "stale"'],
  ["Chinese stale workorder FAQ", readme, "stale 多选工作单"],
  ["nextActor troubleshooting", troubleshooting, "nextActor"],
  ["reproducible asset script", docAssetGenerator, "collaboration-loop.svg"],
  ["distribution checklist", launchKit, "concept diagrams reviewed together"],
  ["governance metadata evidence", governance, "description: null"],
  ["ADR safety decisions", adrIndex, "0002-conversation-state-is-not-authority.md"],
  ["ADR focus decision", adrIndex, "0005-human-focus-is-read-only-context.md"],
  ["ADR stable scan decision", adrIndex, "0006-stable-scan-preserves-human-visual-state.md"],
  ["ADR workflow decision", adrIndex, "0007-agent-workflow-is-a-read-only-contract.md"],
  ["ADR visual history decision", adrIndex, "0008-visual-undo-is-not-project-undo.md"],
  ["ADR source evidence decision", adrIndex, "0009-source-evidence-is-read-only-context.md"],
  ["source evidence ADR boundary", sourceEvidenceAdr, "never enlarges a proposal's permitted paths"],
  ["source evidence shared type", types, "export interface GraphSourceEvidence"],
  ["source evidence scanner", projectScanner, "sourceEvidenceFor"],
  ["source evidence scan stats", projectScanner, "totalEvidence"],
  ["source evidence graph conversion", projectScanner, "sourceEvidence: node.sourceEvidence"],
  ["source evidence merge", visualGraphMerge, "sourceEvidence: scannedNode.sourceEvidence"],
  ["source evidence validation", sessionStore, "sourceEvidence must contain at most 5 entries"],
  ["source evidence bundle parser", sessionBundle, "parseSourceEvidence"],
  ["source evidence MCP context", getVisualContext, "sourceEvidence"],
  ["source evidence diagnostics", await read("src/domain/session-diagnostics.ts"), "sourceEvidence"],
  ["source evidence endpoint", previewServer, "/api/collab/source-evidence"],
  ["source evidence panel", panel, "id=\"sourceEvidenceList\""],
  ["source evidence test", sourceEvidenceTest, "read-only source evidence"],
  ["source evidence workflow", agentWorkflowDomain, "sourceEvidence"],
  ["source evidence research", research, "基础证据已交付"],
  ["source evidence launch", launchKit, "file:line` source evidence"],
  ["source evidence docs map", documentationMap, "0009-source-evidence-is-read-only-context.md"],
  ["source evidence security", security, "GraphSourceEvidence"],
  ["source evidence troubleshooting", troubleshooting, "sourceEvidence"],
  ["node context ADR boundary", nodeContextAdr, "grantsWriteAuthority: false"],
  ["node context shared type", types, "export interface NodeContext"],
  ["node context builder", nodeContextDomain, "buildNodeContext"],
  ["node context thread reuse", nodeContextDomain, "summarizeAnnotationThreads"],
  ["node context tool", getNodeContextTool, '"get_node_context"'],
  ["node context marker", getNodeContextTool, '"NODE_CONTEXT_JSON:"'],
  ["node context read-only invariant", nodeContextDomain, "grantsWriteAuthority: false"],
  ["node context server registration", server, "registerGetNodeContext"],
  ["node context endpoint", previewServer, "/api/collab/node-context"],
  ["node context panel", panel, 'id="nodeContextList"'],
  ["node context workflow output", agentWorkflowDomain, "NODE_CONTEXT_JSON"],
  ["node context test", nodeContextTest, "read-only node context"],
  ["node context MCP test", await read("test/mcp.test.mjs"), "NODE_CONTEXT_JSON"],
  ["node context HTTP test", collaborationTest, "/api/collab/node-context"],
  ["node context ADR index", adrIndex, "0010-node-context-is-a-read-only-projection.md"],
  ["node context docs map", documentationMap, "0010-node-context-is-a-read-only-projection.md"],
  ["node context English docs", englishQuickstart, "NODE_CONTEXT_JSON"],
  ["node context Chinese docs", readme, "NODE_CONTEXT_JSON"],
  ["node context AGENTS docs", agents, "NODE_CONTEXT_JSON"],
  ["node context architecture", architecture, "NODE_CONTEXT_JSON"],
  ["node context security", security, "NODE_CONTEXT_JSON"],
  ["node context launch", launchKit, "NODE_CONTEXT_JSON"],
  ["node context research", research, "NODE_CONTEXT_JSON"],
  ["node context troubleshooting", troubleshooting, "NODE_CONTEXT_JSON"],
  ["node context example", examplesReadme, "get_node_context"],
  ["visual history ADR boundary", visualHistoryAdr, "never writes `AI_DRAW_WORKSPACE_ROOT`"],
  ["visual history shared type", types, "export interface GraphHistoryState"],
  ["visual history parser", graphHistoryDomain, "parseGraphHistory"],
  ["visual history store", sessionStore, "MAX_GRAPH_HISTORY"],
  ["visual history restore", sessionStore, "restoreGraph"],
  ["visual history endpoint", previewServer, "/api/collab/graph/history"],
  ["visual undo endpoint", previewServer, "/api/collab/graph/undo"],
  ["visual redo endpoint", previewServer, "/api/collab/graph/redo"],
  ["visual history panel summary", panel, 'id="graphHistorySummary"'],
  ["visual undo button", panel, 'id="btnUndoGraph"'],
  ["visual redo button", panel, 'id="btnRedoGraph"'],
  ["visual history contract test", graphHistoryTest, "graph history contract"],
  ["visual history integration test", await read("test/collab.integration.test.mjs"), "undoes and redoes only visual graph state"],
  ["visual history diagnostics", await read("src/domain/session-diagnostics.ts"), "graphHistory"],
  ["visual history security", security, "视觉撤销/重做"],
  ["visual history troubleshooting", troubleshooting, "0008-visual-undo-is-not-project-undo.md"],
  ["visual history docs map", documentationMap, "0008-visual-undo-is-not-project-undo.md"],
  ["visual history research", research, "视觉撤销栈已交付"],
  ["visual history launch", launchKit, "visual undo/redo"],
  ["workflow ADR write boundary", workflowAdr, 'writes: "project"'],
  ["workflow shared type", types, "export interface AgentWorkflow"],
  ["workflow domain builder", agentWorkflowDomain, "export function buildAgentWorkflow"],
  ["workflow domain thread reuse", agentWorkflowDomain, "summarizeAnnotationThreads"],
  ["workflow tool name", getAgentWorkflowTool, '"get_agent_workflow"'],
  ["workflow tool marker", getAgentWorkflowTool, '"WORKFLOW_JSON:"'],
  ["workflow tool read-only boundary", getAgentWorkflowTool, "不写会话或项目文件"],
  ["workflow step write target", agentWorkflowDomain, 'writes: "project"'],
  ["workflow readiness blockers", agentWorkflowDomain, "blocked.push"],
  ["workflow example", agentWorkflowExample, "get_agent_workflow"],
  ["workflow example scan", agentWorkflowExample, '"scan_project"'],
  ["workflow example stops at preflight", agentWorkflowExample, "Stopped before create_visual_proposal"],
  ["workflow example assertion", agentWorkflowExample, "no proposal or project write"],
  ["workflow contract test", agentWorkflowTest, "agent workflow contract"],
  ["shared brief type", types, "export interface SharedBrief"],
  ["shared brief domain", sharedBriefDomain, "export function buildSharedBrief"],
  ["shared brief safety", sharedBriefDomain, "excludesApprovalGrants: true"],
  ["shared brief tool", sharedBriefTool, '"get_shared_brief"'],
  ["shared brief marker", sharedBriefTool, '"BRIEF_JSON:"'],
  ["shared brief server registration", server, "registerGetSharedBrief"],
  ["shared brief endpoint", previewServer, "/api/collab/brief"],
  ["shared brief panel", panel, 'id="sharedBriefList"'],
  ["shared brief copy button", panel, 'id="btnCopySharedBrief"'],
  ["shared brief workflow output", agentWorkflowDomain, "BRIEF_JSON"],
  ["shared brief pure contract test", sharedBriefTest, "read-only shared brief"],
  ["shared brief MCP test", await read("test/mcp.test.mjs"), "BRIEF_JSON"],
  ["shared brief HTTP test", collaborationTest, "/api/collab/brief"],
  ["shared brief example", agentWorkflowExample, "get_shared_brief"],
  ["shared brief ADR index", adrIndex, "0011-shared-brief-is-a-read-only-projection.md"],
  ["shared brief ADR boundary", sharedBriefAdr, "excludesApprovalGrants: true"],
  ["shared brief docs map", documentationMap, "0011-shared-brief-is-a-read-only-projection.md"],
  ["shared brief English docs", englishQuickstart, "BRIEF_JSON"],
  ["shared brief Chinese docs", readme, "BRIEF_JSON"],
  ["shared brief AGENTS docs", agents, "BRIEF_JSON"],
  ["shared brief architecture", architecture, "BRIEF_JSON"],
  ["shared brief security", security, "BRIEF_JSON"],
  ["shared brief launch", launchKit, "BRIEF_JSON"],
  ["shared brief research", research, "BRIEF_JSON"],
  ["shared brief troubleshooting", troubleshooting, "BRIEF_JSON"],
  ["shared brief examples map", examplesReadme, "get_shared_brief"],
  ["viewport shared type", types, "export interface SessionViewport"],
  ["viewport domain", viewportDomain, "export function parseViewport"],
  ["viewport bounded values", viewportDomain, "SCALE_MIN"],
  ["viewport store validation", sessionStore, "parseViewport"],
  ["viewport endpoint", previewServer, "/api/collab/viewport"],
  ["viewport panel", panel, 'id="viewportSummary"'],
  ["viewport panel sync", panel, "scheduleViewportSync"],
  ["viewport MCP context", getVisualContext, "viewport"],
  ["viewport brief", sharedBriefDomain, "viewport: snapshot.viewport"],
  ["viewport diagnostics", await read("src/domain/session-diagnostics.ts"), "viewport: snapshot.viewport"],
  ["viewport pure contract test", viewportTest, "read-only viewport attention context"],
  ["viewport HTTP test", collaborationTest, "/api/collab/viewport"],
  ["viewport HTTP auth test", collaborationTest, "unauthenticatedViewport"],
  ["viewport publisher test", await read("test/viewport-publisher.test.mjs"), "authenticated viewport publisher"],
  ["viewport ADR token transport", viewportAdr, "sendBeacon"],
  ["viewport ADR index", adrIndex, "0012-viewport-is-read-only-attention-context.md"],
  ["viewport ADR boundary", viewportAdr, "project-write capability"],
  ["viewport docs map", documentationMap, "0012-viewport-is-read-only-attention-context.md"],
  ["viewport English docs", englishQuickstart, "SessionViewport"],
  ["viewport Chinese docs", readme, "人类视口注意力"],
  ["viewport AGENTS docs", agents, "SessionViewport"],
  ["viewport architecture", architecture, "SessionViewport"],
  ["viewport security", security, "SessionViewport"],
  ["viewport launch", launchKit, "Human viewport attention"],
  ["viewport research", research, "SessionViewport"],
  ["viewport troubleshooting", troubleshooting, "BRIEF_JSON.viewport"],
  ["viewport examples map", examplesReadme, "BRIEF_JSON.viewport"],
  ["viewport authenticated publisher", panel, "'X-AI-Draw-Token': PANEL_TOKEN"],
  ["viewport keepalive publisher", panel, "keepalive: true"],
  ["viewport token middleware", previewServer, 'req.header("X-AI-Draw-Token") !== panelToken'],
  ["viewport AGENTS token transport", agents, "sendBeacon"],
  ["viewport architecture token transport", architecture, "sendBeacon"],
  ["viewport troubleshooting token transport", troubleshooting, "PANEL_TOKEN"],
  ["server tool count", server, "const TOOL_COUNT = SERVER_TOOL_COUNT"],
  ["server capabilities registration", server, "registerGetCapabilities"],
  ["server workflow registration", server, "registerGetAgentWorkflow"],
  ["CI workflow example", ci, "npm run test:examples:workflow"],
  ["package workflow example", packageJson.scripts?.["test:examples:workflow"] ?? "", "node examples/agent-workflow.mjs"],
  ["English workflow contract", englishQuickstart, "get_agent_workflow"],
  ["README workflow decision link", readme, "0007-agent-workflow-is-a-read-only-contract.md"],
  ["AGENTS workflow decision link", agents, "0007-agent-workflow-is-a-read-only-contract.md"],
  ["architecture workflow decision link", architecture, "0007-agent-workflow-is-a-read-only-contract.md"],
  ["launch workflow contract", launchKit, "WORKFLOW_JSON"],
  ["research workflow delivery", research, "基础版已交付"],
  ["security workflow boundary", security, "WORKFLOW_JSON"],
  ["troubleshooting workflow", troubleshooting, "get_agent_workflow"],
  ["examples workflow", examplesReadme, "agent-workflow.mjs"],
  ["collaboration workflow", collaborationWorkflow, "WORKFLOW_JSON.blocked"],
  ["documentation map workflow", documentationMap, "0007-agent-workflow-is-a-read-only-contract.md"],
  ["README focus context", readme, "SessionFocus"],
  ["AGENTS focus context", agents, "SessionFocus"],
  ["architecture focus endpoint", architecture, "/api/collab/focus"],
  ["release governance checklist", releasing, "docs/GOVERNANCE.md"],
  ["README stable scan", readme, "重新扫描不丢人工状态"],
  ["English stable scan", englishReadme, "rescan"],
  ["architecture stable scan", architecture, "ScanPreservationSummary"],
  ["AGENTS stable scan", agents, "VisualSyncService"],
  ["launch stable scan", launchKit, "Layout-preserving rescans"],
  ["research layout delivered", research, "布局保持与视觉撤销栈已交付"],
  ["ADR docs map", documentationMap, "0006-stable-scan-preserves-human-visual-state.md"],
  ["decision trail type", types, "export interface DecisionTrail"],
  ["decision trail event type", types, "export interface DecisionTrailEvent"],
  ["decision trail bounded projection field", types, "changeSummaryIsBoundedProjection: boolean"],
  ["decision trail domain", decisionTrailDomain, "export function buildDecisionTrail"],
  ["decision trail domain projection", decisionTrailDomain, "changeSummaryIsBoundedProjection: isBoundedProjection"],
  ["decision trail stale intent separation", decisionTrailDomain, "staleThreadsExcludedFromIntent: true"],
  ["decision trail no grants", decisionTrailDomain, "excludesApprovalGrants: true"],
  ["decision trail no write authority", decisionTrailDomain, "grantsWriteAuthority: false"],
  ["decision trail tool", getDecisionTrailTool, '"get_decision_trail"'],
  ["decision trail marker", getDecisionTrailTool, '"DECISION_TRAIL_JSON:"'],
  ["decision trail tool read-only boundary", getDecisionTrailTool, "不批准变更、不签发凭据"],
  ["decision trail server registration", server, "registerGetDecisionTrail"],
  ["decision trail endpoint", previewServer, "/api/collab/decision-trail"],
  ["decision trail panel", panel, 'id="decisionTrailList"'],
  ["decision trail panel copy button", panel, 'id="btnCopyDecisionTrail"'],
  ["decision trail panel copy boundary", panel, "提案变更行只是有界投影"],
  ["decision trail workflow output", agentWorkflowDomain, "DECISION_TRAIL_JSON"],
  ["decision trail pure contract test", decisionTrailTest, "read-only decision trail"],
  ["decision trail no-grant assertion", decisionTrailTest, "must-not-leak-grant"],
  ["decision trail MCP test", await read("test/mcp.test.mjs"), "DECISION_TRAIL_JSON"],
  ["decision trail HTTP test", collaborationTest, "/api/collab/decision-trail"],
  ["decision trail workflow example", agentWorkflowExample, "get_decision_trail"],
  ["decision trail workflow test", agentWorkflowTest, "DECISION_TRAIL_JSON"],
  ["decision trail ADR index", adrIndex, "0013-decision-trail-is-a-read-only-projection.md"],
  ["decision trail ADR boundary", decisionTrailAdr, "grantsWriteAuthority"],
  ["decision trail docs map", documentationMap, "0013-decision-trail-is-a-read-only-projection.md"],
  ["decision trail English docs", englishQuickstart, "DECISION_TRAIL_JSON"],
  ["decision trail Chinese docs", readme, "DECISION_TRAIL_JSON"],
  ["decision trail AGENTS docs", agents, "DECISION_TRAIL_JSON"],
  ["decision trail architecture", architecture, "DECISION_TRAIL_JSON"],
  ["decision trail security", security, "DECISION_TRAIL_JSON"],
  ["decision trail launch", launchKit, "DECISION_TRAIL_JSON"],
  ["decision trail research", research, "DECISION_TRAIL_JSON"],
  ["decision trail troubleshooting", troubleshooting, "DECISION_TRAIL_JSON"],
  ["decision trail examples map", examplesReadme, "get_decision_trail"],
  ["export manifest type", types, "export interface ExportManifest"],
  ["export manifest builder", sessionBundle, "export function buildExportManifest"],
  ["export manifest deterministic filename", sessionBundle, "suggestedFilename: `ai-draw-session-"],
  ["export manifest no-grant safety", sessionBundle, "excludesApprovalGrants: true"],
  ["export manifest no-write authority", sessionBundle, "grantsWriteAuthority: false"],
  ["export manifest credential metadata guard", sessionBundle, "CREDENTIAL_LIKE_KEY"],
  ["export manifest endpoint", previewServer, "/api/collab/bundle/manifest"],
  ["export manifest panel annotation", panel, "exportManifest: manifest"],
  ["export manifest panel filename", panel, "manifest.suggestedFilename"],
  ["export manifest pure contract test", domainContractsTest, "credential-free export manifest"],
  ["export manifest HTTP test", collaborationTest, "/api/collab/bundle/manifest"],
  ["export manifest ADR index", adrIndex, "0014-export-manifest-is-a-derived-inventory.md"],
  ["export manifest ADR boundary", exportManifestAdr, "grantsWriteAuthority"],
  ["export manifest docs map", documentationMap, "0014-export-manifest-is-a-derived-inventory.md"],
  ["export manifest English docs", englishQuickstart, "EXPORT_MANIFEST_JSON"],
  ["export manifest Chinese docs", readme, "EXPORT_MANIFEST_JSON"],
  ["export manifest AGENTS docs", agents, "EXPORT_MANIFEST_JSON"],
  ["export manifest architecture", architecture, "EXPORT_MANIFEST_JSON"],
  ["export manifest security", security, "EXPORT_MANIFEST_JSON"],
  ["export manifest launch", launchKit, "EXPORT_MANIFEST_JSON"],
  ["export manifest research", research, "EXPORT_MANIFEST_JSON"],
  ["export manifest troubleshooting", troubleshooting, "EXPORT_MANIFEST_JSON"],
  ["export manifest examples map", examplesReadme, "EXPORT_MANIFEST_JSON"],
  ["review readiness domain", reviewReadinessDomain, "export function buildReviewReadiness"],
  ["review readiness no authority", reviewReadinessDomain, "grantsWriteAuthority: false"],
  ["review readiness brief source", reviewReadinessDomain, "buildSharedBrief"],
  ["review readiness trail source", reviewReadinessDomain, "buildDecisionTrail"],
  ["review readiness diagnostics field", sessionDiagnosticsDomain, "reviewReadiness:"],
  ["review readiness diagnostics signal", sessionDiagnosticsDomain, "review_readiness"],
  ["review readiness endpoint", previewServer, "/api/collab/review-readiness"],
  ["review readiness panel", panel, 'id="reviewReadinessList"'],
  ["review readiness workflow example", agentWorkflowExample, "Review readiness:"],
  ["review readiness pure test", sessionDiagnosticsTest, "review_readiness"],
  ["review readiness dedicated test", reviewReadinessTest, "read-only review readiness"],
  ["review readiness ADR index", adrIndex, "0015-review-readiness-is-a-derived-diagnostic.md"],
  ["review readiness ADR boundary", reviewReadinessAdr, "grantsWriteAuthority: false"],
  ["review readiness docs map", documentationMap, "0015-review-readiness-is-a-derived-diagnostic.md"],
  ["review readiness AGENTS ADR", agents, "ADR 0015"],
  ["review readiness Chinese ADR", readme, "ADR 0015"],
  ["review readiness English ADR", englishQuickstart, "ADR 0015"],
  ["review readiness architecture ADR", architecture, "ADR 0015"],
  ["review readiness security ADR", security, "ADR 0015"],
  ["review readiness launch ADR", launchKit, "ADR 0015"],
  ["review readiness troubleshooting ADR", troubleshooting, "ADR 0015"],
  ["review readiness examples ADR", examplesReadme, "ADR 0015"],
  ["review readiness research ADR", research, "ADR 0015"],
  ["review readiness workflow type", types, "reviewReadiness: {"],
  ["review readiness workflow builder", agentWorkflowDomain, "buildReviewReadiness(snapshot)"],
  ["review readiness workflow no authority", agentWorkflowDomain, "grantsWriteAuthority: false"],
  ["review readiness workflow output", agentWorkflowDomain, '"REVIEW_READINESS_JSON"'],
  ["review readiness workflow pure test", agentWorkflowTest, "reviewReadiness"],
  ["review readiness workflow MCP test", mcpTest, "workflow.reviewReadiness"],
  ["review readiness workflow example", agentWorkflowExample, "Workflow review readiness:"],
  ["review readiness workflow Chinese docs", readme, "紧凑 `reviewReadiness`"],
  ["review readiness workflow English docs", englishQuickstart, "compact `reviewReadiness`"],
  ["review readiness workflow AGENTS docs", agents, "紧凑只读 `reviewReadiness`"],
  ["review readiness workflow architecture", architecture, "buildReviewReadiness()"],
  ["review readiness HTTP test", collaborationTest, "/api/collab/review-readiness"],
  ["source navigation domain", sourceNavigationDomain, "export function buildSourceNavigation"],
  ["source navigation shared type", types, "export interface SourceNavigation"],
  ["source navigation top-level readOnly", sourceNavigationDomain, "readOnly: true,"],
  ["source navigation no authority", sourceNavigationDomain, "grantsWriteAuthority: false"],
  ["source navigation does not open", sourceNavigationDomain, "doesNotOpenFiles: true"],
  ["source navigation human approval invariant", sourceNavigationDomain, "projectWritesRequireHumanApproval: true"],
  ["source navigation absolute path guard", sourceNavigationDomain, "excludesAbsolutePaths: true"],
  ["source navigation tool", getSourceNavigationTool, "get_source_navigation"],
  ["source navigation endpoint", previewServer, "/api/collab/source-navigation"],
  ["source navigation panel", panel, 'id="sourceNavigationList"'],
  ["source navigation copy button", panel, 'id="btnCopySourceNavigation"'],
  ["source navigation pure test", sourceNavigationTest, "read-only source navigation"],
  ["source navigation MCP test", mcpTest, "get_source_navigation"],
  ["source navigation HTTP test", collaborationTest, "/api/collab/source-navigation"],
  ["source navigation ADR index", adrIndex, "0016-source-navigation-is-copyable-context.md"],
  ["source navigation ADR boundary", sourceNavigationAdr, "doesNotOpenFiles"],
  ["source navigation official VS Code research", research, "VS Code CLI"],
  ["source navigation docs map", documentationMap, "0016-source-navigation-is-copyable-context.md"],
  ["source navigation Chinese docs", readme, "SOURCE_NAVIGATION_JSON"],
  ["source navigation English docs", englishQuickstart, "SOURCE_NAVIGATION_JSON"],
  ["source navigation AGENTS docs", agents, "SOURCE_NAVIGATION_JSON"],
  ["source navigation architecture", architecture, "SOURCE_NAVIGATION_JSON"],
  ["source navigation security", security, "SOURCE_NAVIGATION_JSON"],
  ["source navigation launch", launchKit, "SOURCE_NAVIGATION_JSON"],
  ["source navigation research", research, "SOURCE_NAVIGATION_JSON"],
  ["source navigation troubleshooting", troubleshooting, "SOURCE_NAVIGATION_JSON"],
  ["source navigation examples map", examplesReadme, "SOURCE_NAVIGATION_JSON"],
  ["source navigation examples workflow", agentWorkflowExample, "SOURCE_NAVIGATION_JSON"],
  ["source navigation workflow example", agentWorkflowExample, "Source navigation:"],
  ["review readiness English docs", englishQuickstart, "REVIEW_READINESS_JSON"],
  ["review readiness Chinese docs", readme, "REVIEW_READINESS_JSON"],
  ["review readiness AGENTS docs", agents, "REVIEW_READINESS_JSON"],
  ["review readiness architecture", architecture, "REVIEW_READINESS_JSON"],
  ["review readiness security", security, "REVIEW_READINESS_JSON"],
  ["review readiness launch", launchKit, "REVIEW_READINESS_JSON"],
  ["review readiness troubleshooting", troubleshooting, "REVIEW_READINESS_JSON"],
  ["review readiness examples map", examplesReadme, "REVIEW_READINESS_JSON"],
  ["capabilities shared type", types, "export interface Capabilities"],
  ["capabilities domain", capabilitiesDomain, "export function buildCapabilities"],
  ["capabilities count", capabilitiesDomain, "SERVER_TOOL_COUNT = 26"],
  ["capabilities name", capabilitiesDomain, 'name: "get_capabilities"'],
  ["capabilities writer", capabilitiesDomain, 'name: "apply_visual_proposal"'],
  ["capabilities marker contract", capabilitiesDomain, "marker: \"CAPABILITIES_JSON\""],
  ["capabilities no authority", capabilitiesDomain, "grantsWriteAuthority: false"],
  ["capabilities absolute path guard", capabilitiesDomain, "excludesWorkspaceAbsolutePaths: true"],
  ["capabilities tool", getCapabilitiesTool, '"get_capabilities"'],
  ["capabilities marker", getCapabilitiesTool, '"CAPABILITIES_JSON:"'],
  ["capabilities endpoint", previewServer, "/api/collab/capabilities"],
  ["capabilities panel", panel, 'id="capabilitiesList"'],
  ["capabilities panel copy button", panel, 'id="btnCopyCapabilities"'],
  ["capabilities pure contract test", capabilitiesTest, "read-only capabilities catalogue"],
  ["capabilities MCP test", mcpTest, "get_capabilities"],
  ["capabilities HTTP test", collaborationTest, "/api/collab/capabilities"],
  ["capabilities ADR index", adrIndex, "0017-capability-catalogue-is-read-only-discovery.md"],
  ["capabilities ADR boundary", capabilitiesAdr, "grants project-write authority"],
  ["capabilities docs map", documentationMap, "0017-capability-catalogue-is-read-only-discovery.md"],
  ["capabilities Chinese docs", readme, "CAPABILITIES_JSON"],
  ["capabilities English docs", englishQuickstart, "CAPABILITIES_JSON"],
  ["capabilities AGENTS docs", agents, "CAPABILITIES_JSON"],
  ["capabilities architecture", architecture, "CAPABILITIES_JSON"],
  ["capabilities security", security, "CAPABILITIES_JSON"],
  ["capabilities launch", launchKit, "CAPABILITIES_JSON"],
  ["capabilities research", research, "CAPABILITIES_JSON"],
  ["capabilities troubleshooting", troubleshooting, "CAPABILITIES_JSON"],
  ["capabilities examples map", examplesReadme, "CAPABILITIES_JSON"],
  ["capabilities collaboration workflow", collaborationWorkflow, "CAPABILITIES_JSON"],
  ["capabilities workflow example", agentWorkflowExample, "CAPABILITIES_JSON"],
  ["selection shared type", types, "export interface SessionSelection"],
  ["selection scope shared type", types, "export interface SelectionScope"],
  ["selection domain", selectionDomain, "export function buildSelectionScope"],
  ["selection limit", selectionDomain, "SELECTION_LIMIT = 24"],
  ["selection no authority", selectionDomain, "grantsWriteAuthority: false"],
  ["selection marker contract", capabilitiesDomain, 'marker: "SELECTION_SCOPE_JSON"'],
  ["selection tool", getSelectionScopeTool, '"get_selection_scope"'],
  ["selection marker", getSelectionScopeTool, '"SELECTION_SCOPE_JSON:"'],
  ["selection endpoint", previewServer, "/api/collab/selection-scope"],
  ["selection panel", panel, 'id="selectionScopeList"'],
  ["selection panel copy button", panel, 'id="btnCopySelectionScope"'],
  ["selection panel publisher", panel, "/api/collab/selection"],
  ["selection pure contract test", selectionTest, "bounded human selection"],
  ["selection MCP test", mcpTest, "get_selection_scope"],
  ["selection HTTP test", collaborationTest, "/api/collab/selection-scope"],
  ["selection ADR index", adrIndex, "0018-human-selection-is-read-only-scope.md"],
  ["selection ADR boundary", selectionAdr, "grants project-write authority"],
  ["selection Chinese docs", readme, "SELECTION_SCOPE_JSON"],
  ["selection English docs", englishQuickstart, "SELECTION_SCOPE_JSON"],
  ["selection AGENTS docs", agents, "SELECTION_SCOPE_JSON"],
  ["selection architecture", architecture, "SELECTION_SCOPE_JSON"],
  ["selection security", security, "SELECTION_SCOPE_JSON"],
  ["selection launch", launchKit, "SELECTION_SCOPE_JSON"],
  ["selection troubleshooting", troubleshooting, "SELECTION_SCOPE_JSON"],
  ["selection examples map", examplesReadme, "SELECTION_SCOPE_JSON"],
  ["selection collaboration workflow", collaborationWorkflow, "SELECTION_SCOPE_JSON"],
  ["selection workflow example", agentWorkflowExample, "26-tool catalogue"],
  ["workorder shared type", types, "export interface SelectionWorkorder"],
  ["workorder domain", selectionWorkorderDomain, "export function buildSelectionWorkorder"],
  ["workorder no content", selectionWorkorderDomain, "excludesProjectChangeContent: true"],
  ["workorder marker contract", capabilitiesDomain, 'marker: "SELECTION_WORKORDER_JSON"'],
  ["workorder tool", getSelectionWorkorderTool, '"get_selection_workorder"'],
  ["workorder marker", getSelectionWorkorderTool, '"SELECTION_WORKORDER_JSON:"'],
  ["workorder endpoint", previewServer, "/api/collab/selection-workorder"],
  ["workorder panel", panel, 'id="selectionWorkorderList"'],
  ["workorder panel copy button", panel, 'id="btnCopySelectionWorkorder"'],
  ["workorder pure contract test", selectionWorkorderTest, "read-only selection workorder"],
  ["workorder freshness type", types, "status: \"current\" | \"stale\" | \"none\""],
  ["workorder freshness domain", selectionWorkorderDomain, "selectionStale"],
  ["workorder freshness guidance", selectionWorkorderDomain, "freshness is descriptive only"],
  ["workorder freshness tool text", getSelectionWorkorderTool, "Selection freshness"],
  ["workorder freshness panel", panel, "workorder.freshness?.status"],
  ["workorder stale panel emphasis", panel, "signal stale"],
  ["modern brand header", panel, "brand-mark"],
  ["shared board subtitle", panel, "人与 AI 的共享项目画板"],
  ["collaboration safety kicker", panel, "LOCAL · READ-ONLY UNTIL APPROVAL"],
  ["collaboration section icons", panel, "section-icon"],
  ["proposal empty state", panel, "empty-state"],
  ["collaboration overview strip", panel, "collab-overview"],
  ["collaboration responsive tabs", panel, "collab-tabs"],
  ["section scroll regions", panel, "section-scroll"],
  ["sticky action docks", panel, "section-dock"],
  ["collapsible signal drawers", panel, "signal-drawer"],
  ["keyboard shortcut hint", panel, "btnCommandHint"],
  ["button busy feedback", panel, "button.busy"],
  ["copy success feedback", panel, "flashButton"],
  ["reduced motion support", panel, "prefers-reduced-motion"],
  ["keyboard collaboration shortcut", panel, "openCollab()"],
  ["dense action grouping", panel, "dock-secondary"],
  ["board note input counter", panel, "boardNoteInputCount"],
  ["proposal safety note", panel, "safety-note"],
  ["workspace view switch", panel, "view-switch"],
  ["canvas mode chip", panel, "canvas-chip"],
  ["persistent canvas-first view mode", panel, "viewMode: 'canvas'"],
  ["canvas-first rail", panel, "boardContextTitle"],
  ["canvas-first rescan action", panel, "btnBoardRescan"],
  ["canvas-first welcome rescan", panel, "btnWelcomeRescan"],
  ["canvas object thread view", panel, "canvasBoardThread"],
  ["canvas object note input", panel, "canvasBoardNoteInput"],
  ["canvas object note action", panel, "btnCanvasBoardNote"],
  ["canvas object note renderer", panel, "renderCanvasBoardThread"],
  ["canvas object note endpoint", panel, "saveCanvasBoardNote"],
  ["secondary workbench details", panel, "btnBoardDetails"],
  ["shared board canonical screenshot", capturePanelScript, "shared-board-panel.png"],
  ["first-run welcome card", panel, "welcome-card"],
  ["local-only example diagram", panel, "loadExampleDiagram"],
  ["light workspace theme", panel, "theme-light"],
  ["compact density mode", panel, "density-compact"],
  ["appearance popover", panel, "appearance-popover"],
  ["appearance theme options", panel, "data-ui-theme"],
  ["appearance ambient options", panel, "data-ambient"],
  ["appearance zen options", panel, "data-zen"],
  ["restrained visual tokens", panel, "--ui-accent"],
  ["unified visual system CSS", panel, "Restrained workbench: one visual language"],
  ["legacy visual system compatibility", panel, "body.visual-aurora, body.visual-studio, body.visual-atlas"],
  ["hidden legacy chrome CSS", panel, ".visual-switch, .sidebar"],
  ["visible focus outline", panel, "button:focus-visible, select:focus-visible"],
  ["restrained ADR index", adrIndex, "0021-restrained-visual-system.md"],
  ["restrained visual ADR", restrainedVisualAdr, "one restrained workbench visual system"],
  ["default Flow workspace preference", panel, "layoutSystem: 'flow'"],
  ["Flow workspace class", panel, "flow-workspace"],
  ["Flow workspace layout switch", panel, "applyLayoutSystem"],
  ["Flow workspace shortcut", panel, "toggleLayoutSystem()"],
  ["Flow source drawer", panel, "flow-source-open"],
  ["Flow source shortcut", panel, "toggleFlowSource()"],
  ["Flow collaboration rail", panel, "flowRail"],
  ["Flow collaboration rail renderer", panel, "renderFlowRail"],
  ["Flow stage navigation", panel, "openFlowStage"],
  ["Flow focus lens", panel, "flowLens"],
  ["Flow focus lens renderer", panel, "flowLensState"],
  ["Flow focus lens navigation", panel, "btnFlowLensNext"],
  ["Flow focus lens browser regression", panelUiTest, "flowLensIndex"],
  ["Flow rail browser regression", panelUiTest, "flow-source-open"],
  ["Flow rail shortcut regression", panelUiTest, 'press("b")'],
  ["single canonical screenshot", capturePanelScript, "docs/shared-board-panel.png"],
  ["Flow layout in changelog", changelog, "Flow"],
  ["Flow layout in launch kit", launchKit, "Flow"],
  ["command palette CI evidence", changelog, "42196201085"],
  ["command palette CI governance", governance, "127819940490"],
  ["command palette CI launch copy", launchKit, "127819940275"],
  ["command palette pointer guard", panel, "commandPointerMoved"],
  ["command palette default index regression", panelUiTest, 'dataset.commandIndex)).toBe("0")'],
  ["command palette pointer incident", changelog, "42202978563"],
  ["command palette pointer launch copy", launchKit, "42202978563"],
  ["graph skin CI evidence", changelog, "42204154394"],
  ["graph skin CI governance", governance, "127846471614"],
  ["graph skin CI launch copy", launchKit, "127846471877"],
  ["latest evidence CI checks", changelog, "42204590856"],
  ["hover glance CI evidence", changelog, "42206963393"],
  ["hover glance CI governance", governance, "127855933878"],
  ["hover glance CI launch copy", launchKit, "127855934292"],
  ["Flow workspace CI evidence", changelog, "42199110872"],
  ["Flow workspace CI governance", governance, "127829704899"],
  ["Flow workspace CI launch copy", launchKit, "127829705186"],
  ["Flow canvas-first product research", research, "Flow 画布优先布局的产品调研"],
  ["Flow product research boundary", research, "不把进度条当批准"],
  ["Flow welcome orbit labels", panel, "welcome-orbit-label"],
  ["Flow welcome orbit regression", panelUiTest, "AI · 工具调用"],
  ["Flow canvas frame", panel, "canvasFrame"],
  ["Flow graph skin preference", panel, "graphSkin: 'on'"],
  ["Flow graph skin switch", panel, "data-graph-skin"],
  ["Flow graph skin renderer", panel, "toggleGraphSkin()"],
  ["restrained graph skin shortcut", panel, "toggleGraphSkin()"],
  ["restrained graph skin regression", panelUiTest, "graph-skin-off"],
  ["Flow graph skin browser regression", panelUiTest, "graph-skin-off"],
  ["Flow graph skin research", research, "增强图形皮肤"],
  ["Flow graph skin safety boundary", research, "不把视觉焦点当批准"],
  ["canvas object hover card", panel, "canvasHoverCard"],
  ["canvas object hover preference", panel, "hoverPeek: 'on'"],
  ["canvas object hover switch", panel, "data-hover-peek"],
  ["canvas object hover renderer", panel, "showCanvasHoverCard"],
  ["canvas object hover keyboard preview", panel, "stepCanvasHoverNode"],
  ["canvas object hover explicit focus", panel, "focusCanvasHoverNode"],
  ["canvas object hover keyboard browser regression", canvasFocusTest, "ArrowRight"],
  ["canvas object hover frame throttle", panel, "canvasHoverFrame"],
  ["canvas object hover related outline", panel, "is-related"],
  ["canvas object hover outline browser regression", canvasFocusTest, "relatedNodes"],
  ["canvas object hover edge trace", panel, "highlightCanvasHoverEdges"],
  ["canvas object hover edge trace label", panel, "canvasHoverTrace"],
  ["canvas object hover edge trace CSS", panel, ".flowchart-link.is-hover-path"],
  ["canvas object hover edge trace regression", canvasFocusTest, "highlightedEdges"],
  ["canvas object hover edge trace screenshot", capturePanelScript, "flowchart-link.is-hover-path"],
  ["canvas object hover edge trace research", research, "关系路径与即时图形反馈调研"],
  ["canvas object hover edge trace boundary", research, "不把视觉高亮写回图数据"],
  ["compact touch glance CSS", panel, "@media (max-width: 620px)"],
  ["compact touch glance hint", panel, "轻点先速览"],
  ["compact touch glance focus hint", panel, "再点一次聚焦"],
  ["compact touch glance two-step", panel, "showCanvasHoverCard(group);\n    return;"],
  ["compact touch glance browser regression", panelUiTest, "compactGlance"],
  ["compact touch glance browser regression", panelUiTest, "compactGlance"],
  ["compact touch glance research", research, "触屏对象速览调研"],
  ["compact touch glance boundary", research, "第二次点按才表达指向"],
  ["compact touch glance launch copy", launchKit, "触屏速览增量"],
  ["compact lens separate row", panel, "body.flow-workspace .flow-lens { top: 8px; left: 9px; right: 9px; max-width: none; transform: none; padding: 4px 7px; }"],
  ["compact lens browser regression", panelUiTest, "lensTop"],
  ["compact lens browser regression", panelUiTest, "lensTop"],
  ["compact lens changelog", changelog, "窄屏顶部信息分层"],
  ["visible pulse surface", panel, "collab-pulse-bars"],
  ["visible pulse metrics", panel, "setPulseBar('#collabPulseMessageBar', pendingMessages"],
  ["visible pulse browser regression", panelUiTest, "pulseSurface"],
  ["visible layered surfaces regression", panelUiTest, "ambientSurfaces"],
  ["visible status layer launch copy", launchKit, "可见状态层增量"],
  ["visible status layer research", research, "Visible-state research note"],
  ["continuous overlay sync", panel, "holdCanvasOverlaySync(420)"],
  ["continuous overlay browser regression", canvasFocusTest, "canvasThreadLayer .canvas-thread-badge"],
  ["CI 150 incident", changelog, "42213116363"],
  ["CI 150 governance", governance, "127876384815"],
  ["CI 150 launch copy", launchKit, "127876384815"],
  ["focus path CSS", panel, ".flowchart-link.is-focus-path"],
  ["focus path renderer", panel, "syncCanvasFocusEdges()"],
  ["focus path stat marker", panel, "data-focus-paths"],
  ["focus path browser regression", canvasFocusTest, "is-focus-path"],
  ["focus path browser regression", canvasFocusTest, "is-focus-path"],
  ["focus path launch copy", launchKit, "焦点关系路径增量"],
  ["focus path research", research, "Focus-path legibility research note"],
  ["relation map CSS", panel, ".canvas-relation-map"],
  ["relation map renderer", panel, "renderCanvasRelationMap()"],
  ["relation map edge derivation", panel, "canvasRelationLinks()"],
  ["relation map existing focus reuse", panel, "setCanvasFocusNode(nodeId)"],
  ["relation map browser regression", canvasFocusTest, "relationMap"],
  ["relation map visual regression", panelUiTest, "relationMap"],
  ["relation map screenshot", capturePanelScript, "#canvasRelationMap"],
  ["relation map visual regression", panelUiTest, "relationMap"],
  ["relation map changelog", changelog, "对象关系轨道"],
  ["relation map launch copy", launchKit, "对象关系轨道增量"],
  ["relation map research", research, "Relation-rail legibility research note"],
  ["dock route CSS", panel, ".canvas-dock-route"],
  ["dock route renderer", panel, "renderCanvasDockRoute()"],
  ["dock route grouped actions", panel, 'data-group="SHARED"'],
  ["dock route browser regression", panelUiTest, "dockRoute"],
  ["dock route changelog", changelog, "画布焦点航线控制台"],
  ["dock route launch copy", launchKit, "画布焦点航线控制台增量"],
  ["dock route research", research, "Persistent route research note"],
  ["lens relation pulse CSS", panel, ".flow-lens-signal"],
  ["lens relation pulse renderer", panel, "flowLensSignalBar"],
  ["lens relation pulse derived edges", panel, "canvasRelationLinks(node?.id)"],
  ["lens relation pulse browser regression", panelUiTest, "lensSignal"],
  ["lens relation pulse browser regression", panelUiTest, "lensSignal"],
  ["lens relation pulse changelog", changelog, "焦点镜头关系脉冲"],
  ["lens relation pulse launch copy", launchKit, "焦点镜头关系脉冲增量"],
  ["lens relation pulse research", research, "Focus-HUD research note"],
  ["dock route CI 154 evidence", changelog, "42223805073"],
  ["dock route CI 154 governance", governance, "127912081463"],
  ["canvas collab reopen helper", panel, "openCollabFromCanvas"],
  ["CI 155 Node 24 incident", changelog, "127915529861"],
  ["CI 155 Node 24 governance", governance, "127915529861"],
  ["radial pulse CSS", panel, "collab-pulse-orbit-ring-label"],
  ["radial pulse renderer", panel, "--pulse-ring"],
  ["radial pulse browser regression", panelUiTest, "orbitBackground"],
  ["radial pulse browser regression", panelUiTest, "orbitBackground"],
  ["radial pulse changelog", changelog, "径向压力环"],
  ["radial pulse launch copy", launchKit, "协作压力仪表增量"],
  ["radial pulse research", research, "Pressure-gauge research note"],
  ["derived surfaces reduced motion CSS", panel, ".collab-pulse-orbit::after { animation: none;"],
  ["pressure gauge CI 156 evidence", changelog, "42225889980"],
  ["pressure gauge CI 156 governance", governance, "127919168427"],
  ["pressure gauge CI 156 launch copy", launchKit, "压力仪表 CI 证据与动效边界"],
  ["relation CI 153 evidence", changelog, "42221965847"],
  ["relation CI 153 governance", governance, "127905972980"],
  ["CI 151 evidence", changelog, "42218674950"],
  ["CI 151 governance", governance, "127894973116"],
  ["single canonical screenshot output", capturePanelScript, "shared-board-panel.png"],
  ["canvas object hover shortcut", panel, "toggleHoverPeek()"],
  ["canvas object hover read-only note", panel, "悬停只预览"],
  ["canvas object hover explicit focus note", panel, "Enter</kbd> <span id=\"canvasHoverFocusVerb\">聚焦</span> · 不批准或写文件"],
  ["canvas object hover reduced motion", panel, "prefers-reduced-motion"],
  ["canvas object hover browser regression", canvasFocusTest, "canvasHoverCard"],
  ["canvas object hover session boundary", canvasFocusTest, "sessionAfterHover"],
  ["canvas object hover browser regression", canvasFocusTest, "canvasHoverCard"],
  ["canonical screenshot seed thread", capturePanelScript, "canvasBoardThread"],
  ["canvas object hover research", research, "对象悬停速览与低摩擦上下文调研"],
  ["canvas object hover research boundary", research, "悬停不改变选中态"],
  ["canvas object hover keyboard boundary", research, "悬停与方向键不发布 focus/viewport"],
  ["canvas object hover outline boundary", research, "只是本机 CSS 类"],
  ["Flow bottom-centered toast", panel, "body.flow-workspace:not(.zen-workspace) .toast"],
  ["Flow immersive toast override", panel, "body.flow-workspace.zen-workspace .toast"],
  ["Flow immersive toast browser regression", panelUiTest, "zenToastPlacement"],
  ["single canonical screenshot flow", capturePanelScript, "canvasFocusRipple"],
  ["Flow toast clear of canvas dock", panel, "bottom: 100px"],
  ["Flow toast browser regression", panelUiTest, "toastPlacement"],
  ["Flow toast browser regression", panelUiTest, "toastPlacement"],
  ["canvas object hover launch copy", launchKit, "对象悬停速览增量"],
  ["canvas object hover edge launch copy", launchKit, "关系路径速览增量"],
  ["canvas overlay frame sync", panel, "scheduleCanvasOverlaySync"],
  ["canvas overlay frame CI incident", changelog, "127862747864"],
  ["canvas overlay frame CI governance", governance, "127862747864"],
  ["canvas overlay frame CI launch copy", launchKit, "127862747864"],
  ["relationship path CI evidence", changelog, "42211512696"],
  ["relationship path CI governance", governance, "127871005568"],
  ["relationship path CI launch copy", launchKit, "127871006012"],
  ["focused header context", panel, "headerContextTitle"],
  ["toolbar overflow menu", panel, "toolbarOverflowMenu"],
  ["restrained toolbar regression", panelUiTest, 'getComputedStyle(element.closest(".toolbar-overflow")).display'],
  ["canonical screenshot object focus", capturePanelScript, "canvasObjectLabel"],
  ["canonical screenshot in Chinese README", readme, "shared-board-panel.png"],
  ["canonical screenshot in English README", englishQuickstart, "shared-board-panel.png"],
  ["restrained visual system in changelog", changelog, "克制视觉系统收束"],
  ["restrained visual system in launch kit", launchKit, "克制视觉系统增量"],
  ["restrained visual short post", launchKit, "克制视觉系统短帖"],
  ["restrained visual system regression", panelUiTest, 'backgroundImage)).toBe("none")'],
  ["live context inspector", panel, "liveInspector"],
  ["collaboration pulse", panel, "btnCollabPulse"],
  ["collaboration pulse renderer", panel, "renderCollabPulse"],
  ["collaboration pulse read-only snapshot", panel, "loadCollabPulse"],
  ["panel sync progress state", panel, "setCollabSyncState"],
  ["panel batched collaboration load", panel, "renderCollabBundle"],
  ["panel stale revision guard", panel, "collabAuthoritativeRevision"],
  ["panel deferred interaction refresh", panel, "collabInteractionDepth"],
  ["panel pointer interaction guard", panel, "protectCollabInteraction"],
  ["panel unified safe refresh", panel, "refreshCollabSafely"],
  ["proposal DOM reuse guard", panel, "collabProposalsSignature"],
  ["proposal review progress", panel, "proposal-review-rail"],
  ["proposal approval gate", panel, "写入闸门未开启"],
  ["proposal review progress regression", panelUiTest, "proposal-review-rail"],
  ["proposal detached-node regression", panelUiTest, "__proposalApprovalNode"],
  ["collaboration pulse browser regression", panelUiTest, "collabPulseCount"],
  ["expandable collaboration pulse detail", panel, "collabPulseDetail"],
  ["collaboration pulse read-only metrics", panel, "collabPulseProposals"],
  ["collaboration pulse detail regression", panelUiTest, "btnCollabPulse"],
  ["welcome collaboration journey", panel, "welcomeJourney"],
  ["welcome collaboration journey browser regression", panelUiTest, "welcome-journey-step"],
  ["canonical screenshot only", capturePanelScript, "Captured docs/shared-board-panel.png"],
  ["welcome journey changelog", changelog, "四步协作闭环条"],
  ["canvas handoff rail", panel, "collabHandoff"],
  ["canvas handoff renderer", panel, "renderCollabHandoff"],
  ["canvas handoff read-only copy", panel, "不发送消息、不批准提案、不写项目文件"],
  ["shared board note action", panel, "保存到对象线程</button>"],
  ["in-thread human reply composer", panel, "data-annotation-reply"],
  ["canvas handoff browser regression", panelUiTest, "btnHandoffOpen"],
  ["canvas handoff changelog", changelog, "交接航线"],
  ["dialog star track CSS", panel, ".welcome-dialog-ribbon"],
  ["dialog star track renderer", panel, "renderDialogStarTrack()"],
  ["dialog star track read-only copy", panel, "点击只打开既有上下文视图，不发送消息或写文件"],
  ["dialog star track click handler", panel, "openDialogStarTrack"],
  ["dialog star track browser regression", panelUiTest, "welcomeDialogTrack"],
  ["dialog star track canvas browser regression", canvasFocusTest, "handoffStars"],
  ["dialog star track reduced motion CSS", panel, '.dialog-star[data-status="pending"]::after { animation: none;'],
  ["dialog star track browser regression", panelUiTest, "welcomeDialogTrack"],
  ["shared-board Chinese README", readme, "项目沟通画板"],
  ["shared-board English README", englishQuickstart, "visual communication board"],
  ["shared-board agents definition", agents, "AI 与人类项目沟通画板"],
  ["shared-board roadmap principle", roadmap, "The shared visual board is the product"],
  ["shared-board architecture", architecture, "人类与 AI 项目沟通画板"],
  ["shared-board ADR index", adrIndex, "0022-shared-visual-board-is-the-product.md"],
  ["shared-board product direction", productDirection, "## Shared loop"],
  ["shared-board decision", sharedBoardAdr, "The local-first shared visual board is the product"],
  ["superseded MCP-first ADR", mcpToolAdr, "Superseded by [ADR 0022]"],
  ["shared-board goal mode", goalMode, "AI 与人类项目沟通画板"],
  ["board modules Chinese README", readme, "单一画板栏 + 连续画布 + 固定对象检视器"],
  ["board modules English README", englishQuickstart, "board header, one continuous canvas"],
  ["board modules ADR index", adrIndex, "0023-board-modules-and-library-boundary.md"],
  ["board modules ADR boundary", boardModulesAdr, "Opening a library record is a local preview only"],
  ["board modules changelog", changelog, "画板模块与图库边界"],
  ["board header action", panel, "btnBoardScanHeader"],
  ["board save action", panel, "btnBoardSaveHeader"],
  ["single board header", panel, ".header { display: none !important; }"],
  ["hidden legacy flow rail", panel, 'id="flowRail" aria-label="共享画板状态" hidden'],
  ["board safety boundary", panel, "boardSafetyState"],
  ["object inspector evidence", panel, "canvasContextStrip"],
  ["single header regression", panelUiTest, 'document.querySelector(".board-header").getBoundingClientRect().height'],
  ["hidden legacy flow rail regression", panelUiTest, 'getComputedStyle(element).display)).toBe("none")'],
  ["board library action", panel, "btnBoardLibraryHeader"],
  ["board library drawer", panel, "boardLibrary"],
  ["board history notice", panel, "boardHistoryNotice"],
  ["board header regression", panelUiTest, "boardHeaderTitle"],
  ["board library regression", panelUiTest, "btnBoardLibraryHeader"],
  ["panel shared board framing", panel, "和 AI 在同一张图上理解项目"],
  ["panel shared board context", panel, "SHARED VISUAL BOARD"],
  ["dialog live route CSS", panel, ".welcome-live-route"],
  ["dialog live route renderer", panel, "welcomeLiveRoute"],
  ["dialog live route browser regression", panelUiTest, "welcomeLiveRoute"],
  ["restrained design Chinese README", readme, "克制视觉系统"],
  ["English README records shared thread loop", englishQuickstart, "human replies in the same anchored thread"],
  ["product plan acceptance", productDirection, "No project file changes unless a separate proposal is reviewed and approved"],
  ["dialog live route changelog", changelog, "实时协作航线"],
  ["dialog live route launch copy", launchKit, "实时协作航线增量"],
  ["dialog live route research", research, "Live-route research note"],
  ["focus context CSS", panel, ".canvas-focus-context"],
  ["focus context renderer", panel, "renderCanvasFocusContext()"],
  ["focus context read-only copy", panel, "不发布焦点、不批准提案、不写项目文件"],
  ["focus context browser regression", canvasFocusTest, "focusContext"],
  ["focus context reduced motion CSS", panel, ".canvas-focus-context[data-visible=\"true\"] { animation: none;"],
  ["focus context changelog", changelog, "焦点上下文胶囊"],
  ["focus context launch copy", launchKit, "焦点上下文胶囊增量"],
  ["focus context research", research, "Focus-context research note"],
  ["aurora atmosphere CSS", panel, "body.visual-aurora .preview-wrap:not(.dark-bg)::before"],
  ["aurora glass node skin", panel, "body.flow-workspace.visual-aurora #diagramRender svg .node rect"],
  ["aurora welcome top rail", panel, "body.visual-aurora .welcome-card::before"],
  ["aurora atmosphere browser regression", panelUiTest, "auroraSurfaces"],
  ["aurora glass node browser regression", panelUiTest, "auroraCanvasSkin"],
  ["aurora atmosphere changelog", changelog, "Aurora 光场画布"],
  ["aurora atmosphere launch copy", launchKit, "Aurora 光场画布增量"],
  ["aurora atmosphere research", research, "Light-field canvas research note"],
  ["dialog star track changelog", changelog, "双向对话星轨"],
  ["dialog star track launch copy", launchKit, "双向对话星轨增量"],
  ["dialog star track research", research, "Dialogue-star-track research note"],
  ["dialog star track CI 158 evidence", changelog, "42229629131"],
  ["dialog star track CI 158 governance", governance, "127931881114"],
  ["dialog star track CI 158 launch copy", launchKit, "双向对话星轨 CI 证据"],
  ["live route CI 159 evidence", changelog, "42230659858"],
  ["live route CI 159 governance", governance, "127935393616"],
  ["live route CI 159 launch copy", launchKit, "实时协作航线 CI 证据"],
  ["pressure gauge CI 157 evidence", changelog, "42226703679"],
  ["pressure gauge CI 157 governance", governance, "127921902213"],
  ["pressure gauge CI 157 launch copy", launchKit, "压力仪表收尾 CI 证据"],
  ["collaboration journey progress rail", panel, "--journey-progress"],
  ["collaboration journey progress label", panel, "data-progress-label"],
  ["collaboration journey navigation CTA", panel, "journey-cta"],
  ["collaboration journey progress regression", panelUiTest, "progressState"],
  ["collaboration journey progress changelog", changelog, "连续进度轨道"],
  ["canvas thread badges", panel, "canvasThreadLayer"],
  ["canvas thread badge renderer", panel, "renderCanvasThreadBadges"],
  ["canvas thread badge read-only action", panel, "只读标记不改会话"],
  ["canvas thread badge browser regression", canvasFocusTest, "canvas-thread-badge"],
  ["canvas thread badge changelog", changelog, "节点级讨论标记"],
  ["restrained state surface regression", panelUiTest, 'getComputedStyle(element).display)).toBe("none")'],
  ["restrained Chinese README", readme, "克制视觉系统"],
  ["restrained English README", englishQuickstart, "restrained"],
  ["shared board workbench Chinese README", readme, "项目工作台"],
  ["collaboration pulse changelog", changelog, "人机协作脉搏"],
  ["live context ribbon", panel, "workspace-ribbon"],
  ["live context renderer", panel, "renderInspector"],
  ["no legacy screenshot outputs", capturePanelScript, "docs/shared-board-panel.png"],
  ["restrained visual ADR in changelog", changelog, "ADR 0021"],
  ["restrained visual ADR in launch kit", launchKit, "ADR 0021"],
  ["unified visual system regression", panelUiTest, 'getComputedStyle(element).backgroundImage)).toBe("none")'],
  ["cached panel HTML prevention", previewServer, "no-store, max-age=0"],
  ["source template priority", previewServer, "candidates = source"],
  ["calm visual atmosphere", panel, "ambient-calm"],
  ["immersive workspace", panel, "zen-workspace"],
  ["immersive workspace exit", panel, "btnZenExit"],
  ["immersive workspace shortcut", panel, "setZenWorkspace"],
  ["immersive workspace command", panel, "切换沉浸工作区"],
  ["appearance density options", panel, "data-density"],
  ["appearance background options", panel, "data-preview-bg"],
  ["appearance sidebar options", panel, "data-sidebar"],
  ["appearance shortcut cheatsheet", panel, "appearance-shortcuts"],
  ["searchable diagram library", panel, "diagramSearch"],
  ["diagram type icons", panel, "diagramTypeIcons"],
  ["relative diagram timestamps", panel, "relativeTime"],
  ["derived collaboration health card", panel, "renderHealthCard"],
  ["collaboration health progress", panel, "healthProgressFill"],
  ["table-like graph rows", panel, "data-row-number"],
  ["graph editor empty guide", panel, "graph-guide"],
  ["grouped conversation history", panel, "history-tabs"],
  ["conversation bubbles", panel, "chat-bubble"],
  ["conversation role avatars", panel, "chat-avatar"],
  ["conversation status labels", panel, "chat-status"],
  ["conversation empty state", panel, "chat-empty"],
  ["guided history empty states", panel, "history-empty"],
  ["activity role markers", panel, "activity-item.human::before"],
  ["collaboration tab aria state", panel, "aria-selected"],
  ["collaboration tab panels", panel, 'role="tabpanel"'],
  ["compact responsive workbench", panel, "max-width: 620px"],
  ["graph unsaved edit hint", panel, "graphDirtyHint"],
  ["graph unsaved row marker", panel, "is-dirty"],
  ["graph unsaved count", panel, "graphDirtyCount"],
  ["stable graph dirty keys", panel, "node:${node.id}"],
  ["collaboration journey", panel, "collab-journey"],
  ["journey proposal count", panel, "journeyProposalCount"],
  ["journey keyboard view shortcut", panel, "4 / 5 / 6"],
  ["journey tab state renderer", panel, "function renderJourney"],
  ["tab keyboard navigation", panel, "ArrowRight"],
  ["productized welcome visual", panel, "welcome-visual"],
  ["welcome collaboration loop", panel, "welcome-flow-center"],
  ["receipt confirmation dialog", panel, "receiptBackdrop"],
  ["receipt copy action", panel, "btnCopyReceipt"],
  ["receipt text builder", panel, "function receiptText"],
  ["searchable command palette", panel, "commandBackdrop"],
  ["command palette shortcut", panel, "? · Esc"],
  ["command palette executor", panel, "function runCommand"],
  ["command palette active index reset", panel, "commandActiveIndex = 0"],
  ["command palette active index regression", panelUiTest, 'dataset.commandIndex)).toBe("0")'],
  ["command palette welcome entry", panel, "btnOpenCommandsWelcome"],
  ["collaboration focus mode", panel, "focus-mode"],
  ["focus mode toggle", panel, "btnFocusMode"],
  ["focus mode shortcut", panel, "专注模式"],
  ["single screenshot output", capturePanelScript, "shared-board-panel.png"],
  ["reproducible canvas example project", capturePanelScript, "示例 · 人机协作项目结构"],
  ["intent composer card", panel, "intent-composer"],
  ["local board note draft", panel, "BOARD_NOTE_DRAFT_KEY"],
  ["in-thread reply endpoint", panel, "/api/collab/annotations/${encodeURIComponent(id)}/reply"],
  ["intent send state", panel, "intentState"],
  ["graph editor status toolbar", panel, "graphToolbar"],
  ["graph node count", panel, "graphNodeCount"],
  ["graph edge count", panel, "graphEdgeCount"],
  ["graph selection count", panel, "graphSelectedCount"],
  ["canvas floating toolbar", panel, "canvas-dock"],
  ["canvas object navigation", panel, "canvas-object-card"],
  ["canvas object focus actions", panel, "btnCanvasNextNode"],
  ["canvas object stepping", panel, "stepCanvasFocus"],
  ["canvas related object navigation", panel, "stepRelatedCanvasFocus"],
  ["canvas focus context copy", panel, "copyCanvasFocusContext"],
  ["canvas object conversation bridge", panel, "openFocusConversation"],
  ["canvas object thread state", panel, "focusConversationState"],
  ["canvas focus ring", panel, "canvas-focus-ring"],
  ["canvas focus ring positioning", panel, "positionFocusRing"],
  ["canvas focus ring node matching", panel, "g.nodes > g.node"],
  ["canvas focus halo", panel, "canvas-focus-halo"],
  ["canvas focus label", panel, "canvas-focus-label"],
  ["canvas node click focus", panel, "nodeIdForFocusGroup"],
  ["canvas focus ripple", panel, "canvas-focus-ripple"],
  ["canvas reduced motion support", panel, "prefers-reduced-motion"],
  ["canvas object shortcut", panel, "[ / ]"],
  ["canvas shortcut help dialog", panel, "shortcutBackdrop"],
  ["canvas shortcut help action", panel, "btnCanvasHelp"],
  ["canvas shortcut help command", panel, "打开快捷键帮助"],
  ["canvas zoom readout", panel, "canvasZoomLabel"],
  ["canvas diagram readout", panel, "canvasDiagramLabel"],
  ["canvas background toggle", panel, "btnCanvasBackdrop"],
  ["dotted preview canvas", panel, "radial-gradient(rgba(99, 132, 191"],
  ["canvas collaboration action", panel, "btnCanvasCollab"],
  ["canvas command action", panel, "btnCanvasCommands"],
  ["history tab counts", panel, "data-history-count"],
  ["conversation-first history order", panel, 'data-history-pane="chat"'],
  ["distinct source evidence cards", panel, "evidence-item"],
  ["proposal status cards", panel, "proposal-card status-"],
  ["proposal status badge", panel, "proposal-badge"],
  ["proposal review checklist", panel, "proposal-checklist"],
  ["proposal impact grid", panel, "impact-grid"],
  ["proposal diff state", panel, "data-diff-state"],
  ["proposal diff loading state", panel, "is-loading"],
  ["proposal approve awaiting diff", panel, "awaiting-diff"],
  ["proposal approval boundary note", panel, "proposal-safety"],
  ["proposal action hierarchy", panel, "proposal-actions"],
  ["proposal decision feedback", panel, "decision-error"],
  ["panel UI browser regression", panelUiTest, "collaboration panel UI"],
  ["panel UI action grouping regression", panelUiTest, "btnGraphMore"],
  ["panel UI board note counter regression", panelUiTest, "boardNoteCount"],
  ["panel UI default canvas regression", panelUiTest, 'data-view-target="canvas"'],
  ["panel UI first-run rescan regression", panelUiTest, "btnWelcomeRescan"],
  ["panel UI workbench action regression", panelUiTest, "打开审阅台"],
  ["canvas object thread regression", panelUiTest, "canvasBoardThread"],
  ["panel UI first-run regression", panelUiTest, "btnLoadExample"],
  ["panel UI hidden welcome regression", panelUiTest, 'getComputedStyle(element).display)).toBe("none")'],
  ["restrained command palette regression", panelUiTest, "commandBackdrop"],
  ["restrained hidden chrome regression", panelUiTest, 'getComputedStyle(element).display)).toBe("none")'],
  ["panel UI zen workspace regression", panelUiTest, "zen-workspace"],
  ["panel UI zen shortcut regression", panelUiTest, 'page.keyboard.press("z")'],
  ["panel UI diagram library regression", panelUiTest, "diagramSearch"],
  ["panel UI health card regression", panelUiTest, "collabHealth"],
  ["panel UI graph editor regression", panelUiTest, "graph-guide"],
  ["panel UI history tabs regression", panelUiTest, "data-history-target"],
  ["panel UI conversation regression", panelUiTest, "#chatLog .chat-item"],
  ["panel UI history empty regression", panelUiTest, "history-empty"],
  ["panel UI responsive aria regression", panelUiTest, 'getAttribute("aria-selected")'],
  ["panel UI unsaved graph regression", panelUiTest, "graphDirtyCount"],
  ["panel UI journey regression", panelUiTest, "journeySteps"],
  ["panel UI journey keyboard regression", panelUiTest, "ArrowRight"],
  ["panel UI stable dirty key regression", panelUiTest, "stableDirtyRows"],
  ["panel UI welcome visual regression", panelUiTest, "welcome-visual"],
  ["panel UI receipt dialog regression", panelUiTest, "receiptBackdrop"],
  ["panel UI command palette regression", panelUiTest, "commandPalette"],
  ["panel UI focus mode regression", panelUiTest, "focus-mode"],
  ["panel UI board note composer regression", panelUiTest, "intent-composer"],
  ["panel UI graph toolbar regression", panelUiTest, "graphToolbar"],
  ["panel UI canvas dock regression", panelUiTest, "canvas-dock"],
  ["pointer feedback headless CI compatibility", changelog, "pointerType"],
  ["panel UI canvas backdrop regression", panelUiTest, "btnCanvasBackdrop"],
  ["panel UI canvas shortcuts regression", panelUiTest, "shortcutBackdrop"],
  ["panel UI canvas object regression", panelUiTest, "canvasObjectLabel"],
  ["panel UI focus ring regression", panelUiTest, "canvasFocusRing"],
  ["panel UI focus decoration regression", panelUiTest, "canvasFocusHalo"],
  ["canvas focus click regression", canvasFocusTest, "page.mouse.click(refreshedTarget.x, refreshedTarget.y)"],
  ["canvas focus object card fit", panel, "fitCanvasWithObjectCard"],
  ["canvas focus transform regression", canvasFocusTest, "btnCanvasZoomIn"],
  ["canvas focus ripple regression", canvasFocusTest, "canvasFocusRipple"],
  ["canvas related object regression", canvasFocusTest, "btnCanvasRelatedNode"],
  ["canvas focus context boundary regression", canvasFocusTest, "不授权写入"],
  ["canvas object conversation regression", canvasFocusTest, "canvasObjectConversation"],
  ["canvas conversation navigation regression", canvasFocusTest, "btnCanvasOpenConversation"],
  ["panel UI proposal card regression", panelUiTest, "proposal-card.status-pending"],
  ["panel UI proposal diff regression", panelUiTest, "proposal-diff.loaded"],
  ["panel UI diff review progression regression", panelUiTest, "approveAwaiting"],
  ["reproducible proposal screenshot", capturePanelScript, "seedProposalCard"],
  ["reproducible screenshot command", JSON.stringify(packageJson), "ui:shots"],
  ["screenshot capture helper", capturePanelScript, "Captured docs/shared-board-panel.png"],
  ["README shows canonical shared board", readme, "当前共享画板（0.3.x）"],
  ["README describes canonical shared board", readme, "这是可复现的当前共享画板"],
  ["workorder freshness pure test", selectionWorkorderTest, "status: \"stale\""],
  ["workorder freshness MCP test", mcpTest, "Selection freshness none"],
  ["workorder freshness HTTP test", collaborationTest, "selectionStale: false"],
  ["stale selection workorder HTTP test", collaborationTest, "status: \"stale\""],
  ["stale workorder after human-confirmed rescan", collaborationTest, "rescanWorkorder.freshness"],
  ["workorder freshness workflow example", agentWorkflowExample, "freshness contract"],
  ["workorder freshness ADR", selectionWorkorderAdr, "Silently refresh a stale selection"],
  ["workorder freshness architecture", architecture, "纯派生 `freshness`"],
  ["workorder freshness security", security, "stale 只提示让人重新选择"],
  ["workorder freshness troubleshooting", troubleshooting, "freshness.status: \"stale\""],
  ["workorder freshness changelog", changelog, "纯派生 `freshness`"],
  ["selection revision is not auto-rebased", selectionAdr, "Auto-rebase selection to each new graph revision"],
  ["selection refresh preserves revision", sessionStore, "return nodeIds.length === selection.nodeIds.length ? selection"],
  ["workorder MCP test", mcpTest, "get_selection_workorder"],
  ["workorder HTTP test", collaborationTest, "/api/collab/selection-workorder"],
  ["workorder bundle exclusion test", collaborationTest, 'manifest.contents.selection'],
  ["workorder ADR index", adrIndex, "0019-selection-workorder-is-read-only-preflight.md"],
  ["workorder ADR boundary", selectionWorkorderAdr, "grants project-write authority"],
  ["workorder Chinese docs", readme, "SELECTION_WORKORDER_JSON"],
  ["workorder English docs", englishQuickstart, "SELECTION_WORKORDER_JSON"],
  ["workorder AGENTS docs", agents, "SELECTION_WORKORDER_JSON"],
  ["workorder architecture", architecture, "SELECTION_WORKORDER_JSON"],
  ["workorder security", security, "SELECTION_WORKORDER_JSON"],
  ["workorder launch", launchKit, "SELECTION_WORKORDER_JSON"],
  ["workorder troubleshooting", troubleshooting, "SELECTION_WORKORDER_JSON"],
  ["workorder examples map", examplesReadme, "SELECTION_WORKORDER_JSON"],
  ["workorder collaboration workflow", collaborationWorkflow, "SELECTION_WORKORDER_JSON"],
  ["workorder workflow example", agentWorkflowExample, "SELECTION_WORKORDER_JSON:"],
  ["workorder docs map", documentationMap, "0019-selection-workorder-is-read-only-preflight.md"],
  ["workorder research", research, "SELECTION_WORKORDER_JSON"],
]) {
  check(file.includes(needle), `${label} is missing or drifted`);
}
check(agents.includes("scripts/github-maintenance.mjs"), "AGENTS.md does not document GitHub maintenance script");
check(agents.includes("scripts/generate-doc-assets.mjs"), "AGENTS.md does not document the versioned documentation asset generator");
check(agents.includes("ROADMAP.md"), "AGENTS.md does not list ROADMAP.md");
check(agents.includes("annotationThreads"), "AGENTS.md does not document annotation thread context");
check(agents.includes("preflight_visual_proposal"), "AGENTS.md does not document proposal preflight");
check(readme.includes("26 个 MCP 工具"), "README.md does not reflect the 26 MCP tools");
check(agents.includes("## 26 个 MCP 工具"), "AGENTS.md does not reflect the 26 MCP tools");
check(roadmap.includes("26 tools"), "ROADMAP.md does not reflect the MCP tool surface");
const roadmapPhases = [...roadmap.matchAll(/^## Phase \d —/gm)].map((match) => match[0]);
check(roadmapPhases.length === 5, "ROADMAP.md must keep a product-contract phase and four delivery phases");
check(new Set(roadmapPhases).size === roadmapPhases.length, "ROADMAP.md has duplicate delivery phases");
check(!panel.includes("navigator.sendBeacon"), "Collaboration panel must not use sendBeacon for authenticated viewport writes");
check(getAgentWorkflowTool.includes("get_agent_workflow"), "get-agent-workflow.ts is missing the tool name");
check(agentWorkflowDomain.includes('grantsWriteAuthority: false'), "agent-workflow.ts is missing the no-authority invariant");
check(agentWorkflowExample.includes('step.writes === "project"'), "workflow example does not verify the project-write boundary");
check(packageJson.scripts?.check?.includes("npm run test:examples:workflow"), "npm run check does not execute the workflow example");
check(vitestConfig.includes("fileParallelism: false"), "vitest.config.ts does not serialize browser regression files");
check(readme.includes("list_change_templates"), "README.md does not document change templates");
check(agents.includes("change-templates.ts"), "AGENTS.md does not list the change template module");
check(agents.includes("list_change_templates"), "AGENTS.md does not document change templates");
check(changeTemplateDomain.includes("does not create a proposal"), "change template guidance does not state its read-only boundary");
check(packageJson.description?.includes("visual communication board"), "package.json description is missing the shared-board product positioning");
check(agents.includes("anchorStatus"), "AGENTS.md does not document stale annotation anchors");
check(architecture.includes("annotationThreads.nextActor"), "ARCHITECTURE.md does not document annotation thread handoff");
check(architecture.includes("anchorStatus"), "ARCHITECTURE.md does not document stale annotation anchors");
check(architecture.includes("activityTimeline"), "ARCHITECTURE.md does not document the derived activity timeline");
check(architecture.includes("/api/collab/diagnostics"), "ARCHITECTURE.md does not document session diagnostics");
check(agents.includes("activity-timeline.ts"), "AGENTS.md does not list the activity timeline module");
check(agents.includes("/api/collab/activity"), "AGENTS.md does not document the activity endpoint");
check(readme.includes("解决线程只是对话状态"), "README.md does not separate thread resolution from proposal approval");
check(readme.includes("不等于批准变更"), "README.md does not document the thread approval boundary");
check(changelog.includes("## [Unreleased]"), "CHANGELOG.md has no Unreleased section");
check(troubleshooting.includes("清空选择范围"), "TROUBLESHOOTING.md does not give a concrete stale-selection recovery action");
check(troubleshooting.includes("Clear selection"), "TROUBLESHOOTING.md does not give an English stale-selection recovery action");
check(troubleshooting.includes("do not draft changes from the old candidate paths"), "TROUBLESHOOTING.md does not warn against drafting from stale candidate paths");
check(governance.includes("42136060410"), "GOVERNANCE.md is missing the #83 CI evidence");
check(governance.includes("42136310033"), "GOVERNANCE.md is missing the #84 CI evidence");
check(governance.includes("42136720779"), "GOVERNANCE.md is missing the #85 CI evidence");
check(governance.includes("42136060175"), "GOVERNANCE.md is missing the #12 metadata workflow evidence");
check(governance.includes("42137519829"), "GOVERNANCE.md is missing the #86 CI evidence");
check(governance.includes("42137519789"), "GOVERNANCE.md is missing the #13 metadata workflow evidence");
check(governance.includes("42137916943"), "GOVERNANCE.md is missing the #87 CI evidence");
check(governance.includes("42138152753"), "GOVERNANCE.md is missing the #88 CI evidence");
check(governance.includes("42138459195"), "GOVERNANCE.md is missing the #89 CI evidence");
check(governance.includes("42138738900"), "GOVERNANCE.md is missing the #90 CI evidence");
check(governance.includes("42138152985"), "GOVERNANCE.md is missing the #14 metadata workflow evidence");
check(governance.includes("127633381248"), "GOVERNANCE.md is missing the #90 Node 20 job evidence");
check(governance.includes("127633381672"), "GOVERNANCE.md is missing the #90 Node 22 job evidence");
check(governance.includes("127633381836"), "GOVERNANCE.md is missing the #90 Node 24 job evidence");
check(governance.includes("metadata path filter"), "GOVERNANCE.md does not explain the metadata workflow path filter");
check(governance.includes("259790d"), "GOVERNANCE.md is missing the actionable stale FAQ evidence");
check(changelog.includes("42137519829"), "CHANGELOG.md is missing the #86 CI evidence");
check(changelog.includes("42137519789"), "CHANGELOG.md is missing the #13 metadata workflow evidence");
check(changelog.includes("42138738900"), "CHANGELOG.md is missing the #90 CI evidence");
check(changelog.includes("42138152985"), "CHANGELOG.md is missing the #14 metadata workflow evidence");
check(changelog.includes("42139816006"), "CHANGELOG.md is missing the #91 CI evidence");
check(changelog.includes("42139816004"), "CHANGELOG.md is missing the #15 metadata workflow evidence");
check(changelog.includes("不要沿用旧候选路径起草 changes"), "CHANGELOG.md is missing the actionable stale FAQ evidence");
check(launchKit.includes("42137519829"), "LAUNCH_KIT.md is missing the #86 CI evidence");
check(launchKit.includes("42137519789"), "LAUNCH_KIT.md is missing the #13 metadata workflow evidence");
check(launchKit.includes("42138738900"), "LAUNCH_KIT.md is missing the #90 CI evidence");
check(launchKit.includes("42138152985"), "LAUNCH_KIT.md is missing the #14 metadata workflow evidence");
check(launchKit.includes("清空选择范围 → 重新勾选"), "LAUNCH_KIT.md is missing the actionable stale FAQ evidence");
check(governance.includes("127626633187"), "GOVERNANCE.md is missing the #85 Node 20 CI job evidence");
check(governance.includes("127626632935"), "GOVERNANCE.md is missing the #85 Node 22 CI job evidence");
check(governance.includes("127626633150"), "GOVERNANCE.md is missing the #85 Node 24 CI job evidence");
check(governance.includes("not a metadata repair"), "GOVERNANCE.md does not distinguish a green drift check from a metadata fix");
check(changelog.includes("42136060410"), "CHANGELOG.md is missing the #83 CI evidence");
check(changelog.includes("42136310033"), "CHANGELOG.md is missing the #84 CI evidence");
check(changelog.includes("42136720779"), "CHANGELOG.md is missing the #85 CI evidence");
check(changelog.includes("42136060175"), "CHANGELOG.md is missing the #12 metadata workflow evidence");
check(launchKit.includes("42136060410"), "LAUNCH_KIT.md is missing the #83 CI evidence");
check(launchKit.includes("42136310033"), "LAUNCH_KIT.md is missing the #84 CI evidence");
check(launchKit.includes("42136720779"), "LAUNCH_KIT.md is missing the #85 CI evidence");
check(launchKit.includes("42136060175"), "LAUNCH_KIT.md is missing the #12 metadata workflow evidence");
check(research.includes("42136060410"), "COMPETITIVE_RESEARCH.md is missing the #83 CI evidence");
check(research.includes("42136720779"), "COMPETITIVE_RESEARCH.md is missing the #85 CI evidence");
check(research.includes("42138738900"), "COMPETITIVE_RESEARCH.md is missing the #90 CI evidence");
check(research.includes("42138152985"), "COMPETITIVE_RESEARCH.md is missing the #14 metadata workflow evidence");
check(changelog.includes("## [0.3.4]"), "CHANGELOG.md has no 0.3.4 release section");
check(changelog.includes("## [0.3.3]"), "CHANGELOG.md has no published 0.3.3 release section");
check(packageJson.version === "0.3.4", "package.json version is not 0.3.4");
const lockfile = JSON.parse(await read("package-lock.json"));
check(lockfile.version === packageJson.version, "package-lock.json version does not match package.json");
check(lockfile.packages?.[""]?.version === packageJson.version, "package-lock.json root package version does not match package.json");
check(readme.includes("当前版本 `0.3.4` 共 26 个工具"), "README.md does not reflect version 0.3.4 and 26 tools");
check(readme.includes("| `get_source_navigation` |"), "README.md tool table is missing get_source_navigation");
check(readme.includes("| `get_capabilities` |"), "README.md tool table is missing get_capabilities");
check(launchKit.includes("Published release notes — 0.3.3"), "docs/LAUNCH_KIT.md is missing the published 0.3.3 release notes");
check(launchKit.includes("Published release notes — 0.3.4"), "docs/LAUNCH_KIT.md published release notes are not aligned to 0.3.4");
check(launchKit.includes("SELECTION_WORKORDER_JSON"), "docs/LAUNCH_KIT.md is missing the 0.3.4 workorder launch copy");
check(releaseWorkflow.includes("workflow_dispatch:"), "release workflow does not support manual tag verification");
check(releaseWorkflow.includes("contents: write"), "release workflow cannot create a GitHub Release");
check(releaseWorkflow.includes("getReleaseByTag"), "release workflow does not check for an existing Release by tag");
check(releaseWorkflow.includes("createRelease"), "release workflow does not create a GitHub Release");
check(releaseWorkflow.includes("concurrency:"), "release workflow is missing concurrency protection");
check(releaseWorkflow.includes("CHANGELOG.md"), "release workflow does not derive notes from CHANGELOG.md");
check(releasing.includes("getReleaseByTag"), "RELEASING.md does not document the idempotent Release check");
check(governance.includes("42121600753"), "GOVERNANCE.md is missing the 0.3.1 release-boundary CI evidence");
check(governance.includes("42121608391"), "GOVERNANCE.md is missing the 0.3.1 tag-verification evidence");
check(governance.includes("42124987808"), "GOVERNANCE.md is missing the 0.3.2 CI evidence");
check(governance.includes("42124996768"), "GOVERNANCE.md is missing the 0.3.2 Release evidence");
check(governance.includes("42124987876"), "GOVERNANCE.md is missing the 0.3.2 metadata-check evidence");
check(governance.includes("releases/tag/v0.3.2"), "GOVERNANCE.md is missing the published 0.3.2 Release URL");
check(governance.includes("42127902178"), "GOVERNANCE.md is missing the 0.3.3 CI evidence");
check(governance.includes("42128152064"), "GOVERNANCE.md is missing the 0.3.3 Release evidence");
check(governance.includes("releases/tag/v0.3.3"), "GOVERNANCE.md is missing the published 0.3.3 Release URL");
check(governance.includes("42131331089"), "GOVERNANCE.md is missing the 0.3.4 CI evidence");
check(governance.includes("42131352599"), "GOVERNANCE.md is missing the 0.3.4 Release evidence");
check(governance.includes("2026-11-05T23:43:07Z"), "GOVERNANCE.md is missing the published 0.3.4 timestamp");
check(governance.includes("releases/tag/v0.3.4"), "GOVERNANCE.md is missing the published 0.3.4 Release URL");
check(launchKit.includes("tag workflow now creates"), "LAUNCH_KIT.md does not document automatic Release creation");
check(launchKit.includes("releases/tag/v0.3.2"), "LAUNCH_KIT.md is missing the published 0.3.2 Release URL");
check(launchKit.includes("releases/tag/v0.3.3"), "LAUNCH_KIT.md is missing the published 0.3.3 Release URL");
check(launchKit.includes("Verified outcome for `v0.3.4`"), "LAUNCH_KIT.md is missing verified 0.3.4 Release evidence");
check(launchKit.includes("Published release notes — 0.3.4"), "LAUNCH_KIT.md does not mark 0.3.4 release notes as published");
check(launchKit.includes("releases/tag/v0.3.4"), "LAUNCH_KIT.md is missing the published 0.3.4 Release URL");
check(launchKit.includes("42131352599"), "LAUNCH_KIT.md is missing the 0.3.4 Release run evidence");
check(governance.includes("42133746976"), "GOVERNANCE.md is missing the 45e8280 CI evidence");
check(governance.includes("42133747183"), "GOVERNANCE.md is missing the 45e8280 metadata drift evidence");
check(governance.includes("29 advisories"), "GOVERNANCE.md is missing the 08:03 dependency audit evidence");
check(governance.includes("42133986305"), "GOVERNANCE.md is missing the 355b8a7 CI evidence");
check(governance.includes("42135660499"), "GOVERNANCE.md is missing the 132f90e CI evidence");
check(governance.includes("127623011373"), "GOVERNANCE.md is missing the #82 Node 20 CI job evidence");
check(governance.includes("127623011843"), "GOVERNANCE.md is missing the #82 Node 22 CI job evidence");
check(governance.includes("127623011712"), "GOVERNANCE.md is missing the #82 Node 24 CI job evidence");
check(governance.includes("A browser control check timed out twice"), "GOVERNANCE.md is missing the browser control timeout evidence");
check(governance.includes("127617347972"), "GOVERNANCE.md is missing the Node 20 CI job evidence");
check(governance.includes("127617347701"), "GOVERNANCE.md is missing the Node 22 CI job evidence");
check(governance.includes("127617347854"), "GOVERNANCE.md is missing the Node 24 CI job evidence");
check(governance.includes("docs/GOAL_MODE.md"), "GOVERNANCE.md does not link the goal-mode contract");
check(goalMode.includes("2026-11-06 09:00"), "GOAL_MODE.md is missing the overnight time boundary");
check(goalMode.includes("No force push"), "GOAL_MODE.md is missing the push/history red line");
check(goalMode.includes("Final audit"), "GOAL_MODE.md is missing the final-audit rule");
check(goalMode.includes("Reusable Chinese goal template"), "GOAL_MODE.md is missing the reusable goal template");
check(agents.includes("docs/GOAL_MODE.md"), "AGENTS.md does not point AI agents to the goal-mode contract");
check(readme.includes("docs/GOAL_MODE.md"), "README.md does not link the goal-mode contract");
check(englishQuickstart.includes("docs/GOAL_MODE.md"), "README.en.md does not link the goal-mode contract");
check(documentationMap.includes("GOAL_MODE.md"), "docs/README.md does not link the goal-mode contract");
check(changelog.includes("docs/GOAL_MODE.md"), "CHANGELOG.md is missing the goal-mode contract evidence");
check(changelog.includes("42135660499"), "CHANGELOG.md is missing the #82 CI evidence");
check(launchKit.includes("发布后维护更新（不改写 0.3.4 Release notes）"), "LAUNCH_KIT.md is missing the post-release maintenance copy");
check(launchKit.includes("42135660499"), "LAUNCH_KIT.md is missing the #82 CI evidence");
check(launchKit.includes("GOAL_MODE.md"), "LAUNCH_KIT.md does not reference the goal-mode contract");
check(research.includes("目标模式与维护证据的产品调研"), "COMPETITIVE_RESEARCH.md is missing the goal-mode maintenance research");
check(research.includes("132f90e"), "COMPETITIVE_RESEARCH.md is missing the post-release maintenance commit evidence");
check(dependencyMaintenance.includes("08:03 CST audit snapshot"), "DEPENDENCY_MAINTENANCE.md is missing the audit snapshot");
check(dependencyMaintenance.includes("not applied"), "DEPENDENCY_MAINTENANCE.md does not record the no-auto-upgrade decision");
check(releaseWorkflow.includes("AI-human visual communication board"), "release workflow is missing the shared-board Release title");
check(agents.includes("release.yml"), "AGENTS.md does not document the versioned tag Release workflow");
check(getCapabilitiesTool.includes("SERVER_VERSION, type ToolContext"), "get-capabilities.ts bypasses the shared infra boundary");
check(!getCapabilitiesTool.includes('from "../infra/version.js"'), "get-capabilities.ts imports infra directly");
check(packageJson.scripts?.["github:check"] === "node scripts/github-maintenance.mjs --check", "github:check script is missing");
check(packageJson.scripts?.["github:sync"] === "node scripts/github-maintenance.mjs", "github:sync script is missing");
check(metadataWorkflow.includes("branches: [master, main]"), "metadata workflow does not converge on master/main pushes");
check(metadataWorkflow.includes("docs/LAUNCH_KIT.md"), "metadata workflow does not watch the launch-kit path");
check(metadataWorkflow.includes("scripts/github-maintenance.mjs"), "metadata workflow does not watch the maintenance script path");
check(metadataWorkflow.includes(".github/workflows/maintain-github-metadata.yml"), "metadata workflow does not watch its own path");
check(metadataWorkflow.includes("env:\n      GH_ADMIN_TOKEN: ${{ secrets.GH_TOKEN }}"), "metadata workflow does not expose the admin token through job env");
check(metadataWorkflow.includes("env.GH_ADMIN_TOKEN != ''"), "metadata workflow does not guard metadata writes with an admin token");
check(governance.includes("read-only drift check on every master/main push"), "governance docs do not describe automatic metadata drift checks");
check(governance.includes("42185011140"), "governance docs do not record the green approval-gate CI run");
check(launchKit.includes("42185011140"), "launch kit does not record the green approval-gate CI run");
check(governance.includes("42187638417"), "governance docs do not record the green unified-refresh CI run");
check(launchKit.includes("42187638417"), "launch kit does not record the green unified-refresh CI run");
check(governance.includes("42190267479"), "governance docs do not record the green node-badge CI run");
check(launchKit.includes("42190267479"), "launch kit does not record the green node-badge CI run");
check(governance.includes("42193671562"), "governance docs do not record the green Atlas CI run");
check(launchKit.includes("42193671562"), "launch kit does not record the green Atlas CI run");
check(governance.includes("42194826679"), "governance docs do not record the green journey-interaction CI run");
check(launchKit.includes("42194826679"), "launch kit does not record the green journey-interaction CI run");
check(launchKit.includes("协作可见性短帖"), "launch kit does not include the collaboration visibility post");
check(launchKit.includes("克制视觉系统短帖"), "launch kit does not include the restrained visual system post");
check(launchKit.includes("push a metadata-relevant file to apply"), "launch kit does not describe automatic metadata convergence");
check(packageJson.scripts?.["docs:assets"] === "node scripts/generate-doc-assets.mjs", "docs:assets script is missing");
check(packageJson.scripts?.["docs:assets:check"] === "node scripts/generate-doc-assets.mjs --check", "docs:assets:check script is missing");
check(!/gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/.test(launchKit + githubMaintenance + readme + agents + changelog), "A GitHub token-like value appears in tracked maintenance copy");
check(!/labels:\s*\[(?:[^\]]*\bdependencies\b|[^]]*\bci\b)/.test(dependabotConfig), "dependabot.yml references labels the repository does not own");
check(dependencyMaintenance.includes("label references were removed"), "DEPENDENCY_MAINTENANCE.md does not record the label decision");
check(contributing.includes("npm run repo:check"), "CONTRIBUTING.md does not document the offline repository check");
check(contributing.includes("SELECTION_WORKORDER_JSON"), "CONTRIBUTING.md does not document the read-only projection boundary");
check(pullRequestTemplate.includes("npm run test:examples:workflow"), "PR template does not require the reproducible workflow example");
check(pullRequestTemplate.includes("Read-only JSON projection"), "PR template does not flag read-only contract changes");
check(featureRequestTemplate.includes("Safety boundary"), "Feature request template does not ask for safety implications");

if (failures.length) {
  console.error("❌ Offline repository checks failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("✅ Offline repository checks passed: launch metadata, docs links, scripts, and changelog are aligned");
