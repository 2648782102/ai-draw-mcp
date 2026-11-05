import { buildActivityTimeline } from "./activity-timeline.js";
import { summarizeAnnotationThreads } from "./annotation-thread.js";
import { buildSelectionScope } from "./selection.js";
import type { SharedBrief, SessionSnapshot } from "./types.js";

function boundedLimit(limit: number, fallback: number, max: number): number {
  return Number.isFinite(limit) ? Math.max(1, Math.min(max, Math.floor(limit))) : fallback;
}

function clip(value: string, max = 240): string {
  const clean = value.trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function buildSharedBrief(
  snapshot: SessionSnapshot,
  options: { messageLimit?: number; graphDiffLimit?: number; activityLimit?: number } = {},
): SharedBrief {
  const messageLimit = boundedLimit(options.messageLimit ?? 5, 5, 20);
  const graphDiffLimit = boundedLimit(options.graphDiffLimit ?? 3, 3, 10);
  const activityLimit = boundedLimit(options.activityLimit ?? 5, 5, 20);
  const threads = summarizeAnnotationThreads(snapshot.graph);
  const stale = threads.threads.filter((thread) => thread.anchorStatus !== "anchored");
  const activeThreads = threads.threads.filter((thread) => thread.anchorStatus === "anchored" && !thread.resolved);
  const pendingMessages = snapshot.messages.filter((message) =>
    message.author === "human" && message.status === "pending");
  const proposalCounts = snapshot.proposals.reduce<Record<string, number>>((counts, proposal) => {
    counts[proposal.status] = (counts[proposal.status] ?? 0) + 1;
    return counts;
  }, {});
  const graphDiffs = (snapshot.graphDiffs ?? []).slice(-graphDiffLimit);
  const latestDiff = graphDiffs.at(-1);
  const sourceEvidence = (snapshot.graph?.nodes ?? []).flatMap((node) => (node.sourceEvidence ?? []).map((evidence) => ({
    nodeId: node.id,
    nodeLabel: node.label,
    ...evidence,
  })));
  const timeline = buildActivityTimeline(snapshot, activityLimit);
  const focusNode = snapshot.focus
    ? snapshot.graph?.nodes.find((node) => node.id === snapshot.focus?.nodeId)
    : undefined;
  const selectionScope = buildSelectionScope(snapshot, { evidenceLimit: 3, edgeLimit: 6 });
  const blockers: string[] = [];
  if (!snapshot.graph) blockers.push("No VisualGraph is available; ask the AI to run scan_project first.");
  if (stale.length > 0) blockers.push(`${stale.length} stale annotation thread(s) require human review or re-anchoring before they become current intent.`);
  if (threads.nextActor === "human") blockers.push("The conversation is waiting for a human; do not turn an unanswered handoff into a proposal.");
  if ((proposalCounts.pending ?? 0) > 0) blockers.push(`${proposalCounts.pending} pending proposal(s) need human diff review before approval.`);

  return {
    version: 1,
    sessionId: snapshot.id,
    graphRevision: snapshot.graphRevision,
    updatedAt: snapshot.updatedAt,
    workspaceRoot: snapshot.workspaceRoot,
    activeDiagramId: snapshot.activeDiagramId,
    focus: snapshot.focus ? {
      nodeId: snapshot.focus.nodeId,
      nodeLabel: focusNode?.label ?? snapshot.focus.nodeLabel,
      nodePath: focusNode?.path ?? snapshot.focus.nodePath,
      group: focusNode?.group ?? snapshot.focus.group,
      source: "human",
    } : null,
    selection: {
      selectedCount: selectionScope.selectedCount,
      source: selectionScope.source,
      readOnly: true,
      nodes: selectionScope.nodes.slice(0, messageLimit).map((node) => ({
        nodeId: node.nodeId,
        label: node.label,
        path: node.path,
      })),
    },
    viewport: snapshot.viewport ?? null,
    status: {
      graph: snapshot.graph ? {
        nodes: snapshot.graph.nodes.length,
        edges: snapshot.graph.edges.length,
        annotations: snapshot.graph.annotations.length,
        staleAnnotations: stale.length,
      } : null,
      sourceEvidence: { nodes: new Set(sourceEvidence.map((item) => item.nodeId)).size, items: sourceEvidence.length },
      graphHistory: {
        undo: snapshot.graphHistory?.past.length ?? 0,
        redo: snapshot.graphHistory?.future.length ?? 0,
      },
      conversation: {
        pendingMessages: pendingMessages.length,
        annotationThreads: threads.total,
        openThreads: threads.open,
        awaitingAi: threads.awaitingAi,
        awaitingHuman: threads.awaitingHuman,
        nextActor: timeline.nextActor,
        staleThreads: stale.length,
      },
      proposals: {
        pending: proposalCounts.pending ?? 0,
        approved: proposalCounts.approved ?? 0,
        applied: proposalCounts.applied ?? 0,
        failed: proposalCounts.failed ?? 0,
      },
      activity: { total: timeline.total, latestAt: timeline.latestAt },
    },
    intent: {
      pendingMessages: pendingMessages.slice(-messageLimit).map((message) => ({
        id: message.id,
        body: clip(message.body),
        createdAt: message.createdAt,
      })),
      activeThreads: activeThreads.slice(0, messageLimit).map((thread) => ({
        id: thread.id,
        nodeId: thread.nodeId,
        nodeLabel: thread.nodeLabel,
        nodePath: thread.nodePath,
        anchorStatus: thread.anchorStatus,
        nextActor: thread.nextActor,
        body: clip(thread.root.body),
        replyCount: thread.replies.length,
      })),
      staleThreads: stale.slice(0, messageLimit).map((thread) => ({
        id: thread.id,
        nodeId: thread.nodeId,
        nodeLabel: thread.nodeLabel,
        anchorStatus: thread.anchorStatus,
        body: clip(thread.root.body),
      })),
      latestGraphDiff: latestDiff ? {
        fromRevision: latestDiff.fromRevision,
        toRevision: latestDiff.toRevision,
        source: latestDiff.source,
        summary: latestDiff.summary.slice(0, 6),
        items: latestDiff.items.slice(0, 8).map((item) => ({
          entity: item.entity,
          change: item.change,
          id: item.id,
          label: item.label,
          fields: item.fields?.slice(0, 4),
        })),
      } : null,
      sourceEvidence: sourceEvidence.slice(0, messageLimit).map((item) => ({
        nodeId: item.nodeId,
        nodeLabel: item.nodeLabel,
        kind: item.kind,
        path: item.path,
        line: item.line,
        excerpt: clip(item.excerpt, 160),
      })),
      blockers,
      nextActions: [
        blockers.length === 0
          ? "Read get_visual_context for full context, then continue the versioned workflow."
          : "Resolve readiness blockers with the human before creating or applying a proposal.",
        "Use get_node_context for the focused node when one object needs detailed evidence, threads, edges, and diffs.",
        "Run preflight_visual_proposal before create_visual_proposal; only a human-reviewed diff can produce a one-time receipt.",
      ],
    },
    safety: {
      readOnly: true,
      grantsWriteAuthority: false,
      excludesApprovalGrants: true,
      staleThreadsExcludedFromIntent: true,
    },
    guidance: [
      "BRIEF_JSON is a compact, derived handoff view; use get_visual_context for the full graph, raw messages, proposals, and diagnostics.",
      "Stale annotation threads are historical context only and must not be treated as current intent.",
      "Focus, evidence, graph diffs, diagnostics, and this brief never approve a change or grant project-write authority.",
    ],
  };
}
