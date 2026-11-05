import { summarizeAnnotationThreads } from "./annotation-thread.js";
import type { ChangeProposal, SessionSnapshot } from "./types.js";

export type ActivityKind =
  | "session_created"
  | "message"
  | "annotation_created"
  | "annotation_replied"
  | "annotation_status"
  | "annotation_anchor"
  | "graph_diff"
  | "proposal_created"
  | "proposal_status";

export interface ActivityTimelineItem {
  id: string;
  kind: ActivityKind;
  actor: "human" | "ai" | "system";
  body: string;
  createdAt: string;
  graphRevision?: number;
  nodeId?: string;
  nodeLabel?: string;
  annotationId?: string;
  proposalId?: string;
  proposalStatus?: ChangeProposal["status"];
  status?: string;
  anchorStatus?: "anchored" | "detached" | "outdated";
  derived?: boolean;
}

export interface ActivityTimelineSummary {
  version: 1;
  total: number;
  returned: number;
  kinds: Record<ActivityKind, number>;
  latestAt?: string;
  nextActor: "ai" | "human" | "none";
  guidance: string;
  items: ActivityTimelineItem[];
}

const isStatusTimestamp = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

function statusEvents(proposal: ChangeProposal): Array<{ status: ChangeProposal["status"]; at: string }> {
  const candidates: Array<[ChangeProposal["status"], unknown]> = [
    ["approved", proposal.approvedAt],
    ["applied", proposal.appliedAt],
    ["rejected", proposal.rejectedAt],
  ];
  return candidates
    .filter(([, at]) => isStatusTimestamp(at))
    .map(([status, at]) => ({ status, at: at as string }));
}

export function buildActivityTimeline(
  snapshot: SessionSnapshot,
  limit = 60,
): ActivityTimelineSummary {
  const boundedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, Math.floor(limit))) : 60;
  const nodeLabels = new Map((snapshot.graph?.nodes ?? []).map((node) => [node.id, node.label]));
  const items: ActivityTimelineItem[] = [{
    id: `activity:session:${snapshot.id}`,
    kind: "session_created",
    actor: "system",
    body: `协作会话创建：${snapshot.title}`,
    createdAt: snapshot.createdAt,
    graphRevision: 0,
    derived: true,
  }];

  for (const message of snapshot.messages) {
    items.push({
      id: `activity:message:${message.id}`,
      kind: "message",
      actor: message.author,
      body: message.body,
      createdAt: message.createdAt,
      graphRevision: message.graphRevision,
      status: message.status,
      derived: message.metadata?.event === "ai_reply" ? false : true,
    });
  }

  for (const annotation of snapshot.graph?.annotations ?? []) {
    items.push({
      id: `activity:annotation:${annotation.id}`,
      kind: "annotation_created",
      actor: annotation.author === "ai" ? "ai" : "human",
      body: annotation.body,
      createdAt: annotation.createdAt,
      nodeId: annotation.nodeId,
      nodeLabel: annotation.nodeId ? nodeLabels.get(annotation.nodeId) : undefined,
      annotationId: annotation.id,
      status: annotation.resolved ? "resolved" : "open",
      derived: true,
    });
    for (const reply of annotation.replies ?? []) {
      items.push({
        id: `activity:annotation-reply:${reply.id}`,
        kind: "annotation_replied",
        actor: reply.author,
        body: reply.body,
        createdAt: reply.createdAt,
        nodeId: annotation.nodeId,
        nodeLabel: annotation.nodeId ? nodeLabels.get(annotation.nodeId) : undefined,
        annotationId: annotation.id,
        status: reply.status,
        derived: true,
      });
    }
    if (annotation.resolved) {
      items.push({
        id: `activity:annotation-status:${annotation.id}`,
        kind: "annotation_status",
        actor: "system",
        body: `节点批注线程已解决：${annotation.body.slice(0, 80)}`,
        createdAt: annotation.replies?.at(-1)?.createdAt ?? annotation.createdAt,
        nodeId: annotation.nodeId,
        nodeLabel: annotation.nodeId ? nodeLabels.get(annotation.nodeId) : undefined,
        annotationId: annotation.id,
        status: "resolved",
        derived: true,
      });
    }
    if (annotation.anchorStatus === "detached" || annotation.anchorStatus === "outdated") {
      items.push({
        id: `activity:annotation-anchor:${annotation.id}`,
        kind: "annotation_anchor",
        actor: "system",
        body: annotation.anchorStatus === "detached"
          ? `节点批注线程已失锚：原节点不再存在，请人类确认或重锚。${annotation.body.slice(0, 80)}`
          : `节点批注线程已过期：节点标签或路径已变化，请人类确认。${annotation.body.slice(0, 80)}`,
        createdAt: annotation.replies?.at(-1)?.createdAt ?? annotation.createdAt,
        nodeId: annotation.nodeId,
        nodeLabel: annotation.nodeLabel ?? (annotation.nodeId ? nodeLabels.get(annotation.nodeId) : undefined),
        annotationId: annotation.id,
        anchorStatus: annotation.anchorStatus,
        status: annotation.anchorStatus,
        derived: true,
      });
    }
  }

  for (const proposal of snapshot.proposals) {
    items.push({
      id: `activity:proposal:${proposal.id}`,
      kind: "proposal_created",
      actor: proposal.createdBy,
      body: `创建提案「${proposal.title}」：${proposal.summary}`,
      createdAt: proposal.createdAt,
      graphRevision: proposal.graphRevision,
      proposalId: proposal.id,
      proposalStatus: "pending",
      derived: true,
    });
    for (const status of statusEvents(proposal)) {
      items.push({
        id: `activity:proposal-status:${proposal.id}:${status.status}`,
        kind: "proposal_status",
        actor: "system",
        body: `提案「${proposal.title}」状态：${status.status}`,
        createdAt: status.at,
        graphRevision: proposal.graphRevision,
        proposalId: proposal.id,
        proposalStatus: status.status,
        derived: true,
      });
    }
    if (proposal.status === "failed" && proposal.error && !proposal.rejectedAt) {
      items.push({
        id: `activity:proposal-status:${proposal.id}:failed`,
        kind: "proposal_status",
        actor: "system",
        body: `提案「${proposal.title}」应用失败并回滚：${proposal.error}`,
        createdAt: proposal.appliedAt ?? proposal.createdAt,
        graphRevision: proposal.graphRevision,
        proposalId: proposal.id,
        proposalStatus: "failed",
        derived: true,
      });
    }
  }

  for (const diff of snapshot.graphDiffs ?? []) {
    items.push({
      id: `activity:graph-diff:${diff.diagramId}:${diff.toRevision}`,
      kind: "graph_diff",
      actor: diff.source === "ai" ? "ai" : diff.source === "system" ? "system" : "human",
      body: `图形修订 rev ${diff.fromRevision} → ${diff.toRevision}：${diff.summary.join("；")}`,
      createdAt: diff.createdAt,
      graphRevision: diff.toRevision,
      derived: true,
    });
  }

  items.sort((left, right) => {
    const byTime = left.createdAt.localeCompare(right.createdAt);
    return byTime || left.id.localeCompare(right.id);
  });
  const kinds = items.reduce<Record<ActivityKind, number>>((counts, item) => {
    counts[item.kind] += 1;
    return counts;
  }, {
    session_created: 0,
    message: 0,
    annotation_created: 0,
    annotation_replied: 0,
    annotation_status: 0,
    annotation_anchor: 0,
    proposal_created: 0,
    proposal_status: 0,
    graph_diff: 0,
  });
  const annotationThreads = summarizeAnnotationThreads(snapshot.graph);
  const staleThreads = annotationThreads.detached + annotationThreads.outdated;
  const guidance = staleThreads > 0
    ? "Some annotation threads are detached or outdated; ask the human to re-anchor or confirm them before using their text as current intent."
    : annotationThreads.nextActor === "ai"
      ? "AI should read open annotation threads first, then reply or create a proposal for the human to approve."
      : annotationThreads.nextActor === "human"
        ? "The latest annotation replies are from AI; wait for the human before creating or applying a proposal."
        : "No annotation thread is awaiting AI; use latest activity and pending messages for remaining intent.";
  return {
    version: 1,
    total: items.length,
    returned: Math.min(items.length, boundedLimit),
    kinds,
    latestAt: items.at(-1)?.createdAt,
    nextActor: annotationThreads.nextActor,
    guidance,
    items: items.slice(-boundedLimit),
  };
}
