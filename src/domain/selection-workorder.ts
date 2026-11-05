import { buildReviewReadiness } from "./review-readiness.js";
import { buildSelectionScope } from "./selection.js";
import { summarizeAnnotationThreads } from "./annotation-thread.js";
import type { SelectionWorkorder, SessionSnapshot } from "./types.js";

const ITEM_LIMIT = 12;
const GAP_LIMIT = 8;

function clip(value: string, max = 240): string {
  const clean = value.trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function bounded(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.min(ITEM_LIMIT, Math.floor(value)))
    : fallback;
}

export function buildSelectionWorkorder(
  snapshot: SessionSnapshot,
  options: { itemLimit?: number } = {},
): SelectionWorkorder {
  const itemLimit = bounded(options.itemLimit, 8);
  const scope = buildSelectionScope(snapshot, { evidenceLimit: itemLimit, edgeLimit: itemLimit });
  const threads = summarizeAnnotationThreads(snapshot.graph);
  const readiness = buildReviewReadiness(snapshot);
  const pendingMessages = snapshot.messages.filter((message) =>
    message.author === "human" && message.status === "pending");
  const selectedIds = new Set(scope.nodes.map((node) => node.nodeId));
  const selectedThreads = threads.threads.filter((thread) => thread.nodeId && selectedIds.has(thread.nodeId));
  const activeSelectedThreads = selectedThreads.filter((thread) => thread.anchorStatus === "anchored" && !thread.resolved);
  const staleSelectedThreads = selectedThreads.filter((thread) => thread.anchorStatus !== "anchored");
  const safePaths = [...new Set(scope.nodes
    .map((node) => node.path)
    .filter((path): path is string => typeof path === "string" && path !== "." && !path.endsWith("/")))];
  const gaps: string[] = [];

  if (scope.selectedCount === 0) gaps.push("No active human selection; ask the human to select nodes in the panel before drafting a scoped change.");
  if (pendingMessages.length === 0 && activeSelectedThreads.length === 0) {
    gaps.push("No pending human message or active annotation thread is anchored to the selected scope; confirm the requested change before proposing content.");
  }
  if (safePaths.length === 0 && scope.selectedCount > 0) {
    gaps.push("Selected nodes have no safe workspace-relative file paths; inspect the graph and ask the human which files the change should cover.");
  }
  if (safePaths.length < scope.selectedCount) {
    gaps.push(`${scope.selectedCount - safePaths.length} selected node(s) have no safe file path; do not infer untyped or protected paths as write targets.`);
  }
  if (staleSelectedThreads.length > 0) {
    gaps.push(`${staleSelectedThreads.length} stale annotation thread(s) are attached to selected nodes; human re-anchoring is required before reusing their intent.`);
  }
  if (readiness.status === "blocked") gaps.push(...readiness.brief.blockers.slice(0, 2));
  if (readiness.status === "review" && readiness.decisionTrail.gaps.length > 0) {
    gaps.push(`REVIEW_READINESS_JSON reports ${readiness.decisionTrail.gaps.length} evidence gap(s); review the decision trail before drafting content.`);
  }
  if ((snapshot.proposals ?? []).some((proposal) => proposal.status === "pending")) {
    gaps.push("A pending proposal needs full line-diff review before another scoped draft becomes a new proposal.");
  }

  const safePathItems = safePaths.slice(0, itemLimit).map((path, index) => ({
    id: `path:${index + 1}`,
    path,
    status: "candidate" as const,
    rationale: "Safe workspace-relative path from a selected graph node; preflight must confirm create/update and full UTF-8 content.",
  }));
  const intentItems: SelectionWorkorder["intent"] = [
    ...pendingMessages.slice(-itemLimit).map((message) => ({
      id: message.id,
      kind: "message" as const,
      excerpt: clip(message.body),
      createdAt: message.createdAt,
    })),
    ...activeSelectedThreads.slice(0, itemLimit).map((thread) => ({
      id: thread.id,
      kind: "annotation" as const,
      nodeId: thread.nodeId,
      excerpt: clip([thread.root.body, ...thread.replies.map((reply) => `${reply.author}: ${reply.body}`)].join(" / ")),
      nextActor: thread.nextActor,
    })),
  ].slice(0, itemLimit);
  const evidence = scope.evidence.slice(0, itemLimit).map((item) => ({
    id: `evidence:${item.nodeId}:${item.path}:${item.line}`,
    nodeId: item.nodeId,
    path: item.path,
    fileLine: item.fileLine,
    kind: item.kind,
  }));
  const edges = scope.edges.slice(0, itemLimit).map((edge) => ({
    id: edge.id,
    from: edge.from,
    to: edge.to,
    label: edge.label,
    kind: edge.kind,
  }));
  const nextActions = scope.selectedCount === 0
    ? ["Ask the human to select graph nodes that define the intended scope."]
    : [
        "Read get_visual_context for the full conversation and proposal state before writing any file content.",
        "Discuss the workorder gaps with the human; selection is attention context, not a change specification.",
        "Draft explicit UTF-8 candidate changes and call preflight_visual_proposal before create_visual_proposal.",
        "Wait for the human to review the full line diff, approve in the panel, and provide a one-time receipt.",
      ];
  const copyText = [
    `Selection workorder · session ${snapshot.id} · graphRevision ${snapshot.graphRevision} · selectionRevision ${scope.selectionRevision ?? "none"} · read-only`,
    `Selected nodes: ${scope.selectedCount}/${scope.limit} · internal edges ${scope.edges.length}/${scope.totalEdges} · safe evidence ${scope.evidence.length}/${scope.totalEvidence}`,
    `Review readiness: ${readiness.status} · blockers ${readiness.brief.blockers.length} · gaps ${readiness.decisionTrail.gaps.length}`,
    ...scope.nodes.slice(0, itemLimit).map((node) => `- Node: ${node.label} (${node.nodeId})${node.path ? ` · ${node.path}` : ""}`),
    ...safePathItems.map((item) => `- Candidate path: ${item.path} (preflight required)`),
    ...gaps.slice(0, GAP_LIMIT).map((gap) => `- Gap: ${gap}`),
    "This workorder contains no file content, line diff, proposal, approval receipt, or project-write authority.",
  ].join("\n");

  return {
    version: 1,
    readOnly: true,
    sessionId: snapshot.id,
    graphRevision: snapshot.graphRevision,
    selectionRevision: scope.selectionRevision,
    source: scope.source,
    selectedCount: scope.selectedCount,
    selectionLimit: scope.limit,
    reviewReadiness: {
      status: readiness.status,
      blockers: readiness.brief.blockers.length,
      gaps: readiness.decisionTrail.gaps.length,
    },
    nodes: scope.nodes.slice(0, itemLimit).map((node) => ({
      nodeId: node.nodeId,
      label: node.label,
      kind: node.kind,
      path: node.path,
      group: node.group,
      hasSafePath: typeof node.path === "string" && node.path !== "." && !node.path.endsWith("/"),
      activeThreadCount: activeSelectedThreads.filter((thread) => thread.nodeId === node.nodeId).length,
      staleThreadCount: staleSelectedThreads.filter((thread) => thread.nodeId === node.nodeId).length,
    })),
    internalEdges: edges,
    safePaths: safePathItems,
    intent: intentItems,
    evidence,
    gaps: gaps.slice(0, GAP_LIMIT),
    nextActions,
    copyText,
    guidance: [
      "SELECTION_WORKORDER_JSON is a derived, read-only pre-proposal checklist for a bounded human selection.",
      "Candidate paths are not permissions and contain no proposed content; preflight and a human-reviewed full line diff remain mandatory.",
      "Stale annotation threads, readiness blockers, and evidence gaps must be resolved with the human before they become current intent.",
      "Only apply_visual_proposal with a valid one-time human receipt may write project files.",
    ],
    safety: {
      readOnly: true,
      grantsWriteAuthority: false,
      excludesApprovalGrants: true,
      excludesAbsolutePaths: true,
      excludesProjectChangeContent: true,
      projectWritesRequireHumanApproval: true,
    },
  };
}
