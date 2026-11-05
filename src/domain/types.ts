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
  x?: number;
  y?: number;
  body: string;
  author: Participant;
  createdAt: string;
  resolved?: boolean;
}

export interface VisualGraph {
  version: 1;
  diagramId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  annotations: AnnotationPin[];
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
  messages: ConversationMessage[];
  proposals: ChangeProposal[];
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
