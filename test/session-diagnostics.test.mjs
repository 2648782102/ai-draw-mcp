import { describe, expect, it } from "vitest";
import { buildSessionDiagnostics } from "../dist/domain/session-diagnostics.js";

const snapshot = {
  version: 1,
  id: "session_diagnostics",
  title: "Diagnostics",
  createdAt: "2026-11-06T00:00:00.000Z",
  updatedAt: "2026-11-06T00:09:00.000Z",
  workspaceRoot: "/workspace",
  graphRevision: 4,
  graph: {
    version: 1,
    diagramId: "diagram_diagnostics",
    nodes: [{ id: "readme", label: "README.md", kind: "documentation", path: "README.md" }],
    edges: [],
    annotations: [{
      id: "ann_detached",
      nodeId: "removed",
      nodeLabel: "old.md",
      body: "旧节点讨论",
      author: "human",
      createdAt: "2026-11-06T00:02:00.000Z",
      anchorStatus: "detached",
    }],
  },
  graphDiffs: [{
    version: 1,
    fromRevision: 3,
    toRevision: 4,
    createdAt: "2026-11-06T00:04:00.000Z",
    source: "human",
    diagramId: "diagram_diagnostics",
    nodes: { added: 0, removed: 0, updated: 1 },
    edges: { added: 0, removed: 0, updated: 0 },
    items: [],
    summary: ["0 nodes added, 0 removed, 1 updated"],
  }],
  messages: [{
    id: "msg_pending",
    sessionId: "session_diagnostics",
    author: "human",
    body: "请先看这条消息",
    createdAt: "2026-11-06T00:03:00.000Z",
    status: "pending",
  }],
  proposals: [
    {
      id: "proposal_pending",
      sessionId: "session_diagnostics",
      title: "Update README",
      summary: "Pending review",
      graphRevision: 4,
      status: "pending",
      createdAt: "2026-11-06T00:04:00.000Z",
      changes: [],
      createdBy: "ai",
    },
    {
      id: "proposal_failed",
      sessionId: "session_diagnostics",
      title: "Failed write",
      summary: "Rolled back",
      graphRevision: 3,
      status: "failed",
      createdAt: "2026-11-06T00:05:00.000Z",
      changes: [],
      createdBy: "ai",
    },
  ],
};

describe("session diagnostics", () => {
  it("summarizes health, proposal states, and safety invariants", () => {
    const diagnostics = buildSessionDiagnostics(snapshot);
    expect(diagnostics).toMatchObject({
      version: 1,
      sessionId: "session_diagnostics",
      graphRevision: 4,
    });
    expect(diagnostics.graph).toMatchObject({ nodes: 1, annotations: 1, staleAnnotations: 1 });
    expect(diagnostics.conversations.pendingMessages).toBe(1);
    expect(diagnostics.proposals).toMatchObject({ pending: 1, failed: 1 });
    expect(diagnostics.safety).toMatchObject({
      approvalGrantsExported: false,
      staleThreadsExcludedFromIntent: true,
      projectWritesRequireHumanApproval: true,
    });
    expect(diagnostics.signals.map((signal) => signal.code)).toEqual(expect.arrayContaining([
      "stale_threads",
      "pending_messages",
      "proposals_await_review",
      "failed_proposals",
      "graph_diffs",
    ]));
    expect(diagnostics.nextActions.join(" ")).toContain("re-anchor");
    expect(diagnostics.nextActions.join(" ")).toContain("graphDiffs");
  });

  it("asks for a scan when the graph is missing", () => {
    const diagnostics = buildSessionDiagnostics({ ...snapshot, graph: undefined, messages: [], proposals: [] });
    expect(diagnostics.signals.map((signal) => signal.code)).toContain("graph_missing");
    expect(diagnostics.nextActions.join(" ")).toContain("scan_project");
  });
});
