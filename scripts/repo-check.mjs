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
const packageJson = JSON.parse(await read("package.json"));
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
const collaborationTest = await read("test/collab.integration.test.mjs");
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
const englishReadme = englishQuickstart;
const ci = await read(".github/workflows/ci.yml");
const metadataWorkflow = await read(".github/workflows/maintain-github-metadata.yml");

const expectedDescription = "Human ↔ AI visual collaboration workspace for MCP: scan a project, edit the diagram, discuss intent, and apply approved code changes.";
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
check(launchKit.includes(expectedDescription), "docs/LAUNCH_KIT.md is missing the GitHub description");
check(launchKit.includes(expectedHomepage), "docs/LAUNCH_KIT.md is missing the GitHub homepage");
check(launchKit.includes("22 MCP tools"), "docs/LAUNCH_KIT.md release notes do not reflect the 22 MCP tools");
check(githubMaintenance.includes(expectedDescription), "scripts/github-maintenance.mjs is missing the GitHub description");
check(githubMaintenance.includes(expectedHomepage), "scripts/github-maintenance.mjs is missing the GitHub homepage");
for (const topic of expectedTopics) {
  check(launchKit.includes(topic), `docs/LAUNCH_KIT.md is missing topic: ${topic}`);
  check(githubMaintenance.includes(`"${topic}"`), `scripts/github-maintenance.mjs is missing topic: ${topic}`);
}

for (const [id, needle] of [
  ["btnSaveGraph", 'id="btnSaveGraph"'],
  ["btnAddAnnotation", 'id="btnAddAnnotation"'],
  ["annotationList", 'id="annotationList"'],
  ["btnExportSession", 'id="btnExportSession"'],
  ["btnImportSession", 'id="btnImportSession"'],
  ["messageInput", 'id="messageInput"'],
  ["focusSummary", 'id="focusSummary"'],
  ["btnCopyAiContext", 'id="btnCopyAiContext"'],
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
  ["Chinese README workbench diagram", readme, "docs/collaboration-workbench.svg"],
  ["English quickstart loop diagram", englishQuickstart, "docs/collaboration-loop.svg"],
  ["English quickstart workbench diagram", englishQuickstart, "docs/collaboration-workbench.svg"],
  ["Chinese README troubleshooting link", readme, "docs/TROUBLESHOOTING.md"],
  ["English quickstart troubleshooting link", englishQuickstart, "docs/TROUBLESHOOTING.md"],
  ["one-time receipt FAQ", troubleshooting, "one-time receipt"],
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
  ["source evidence roadmap", roadmap, "file:line` source evidence"],
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
  ["node context roadmap", roadmap, "get_node_context"],
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
  ["visual history roadmap", roadmap, "visual undo/redo"],
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
  ["shared brief roadmap", roadmap, "get_shared_brief"],
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
  ["viewport roadmap", roadmap, "viewport attention"],
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
  ["server tool count", server, "const TOOL_COUNT = 22"],
  ["server workflow registration", server, "registerGetAgentWorkflow"],
  ["CI workflow example", ci, "npm run test:examples:workflow"],
  ["package workflow example", packageJson.scripts?.["test:examples:workflow"] ?? "", "node examples/agent-workflow.mjs"],
  ["English workflow contract", englishQuickstart, "get_agent_workflow"],
  ["README workflow decision link", readme, "0007-agent-workflow-is-a-read-only-contract.md"],
  ["AGENTS workflow decision link", agents, "0007-agent-workflow-is-a-read-only-contract.md"],
  ["architecture workflow decision link", architecture, "0007-agent-workflow-is-a-read-only-contract.md"],
  ["launch workflow contract", launchKit, "WORKFLOW_JSON"],
  ["research workflow delivery", research, "基础版已交付"],
  ["roadmap workflow delivery", roadmap, "get_agent_workflow"],
  ["security workflow boundary", security, "WORKFLOW_JSON"],
  ["troubleshooting workflow", troubleshooting, "get_agent_workflow"],
  ["examples workflow", examplesReadme, "agent-workflow.mjs"],
  ["collaboration workflow", collaborationWorkflow, "WORKFLOW_JSON.blocked"],
  ["documentation map workflow", documentationMap, "0007-agent-workflow-is-a-read-only-contract.md"],
  ["README focus context", readme, "SessionFocus"],
  ["AGENTS focus context", agents, "SessionFocus"],
  ["architecture focus endpoint", architecture, "/api/collab/focus"],
  ["roadmap focus delivery", await read("ROADMAP.md"), "Versioned human focus"],
  ["roadmap stable scan delivery", roadmap, "Stable-path project scans"],
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
  ["decision trail roadmap", roadmap, "get_decision_trail"],
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
  ["export manifest roadmap", roadmap, "EXPORT_MANIFEST_JSON"],
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
  ["review readiness English docs", englishQuickstart, "REVIEW_READINESS_JSON"],
  ["review readiness Chinese docs", readme, "REVIEW_READINESS_JSON"],
  ["review readiness AGENTS docs", agents, "REVIEW_READINESS_JSON"],
  ["review readiness architecture", architecture, "REVIEW_READINESS_JSON"],
  ["review readiness security", security, "REVIEW_READINESS_JSON"],
  ["review readiness roadmap", roadmap, "REVIEW_READINESS_JSON"],
  ["review readiness launch", launchKit, "REVIEW_READINESS_JSON"],
  ["review readiness troubleshooting", troubleshooting, "REVIEW_READINESS_JSON"],
  ["review readiness examples map", examplesReadme, "REVIEW_READINESS_JSON"],
]) {
  check(file.includes(needle), `${label} is missing or drifted`);
}
check(agents.includes("scripts/github-maintenance.mjs"), "AGENTS.md does not document GitHub maintenance script");
check(agents.includes("scripts/generate-doc-assets.mjs"), "AGENTS.md does not document the versioned documentation asset generator");
check(agents.includes("ROADMAP.md"), "AGENTS.md does not list ROADMAP.md");
check(agents.includes("annotationThreads"), "AGENTS.md does not document annotation thread context");
check(agents.includes("preflight_visual_proposal"), "AGENTS.md does not document proposal preflight");
check(readme.includes("22 个 MCP 工具"), "README.md does not reflect the 22 MCP tools");
check(agents.includes("## 22 个 MCP 工具"), "AGENTS.md does not reflect the 22 MCP tools");
check(roadmap.includes("22 MCP tools"), "ROADMAP.md does not reflect the 22 MCP tools");
const roadmapNextLines = roadmap.split("\n").slice(
  roadmap.split("\n").findIndex((line) => line.startsWith("## Next")),
  roadmap.split("\n").findIndex((line) => line.startsWith("## Shipped")),
).filter((line) => line.startsWith("- "));
check(new Set(roadmapNextLines).size === roadmapNextLines.length, "ROADMAP.md has duplicate next-stage items");
check(!panel.includes("navigator.sendBeacon"), "Collaboration panel must not use sendBeacon for authenticated viewport writes");
check(getAgentWorkflowTool.includes("get_agent_workflow"), "get-agent-workflow.ts is missing the tool name");
check(agentWorkflowDomain.includes('grantsWriteAuthority: false'), "agent-workflow.ts is missing the no-authority invariant");
check(agentWorkflowExample.includes('step.writes === "project"'), "workflow example does not verify the project-write boundary");
check(packageJson.scripts?.check?.includes("npm run test:examples:workflow"), "npm run check does not execute the workflow example");
check(readme.includes("list_change_templates"), "README.md does not document change templates");
check(agents.includes("change-templates.ts"), "AGENTS.md does not list the change template module");
check(agents.includes("list_change_templates"), "AGENTS.md does not document change templates");
check(changeTemplateDomain.includes("does not create a proposal"), "change template guidance does not state its read-only boundary");
check(packageJson.description?.includes("visual collaboration"), "package.json description is missing the product positioning");
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
check(packageJson.scripts?.["github:check"] === "node scripts/github-maintenance.mjs --check", "github:check script is missing");
check(packageJson.scripts?.["github:sync"] === "node scripts/github-maintenance.mjs", "github:sync script is missing");
check(metadataWorkflow.includes("branches: [master, main]"), "metadata workflow does not converge on master/main pushes");
check(metadataWorkflow.includes("env:\n      GH_ADMIN_TOKEN: ${{ secrets.GH_TOKEN }}"), "metadata workflow does not expose the admin token through job env");
check(metadataWorkflow.includes("env.GH_ADMIN_TOKEN != ''"), "metadata workflow does not guard metadata writes with an admin token");
check(governance.includes("read-only drift check on every master/main push"), "governance docs do not describe automatic metadata drift checks");
check(launchKit.includes("push a metadata-relevant file to apply"), "launch kit does not describe automatic metadata convergence");
check(packageJson.scripts?.["docs:assets"] === "node scripts/generate-doc-assets.mjs", "docs:assets script is missing");
check(packageJson.scripts?.["docs:assets:check"] === "node scripts/generate-doc-assets.mjs --check", "docs:assets:check script is missing");
check(!/gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/.test(launchKit + githubMaintenance + readme + agents + changelog), "A GitHub token-like value appears in tracked maintenance copy");
check(!/labels:\s*\[(?:[^\]]*\bdependencies\b|[^]]*\bci\b)/.test(dependabotConfig), "dependabot.yml references labels the repository does not own");
check(dependencyMaintenance.includes("label references were removed"), "DEPENDENCY_MAINTENANCE.md does not record the label decision");

if (failures.length) {
  console.error("❌ Offline repository checks failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("✅ Offline repository checks passed: launch metadata, docs links, scripts, and changelog are aligned");
