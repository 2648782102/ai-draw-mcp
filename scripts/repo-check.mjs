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
const annotationThread = await read("src/domain/annotation-thread.ts");
const activityTimeline = await read("src/domain/activity-timeline.ts");
const sessionBundleSource = await read("src/domain/session-bundle.ts");
const pathSafety = await read("src/domain/path-safety.ts");
const approval = await read("src/domain/approval.ts");
const domainContractsTest = await read("test/domain-contracts.test.mjs");

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
]) {
  check(panel.includes(needle), `Collaboration panel is missing ${id}`);
}
for (const endpoint of [
  "/api/collab/annotations/:id/reply",
  "/api/collab/annotations/:id/status",
  "/api/collab/activity",
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
  ["annotation_replies tool argument", replyTool, "annotation_replies"],
  ["activity timeline derivation", activityTimeline, "export function buildActivityTimeline"],
  ["activity timeline context", getVisualContext, "activityTimeline"],
  ["approval downgrade in bundle", sessionBundleSource, 'status: proposal.status === "approved" ? "pending" : proposal.status'],
  ["protected path checks", pathSafety, "DENIED_SEGMENTS"],
  ["one-time approval validation", approval, "grant.usedAt"],
  ["domain contract tests", domainContractsTest, "describe(\"session bundle contract\""],
]) {
  check(file.includes(needle), `${label} is missing or drifted`);
}

for (const document of ["ROADMAP.md", "docs/ARCHITECTURE.md", "docs/COMPETITIVE_RESEARCH.md", "docs/LAUNCH_KIT.md"]) {
  check(readme.includes(document) || readme.includes(document.replace(/\.md$/, ".md")), `README.md does not link ${document}`);
}
check(agents.includes("scripts/github-maintenance.mjs"), "AGENTS.md does not document GitHub maintenance script");
check(agents.includes("ROADMAP.md"), "AGENTS.md does not list ROADMAP.md");
check(agents.includes("annotationThreads"), "AGENTS.md does not document annotation thread context");
check(architecture.includes("annotationThreads.nextActor"), "ARCHITECTURE.md does not document annotation thread handoff");
check(architecture.includes("activityTimeline"), "ARCHITECTURE.md does not document the derived activity timeline");
check(agents.includes("activity-timeline.ts"), "AGENTS.md does not list the activity timeline module");
check(agents.includes("/api/collab/activity"), "AGENTS.md does not document the activity endpoint");
check(readme.includes("解决线程只是对话状态"), "README.md does not separate thread resolution from proposal approval");
check(readme.includes("不等于批准变更"), "README.md does not document the thread approval boundary");
check(changelog.includes("## [Unreleased]"), "CHANGELOG.md has no Unreleased section");
check(packageJson.scripts?.["github:check"] === "node scripts/github-maintenance.mjs --check", "github:check script is missing");
check(packageJson.scripts?.["github:sync"] === "node scripts/github-maintenance.mjs", "github:sync script is missing");
check(!/gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}/.test(launchKit + githubMaintenance + readme + agents + changelog), "A GitHub token-like value appears in tracked maintenance copy");

if (failures.length) {
  console.error("❌ Offline repository checks failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("✅ Offline repository checks passed: launch metadata, docs links, scripts, and changelog are aligned");
