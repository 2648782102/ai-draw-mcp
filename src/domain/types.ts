/**
 * Shared domain types for the collaborative visual workspace.
 *
 * All persisted payloads live here so tools, the preview server and tests can
 * agree on one versioned contract.
 */

export type Participant = "human" | "ai" | "system";
export type MessageStatus = "pending" | "answered" | "applied" | "rejected";
export type ProposalStatus = "draft" | "pending" | "approved" | "applied" | "rejected" | "failed";
export type ProjectChangeKind = "create" | "update" | "delete" | "mkdir";
export type ProjectChangeEncoding = "utf8" | "base64";

export interface DiagramMeta {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  svgPath: string;
  pngPath?: string;
  mermaidCode?: string;
  updatedAt?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  kind: string;
  path?: string;
  group?: string;
  x?: number;
  y?: number;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  kind?: string;
  metadata?: Record<string, unknown>;
}

export interface AnnotationPin {
  id: string;
  nodeId?: string;
  nodeLabel?: string;
  nodePath?: string;
  graphRevision?: number;
  anchorStatus?: "anchored" | "detached" | "outdated";
  x?: number;
  y?: number;
  body: string;
  author: Participant;
  createdAt: string;
  resolved?: boolean;
  replies?: AnnotationReply[];
}

export interface AnnotationReply {
  id: string;
  author: "human" | "ai";
  body: string;
  createdAt: string;
  status?: MessageStatus;
}

export interface VisualGraph {
  version: 1;
  diagramId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  annotations: AnnotationPin[];
}

export interface SessionFocus {
  version: 1;
  nodeId: string;
  nodeLabel: string;
  nodePath?: string;
  group?: string;
  graphRevision: number;
  updatedAt: string;
  source: "human";
}

export interface ConversationMessage {
  id: string;
  sessionId: string;
  author: Participant;
  body: string;
  createdAt: string;
  diagramId?: string;
  graphRevision?: number;
  status?: MessageStatus;
  metadata?: Record<string, unknown>;
}

export interface ProjectChange {
  id: string;
  kind: ProjectChangeKind;
  path: string;
  content?: string;
  encoding?: ProjectChangeEncoding;
  rationale?: string;
}

export interface ChangeProposal {
  id: string;
  sessionId: string;
  diagramId?: string;
  title: string;
  summary: string;
  graphRevision: number;
  status: ProposalStatus;
  createdAt: string;
  changes: ProjectChange[];
  createdBy: Participant;
  approvedAt?: string;
  appliedAt?: string;
  rejectedAt?: string;
  error?: string;
  contentHash?: string;
  metadata?: Record<string, unknown>;
}

export interface SessionSnapshot {
  version: 1;
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  workspaceRoot: string;
  activeDiagramId?: string;
  graphRevision: number;
  graph?: VisualGraph;
  focus?: SessionFocus;
  graphDiffs?: GraphRevisionDiff[];
  graphHistory?: GraphHistoryState;
  messages: ConversationMessage[];
  proposals: ChangeProposal[];
}

export interface ScanPreservationSummary {
  version: 1;
  strategy: "stable-path-merge";
  matchedNodes: number;
  newNodes: number;
  removedNodes: number;
  preservedCoordinates: number;
  humanCoordinates: number;
  preservedLabels: number;
  carriedAnnotations: number;
  detachedAnnotations: number;
  preservedFocus: boolean;
}

export type WorkflowActor = "human" | "ai" | "system";
export type WorkflowWriteTarget = "none" | "session" | "project";

export interface WorkflowStep {
  version: 1;
  order: number;
  id: string;
  actor: WorkflowActor;
  tool?: string;
  panelAction?: string;
  input: string[];
  output: string[];
  requires: string[];
  produces: string[];
  readOnly: boolean;
  writes: WorkflowWriteTarget;
  grantsWriteAuthority: false;
  description: string;
}

export interface AgentWorkflow {
  version: 1;
  sessionId: string;
  graphRevision: number;
  activeDiagramId?: string;
  focus?: { nodeId: string; nodeLabel: string; nodePath?: string };
  graph?: { nodes: number; edges: number; annotations: number; staleAnnotations: number };
  conversation?: { pendingMessages: number; nextActor: string };
  proposals?: { pending: number; approved: number };
  blocked: string[];
  steps: WorkflowStep[];
  safety: string[];
}

export interface GraphRevisionDiff {
  version: 1;
  fromRevision: number;
  toRevision: number;
  createdAt: string;
  source: "human" | "ai" | "system";
  diagramId: string;
  nodes: { added: number; removed: number; updated: number };
  edges: { added: number; removed: number; updated: number };
  items: Array<{
    entity: "node" | "edge";
    change: "added" | "removed" | "updated";
    id: string;
    label?: string;
    fields?: Array<{ field: string; before?: string | number | boolean; after?: string | number | boolean }>;
  }>;
  summary: string[];
}

export interface GraphHistoryEntry {
  version: 1;
  graph: VisualGraph;
  graphRevision: number;
  source: GraphRevisionDiff["source"];
  createdAt: string;
}

export interface GraphHistoryState {
  version: 1;
  past: GraphHistoryEntry[];
  future: GraphHistoryEntry[];
}

export interface GraphHistorySummary {
  version: 1;
  undo: number;
  redo: number;
  limit: number;
}

export interface ProjectScanNode {
  id: string;
  label: string;
  kind: "directory" | "file" | "package" | "test" | "documentation" | "config";
  path: string;
  group?: string;
  metadata?: Record<string, unknown>;
}

export interface ProjectScanEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  kind: "contains" | "imports";
}

export interface ProjectScanResult {
  version: 1;
  workspaceRoot: string;
  generatedAt: string;
  nodes: ProjectScanNode[];
  edges: ProjectScanEdge[];
  stats: {
    directories: number;
    files: number;
    sourceFiles: number;
    testFiles: number;
    configFiles: number;
    ignoredPaths: number;
  };
}
