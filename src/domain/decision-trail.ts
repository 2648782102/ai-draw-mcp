import { buildActivityTimeline, type ActivityTimelineItem } from "./activity-timeline.js";
import { summarizeAnnotationThreads } from "./annotation-thread.js";
import { unifiedDiff } from "./diff.js";
import type { DecisionTrail, DecisionTrailEvent, SessionSnapshot } from "./types.js";

type ProposalStage = "created" | "approved" | "rejected" | "applied" | "failed";

function boundedLimit(value: number, fallback: number, max: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.min(max, Math.floor(value))) : fallback;
}

function clip(value: string, max = 240): string {
  const clean = value.trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function event(
  item: Omit<DecisionTrailEvent, "version" | "order">,
  order: number,
): DecisionTrailEvent {
  return { version: 1, order, ...item };
}

function activityEvent(item: ActivityTimelineItem, order: number): DecisionTrailEvent {
  const category = item.kind === "graph_diff" ? "graph" : "intent";
  return event({
    id: `decision:${item.id}`,
    category,
    kind: item.kind,
    actor: item.actor,
    createdAt: item.createdAt,
    nodeId: item.nodeId,
    nodeLabel: item.nodeLabel,
    proposalId: item.proposalId,
    graphRevision: item.graphRevision,
    body: clip(item.body),
    evidence: item.proposalId ? "proposal_status" : item.kind === "graph_diff" ? "graph_diff" : "session_record",
    derived: true,
  }, order);
}

export function buildDecisionTrail(
  snapshot: SessionSnapshot,
  options: { eventLimit?: number; proposalLimit?: number; graphDiffLimit?: number; lineLimit?: number } = {},
): DecisionTrail {
  const eventLimit = boundedLimit(options.eventLimit ?? 60, 60, 120);
  const proposalLimit = boundedLimit(options.proposalLimit ?? 6, 6, 20);
  const graphDiffLimit = boundedLimit(options.graphDiffLimit ?? 4, 4, 20);
  const lineLimit = boundedLimit(options.lineLimit ?? 12, 12, 40);
  const threads = summarizeAnnotationThreads(snapshot.graph);
  const staleThreads = threads.threads.filter((thread) => thread.anchorStatus !== "anchored" && !thread.resolved);
  const activeThreads = threads.threads.filter((thread) => thread.anchorStatus === "anchored" && !thread.resolved);
  const pendingMessages = snapshot.messages.filter((message) =>
    message.author === "human" && message.status === "pending");
  const nodeLabels = new Map((snapshot.graph?.nodes ?? []).map((node) => [node.id, node.label]));
  const citedNodeIds = new Set([
    ...activeThreads.flatMap((thread) => thread.nodeId ? [thread.nodeId] : []),
    ...(snapshot.focus ? [snapshot.focus.nodeId] : []),
  ]);
  const graphDiffs = (snapshot.graphDiffs ?? []).slice(-graphDiffLimit);
  const proposals = snapshot.proposals.slice(-proposalLimit);
  const events: DecisionTrailEvent[] = [];
  let order = 0;

  events.push(event({
    id: `decision:activity:session:${snapshot.id}`,
    category: "system",
    kind: "session_created",
    actor: "system",
    createdAt: snapshot.createdAt,
    body: `协作会话创建：${clip(snapshot.title)}`,
    evidence: "session_record",
    derived: true,
  }, order++));

  for (const message of pendingMessages) {
    events.push(event({
      id: `decision:activity:message:${message.id}`,
      category: "intent",
      kind: "pending_message",
      actor: "human",
      createdAt: message.createdAt,
      graphRevision: message.graphRevision,
      body: clip(message.body),
      evidence: "session_record",
    }, order++));
  }
  for (const thread of activeThreads) {
    events.push(event({
      id: `decision:activity:annotation:${thread.id}`,
      category: "intent",
      kind: "annotation_thread",
      actor: thread.root.author,
      createdAt: thread.root.createdAt,
      nodeId: thread.nodeId,
      nodeLabel: thread.nodeLabel,
      graphRevision: thread.anchorGraphRevision,
      body: clip(thread.root.body),
      evidence: "anchored_annotation",
    }, order++));
    for (const reply of thread.replies) {
      events.push(event({
        id: `decision:activity:annotation-reply:${reply.id}`,
        category: "intent",
        kind: "annotation_reply",
        actor: reply.author,
        createdAt: reply.createdAt,
        nodeId: thread.nodeId,
        nodeLabel: thread.nodeLabel,
        body: clip(reply.body),
        evidence: "anchored_annotation",
      }, order++));
    }
  }
  for (const thread of staleThreads) {
    events.push(event({
      id: `decision:activity:annotation-anchor:${thread.id}`,
      category: "intent",
      kind: "stale_annotation",
      actor: "system",
      createdAt: thread.updatedAt,
      nodeId: thread.nodeId,
      nodeLabel: thread.nodeLabel,
      graphRevision: thread.anchorGraphRevision,
      body: `${thread.anchorStatus} 讨论仅供审计：${clip(thread.root.body)}`,
      evidence: "stale_annotation",
      derived: true,
    }, order++));
  }
  for (const diff of graphDiffs) {
    events.push(event({
      id: `decision:activity:graph-diff:${diff.diagramId}:${diff.toRevision}`,
      category: "graph",
      kind: "graph_diff",
      actor: diff.source,
      createdAt: diff.createdAt,
      graphRevision: diff.toRevision,
      body: clip(`图形修订 rev ${diff.fromRevision} → ${diff.toRevision}：${diff.summary.join("；")}`),
      evidence: "graph_diff",
    }, order++));
  }

  const stages: DecisionTrail["proposals"] = [];
  for (const proposal of proposals) {
    const truncatedChanges: DecisionTrail["proposals"][number]["changes"] = proposal.changes.map((change) => {
      const proposedContent = change.kind === "mkdir" ? "" : (change.content ?? "");
      const isBoundedProjection = change.kind === "create" || change.kind === "update" || change.kind === "mkdir";
      const fullLines = change.kind === "mkdir"
        ? [{ type: "add" as const, text: `创建目录 ${change.path}`, newLine: 1 }]
        : unifiedDiff("", proposedContent).map((line) => ({
          type: line.type === "context" ? "add" as const : line.type,
          text: clip(line.text, 160),
          oldLine: line.oldLine,
          newLine: line.newLine,
        }));
      const lines = fullLines.slice(0, lineLimit);
      return {
        id: change.id,
        kind: change.kind,
        path: change.path,
        lines,
        truncated: lines.length < fullLines.length,
        changeSummaryIsBoundedProjection: isBoundedProjection,
      };
    });
    const stageEvents: Array<{ stage: ProposalStage; at: string }> = [
      { stage: "created", at: proposal.createdAt },
    ];
    if (proposal.approvedAt) stageEvents.push({ stage: "approved", at: proposal.approvedAt });
    if (proposal.appliedAt) stageEvents.push({ stage: "applied", at: proposal.appliedAt });
    if (proposal.rejectedAt) stageEvents.push({ stage: "rejected", at: proposal.rejectedAt });
    if (proposal.status === "failed" && !proposal.appliedAt)
      stageEvents.push({ stage: "failed", at: proposal.createdAt });
    stages.push({
      proposalId: proposal.id,
      title: clip(proposal.title, 120),
      summary: clip(proposal.summary, 240),
      graphRevision: proposal.graphRevision,
      createdAt: proposal.createdAt,
      createdBy: proposal.createdBy,
      status: proposal.status,
      contentHash: proposal.contentHash,
      changes: truncatedChanges,
      approval: {
        humanApprovalRecorded: Boolean(proposal.approvedAt),
        approvedAt: proposal.approvedAt,
        receiptExported: false,
      },
    });
    for (const stage of stageEvents) {
      events.push(event({
        id: stage.stage === "created"
          ? `decision:activity:proposal:${proposal.id}`
          : `decision:activity:proposal-status:${proposal.id}:${stage.stage}`,
        category: "proposal",
        kind: `proposal_${stage.stage}`,
        actor: stage.stage === "created" ? proposal.createdBy : stage.stage === "approved" ? "human" : "system",
        createdAt: stage.at,
        graphRevision: proposal.graphRevision,
        proposalId: proposal.id,
        body: clip(`提案「${proposal.title}」：${stage.stage}`),
        evidence: "proposal_status",
        derived: stage.stage !== "created",
      }, order++));
    }
  }

  const timeline = buildActivityTimeline(snapshot, eventLimit);
  const knownIds = new Set(events.map((item) => item.id));
  for (const item of timeline.items) {
    const candidateId = `decision:${item.id}`;
    if (knownIds.has(candidateId)) continue;
    events.push(activityEvent(item, order++));
  }
  events.sort((left, right) => {
    const byTime = left.createdAt.localeCompare(right.createdAt);
    return byTime || left.order - right.order;
  });
  events.forEach((item, index) => { item.order = index + 1; });
  const boundedEvents = events.slice(-eventLimit);
  const gaps: string[] = [];
  if (!snapshot.graph) gaps.push("No VisualGraph is available; run scan_project before treating visual edits as evidence.");
  if (staleThreads.length > 0)
    gaps.push(`${staleThreads.length} stale annotation thread(s) are historical evidence only; human confirmation is required before reusing their intent.`);
  if (stages.some((stage) => stage.status === "approved" || stage.status === "applied")
      && stages.every((stage) => !stage.changes.some((change) => change.lines.length > 0)))
    gaps.push("Proposal change summaries contain no line evidence; open the full line diff before relying on this trail.");
  if (threads.nextActor === "human") gaps.push("The conversation is waiting for a human; do not infer a new decision from an unanswered handoff.");

  const threadNodeIds = new Set(activeThreads.flatMap((thread) => thread.nodeId ? [thread.nodeId] : []));
  const citedNodes = [...citedNodeIds].map((nodeId) => ({
    id: nodeId,
    label: nodeLabels.get(nodeId) ?? nodeId,
    roles: [
      ...(snapshot.focus?.nodeId === nodeId ? ["focus" as const] : []),
      ...(threadNodeIds.has(nodeId) ? ["thread_anchor" as const] : []),
    ],
  }));
  return {
    version: 1,
    sessionId: snapshot.id,
    graphRevision: snapshot.graphRevision,
    updatedAt: snapshot.updatedAt,
    activeDiagramId: snapshot.activeDiagramId,
    focus: snapshot.focus ? {
      nodeId: snapshot.focus.nodeId,
      nodeLabel: nodeLabels.get(snapshot.focus.nodeId) ?? snapshot.focus.nodeLabel,
      nodePath: snapshot.focus.nodePath,
      source: "human",
    } : null,
    intent: {
      pendingMessages: pendingMessages.length,
      activeThreads: activeThreads.map((thread) => ({
        id: thread.id,
        nodeId: thread.nodeId,
        nodeLabel: thread.nodeLabel,
        anchorStatus: thread.anchorStatus,
        nextActor: thread.nextActor,
        body: clip(thread.root.body),
        replyCount: thread.replies.length,
      })),
      staleThreads: staleThreads.map((thread) => ({
        id: thread.id,
        nodeId: thread.nodeId,
        nodeLabel: thread.nodeLabel,
        anchorStatus: thread.anchorStatus,
        body: clip(thread.root.body),
      })),
      citedNodes,
    },
    graphDiffs: graphDiffs.map((diff) => ({
      fromRevision: diff.fromRevision,
      toRevision: diff.toRevision,
      createdAt: diff.createdAt,
      source: diff.source,
      summary: diff.summary.slice(0, 6).map((line) => clip(line, 160)),
      items: diff.items.slice(0, 12).map((item) => ({
        entity: item.entity,
        change: item.change,
        id: item.id,
        label: item.label,
        fields: item.fields?.slice(0, 4),
      })),
    })),
    proposals: stages,
    events: boundedEvents,
    counts: {
      events: events.length,
      returnedEvents: boundedEvents.length,
      intent: pendingMessages.length + activeThreads.length + staleThreads.length,
      graphDiffs: graphDiffs.length,
      proposals: stages.length,
      staleThreads: staleThreads.length,
    },
    gaps,
    safety: {
      readOnly: true,
      grantsWriteAuthority: false,
      excludesApprovalGrants: true,
      staleThreadsExcludedFromIntent: true,
      projectWritesRequireHumanApproval: true,
    },
    guidance: [
      "DECISION_TRAIL_JSON is a derived chronology, not an approval grant; open the full proposal diff before approving or applying anything.",
      "Proposal change lines are a bounded add-line projection of proposed content, not a complete line diff; use /api/collab/proposals/:id/diff or the panel for review.",
      "Stale annotation threads are historical evidence only and must be confirmed or re-anchored by a human before becoming current intent.",
      "Use citedNodes, graphDiffs, and proposal change summaries to explain why a decision was made; use get_visual_context for raw source records.",
      "Only apply_visual_proposal with a valid one-time human receipt may write project files.",
    ],
  };
}
