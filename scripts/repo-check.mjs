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
const dependabotConfig = await read(".github/dependabot.yml");
const dependencyMaintenance = await read("docs/DEPENDENCY_MAINTENANCE.md");
const englishQuickstart = await read("README.en.md");
const troubleshooting = await read("docs/TROUBLESHOOTING.md");
const documentationMap = await read("docs/README.md");
const docAssetGenerator = await read("scripts/generate-doc-assets.mjs");
const governance = await read("docs/GOVERNANCE.md");
const adrIndex = await read("docs/ADR/README.md");
const releasing = await read("RELEASING.md");
const changeTemplateDomain = await read("src/domain/change-templates.ts");
const projectScanner = await read("src/infra/project-scanner.ts");
const visualSyncService = await read("src/infra/visual-sync-service.ts");
const visualGraphMerge = await read("src/domain/visual-graph-merge.ts");
const scanTool = await read("src/tools/scan-project.ts");
const roadmap = await read("ROADMAP.md");
const research = await read("docs/COMPETITIVE_RESEARCH.md");
const englishReadme = englishQuickstart;

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
check(launchKit.includes("18 MCP tools"), "docs/LAUNCH_KIT.md release notes do not reflect the 18 MCP tools");
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
  ["stable scanner IDs", projectScanner, "stableId"],
  ["visual sync service", visualSyncService, "export class VisualSyncService"],
  ["visual graph merge", visualGraphMerge, "export function mergeScannedGraph"],
  ["scan preservation contract", scanTool, "PRESERVATION_JSON"],
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
for (const [label, source, needle] of [
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
  ["research layout delivered", research, "布局保持已交付"],
  ["ADR docs map", documentationMap, "0006-stable-scan-preserves-human-visual-state.md"],
]) {
  check(source.includes(needle), `${label} is missing or drifted`);
}
check(agents.includes("scripts/github-maintenance.mjs"), "AGENTS.md does not document GitHub maintenance script");
check(agents.includes("scripts/generate-doc-assets.mjs"), "AGENTS.md does not document the versioned documentation asset generator");
check(agents.includes("ROADMAP.md"), "AGENTS.md does not list ROADMAP.md");
check(agents.includes("annotationThreads"), "AGENTS.md does not document annotation thread context");
check(agents.includes("preflight_visual_proposal"), "AGENTS.md does not document proposal preflight");
check(readme.includes("18 个 MCP 工具"), "README.md does not reflect the 18 MCP tools");
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
