import type { SessionSnapshot, SourceNavigation, SourceNavigationItem } from "./types.js";

function isRelativeEvidencePath(value: string): boolean {
  if (!value || value !== value.trim() || value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value)) return false;
  if (value.includes("\\") || value.includes("\0") || value.includes("?")) return false;
  const segments = value.split("/");
  return segments.length > 0 && segments.every((segment) => Boolean(segment)
    && segment !== "."
    && segment !== ".."
    && segment !== ".git"
    && segment !== "node_modules"
    && !segment.startsWith(".env"));
}

function boundedLimit(value: number, fallback: number, max: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.min(max, Math.floor(value))) : fallback;
}

export function buildSourceNavigation(
  snapshot: SessionSnapshot,
  options: { nodeId?: string; limit?: number } = {},
): SourceNavigation {
  const graph = snapshot.graph;
  if (!graph) throw new Error("No VisualGraph is available; run scan_project first.");
  const requestedNodeId = typeof options.nodeId === "string" ? options.nodeId.trim() : undefined;
  if (requestedNodeId && !graph.nodes.some((node) => node.id === requestedNodeId))
    throw new Error(`Unknown graph node: ${requestedNodeId}`);
  const limit = boundedLimit(options.limit ?? 30, 30, 60);
  const allItems = graph.nodes.flatMap((node) => (node.sourceEvidence ?? [])
    .filter((evidence) => evidence.version === 1
      && Number.isInteger(evidence.line)
      && evidence.line > 0
      && isRelativeEvidencePath(evidence.path))
    .map((evidence): SourceNavigationItem => ({
      nodeId: node.id,
      nodeLabel: node.label,
      kind: evidence.kind,
      path: evidence.path,
      line: evidence.line,
      excerpt: evidence.excerpt,
      fileLine: `${evidence.path}:${evidence.line}:1`,
      vscodeUri: `vscode://file/${evidence.path}:${evidence.line}:1`,
      cursorUri: `cursor://file/${evidence.path}:${evidence.line}:1`,
      editorCommand: `code --goto ${evidence.path}:${evidence.line}:1`,
    })));
  const scopedItems = requestedNodeId
    ? allItems.filter((item) => item.nodeId === requestedNodeId)
    : allItems;
  const items = scopedItems.slice(0, limit);
  const copyText = items.length
    ? items.map((item) => `- ${item.nodeLabel} · ${item.kind} · ${item.fileLine} · ${item.excerpt}`).join("\n")
    : "No bounded source evidence is available for the selected scope.";
  return {
    version: 1,
    readOnly: true,
    sessionId: snapshot.id,
    graphRevision: snapshot.graphRevision,
    nodeId: requestedNodeId,
    totalEvidence: scopedItems.length,
    returnedItems: items.length,
    items,
    copyText,
    guidance: [
      "SOURCE_NAVIGATION_JSON is a bounded, read-only projection of scanner evidence; it never reads project files again.",
      "Relative URIs are plain copyable text. The server does not open files, launch an IDE, or execute editor commands.",
      "Use file:line references to inspect code, then follow preflight, full line diff review, human approval, and a one-time receipt before any project write.",
      "Paths are filtered to workspace-relative text; absolute paths, traversal segments, protected directories, and .env-like files are excluded.",
    ],
    safety: {
      readOnly: true,
      grantsWriteAuthority: false,
      excludesApprovalGrants: true,
      excludesAbsolutePaths: true,
      doesNotOpenFiles: true,
      projectWritesRequireHumanApproval: true,
    },
  };
}
