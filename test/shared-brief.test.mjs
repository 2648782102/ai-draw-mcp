import { describe, expect, it } from "vitest";
import { buildSharedBrief } from "../dist/domain/shared-brief.js";
import { buildAgentWorkflow } from "../dist/domain/agent-workflow.js";

const snapshot = {
  version: 1,
  id: "session_brief",
  title: "Shared brief",
  createdAt: "2026-11-06T00:00:00.000Z",
  updatedAt: "2026-11-06T00:10:00.000Z",
  workspaceRoot: "/tmp/ai-draw-brief",
  activeDiagramId: "diagram_brief",
  graphRevision: 4,
  graph: {
    version: 1,
    diagramId: "diagram_brief",
    nodes: [
      {
        id: "readme",
        label: "README.md",
        kind: "documentation",
        path: "README.md",
        sourceEvidence: [{ version: 1, kind: "heading", path: "README.md", line: 1, excerpt: "# Demo" }],
      },
      { id: "service", label: "Service", kind: "file", path: "src/service.ts" },
    ],
    edges: [{ id: "edge_contains", from: "readme", to: "service", label: "contains" }],
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
    graphRevision: 4,
    updatedAt: "2026-11-06T00:09:00.000Z",
    source: "human",
  },
  graphDiffs: [{
    version: 1,
    fromRevision: 3,
    toRevision: 4,
    createdAt: "2026-11-06T00:08:00.000Z",
    source: "human",
    diagramId: "diagram_brief",
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
  graphHistory: {
    version: 1,
    past: [{ version: 1, graph: { version: 1, diagramId: "diagram_brief", nodes: [], edges: [], annotations: [] }, graphRevision: 3, source: "human", createdAt: "2026-11-06T00:07:00.000Z" }],
    future: [],
    limit: 12,
  },
  messages: [
    { id: "msg_pending", sessionId: "session_brief", author: "human", body: "请补充安全说明", createdAt: "2026-11-06T00:03:00.000Z", status: "pending" },
    { id: "msg_answered", sessionId: "session_brief", author: "human", body: "旧消息", createdAt: "2026-11-06T00:01:00.000Z", status: "answered" },
    { id: "msg_ai", sessionId: "session_brief", author: "ai", body: "已收到", createdAt: "2026-11-06T00:04:00.000Z" },
  ],
  proposals: [
    { id: "proposal_pending", sessionId: "session_brief", title: "Docs", summary: "", graphRevision: 4, status: "pending", createdAt: "2026-11-06T00:05:00.000Z", changes: [], createdBy: "ai", approvalId: "must-not-leak" },
  ],
};

describe("read-only shared brief", () => {
  it("compresses the session without leaking approval credentials or stale intent", () => {
    const brief = buildSharedBrief(snapshot);
    expect(brief).toMatchObject({ version: 1, sessionId: "session_brief", graphRevision: 4 });
    expect(brief.focus).toMatchObject({ nodeId: "readme", source: "human" });
    expect(brief.status.graph).toMatchObject({ nodes: 2, edges: 1, staleAnnotations: 1 });
    expect(brief.status.sourceEvidence).toEqual({ nodes: 1, items: 1 });
    expect(brief.status.graphHistory).toEqual({ undo: 1, redo: 0 });
    expect(brief.intent.pendingMessages.map((item) => item.id)).toEqual(["msg_pending"]);
    expect(brief.intent.activeThreads.map((item) => item.id)).toEqual(["thread_current"]);
    expect(brief.intent.staleThreads.map((item) => item.id)).toEqual(["thread_stale"]);
    expect(brief.intent.latestGraphDiff).toMatchObject({ fromRevision: 3, toRevision: 4, source: "human" });
    expect(brief.intent.blockers.join(" ")).toContain("stale annotation thread");
    expect(brief.intent.blockers.join(" ")).toContain("pending proposal");
    expect(brief.safety).toMatchObject({ readOnly: true, grantsWriteAuthority: false, excludesApprovalGrants: true });
    expect(JSON.stringify(brief)).not.toContain("must-not-leak");
    expect(JSON.stringify(brief)).not.toContain("approvalId");
  });

  it("stays bounded and reports a missing graph as a blocker", () => {
    const bounded = buildSharedBrief(snapshot, { messageLimit: 1, graphDiffLimit: 1, activityLimit: 1 });
    expect(bounded.intent.sourceEvidence.length).toBeLessThanOrEqual(1);
    expect(bounded.intent.activeThreads.length).toBeLessThanOrEqual(1);
    const missing = buildSharedBrief({ ...snapshot, graph: undefined, focus: undefined, graphDiffs: [] });
    expect(missing.status.graph).toBeNull();
    expect(missing.focus).toBeNull();
    expect(missing.intent.latestGraphDiff).toBeNull();
    expect(missing.intent.blockers.join(" ")).toContain("No VisualGraph");
  });

  it("is a versioned shared contract named by the workflow", async () => {
    const types = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../src/domain/types.ts", import.meta.url), "utf8"));
    expect(types).toContain("export interface SharedBrief");
    const workflow = buildAgentWorkflow(snapshot);
    expect(workflow.steps.find((step) => step.id === "visual_context").output).toContain("BRIEF_JSON");
  });
});
