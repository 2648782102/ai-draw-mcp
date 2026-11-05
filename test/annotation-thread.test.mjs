import { describe, expect, it } from "vitest";
import { summarizeAnnotationThreads } from "../dist/domain/annotation-thread.js";

describe("annotation threads", () => {
  const graph = {
    version: 1,
    diagramId: "diagram_threads",
    nodes: [{ id: "readme", label: "README.md", kind: "documentation", path: "README.md" }],
    edges: [],
    annotations: [
      {
        id: "ann_open",
        nodeId: "readme",
        body: "把说明改成中文",
        author: "human",
        createdAt: "2026-11-06T00:00:00.000Z",
        replies: [
          {
            id: "reply_ai",
            author: "ai",
            body: "我会更新 README。",
            createdAt: "2026-11-06T00:01:00.000Z",
          },
        ],
      },
      {
        id: "ann_resolved",
        nodeId: "readme",
        body: "检查链接",
        author: "human",
        createdAt: "2026-11-06T00:02:00.000Z",
        resolved: true,
      },
      {
        id: "ann_general",
        body: "补充协作说明",
        author: "human",
        createdAt: "2026-11-06T00:03:00.000Z",
      },
    ],
  };

  it("summarizes open threads and whose turn it is", () => {
    const summary = summarizeAnnotationThreads(graph);
    expect(summary).toMatchObject({
      total: 3,
      open: 2,
      resolved: 1,
      openReplies: 0,
      awaitingAi: 1,
      awaitingHuman: 1,
      nextActor: "ai",
    });
    const openThread = summary.threads.find((thread) => thread.id === "ann_open");
    expect(openThread).toMatchObject({
      nodeLabel: "README.md",
      nodePath: "README.md",
      resolved: false,
      nextActor: "human",
      updatedAt: "2026-11-06T00:01:00.000Z",
    });
    expect(summary.threads.find((thread) => thread.id === "ann_resolved")?.nextActor).toBe("none");
  });

  it("returns an empty queue with no graph", () => {
    expect(summarizeAnnotationThreads()).toMatchObject({
      total: 0,
      open: 0,
      resolved: 0,
      nextActor: "none",
      threads: [],
    });
  });
});
