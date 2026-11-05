import { buildActivityTimeline } from "./activity-timeline.js";
import { summarizeAnnotationThreads } from "./annotation-thread.js";
import type { ChangeProposal, SessionSnapshot } from "./types.js";

export type DiagnosticLevel = "info" | "warning" | "action";

export interface DiagnosticSignal {
  code: string;
  level: DiagnosticLevel;
  message: string;
  count?: number;
  ids?: string[];
}

export interface SessionDiagnostics {
  version: 1;
  sessionId: string;
  workspaceRoot: string;
  graphRevision: number;
  updatedAt: string;
  activeDiagramId?: string;
  graph: { nodes: number; edges: number; annotations: number; staleAnnotations: number };
  sourceEvidence: { nodes: number; items: number };
  graphHistory: { undo: number; redo: number };
  focus: { nodeId: string; nodeLabel: string; nodePath?: string; graphRevision: number } | null;
  conversations: { pendingMessages: number; annotationThreads: number; openThreads: number; awaitingAi: number; awaitingHuman: number };
  proposals: Record<ChangeProposal["status"], number>;
  activity: { total: number; latestAt?: string; nextActor: "ai" | "human" | "none" };
  safety: {
    approvalGrantsExported: false;
    staleThreadsExcludedFromIntent: true;
    projectWritesRequireHumanApproval: true;
  };
  signals: DiagnosticSignal[];
  nextActions: string[];
}

function emptyProposalCounts(): Record<ChangeProposal["status"], number> {
  return { draft: 0, pending: 0, approved: 0, applied: 0, rejected: 0, failed: 0 };
}

export function buildSessionDiagnostics(snapshot: SessionSnapshot): SessionDiagnostics {
  const threads = summarizeAnnotationThreads(snapshot.graph);
  const timeline = buildActivityTimeline(snapshot, 1);
  const proposalCounts = emptyProposalCounts();
  for (const proposal of snapshot.proposals) proposalCounts[proposal.status] += 1;
  const pendingMessages = snapshot.messages.filter((message) => message.author === "human" && message.status === "pending");
  const stale = threads.threads.filter((thread) => thread.anchorStatus !== "anchored");
  const signals: DiagnosticSignal[] = [];
  if (snapshot.graph) {
    signals.push({
      code: "graph_ready",
      level: "info",
      message: `Visual graph is ready at revision ${snapshot.graphRevision}.`,
      count: snapshot.graph.nodes.length,
    });
  } else {
    signals.push({ code: "graph_missing", level: "action", message: "No graph yet; ask the AI to run scan_project." });
  }
  if (stale.length > 0) {
    signals.push({
      code: "stale_threads",
      level: "action",
      message: "Detached or outdated annotation threads need human review before AI uses them as current intent.",
      count: stale.length,
      ids: stale.map((thread) => thread.id),
    });
  }
  if (pendingMessages.length > 0) {
    signals.push({
      code: "pending_messages",
      level: "action",
      message: "Human messages are waiting for an AI reply.",
      count: pendingMessages.length,
      ids: pendingMessages.map((message) => message.id),
    });
  }
  if (threads.awaitingAi > 0) {
    signals.push({
      code: "threads_await_ai",
      level: "action",
      message: "Open annotation threads are waiting for an AI reply.",
      count: threads.awaitingAi,
    });
  }
  if (proposalCounts.pending > 0) {
    signals.push({
      code: "proposals_await_review",
      level: "action",
      message: "Pending proposals need human diff review before approval.",
      count: proposalCounts.pending,
      ids: snapshot.proposals.filter((proposal) => proposal.status === "pending").map((proposal) => proposal.id),
    });
  }
  if (proposalCounts.approved > 0) {
    signals.push({
      code: "approved_proposals",
      level: "warning",
      message: "Approved proposals are waiting for apply_visual_proposal with a one-time receipt.",
      count: proposalCounts.approved,
    });
  }
  if (proposalCounts.failed > 0) {
    signals.push({
      code: "failed_proposals",
      level: "warning",
      message: "Failed proposals were rolled back; inspect their errors before creating a replacement.",
      count: proposalCounts.failed,
    });
  }
  if (proposalCounts.applied > 0) {
    signals.push({
      code: "applied_proposals",
      level: "info",
      message: "Applied proposals are recorded; consider scanning the project again to refresh the graph.",
      count: proposalCounts.applied,
    });
  }
  const graphDiffs = snapshot.graphDiffs ?? [];
  if (graphDiffs.length > 0) {
    const latest = graphDiffs.at(-1)!;
    signals.push({
      code: "graph_diffs",
      level: "info",
      message: `Recent graph revision diffs are available from rev ${latest.fromRevision} to ${latest.toRevision}.`,
      count: graphDiffs.length,
    });
  }
  const nextActions: string[] = [];
  if (!snapshot.graph) nextActions.push("Run scan_project to create the current VisualGraph.");
  if (graphDiffs.length > 0) nextActions.push("Read graphDiffs to understand exact node/edge edits before generating a proposal.");
  if (stale.length > 0) nextActions.push("Ask the human to resolve or re-anchor stale annotation threads; do not use stale text as current intent.");
  if (pendingMessages.length > 0 || threads.nextActor === "ai") nextActions.push("Use get_visual_context and reply_to_visual_context for the latest human intent.");
  if (proposalCounts.pending > 0) nextActions.push("Ask the human to review the line diff before approving a proposal.");
  if (proposalCounts.approved > 0) nextActions.push("The AI needs a one-time receipt from the human to call apply_visual_proposal.");
  if (proposalCounts.applied > 0) nextActions.push("Run scan_project again so the graph and source tree stay aligned.");
  if (nextActions.length === 0) nextActions.push("Session is quiet; use get_visual_context for full context before creating a proposal.");

  return {
    version: 1,
    sessionId: snapshot.id,
    workspaceRoot: snapshot.workspaceRoot,
    graphRevision: snapshot.graphRevision,
    updatedAt: snapshot.updatedAt,
    activeDiagramId: snapshot.activeDiagramId,
    graph: {
      nodes: snapshot.graph?.nodes.length ?? 0,
      edges: snapshot.graph?.edges.length ?? 0,
      annotations: snapshot.graph?.annotations.length ?? 0,
      staleAnnotations: stale.length,
    },
    sourceEvidence: {
      nodes: (snapshot.graph?.nodes ?? []).filter((node) => (node.sourceEvidence?.length ?? 0) > 0).length,
      items: (snapshot.graph?.nodes ?? []).reduce((total, node) => total + (node.sourceEvidence?.length ?? 0), 0),
    },
    graphHistory: {
      undo: snapshot.graphHistory?.past.length ?? 0,
      redo: snapshot.graphHistory?.future.length ?? 0,
    },
    focus: snapshot.focus ? {
      nodeId: snapshot.focus.nodeId,
      nodeLabel: snapshot.focus.nodeLabel,
      nodePath: snapshot.focus.nodePath,
      graphRevision: snapshot.focus.graphRevision,
    } : null,
    conversations: {
      pendingMessages: pendingMessages.length,
      annotationThreads: threads.total,
      openThreads: threads.open,
      awaitingAi: threads.awaitingAi,
      awaitingHuman: threads.awaitingHuman,
    },
    proposals: proposalCounts,
    activity: { total: timeline.total, latestAt: timeline.latestAt, nextActor: timeline.nextActor },
    safety: {
      approvalGrantsExported: false,
      staleThreadsExcludedFromIntent: true,
      projectWritesRequireHumanApproval: true,
    },
    signals,
    nextActions,
  };
}
