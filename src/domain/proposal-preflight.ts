import fs from "node:fs/promises";
import type { Stats } from "node:fs";
import path from "node:path";
import { assertSafeWorkspacePath, toWorkspaceRelative } from "./path-safety.js";
import { unifiedDiff } from "./diff.js";
import type { ProjectChange, VisualGraph } from "./types.js";

export type PreflightSeverity = "info" | "warning" | "blocker";

export interface PreflightFinding {
  code: string;
  severity: PreflightSeverity;
  path?: string;
  message: string;
}

export interface ProposalPreflightSummary {
  version: 1;
  safe: boolean;
  files: number;
  blockers: number;
  warnings: number;
  existingFiles: number;
  newFiles: number;
  unchanged: number;
  graphReferencedPaths: string[];
  findings: PreflightFinding[];
  guidance: string;
}

export interface PreflightOptions {
  workspaceRoot: string;
  changes: ProjectChange[];
  graph?: VisualGraph;
  stats?: Map<string, Stats | null>;
  contents?: Map<string, string>;
}

const MAX_CHANGE_BYTES = 1024 * 1024;

function keyFor(workspaceRoot: string, relativePath: string): string {
  return path.resolve(workspaceRoot, relativePath);
}

function graphPaths(graph?: VisualGraph): Set<string> {
  const paths = new Set<string>();
  for (const node of graph?.nodes ?? []) {
    if (node.path && node.path !== ".") paths.add(node.path.replace(/\\/g, "/"));
  }
  return paths;
}

function duplicatePaths(changes: ProjectChange[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const change of changes) {
    if (seen.has(change.path)) duplicates.add(change.path);
    seen.add(change.path);
  }
  return [...duplicates];
}

function isProtectedPath(relativePath: string): boolean {
  const segments = relativePath.replace(/\\/g, "/").split("/").filter(Boolean);
  return segments.some((segment) =>
    segment === ".git" || segment === "node_modules" || segment === "dist" || segment === "coverage"
    || segment.startsWith(".env")
    || ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "Cargo.lock"].includes(segment));
}

export async function inspectProposalChanges(options: PreflightOptions): Promise<ProposalPreflightSummary> {
  const { workspaceRoot, changes, graph } = options;
  const stats = options.stats ?? new Map<string, Stats | null>();
  const contents = options.contents ?? new Map<string, string>();
  const findings: PreflightFinding[] = [];
  const graphPathSet = graphPaths(graph);
  const changedPaths = new Set(changes.map((change) => change.path));
  let existingFiles = 0;
  let newFiles = 0;
  let unchanged = 0;

  for (const duplicate of duplicatePaths(changes)) {
    findings.push({
      code: "duplicate_path",
      severity: "blocker",
      path: duplicate,
      message: `Path is changed more than once in one proposal: ${duplicate}`,
    });
  }

  for (const change of changes) {
    let absolute: string;
    let relative: string;
    try {
      absolute = assertSafeWorkspacePath(workspaceRoot, change.path);
      relative = toWorkspaceRelative(workspaceRoot, absolute);
    } catch (error) {
      findings.push({
        code: "unsafe_path",
        severity: "blocker",
        path: change.path,
        message: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
    if (!["create", "update", "mkdir"].includes(change.kind)) {
      findings.push({
        code: "unsupported_kind",
        severity: "blocker",
        path: change.path,
        message: `Unsupported change kind: ${change.kind}`,
      });
      continue;
    }
    if (isProtectedPath(relative)) {
      findings.push({
        code: "protected_path",
        severity: "blocker",
        path: relative,
        message: `Protected path cannot be changed: ${relative}`,
      });
    }
    if (change.kind === "mkdir") {
      findings.push({
        code: "directory",
        severity: "info",
        path: relative,
        message: `Creates a directory with no file content: ${relative}`,
      });
      continue;
    }
    if (typeof change.content !== "string") {
      findings.push({
        code: "missing_content",
        severity: "blocker",
        path: relative,
        message: `Full UTF-8 content is required: ${relative}`,
      });
      continue;
    }
    if (change.encoding && change.encoding !== "utf8") {
      findings.push({
        code: "unsupported_encoding",
        severity: "blocker",
        path: relative,
        message: `Only utf8 content is supported: ${relative}`,
      });
    }
    if (Buffer.byteLength(change.content, "utf8") > MAX_CHANGE_BYTES) {
      findings.push({
        code: "content_too_large",
        severity: "blocker",
        path: relative,
        message: `File content exceeds ${MAX_CHANGE_BYTES} bytes: ${relative}`,
      });
    }

    const key = keyFor(workspaceRoot, relative);
    const stat = stats.has(key) ? stats.get(key) : await fs.stat(absolute).then((value) => value, () => null);
    stats.set(key, stat ?? null);
    if (stat) existingFiles += 1;
    else newFiles += 1;
    if (change.kind === "create" && stat) {
      findings.push({
        code: "create_overwrite",
        severity: "blocker",
        path: relative,
        message: `create would overwrite an existing file; use update: ${relative}`,
      });
    }
    if (change.kind === "update" && !stat) {
      findings.push({
        code: "update_missing",
        severity: "blocker",
        path: relative,
        message: `update targets a missing file; use create: ${relative}`,
      });
    }
    if (stat && !stat.isFile()) {
      findings.push({
        code: "not_regular_file",
        severity: "blocker",
        path: relative,
        message: `Target is not a regular file: ${relative}`,
      });
      continue;
    }
    if (stat) {
      const before = contents.get(key) ?? await fs.readFile(absolute, "utf8");
      contents.set(key, before);
      if (before === change.content) {
        unchanged += 1;
        findings.push({
          code: "no_content_change",
          severity: "warning",
          path: relative,
          message: `Proposed content is identical to the existing file: ${relative}`,
        });
      } else if (unifiedDiff(before, change.content).every((line) => line.type === "context")) {
        findings.push({
          code: "no_visible_diff",
          severity: "warning",
          path: relative,
          message: `No visible line diff was detected: ${relative}`,
        });
      }
    }
    if (graphPathSet.size > 0 && !graphPathSet.has(relative)) {
      findings.push({
        code: "not_in_current_graph",
        severity: "info",
        path: relative,
        message: `Path is not a node in the current scan graph: ${relative}`,
      });
    }
  }

  for (const graphPath of graphPathSet) {
    if (graphPath.endsWith("/") || !changedPaths.has(graphPath)) continue;
    findings.push({
      code: "graph_path_changed",
      severity: "info",
      path: graphPath,
      message: `Proposal changes a path that is visible in the current graph: ${graphPath}`,
    });
  }

  const blockers = findings.filter((finding) => finding.severity === "blocker").length;
  const warnings = findings.filter((finding) => finding.severity === "warning").length;
  return {
    version: 1,
    safe: blockers === 0,
    files: changes.length,
    blockers,
    warnings,
    existingFiles,
    newFiles,
    unchanged,
    graphReferencedPaths: [...graphPathSet].filter((item) => changedPaths.has(item)).sort(),
    findings,
    guidance: blockers > 0
      ? "Fix every blocker before calling create_visual_proposal; the server will reject unsafe changes."
      : warnings > 0
        ? "Review warnings and remove no-op changes before creating a proposal."
        : "Preflight found no blockers; create a proposal only if the human intent is still current.",
  };
}
