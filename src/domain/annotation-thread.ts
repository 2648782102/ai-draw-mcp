import type { AnnotationPin, AnnotationReply, GraphNode, MessageStatus, VisualGraph } from "./types.js";

export type ThreadAnchorStatus = "anchored" | "detached" | "outdated";

export interface AnnotationAnchorDiff {
  kind: "none" | "label" | "path" | "kind" | "label+path";
  from: string;
  to: string;
}

export interface AnnotationThread {
  id: string;
  nodeId?: string;
  nodeLabel?: string;
  nodeKind?: string;
  nodePath?: string;
  anchorStatus: ThreadAnchorStatus;
  anchorDiff?: AnnotationAnchorDiff;
  anchorGraphRevision?: number;
  root: AnnotationPin;
  replies: AnnotationReply[];
  resolved: boolean;
  openReplyCount: number;
  nextActor: "ai" | "human" | "none";
  updatedAt: string;
}

export interface AnnotationThreadSummary {
  total: number;
  open: number;
  resolved: number;
  openReplies: number;
  detached: number;
  outdated: number;
  awaitingHuman: number;
  awaitingAi: number;
  threads: AnnotationThread[];
  nextActor: "ai" | "human" | "none";
  guidance: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function parseAnnotationReplies(value: unknown, label: string): AnnotationReply[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value.map((item, index) => {
    if (!isRecord(item)) throw new Error(`${label}[${index}] must be an object`);
    if (typeof item.body !== "string" || !item.body.trim())
      throw new Error(`${label}[${index}].body must be a non-empty string`);
    if (item.author !== "human" && item.author !== "ai")
      throw new Error(`${label}[${index}].author must be human or ai`);
    const status: MessageStatus | undefined = item.status === "pending"
      || item.status === "answered"
      || item.status === "applied"
      || item.status === "rejected"
      ? item.status
      : undefined;
    return {
      id: typeof item.id === "string" && item.id ? item.id : `${label}_${index + 1}`,
      author: item.author,
      body: item.body,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
      status,
    };
  });
}

function newestTimestamp(annotation: AnnotationPin): string {
  return annotation.replies?.at(-1)?.createdAt ?? annotation.createdAt;
}

function nextActorFor(annotation: AnnotationPin, anchorStatus: ThreadAnchorStatus): "ai" | "human" | "none" {
  if (annotation.resolved) return "none";
  if (anchorStatus === "detached" || anchorStatus === "outdated") return "human";
  const latest = annotation.replies?.at(-1);
  if (!latest) return "ai";
  return latest.author === "ai" ? "human" : "ai";
}

const normalize = (value: string | undefined): string | undefined => value?.trim() || undefined;

function anchorDiffFor(annotation: AnnotationPin, node?: GraphNode): AnnotationAnchorDiff | undefined {
  if (!node) return undefined;
  const parts: string[] = [];
  let from = "";
  let to = "";
  if (normalize(annotation.nodeLabel) && normalize(annotation.nodeLabel) !== normalize(node.label)) {
    parts.push("label");
    from += normalize(annotation.nodeLabel);
    to += normalize(node.label);
  }
  if (normalize(annotation.nodePath) && normalize(annotation.nodePath) !== normalize(node.path)) {
    if (parts.length) {
      from += " → ";
      to += " → ";
    }
    parts.push("path");
    from += normalize(annotation.nodePath);
    to += normalize(node.path);
  }
  if (!parts.length) return undefined;
  return { kind: parts.join("+") as AnnotationAnchorDiff["kind"], from, to };
}

function threadFor(annotation: AnnotationPin, nodeLabels: Map<string, GraphNode>): AnnotationThread {
  const node = annotation.nodeId ? nodeLabels.get(annotation.nodeId) : undefined;
  const anchorDiff = anchorDiffFor(annotation, node);
  const anchorStatus: ThreadAnchorStatus = annotation.anchorStatus
    ?? (annotation.nodeId && !node ? "detached" : anchorDiff ? "outdated" : "anchored");
  const replies = annotation.replies ?? [];
  return {
    id: annotation.id,
    nodeId: annotation.nodeId,
    nodeLabel: node?.label ?? annotation.nodeLabel,
    nodeKind: node?.kind,
    nodePath: node?.path ?? annotation.nodePath,
    anchorStatus,
    anchorDiff,
    anchorGraphRevision: annotation.graphRevision,
    root: annotation,
    replies,
    resolved: annotation.resolved === true,
    openReplyCount: annotation.resolved ? 0 : replies.filter((reply) => reply.author === "human").length,
    nextActor: nextActorFor(annotation, anchorStatus),
    updatedAt: newestTimestamp(annotation),
  };
}

export function summarizeAnnotationThreads(graph?: VisualGraph): AnnotationThreadSummary {
  const nodeLabels = new Map((graph?.nodes ?? []).map((node) => [node.id, node]));
  const threads = (graph?.annotations ?? []).map((annotation) => threadFor(annotation, nodeLabels));
  const open = threads.filter((thread) => !thread.resolved);
  const detached = threads.filter((thread) => thread.anchorStatus === "detached").length;
  const outdated = threads.filter((thread) => thread.anchorStatus === "outdated").length;
  const stale = threads.filter((thread) => thread.anchorStatus !== "anchored");
  const awaitingAi = open.filter((thread) => thread.nextActor === "ai").length;
  const awaitingHuman = open.filter((thread) => thread.nextActor === "human").length;
  const nextActor = stale.length > 0
    ? "human"
    : awaitingAi > 0 ? "ai" : awaitingHuman > 0 ? "human" : "none";
  return {
    total: threads.length,
    open: open.length,
    resolved: threads.length - open.length,
    openReplies: open.reduce((total, thread) => total + thread.openReplyCount, 0),
    detached,
    outdated,
    awaitingHuman,
    awaitingAi,
    threads,
    nextActor,
    guidance: stale.length > 0
      ? `${stale.length} annotation thread(s) are detached or outdated because their graph anchor changed. Ask the human to confirm, re-anchor, resolve, or reopen the thread before treating it as current intent; do not create a proposal from stale thread text alone.`
      : nextActor === "ai"
        ? "Reply to node-linked annotation threads with reply_to_visual_context, then create a proposal if the human asks for a project change."
        : nextActor === "human"
          ? "The latest replies are from AI; wait for the human to respond in the panel before creating or applying a proposal."
          : "All annotation threads are resolved; use pendingMessages and intentByNode for any remaining intent.",
  };
}
