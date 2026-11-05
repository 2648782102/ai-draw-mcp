import { describe, expect, it } from "vitest";
import { buildDecisionTrail } from "../dist/domain/decision-trail.js";

const snapshot = {
  version: 1,
  id: "session_decision",
  title: "Decision trail",
  createdAt: "2026-11-06T00:00:00.000Z",
  updatedAt: "2026-11-06T00:10:00.000Z",
  workspaceRoot: "/workspace",
  graphRevision: 3,
  activeDiagramId: "diagram_decision",
  graph: {
    version: 1,
    diagramId: "diagram_decision",
    nodes: [
      { id: "readme", label: "README.md", kind: "documentation", path: "README.md" },
      { id: "service", label: "Service", kind: "file", path: "src/service.ts" },
    ],
    edges: [],
    annotations: [
      {
        id: "thread_current",
        nodeId: "readme",
        nodeLabel: "README.md",
        nodePath: "README.md",
        anchorStatus: "anchored",
        body: "Add a safety note",
        author: "human",
        createdAt: "2026-11-06T00:02:00.000Z",
        replies: [{ id: "reply_ai", author: "ai", body: "I will do it", createdAt: "2026-11-06T00:03:00.000Z" }],
      },
      {
        id: "thread_stale",
        nodeId: "service",
        nodeLabel: "Old Service",
        anchorStatus: "outdated",
        body: "Old discussion",
        author: "human",
        createdAt: "2026-11-06T00:01:00.000Z",
      },
    ],
  },
  focus: {
    version: 1,
    nodeId: "readme",
    nodeLabel: "README.md",
    nodePath: "README.md",
    graphRevision: 3,
    updatedAt: "2026-11-06T00:09:00.000Z",
    source: "human",
  },
  graphDiffs: [{
    version: 1,
    fromRevision: 2,
    toRevision: 3,
    createdAt: "2026-11-06T00:04:00.000Z",
    source: "human",
    diagramId: "diagram_decision",
    nodes: { added: 0, removed: 0, updated: 1 },
    edges: { added: 0, removed: 0, updated: 0 },
    items: [{
      entity: "node",
      change: "updated",
      id: "readme",
      label: "README.md",
      fields: [{ field: "label", before: "Docs", after: "README.md" }],
    }],
    summary: ["1 node updated"],
  }],
  messages: [{
    id: "msg_pending",
    sessionId: "session_decision",
    author: "human",
    body: "请补充安全说明",
    createdAt: "2026-11-06T00:05:00.000Z",
    status: "pending",
  }],
  proposals: [{
    id: "proposal_approved",
    sessionId: "session_decision",
    title: "Update README",
    summary: "Add a safety note",
    graphRevision: 3,
    status: "approved",
    createdAt: "2026-11-06T00:06:00.000Z",
    approvedAt: "2026-11-06T00:07:00.000Z",
    changes: [{
      id: "change_docs",
      kind: "update",
      path: "README.md",
      content: "# Demo\n\nSafety note\n",
    }],
    createdBy: "ai",
    contentHash: "sha256_projection",
    approvalId: "must-not-leak-id",
    approvalGrant: "must-not-leak-grant",
    approvalExpiresAt: "2026-11-06T00:17:00.000Z",
    metadata: { approvalGrant: "must-not-leak-metadata" },
  }],
};

describe("read-only decision trail", () => {
  it("links intent, graph diffs, and proposal stages without approval secrets", () => {
    const trail = buildDecisionTrail(snapshot);
    const serialized = JSON.stringify(trail);
    expect(trail).toMatchObject({ version: 1, sessionId: "session_decision", graphRevision: 3 });
    expect(trail.focus).toMatchObject({ nodeId: "readme", source: "human" });
    expect(trail.intent.activeThreads.map((thread) => thread.id)).toEqual(["thread_current"]);
    expect(trail.intent.staleThreads.map((thread) => thread.id)).toEqual(["thread_stale"]);
    expect(trail.intent.citedNodes.flatMap((node) => node.roles)).toEqual(expect.arrayContaining(["focus", "thread_anchor"]));
    expect(trail.graphDiffs[0]).toMatchObject({ fromRevision: 2, toRevision: 3, source: "human" });
    expect(trail.proposals[0]).toMatchObject({
      proposalId: "proposal_approved",
      status: "approved",
      approval: { humanApprovalRecorded: true, receiptExported: false },
    });
    expect(trail.proposals[0].changes[0].lines.some((line) => line.type === "add")).toBe(true);
    expect(trail.proposals[0].changes[0].changeSummaryIsBoundedProjection).toBe(true);
    expect(trail.events.map((item) => item.category)).toEqual(expect.arrayContaining(["intent", "graph", "proposal"]));
    expect(trail.events.some((item) => item.kind === "proposal_approved")).toBe(true);
    expect(trail.safety).toMatchObject({
      readOnly: true,
      grantsWriteAuthority: false,
      excludesApprovalGrants: true,
      staleThreadsExcludedFromIntent: true,
      projectWritesRequireHumanApproval: true,
    });
    for (const secret of ["must-not-leak-id", "must-not-leak-grant", "must-not-leak-metadata", "approvalExpiresAt"]) {
      expect(serialized).not.toContain(secret);
    }
    expect(trail.gaps.join(" ")).toContain("stale annotation thread");
    expect(trail.gaps.join(" ")).toContain("waiting for a human");
  });

  it("bounds events and line summaries and reports a missing graph", () => {
    const bounded = buildDecisionTrail(snapshot, { eventLimit: 3, lineLimit: 1, proposalLimit: 1 });
    expect(bounded.counts.events).toBeGreaterThan(bounded.counts.returnedEvents);
    expect(bounded.events).toHaveLength(3);
    expect(bounded.proposals[0].changes[0].lines).toHaveLength(1);
    expect(bounded.proposals[0].changes[0].truncated).toBe(true);
    const missing = buildDecisionTrail({ ...snapshot, graph: undefined, focus: undefined, graphDiffs: [] });
    expect(missing.focus).toBeNull();
    expect(missing.graphDiffs).toEqual([]);
    expect(missing.gaps.join(" ")).toContain("No VisualGraph");
  });
});
