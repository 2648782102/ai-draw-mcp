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

for (const document of ["ROADMAP.md", "docs/ARCHITECTURE.md", "docs/COMPETITIVE_RESEARCH.md", "docs/LAUNCH_KIT.md"]) {
  check(readme.includes(document) || readme.includes(document.replace(/\.md$/, ".md")), `README.md does not link ${document}`);
}
check(agents.includes("scripts/github-maintenance.mjs"), "AGENTS.md does not document GitHub maintenance script");
check(agents.includes("ROADMAP.md"), "AGENTS.md does not list ROADMAP.md");
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
