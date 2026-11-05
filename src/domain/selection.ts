import type { SessionSelection, SessionSnapshot, SelectionScope } from "./types.js";

export const SELECTION_LIMIT = 24;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertIsoTimestamp(value: unknown, label: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} must be a valid timestamp`);
  }
  return value;
}

function assertNodeId(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > 200 || /[\n\r\0]/.test(value)) {
    throw new Error(`${label} must be a bounded non-empty string`);
  }
  return value;
}

function isSafeRelativePath(value: string): boolean {
  if (!value || value !== value.trim() || value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value)) return false;
  if (value.includes("\\") || value.includes("\0") || value.includes("?")) return false;
  return value.split("/").every((segment) => Boolean(segment)
    && segment !== "."
    && segment !== ".."
    && segment !== ".git"
    && segment !== "node_modules"
    && segment !== "dist"
    && segment !== "coverage"
    && !segment.startsWith(".env"));
}

export function parseSelection(input: unknown, graphRevision?: number): SessionSelection | undefined {
  if (input === undefined || input === null) return undefined;
  if (!isRecord(input)) throw new Error("selection must be an object");
  if (input.version !== 1) throw new Error("selection has unsupported version");
  if (input.source !== "human") throw new Error("selection.source must be human");
  for (const key of Object.keys(input)) {
    if (!["version", "nodeIds", "graphRevision", "updatedAt", "source"].includes(key)) {
      throw new Error(`selection has unknown property ${key}`);
    }
  }
  if (!Array.isArray(input.nodeIds) || input.nodeIds.length > SELECTION_LIMIT) {
    throw new Error(`selection.nodeIds must be an array of at most ${SELECTION_LIMIT} nodes`);
  }
  const nodeIds = input.nodeIds.map((id, index) => assertNodeId(id, `selection.nodeIds[${index}]`));
  if (new Set(nodeIds).size !== nodeIds.length) throw new Error("selection.nodeIds contains duplicates");
  const revision = typeof input.graphRevision === "number" && Number.isFinite(input.graphRevision)
    ? input.graphRevision
    : graphRevision;
  if (revision === undefined || !Number.isFinite(revision)) {
    throw new Error("selection.graphRevision must be a finite number");
  }
  return {
    version: 1,
    nodeIds,
    graphRevision: revision,
    updatedAt: assertIsoTimestamp(input.updatedAt, "selection.updatedAt"),
    source: "human",
  };
}

export function buildSelection(
  nodeIds: unknown,
  graph: SessionSnapshot["graph"],
  graphRevision: number,
  updatedAt = new Date().toISOString(),
): SessionSelection | undefined {
  if (!Array.isArray(nodeIds)) throw new Error("selection.nodeIds must be an array");
  if (!graph) throw new Error("No VisualGraph is available; run scan_project first.");
  const available = new Set(graph.nodes.map((node) => node.id));
  const bounded = nodeIds.slice(0, SELECTION_LIMIT).map((id, index) => assertNodeId(id, `selection.nodeIds[${index}]`));
  const unique = [...new Set(bounded)];
  for (const id of unique) {
    if (!available.has(id)) throw new Error(`Unknown selection node: ${id}`);
  }
  return parseSelection({
    version: 1,
    nodeIds: unique,
    graphRevision,
    updatedAt,
    source: "human",
  });
}

function projectSelection(
  selection: SessionSelection | undefined,
  graph: SessionSnapshot["graph"],
): SessionSelection | undefined {
  if (!selection || !graph) return undefined;
  const available = new Set(graph.nodes.map((node) => node.id));
  const nodeIds = selection.nodeIds.filter((id) => available.has(id));
  return nodeIds.length ? { ...selection, nodeIds } : undefined;
}

function boundedLimit(value: number, fallback: number, max: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.min(max, Math.floor(value))) : fallback;
}

export function buildSelectionScope(
  snapshot: SessionSnapshot,
  options: { evidenceLimit?: number; edgeLimit?: number } = {},
): SelectionScope {
  const graph = snapshot.graph;
  const selection = projectSelection(snapshot.selection, graph);
  const evidenceLimit = boundedLimit(options.evidenceLimit ?? 20, 20, 60);
  const edgeLimit = boundedLimit(options.edgeLimit ?? 40, 40, 120);
  const nodeIds = new Set(selection?.nodeIds ?? []);
  const nodes = graph?.nodes
    .filter((node) => nodeIds.has(node.id))
    .map((node) => ({
      nodeId: node.id,
      label: node.label,
      kind: node.kind,
      path: node.path && isSafeRelativePath(node.path) ? node.path : undefined,
      group: node.group,
      sourceEvidenceCount: node.sourceEvidence?.length ?? 0,
    })) ?? [];
  const edges = graph?.edges
    .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
    .map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      label: edge.label,
      kind: edge.kind,
    })) ?? [];
  const evidence = graph?.nodes
    .filter((node) => nodeIds.has(node.id))
    .flatMap((node) => (node.sourceEvidence ?? [])
      .filter((item) => item.version === 1
        && Number.isInteger(item.line)
        && item.line > 0
        && isSafeRelativePath(item.path))
      .map((item) => ({
        nodeId: node.id,
        nodeLabel: node.label,
        kind: item.kind,
        path: item.path,
        line: item.line,
        excerpt: item.excerpt,
        fileLine: `${item.path}:${item.line}:1`,
      }))) ?? [];
  const returnedEdges = edges.slice(0, edgeLimit);
  const returnedEvidence = evidence.slice(0, evidenceLimit);
  const copyLines = nodes.length
    ? [
        `Selection scope · selectionRevision ${selection?.graphRevision ?? snapshot.graphRevision} · ${nodes.length} node(s) · read-only`,
        ...nodes.map((node) => `- ${node.label} (${node.nodeId})${node.path ? ` · ${node.path}` : ""}`),
        returnedEdges.length ? `- Internal edges: ${returnedEdges.length}${returnedEdges.length < edges.length ? ` / ${edges.length}` : ""}` : "- Internal edges: 0",
        returnedEvidence.length ? `- Safe file:line evidence: ${returnedEvidence.length}${returnedEvidence.length < evidence.length ? ` / ${evidence.length}` : ""}` : "- Safe file:line evidence: 0",
        "This scope is human attention context only. It does not approve changes or grant project-write authority.",
      ]
    : ["Selection scope · no active selection · read-only; select nodes in the panel to describe a bounded scope."];
  return {
    version: 1,
    readOnly: true,
    sessionId: snapshot.id,
    graphRevision: snapshot.graphRevision,
    selectionRevision: selection?.graphRevision ?? null,
    source: selection ? "human" : "none",
    limit: SELECTION_LIMIT,
    selectedCount: nodes.length,
    nodes,
    totalEdges: edges.length,
    edges: returnedEdges,
    totalEvidence: evidence.length,
    evidence: returnedEvidence,
    focus: snapshot.focus ? {
      nodeId: snapshot.focus.nodeId,
      nodeLabel: snapshot.focus.nodeLabel,
      included: nodeIds.has(snapshot.focus.nodeId),
    } : null,
    viewport: snapshot.viewport ?? null,
    copyText: copyLines.join("\n"),
    guidance: [
      "SELECTION_SCOPE_JSON is a bounded, read-only projection of the human's current node selection.",
      "Use selected nodes, internal edges, and safe relative file:line evidence to disambiguate 'these modules' or 'this scope'.",
      "Selection never resolves annotation threads, creates a proposal, issues a receipt, or grants project-write authority.",
      "Paths are filtered to workspace-relative text; absolute paths, traversal, protected directories, and .env-like names are excluded.",
    ],
    safety: {
      readOnly: true,
      grantsWriteAuthority: false,
      excludesApprovalGrants: true,
      excludesAbsolutePaths: true,
      projectWritesRequireHumanApproval: true,
    },
  };
}
