import type {
  AnnotationPin,
  ChangeProposal,
  ConversationMessage,
  GraphEdge,
  GraphNode,
  SessionSnapshot,
  VisualGraph,
} from "./types.js";

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
      x: typeof item.x === "number" ? item.x : undefined,
      y: typeof item.y === "number" ? item.y : undefined,
      body: assertString(item.body, `session.graph.annotations[${index}].body`),
      author: item.author === "ai" || item.author === "system" ? item.author : "human",
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
      resolved: item.resolved === true,
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
      graph: snapshot.graph,
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
      messages: parseMessages(input.session.messages),
      proposals: parseProposals(input.session.proposals),
    },
  };
}
