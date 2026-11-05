import fs from "node:fs/promises";
import path from "node:path";
import { makeId, nowIso } from "../domain/ids.js";
import { isPathInside } from "../domain/path-safety.js";
import type {
  ProjectScanEdge,
  ProjectScanNode,
  ProjectScanResult,
  VisualGraph,
} from "../domain/types.js";

const IGNORED_DIRECTORIES = new Set([
  ".git", ".codex", ".cursor", ".github", ".vscode", ".idea",
  "node_modules", "dist", "build", "coverage", "output", ".next", ".turbo",
]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".rs", ".go"]);
const CONFIG_BASENAMES = new Set([
  "package.json", "tsconfig.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
  "vitest.config.ts", "vite.config.ts", "eslint.config.js", ".gitignore", ".env.example",
]);
const MAX_DEPTH = 4;
const MAX_FILES = 400;
const MAX_IMPORTS_PER_FILE = 8;

function classify(relativePath: string, isDirectory: boolean): ProjectScanNode["kind"] {
  if (isDirectory) return "directory";
  const base = path.basename(relativePath);
  if (CONFIG_BASENAMES.has(base) || base.startsWith(".")) return "config";
  if (/(^|[_.-])(test|spec|e2e)([_.-]|$)/i.test(base) || relativePath.includes("/test/")) return "test";
  if (base.toLowerCase() === "readme.md" || relativePath.startsWith("docs/")) return "documentation";
  if (base === "package.json") return "package";
  return "file";
}

function groupFor(relativePath: string): string | undefined {
  const first = relativePath.split(path.sep)[0];
  return first && !first.includes(".") ? first : "root";
}

function nodeLabel(relativePath: string, isDirectory: boolean): string {
  return isDirectory ? `${path.basename(relativePath)}/` : path.basename(relativePath);
}

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

function extractImports(source: string): string[] {
  const matches = source.matchAll(/(?:from\s+|import\s*\(\s*|require\s*\(\s*)["']([^"']+)["']/g);
  return [...new Set([...matches].map((match) => match[1]))]
    .filter((specifier) => specifier.startsWith(".") || specifier.startsWith("/"))
    .slice(0, MAX_IMPORTS_PER_FILE);
}

function resolveImport(fromFile: string, specifier: string): string | null {
  const base = path.resolve(path.dirname(fromFile), specifier);
  for (const candidate of [base, `${base}.ts`, `${base}.js`, `${base}.mjs`, path.join(base, "index.ts"), path.join(base, "index.js")]) {
    if (isPathInside(path.dirname(fromFile), candidate) || isPathInside(path.dirname(fromFile), path.dirname(candidate)))
      return candidate;
  }
  return null;
}

export interface ScanOptions {
  workspaceRoot: string;
  includeHidden?: boolean;
  maxDepth?: number;
  maxFiles?: number;
}

export async function scanProject(options: ScanOptions): Promise<ProjectScanResult> {
  const { workspaceRoot, includeHidden = false, maxDepth = MAX_DEPTH, maxFiles = MAX_FILES } = options;
  const nodes: ProjectScanNode[] = [];
  const edges: ProjectScanEdge[] = [];
  const absoluteById = new Map<string, string>();
  const idByAbsolute = new Map<string, string>();
  let ignoredPaths = 0;

  async function walk(current: string, depth: number): Promise<void> {
    if (depth > maxDepth || nodes.length >= maxFiles) return;
    const entries = await fs.readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (!includeHidden && entry.name.startsWith(".")) { ignoredPaths++; continue; }
      if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) { ignoredPaths++; continue; }
      const absolute = path.join(current, entry.name);
      const relative = path.relative(workspaceRoot, absolute);
      const isDirectory = entry.isDirectory();
      const id = makeId("node");
      nodes.push({
        id,
        label: nodeLabel(relative, isDirectory),
        kind: classify(relative, isDirectory),
        path: toPosix(relative),
        group: groupFor(relative),
        metadata: { depth },
      });
      absoluteById.set(id, absolute);
      idByAbsolute.set(absolute, id);
      if (!isDirectory) {
        const stat = await fs.stat(absolute).catch(() => null);
        if (stat) nodes[nodes.length - 1].metadata = { ...nodes[nodes.length - 1].metadata, bytes: stat.size };
      }
      if (isDirectory) await walk(absolute, depth + 1);
    }
  }

  const rootId = makeId("node");
  nodes.push({
    id: rootId,
    label: path.basename(workspaceRoot) || "workspace",
    kind: "package",
    path: ".",
    group: "root",
  });
  idByAbsolute.set(workspaceRoot, rootId);
  await walk(workspaceRoot, 0);

  for (const node of nodes) {
    if (node.path === "." || node.kind === "directory") continue;
    const absolute = absoluteById.get(node.id);
    if (!absolute) continue;
    const parentId = idByAbsolute.get(path.dirname(absolute)) ?? rootId;
    edges.push({ id: makeId("edge"), from: parentId, to: node.id, label: "contains", kind: "contains" });
  }

  for (const node of nodes) {
    if (node.kind === "directory" || node.kind === "package") continue;
    const absolute = absoluteById.get(node.id);
    if (!absolute || !SOURCE_EXTENSIONS.has(path.extname(absolute))) continue;
    const source = await fs.readFile(absolute, "utf8").catch(() => "");
    for (const specifier of extractImports(source)) {
      const target = resolveImport(absolute, specifier);
      const targetId = target ? idByAbsolute.get(target) : undefined;
      if (!targetId || targetId === node.id) continue;
      edges.push({ id: makeId("edge"), from: node.id, to: targetId, label: specifier, kind: "imports" });
    }
  }

  return {
    version: 1,
    workspaceRoot,
    generatedAt: nowIso(),
    nodes,
    edges,
    stats: {
      directories: nodes.filter((node) => node.kind === "directory").length,
      files: nodes.filter((node) => node.kind !== "directory" && node.path !== ".").length,
      sourceFiles: nodes.filter((node) => SOURCE_EXTENSIONS.has(path.extname(node.path))).length,
      testFiles: nodes.filter((node) => node.kind === "test").length,
      configFiles: nodes.filter((node) => node.kind === "config").length,
      ignoredPaths,
    },
  };
}

export function scanToVisualGraph(scan: ProjectScanResult, diagramId: string): VisualGraph {
  return {
    version: 1,
    diagramId,
    nodes: scan.nodes.map((node, index) => ({
      id: node.id,
      label: node.label,
      kind: node.kind,
      path: node.path,
      group: node.group,
      x: (index % 8) * 180,
      y: Math.floor(index / 8) * 100,
      metadata: node.metadata,
    })),
    edges: scan.edges.map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      label: edge.label,
      kind: edge.kind,
    })),
    annotations: [],
  };
}
