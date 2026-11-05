import { summarizeAnnotationThreads, type AnnotationThread } from "./annotation-thread.js";
import type {
  GraphEdge,
  GraphNode,
  GraphSourceEvidence,
  SessionFocus,
  SessionSnapshot,
} from "./types.js";

export interface NodeContext {
  version: 1;
  sessionId: string;
  graphRevision: number;
  nodeId: string;
  node: {
    id: string;
    label: string;
    kind: string;
    path?: string;
    group?: string;
    x?: number;
    y?: number;
    metadata?: Record<string, unknown>;
    sourceEvidence: GraphSourceEvidence[];
  };
  focus: { active: boolean; stale: boolean; source: "human" | "none"; focus?: SessionFocus };
  annotationThreads: AnnotationThread[];
  staleThreadCount: number;
  edges: Array<{
    direction: "incoming" | "outgoing";
    id: string;
    from: string;
    to: string;
    label?: string;
    kind?: string;
    otherNodeId: string;
    otherNodeLabel: string;
    otherNodePath?: string;
  }>;
  graphDiffs: SessionSnapshot["graphDiffs"];
  relatedNodeLabels: Record<string, string>;
  safety: {
    readOnly: true;
    grantsWriteAuthority: false;
    staleThreadsExcludedFromIntent: true;
  };
  guidance: string[];
}

function projectNode(node: GraphNode): NodeContext["node"] {
  return {
    id: node.id,
    label: node.label,
    kind: node.kind,
    path: node.path,
    group: node.group,
    x: node.x,
    y: node.y,
    metadata: node.metadata,
    sourceEvidence: node.sourceEvidence ?? [],
  };
}

function edgeContext(
  direction: "incoming" | "outgoing",
  edge: GraphEdge,
  nodes: Map<string, GraphNode>,
): NodeContext["edges"][number] {
  const otherNodeId = direction === "incoming" ? edge.from : edge.to;
  const otherNode = nodes.get(otherNodeId);
  return {
    direction,
    id: edge.id,
    from: edge.from,
    to: edge.to,
    label: edge.label,
    kind: edge.kind,
    otherNodeId,
    otherNodeLabel: otherNode?.label ?? otherNodeId,
    otherNodePath: otherNode?.path,
  };
}

export function buildNodeContext(
  snapshot: SessionSnapshot,
  requestedNodeId?: string,
  diffLimit = 5,
): NodeContext {
  const graph = snapshot.graph;
  if (!graph) throw new Error("No VisualGraph is available; run scan_project first.");
  const nodeId = requestedNodeId?.trim() || snapshot.focus?.nodeId;
  if (!nodeId) throw new Error("Provide node_id or select a node in the panel to set human focus.");
  const node = graph.nodes.find((item) => item.id === nodeId);
  if (!node) throw new Error(`Unknown graph node: ${nodeId}`);
  const nodes = new Map(graph.nodes.map((item) => [item.id, item]));
  const threads = summarizeAnnotationThreads(graph);
  const annotationThreads = threads.threads.filter((thread) => thread.nodeId === nodeId);
  const staleThreadCount = annotationThreads.filter((thread) => thread.anchorStatus !== "anchored").length;
  const safeLimit = Number.isFinite(diffLimit) ? Math.max(1, Math.min(20, Math.floor(diffLimit))) : 5;
  const graphDiffs = (snapshot.graphDiffs ?? []).slice(-safeLimit)
    .map((diff) => ({
      ...diff,
      items: diff.items.filter((item) => item.id === nodeId
        || (item.entity === "edge" && graph.edges.some((edge) => edge.id === item.id
          && (edge.from === nodeId || edge.to === nodeId)))),
    }))
    .filter((diff) => diff.items.length > 0);
  const edgeIds = new Set(graph.edges
    .filter((edge) => edge.from === nodeId || edge.to === nodeId)
    .flatMap((edge) => [edge.from, edge.to]));
  const relatedNodeLabels: Record<string, string> = {};
  for (const relatedId of edgeIds) {
    const related = nodes.get(relatedId);
    if (related && related.id !== nodeId) relatedNodeLabels[related.id] = related.label;
  }
  const focusActive = snapshot.focus?.nodeId === nodeId;
  return {
    version: 1,
    sessionId: snapshot.id,
    graphRevision: snapshot.graphRevision,
    nodeId,
    node: projectNode(node),
    focus: {
      active: focusActive,
      stale: Boolean(snapshot.focus && !focusActive),
      source: snapshot.focus ? "human" : "none",
      focus: snapshot.focus,
    },
    annotationThreads,
    staleThreadCount,
    edges: graph.edges.flatMap((edge) => {
      if (edge.from !== nodeId && edge.to !== nodeId) return [];
      return [edgeContext(edge.from === nodeId ? "outgoing" : "incoming", edge, nodes)];
    }),
    graphDiffs,
    relatedNodeLabels,
    safety: {
      readOnly: true,
      grantsWriteAuthority: false,
      staleThreadsExcludedFromIntent: true,
    },
    guidance: [
      "This context is a read-only projection of the current session; it does not approve a change or grant project-write authority.",
      "Use sourceEvidence to cite file:line definitions/imports/headings, then pass candidate changes through preflight and human review.",
      "Treat detached/outdated annotation threads as historical context only; wait for human re-anchoring before using them as current intent.",
      "Focus identifies what the human selected, but never replaces a one-time approval receipt.",
    ],
  };
}
