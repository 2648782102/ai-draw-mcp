import { describe, expect, it } from "vitest";
import { buildActivityTimeline } from "../dist/domain/activity-timeline.js";

describe("activity timeline", () => {
  const snapshot = {
    version: 1,
    id: "session_test",
    title: "Demo session",
    createdAt: "2026-11-06T00:00:00.000Z",
    updatedAt: "2026-11-06T00:09:00.000Z",
    workspaceRoot: "/workspace",
    graphRevision: 2,
    graph: {
      version: 1,
      diagramId: "diagram_test",
      nodes: [{ id: "readme", label: "README.md", kind: "documentation", path: "README.md" }],
      edges: [],
      annotations: [{
        id: "ann_1",
        nodeId: "readme",
        body: "把说明改成中文",
        author: "human",
        createdAt: "2026-11-06T00:02:00.000Z",
        replies: [{
          id: "reply_1",
          author: "ai",
          body: "我会更新 README。",
          createdAt: "2026-11-06T00:03:00.000Z",
        }],
      }],
    },
    messages: [{
      id: "msg_1",
      sessionId: "session_test",
      author: "human",
      body: "请更新 README",
      createdAt: "2026-11-06T00:01:00.000Z",
      graphRevision: 1,
      status: "pending",
    }],
    proposals: [{
      id: "proposal_1",
      sessionId: "session_test",
      title: "更新 README",
      summary: "加入中文说明",
      graphRevision: 2,
      status: "applied",
      createdAt: "2026-11-06T00:04:00.000Z",
      approvedAt: "2026-11-06T00:05:00.000Z",
      appliedAt: "2026-11-06T00:06:00.000Z",
      changes: [],
      createdBy: "ai",
    }],
  };

  it("merges messages, threads, and proposal lifecycle events in time order", () => {
    const timeline = buildActivityTimeline(snapshot);
    expect(timeline).toMatchObject({ version: 1, total: 7, nextActor: "human" });
    expect(timeline.items.map((item) => item.kind)).toEqual([
      "session_created",
      "message",
      "annotation_created",
      "annotation_replied",
      "proposal_created",
      "proposal_status",
      "proposal_status",
    ]);
    expect(timeline.items[2]).toMatchObject({
      nodeLabel: "README.md",
      annotationId: "ann_1",
      derived: true,
    });
    expect(timeline.items.at(-1)).toMatchObject({
      proposalId: "proposal_1",
      proposalStatus: "applied",
    });
    expect(timeline.kinds.proposal_status).toBe(2);
  });

  it("returns the newest bounded slice and keeps total counts", () => {
    const timeline = buildActivityTimeline(snapshot, 3);
    expect(timeline.total).toBe(7);
    expect(timeline.returned).toBe(3);
    expect(timeline.items).toHaveLength(3);
    expect(timeline.items[0].kind).toBe("proposal_created");
  });

  it("handles an empty session", () => {
    const timeline = buildActivityTimeline({ ...snapshot, graph: undefined, messages: [], proposals: [] });
    expect(timeline).toMatchObject({ total: 1, returned: 1, nextActor: "none" });
    expect(timeline.items[0].kind).toBe("session_created");
  });

  it("records detached anchors and warns AI against stale intent", () => {
    const stale = {
      ...snapshot,
      graph: {
        ...snapshot.graph,
        annotations: [{
          ...snapshot.graph.annotations[0],
          nodeId: "removed",
          nodeLabel: "old.md",
          anchorStatus: "detached",
        }],
      },
    };
    const timeline = buildActivityTimeline(stale);
    expect(timeline.items.map((item) => item.kind)).toContain("annotation_anchor");
    expect(timeline.guidance).toContain("detached or outdated");
    expect(timeline.nextActor).toBe("human");
  });

  it("derives graph revision events without persisting new timeline state", () => {
    const withDiffs = {
      ...snapshot,
      graphDiffs: [{
        version: 1,
        fromRevision: 1,
        toRevision: 2,
        createdAt: "2026-11-06T00:02:30.000Z",
        source: "human",
        diagramId: "diagram_test",
        nodes: { added: 1, removed: 0, updated: 0 },
        edges: { added: 0, removed: 0, updated: 0 },
        items: [{ entity: "node", change: "added", id: "shared", label: "shared" }],
        summary: ["1 nodes added, 0 removed, 0 updated"],
      }],
    };
    const timeline = buildActivityTimeline(withDiffs);
    const event = timeline.items.find((item) => item.kind === "graph_diff");
    expect(event).toMatchObject({
      actor: "human",
      graphRevision: 2,
      derived: true,
    });
    expect(event.body).toContain("rev 1 → 2");
    expect(timeline.kinds.graph_diff).toBe(1);
    expect(timeline.items.map((item) => item.id)).toEqual(expect.arrayContaining([
      "activity:graph-diff:diagram_test:2",
    ]));
  });
});
