#!/usr/bin/env node
/**
 * Keep public GitHub repository metadata aligned with versioned launch copy.
 *
 * Read-only:  node scripts/github-maintenance.mjs --check
 * Apply:      GH_TOKEN=... node scripts/github-maintenance.mjs
 * Release:    GH_TOKEN=... node scripts/github-maintenance.mjs --release v0.3.1
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repo = "2648782102/ai-draw-mcp";
const api = "https://api.github.com";

const expected = {
  description: "Human ↔ AI visual collaboration workspace for MCP: scan a project, edit the diagram, discuss intent, and apply approved code changes.",
  homepage: "https://github.com/2648782102/ai-draw-mcp#readme",
  topics: [
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
  ],
};

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const releaseIndex = args.indexOf("--release");
const releaseTag = releaseIndex >= 0 ? args[releaseIndex + 1] : null;
const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;

function authHeaders(extra = {}) {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ai-draw-mcp-maintenance",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function request(method, endpoint, body) {
  const response = await fetch(`${api}${endpoint}`, {
    method,
    headers: authHeaders(body ? { "Content-Type": "application/json" } : {}),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${method} ${endpoint} failed (${response.status}): ${payload.message ?? text}`);
  }
  return payload;
}

async function checkMetadata() {
  const [metadata, topics] = await Promise.all([
    request("GET", `/repos/${repo}`),
    request("GET", `/repos/${repo}/topics`),
  ]);
  const drift = [];
  if (metadata.description !== expected.description) drift.push(`description: ${metadata.description ?? "null"}`);
  if (metadata.homepage !== expected.homepage) drift.push(`homepage: ${metadata.homepage ?? "null"}`);
  const actualTopics = topics.names ?? [];
  if (JSON.stringify(actualTopics) !== JSON.stringify(expected.topics)) {
    drift.push(`topics: ${JSON.stringify(actualTopics)}`);
  }
  if (drift.length) {
    console.log(`⚠️  GitHub metadata differs from docs/LAUNCH_KIT.md:\n  - ${drift.join("\n  - ")}`);
    if (checkOnly) process.exitCode = 2;
    return false;
  }
  console.log(`✅ GitHub description, homepage, and topics are synchronized (${repo})`);
  return true;
}

async function applyMetadata() {
  if (!token) throw new Error("GH_TOKEN or GITHUB_TOKEN is required to update repository metadata");
  await request("PATCH", `/repos/${repo}`, {
    description: expected.description,
    homepage: expected.homepage,
  });
  await request("PUT", `/repos/${repo}/topics`, { names: expected.topics });
  return checkMetadata();
}

async function releaseNotes(tag) {
  const version = tag.replace(/^v/, "");
  const changelog = await fs.readFile(path.join(root, "CHANGELOG.md"), "utf8");
  const heading = `## [${version}]`;
  const start = changelog.indexOf(heading);
  if (start < 0) throw new Error(`No CHANGELOG section for ${version}`);
  const next = changelog.indexOf("\n## [", start + heading.length);
  const body = changelog.slice(start, next < 0 ? undefined : next).trim();
  return {
    tag_name: tag,
    name: `${tag} — Human ↔ AI visual collaboration`,
    body: `${body}\n\nFull documentation: https://github.com/${repo}#readme`,
    draft: false,
    prerelease: version.includes("-"),
  };
}

try {
  if (checkOnly) {
    await checkMetadata();
  } else if (!releaseTag) {
    if (!token) throw new Error("GH_TOKEN or GITHUB_TOKEN is required to update repository metadata");
    await applyMetadata();
  } else {
    if (!token) throw new Error("GH_TOKEN or GITHUB_TOKEN is required to create a release");
    const release = await releaseNotes(releaseTag);
    const created = await request("POST", `/repos/${repo}/releases`, release);
    console.log(`✅ Created release ${created.html_url}`);
  }
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exitCode = 1;
}
