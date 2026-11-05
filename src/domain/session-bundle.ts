import type {
  AnnotationPin,
  AnnotationReply,
  ChangeProposal,
  ConversationMessage,
  GraphEdge,
  GraphNode,
  GraphRevisionDiff,
  SessionSnapshot,
  VisualGraph,
} from "./types.js";
import { parseAnnotationReplies } from "./annotation-thread.js";

export interface SessionBundle {
  kind: "ai-draw-session-bundle";
  version: 1;
  exportedAt: string;
  session: {
    id: string;
    title: string;
    createdAt: string;
    graphRevision: number;
    activeDiagramId?: string;
    workspaceRoot: string;
    graph?: VisualGraph;
    graphDiffs?: GraphRevisionDiff[];
    messages: ConversationMessage[];
    proposals: ChangeProposal[];
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function assertString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string`);
  return value;
}

function assertFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} must be a finite number`);
  return value;
}

function assertIsoTimestamp(value: unknown, label: string): string {
  const text = assertString(value, label);
  if (!Number.isFinite(Date.parse(text))) throw new Error(`${label} must be a valid timestamp`);
  return text;
}

function assertGraphDiffCounts(value: unknown, label: string): { added: number; removed: number; updated: number } {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  return {
    added: assertFiniteNumber(value.added, `${label}.added`),
    removed: assertFiniteNumber(value.removed, `${label}.removed`),
    updated: assertFiniteNumber(value.updated, `${label}.updated`),
  };
}

function assertGraphDiffFieldValue(value: unknown, label: string): string | number | boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error(`${label} must be finite`);
    return value;
  }
  throw new Error(`${label} must be a string, finite number, boolean, or undefined`);
}

function parseGraphDiffItems(value: unknown, label: string): GraphRevisionDiff["items"] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.map((entry, index) => {
    const itemLabel = `${label}[${index}]`;
    if (!isRecord(entry)) throw new Error(`${itemLabel} must be an object`);
    if (entry.entity !== "node" && entry.entity !== "edge") throw new Error(`${itemLabel}.entity is invalid`);
    if (entry.change !== "added" && entry.change !== "removed" && entry.change !== "updated") {
      throw new Error(`${itemLabel}.change is invalid`);
    }
    const parsed: GraphRevisionDiff["items"][number] = {
      entity: entry.entity,
      change: entry.change,
      id: assertString(entry.id, `${itemLabel}.id`),
    };
    if (typeof entry.label === "string") parsed.label = entry.label;
    else if (entry.label !== undefined) throw new Error(`${itemLabel}.label must be a string`);
    if (entry.fields !== undefined && !Array.isArray(entry.fields)) {
      throw new Error(`${itemLabel}.fields must be an array`);
    }
    if (entry.fields !== undefined) {
      parsed.fields = entry.fields.map((field, fieldIndex) => {
        const fieldLabel = `${itemLabel}.fields[${fieldIndex}]`;
        if (!isRecord(field)) throw new Error(`${fieldLabel} must be an object`);
        for (const key of Object.keys(field)) {
          if (!["field", "before", "after"].includes(key)) throw new Error(`${fieldLabel} has unknown property ${key}`);
        }
        return {
          field: assertString(field.field, `${fieldLabel}.field`),
          before: assertGraphDiffFieldValue(field.before, `${fieldLabel}.before`),
          after: assertGraphDiffFieldValue(field.after, `${fieldLabel}.after`),
        };
      });
    }
    for (const key of Object.keys(entry)) {
      if (!["entity", "change", "id", "label", "fields"].includes(key)) {
        throw new Error(`${itemLabel} has unknown property ${key}`);
      }
    }
    return parsed;
  });
}

function parseNodes(value: unknown): GraphNode[] {
  if (!Array.isArray(value)) throw new Error("session.graph.nodes must be an array");
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`session.graph.nodes[${index}] must be an object`);
    return {
      id: assertString(item.id, `session.graph.nodes[${index}].id`),
      label: assertString(item.label, `session.graph.nodes[${index}].label`),
      kind: assertString(item.kind, `session.graph.nodes[${index}].kind`),
      path: typeof item.path === "string" ? item.path : undefined,
      group: typeof item.group === "string" ? item.group : undefined,
      x: typeof item.x === "number" ? item.x : undefined,
      y: typeof item.y === "number" ? item.y : undefined,
      metadata: isRecord(item.metadata) ? item.metadata : undefined,
    };
  });
}

function parseEdges(value: unknown): GraphEdge[] {
  if (!Array.isArray(value)) throw new Error("session.graph.edges must be an array");
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`session.graph.edges[${index}] must be an object`);
    return {
      id: assertString(item.id, `session.graph.edges[${index}].id`),
      from: assertString(item.from, `session.graph.edges[${index}].from`),
      to: assertString(item.to, `session.graph.edges[${index}].to`),
      label: typeof item.label === "string" ? item.label : undefined,
      kind: typeof item.kind === "string" ? item.kind : undefined,
      metadata: isRecord(item.metadata) ? item.metadata : undefined,
    };
  });
}

function parseAnnotations(value: unknown): AnnotationPin[] {
  if (!Array.isArray(value)) throw new Error("session.graph.annotations must be an array");
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`session.graph.annotations[${index}] must be an object`);
    return {
      id: assertString(item.id, `session.graph.annotations[${index}].id`),
      nodeId: typeof item.nodeId === "string" ? item.nodeId : undefined,
      nodeLabel: typeof item.nodeLabel === "string" ? item.nodeLabel : undefined,
      nodePath: typeof item.nodePath === "string" ? item.nodePath : undefined,
      graphRevision: typeof item.graphRevision === "number" ? item.graphRevision : undefined,
      anchorStatus: item.anchorStatus === "anchored" || item.anchorStatus === "detached" || item.anchorStatus === "outdated"
        ? item.anchorStatus : undefined,
      x: typeof item.x === "number" ? item.x : undefined,
      y: typeof item.y === "number" ? item.y : undefined,
      body: assertString(item.body, `session.graph.annotations[${index}].body`),
      author: item.author === "ai" || item.author === "system" ? item.author : "human",
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
      resolved: item.resolved === true,
      replies: parseAnnotationReplies(item.replies, `session.graph.annotations[${index}].replies`),
    };
  });
}

function serializeReplies(replies: AnnotationReply[] | undefined): AnnotationReply[] | undefined {
  return replies?.map((reply) => ({
    id: reply.id,
    author: reply.author,
    body: reply.body,
    createdAt: reply.createdAt,
    status: reply.status,
  }));
}

function parseGraphDiffs(value: unknown): GraphRevisionDiff[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("session.graphDiffs must be an array");
  return value.map((item, index) => {
    const label = `session.graphDiffs[${index}]`;
    if (!isRecord(item)) throw new Error(`${label} must be an object`);
    if (item.version !== 1) throw new Error(`${label} has unsupported version`);
    if (item.source !== "human" && item.source !== "ai" && item.source !== "system") {
      throw new Error(`${label}.source is invalid`);
    }
    if (!Array.isArray(item.summary) || item.summary.some((line) => typeof line !== "string")) {
      throw new Error(`${label}.summary must be an array of strings`);
    }
    for (const key of Object.keys(item)) {
      if (!["version", "fromRevision", "toRevision", "createdAt", "source", "diagramId", "nodes", "edges", "items", "summary"].includes(key)) {
        throw new Error(`${label} has unknown property ${key}`);
      }
    }
    return {
      version: 1,
      fromRevision: assertFiniteNumber(item.fromRevision, `${label}.fromRevision`),
      toRevision: assertFiniteNumber(item.toRevision, `${label}.toRevision`),
      createdAt: assertIsoTimestamp(item.createdAt, `${label}.createdAt`),
      source: item.source,
      diagramId: assertString(item.diagramId, `${label}.diagramId`),
      nodes: assertGraphDiffCounts(item.nodes, `${label}.nodes`),
      edges: assertGraphDiffCounts(item.edges, `${label}.edges`),
      items: parseGraphDiffItems(item.items, `${label}.items`),
      summary: item.summary as string[],
    };
  });
}

function parseMessages(value: unknown): ConversationMessage[] {
  if (!Array.isArray(value)) throw new Error("session.messages must be an array");
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`session.messages[${index}] must be an object`);
    const status = item.status === "answered" || item.status === "applied" || item.status === "rejected"
      ? item.status : "pending";
    return {
      id: assertString(item.id, `session.messages[${index}].id`),
      sessionId: assertString(item.sessionId, `session.messages[${index}].sessionId`),
      author: item.author === "ai" || item.author === "system" ? item.author : "human",
      body: assertString(item.body, `session.messages[${index}].body`),
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
      diagramId: typeof item.diagramId === "string" ? item.diagramId : undefined,
      graphRevision: typeof item.graphRevision === "number" ? item.graphRevision : undefined,
      status,
      metadata: isRecord(item.metadata) ? item.metadata : undefined,
    };
  });
}

function parseProposals(value: unknown): ChangeProposal[] {
  if (!Array.isArray(value)) throw new Error("session.proposals must be an array");
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`session.proposals[${index}] must be an object`);
    const status = ["draft", "pending", "approved", "applied", "rejected", "failed"].includes(String(item.status))
      ? item.status as ChangeProposal["status"] : "draft";
    return {
      id: assertString(item.id, `session.proposals[${index}].id`),
      sessionId: assertString(item.sessionId, `session.proposals[${index}].sessionId`),
      diagramId: typeof item.diagramId === "string" ? item.diagramId : undefined,
      title: assertString(item.title, `session.proposals[${index}].title`),
      summary: typeof item.summary === "string" ? item.summary : "",
      graphRevision: typeof item.graphRevision === "number" ? item.graphRevision : 0,
      status,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
      changes: Array.isArray(item.changes) ? item.changes as ChangeProposal["changes"] : [],
      createdBy: item.createdBy === "ai" || item.createdBy === "system" ? item.createdBy : "human",
      approvedAt: typeof item.approvedAt === "string" ? item.approvedAt : undefined,
      appliedAt: typeof item.appliedAt === "string" ? item.appliedAt : undefined,
      rejectedAt: typeof item.rejectedAt === "string" ? item.rejectedAt : undefined,
      error: typeof item.error === "string" ? item.error : undefined,
      contentHash: typeof item.contentHash === "string" ? item.contentHash : undefined,
      metadata: isRecord(item.metadata) ? item.metadata : undefined,
    };
  });
}

export function createSessionBundle(snapshot: SessionSnapshot, exportedAt = new Date().toISOString()): SessionBundle {
  const proposals = snapshot.proposals.map((proposal) => ({
    ...proposal,
    status: proposal.status === "approved" ? "pending" : proposal.status,
    approvedAt: undefined,
    appliedAt: undefined,
    metadata: { ...(proposal.metadata ?? {}), importedApprovalStateCleared: proposal.status === "approved" },
  }));
  return {
    kind: "ai-draw-session-bundle",
    version: 1,
    exportedAt,
    session: {
      id: snapshot.id,
      title: snapshot.title,
      createdAt: snapshot.createdAt,
      graphRevision: snapshot.graphRevision,
      activeDiagramId: snapshot.activeDiagramId,
      workspaceRoot: snapshot.workspaceRoot,
      graph: snapshot.graph ? {
        ...snapshot.graph,
        annotations: snapshot.graph.annotations.map((annotation) => ({
          ...annotation,
          replies: serializeReplies(annotation.replies),
        })),
      } : undefined,
      graphDiffs: snapshot.graphDiffs?.map((diff) => JSON.parse(JSON.stringify(diff)) as GraphRevisionDiff),
      messages: snapshot.messages,
      proposals,
    },
  };
}

export function parseSessionBundle(input: unknown): SessionBundle {
  if (!isRecord(input) || input.kind !== "ai-draw-session-bundle" || input.version !== 1)
    throw new Error("Not a version 1 ai-draw session bundle");
  if (!isRecord(input.session)) throw new Error("session must be an object");
  const rawGraph = input.session.graph;
  let graph: VisualGraph | undefined;
  if (rawGraph !== undefined) {
    if (!isRecord(rawGraph)) throw new Error("session.graph must be an object");
    graph = {
      version: 1,
      diagramId: assertString(rawGraph.diagramId, "session.graph.diagramId"),
      nodes: parseNodes(rawGraph.nodes),
      edges: parseEdges(rawGraph.edges),
      annotations: parseAnnotations(rawGraph.annotations),
    };
  }
  return {
    kind: "ai-draw-session-bundle",
    version: 1,
    exportedAt: typeof input.exportedAt === "string" ? input.exportedAt : new Date().toISOString(),
    session: {
      id: assertString(input.session.id, "session.id"),
      title: assertString(input.session.title, "session.title"),
      createdAt: typeof input.session.createdAt === "string" ? input.session.createdAt : new Date().toISOString(),
      graphRevision: typeof input.session.graphRevision === "number" ? input.session.graphRevision : 0,
      activeDiagramId: typeof input.session.activeDiagramId === "string" ? input.session.activeDiagramId : undefined,
      workspaceRoot: assertString(input.session.workspaceRoot, "session.workspaceRoot"),
      graph,
      graphDiffs: parseGraphDiffs(input.session.graphDiffs),
      messages: parseMessages(input.session.messages),
      proposals: parseProposals(input.session.proposals),
    },
  };
}
