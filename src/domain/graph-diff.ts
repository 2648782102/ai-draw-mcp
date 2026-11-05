import type { GraphEdge, GraphNode, GraphRevisionDiff, VisualGraph } from "./types.js";

type GraphDiffEntity = "node" | "edge";
type GraphDiffChange = "added" | "removed" | "updated";

interface GraphFieldChange {
  field: string;
  before?: string | number | boolean;
  after?: string | number | boolean;
}

export interface GraphDiffItem {
  entity: GraphDiffEntity;
  change: GraphDiffChange;
  id: string;
  label?: string;
  fields?: GraphFieldChange[];
}

const OPTIONAL_FIELDS = ["path", "group", "kind", "label"] as const;

function comparable(field: string, value: unknown): string | number | boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

function fieldChanges<T extends object>(before: T | undefined, after: T | undefined, fields: readonly string[]): GraphFieldChange[] {
  const changes: GraphFieldChange[] = [];
  for (const field of fields) {
    const oldValue = comparable(field, (before as Record<string, unknown> | undefined)?.[field]);
    const newValue = comparable(field, (after as Record<string, unknown> | undefined)?.[field]);
    if (oldValue !== newValue) changes.push({ field, before: oldValue, after: newValue });
  }
  return changes;
}

function nodeLabel(node: GraphNode): string {
  return node.label || node.id;
}

function edgeLabel(edge: GraphEdge, labels: Map<string, string>): string {
  return `${labels.get(edge.from) ?? edge.from} → ${labels.get(edge.to) ?? edge.to}${edge.label ? ` (${edge.label})` : ""}`;
}

export function diffVisualGraph(
  before: VisualGraph | undefined,
  after: VisualGraph,
  options: { fromRevision: number; toRevision: number; createdAt: string; source: GraphRevisionDiff["source"] },
): GraphRevisionDiff {
  const beforeNodes = new Map((before?.nodes ?? []).map((node) => [node.id, node]));
  const afterNodes = new Map(after.nodes.map((node) => [node.id, node]));
  const beforeEdges = new Map((before?.edges ?? []).map((edge) => [edge.id, edge]));
  const afterEdges = new Map(after.edges.map((edge) => [edge.id, edge]));
  const labels = new Map(after.nodes.map((node) => [node.id, node.label]));
  const items: GraphDiffItem[] = [];
  const counts = {
    nodes: { added: 0, removed: 0, updated: 0 },
    edges: { added: 0, removed: 0, updated: 0 },
  };

  for (const [id, node] of afterNodes) {
    const previous = beforeNodes.get(id);
    if (!previous) {
      items.push({ entity: "node", change: "added", id, label: nodeLabel(node) });
      counts.nodes.added += 1;
      continue;
    }
    const changes = fieldChanges(previous, node, ["label", "kind", ...OPTIONAL_FIELDS]);
    if (changes.length > 0) {
      items.push({ entity: "node", change: "updated", id, label: nodeLabel(node), fields: changes });
      counts.nodes.updated += 1;
    }
  }
  for (const [id, node] of beforeNodes) {
    if (!afterNodes.has(id)) {
      items.push({ entity: "node", change: "removed", id, label: nodeLabel(node) });
      counts.nodes.removed += 1;
    }
  }
  for (const [id, edge] of afterEdges) {
    const previous = beforeEdges.get(id);
    if (!previous) {
      items.push({ entity: "edge", change: "added", id, label: edgeLabel(edge, labels) });
      counts.edges.added += 1;
      continue;
    }
    const changes = fieldChanges(previous, edge, ["from", "to", "label", "kind"]);
    if (changes.length > 0) {
      items.push({ entity: "edge", change: "updated", id, label: edgeLabel(edge, labels), fields: changes });
      counts.edges.updated += 1;
    }
  }
  for (const [id, edge] of beforeEdges) {
    if (!afterEdges.has(id)) {
      items.push({ entity: "edge", change: "removed", id, label: edgeLabel(edge, labels) });
      counts.edges.removed += 1;
    }
  }

  const summary = [
    `${counts.nodes.added} nodes added, ${counts.nodes.removed} removed, ${counts.nodes.updated} updated`,
    `${counts.edges.added} edges added, ${counts.edges.removed} removed, ${counts.edges.updated} updated`,
  ];
  return {
    version: 1,
    fromRevision: options.fromRevision,
    toRevision: options.toRevision,
    createdAt: options.createdAt,
    source: options.source,
    diagramId: after.diagramId,
    nodes: counts.nodes,
    edges: counts.edges,
    items,
    summary,
  };
}
