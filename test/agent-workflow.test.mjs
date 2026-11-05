import { describe, expect, it } from "vitest";
import { buildAgentWorkflow } from "../dist/domain/agent-workflow.js";

const snapshot = {
  version: 1,
  id: "session_workflow",
  title: "Workflow contract",
  createdAt: "2026-11-06T00:00:00.000Z",
  updatedAt: "2026-11-06T00:02:00.000Z",
  workspaceRoot: "/workspace",
  activeDiagramId: "diagram_workflow",
  graphRevision: 4,
  focus: {
    version: 1,
    nodeId: "readme",
    nodeLabel: "README.md",
    nodePath: "README.md",
    graphRevision: 4,
    updatedAt: "2026-11-06T00:02:00.000Z",
    source: "human",
  },
  selection: {
    version: 1,
    nodeIds: ["readme"],
    graphRevision: 4,
    updatedAt: "2026-11-06T00:02:00.000Z",
    source: "human",
  },
  graph: {
    version: 1,
    diagramId: "diagram_workflow",
    nodes: [{ id: "readme", label: "README.md", kind: "documentation", path: "README.md" }],
    edges: [],
    annotations: [{
      id: "ann_stale",
      nodeId: "readme",
      body: "旧讨论",
      author: "human",
      createdAt: "2026-11-06T00:01:00.000Z",
      anchorStatus: "detached",
      replies: [{ id: "reply_human", author: "human", body: "先回复", createdAt: "2026-11-06T00:01:30.000Z" }],
    }],
  },
  messages: [{ id: "msg_human", sessionId: "session_workflow", author: "human", body: "更新 README", createdAt: "2026-11-06T00:01:00.000Z", status: "pending" }],
  proposals: [{ id: "proposal_pending", sessionId: "session_workflow", title: "Draft", summary: "", graphRevision: 4, status: "pending", createdAt: "2026-11-06T00:02:00.000Z", changes: [], createdBy: "ai" }],
};

describe("agent workflow contract", () => {
  it("returns ordered, read-only-safe steps with explicit prerequisites", () => {
    const workflow = buildAgentWorkflow(snapshot);
    expect(workflow).toMatchObject({ version: 1, sessionId: "session_workflow", graphRevision: 4 });
    expect(workflow.steps.map((step) => step.id)).toEqual([
      "visual_context", "reply_or_wait", "draft", "preflight", "proposal", "human_review", "apply", "rescan",
    ]);
    expect(workflow.steps.every((step) => step.version === 1 && step.grantsWriteAuthority === false)).toBe(true);
    expect(workflow.steps.slice(0, 4).every((step) => step.readOnly === true)).toBe(true);
    expect(workflow.steps.filter((step) => step.writes === "project").map((step) => step.id)).toEqual(["apply"]);
    expect(workflow.steps.find((step) => step.id === "preflight").requires).toContain("candidate changes");
    expect(workflow.steps.find((step) => step.id === "proposal").requires).toContain("staleThreads === 0");
    expect(workflow.steps.find((step) => step.id === "apply").requires).toContain("valid one-time receipt");
    expect(workflow.steps.find((step) => step.id === "rescan").output).toContain("PRESERVATION_JSON");
    expect(workflow.steps.find((step) => step.id === "visual_context").input).toContain("sourceEvidence");
    expect(workflow.steps.find((step) => step.id === "visual_context").output).toContain("NODE_CONTEXT_JSON");
    expect(workflow.steps.find((step) => step.id === "visual_context").output).toContain("BRIEF_JSON");
    expect(workflow.steps.find((step) => step.id === "visual_context").output).toContain("DECISION_TRAIL_JSON");
    expect(workflow).toMatchObject({
      graph: { nodes: 1, annotations: 1, staleAnnotations: 1 },
      conversation: { pendingMessages: 1, nextActor: "human" },
      proposals: { pending: 1, approved: 0 },
    });
    expect(workflow.focus).toMatchObject({ nodeId: "readme", nodePath: "README.md" });
    expect(workflow.selection).toMatchObject({ nodeCount: 1, readOnly: true, source: "human" });
    expect(workflow.steps.find((step) => step.id === "visual_context").input).toContain("selectionScope");
    expect(workflow.reviewReadiness).toMatchObject({ version: 1, readOnly: true, grantsWriteAuthority: false });
    expect(["ready", "review", "blocked"]).toContain(workflow.reviewReadiness.status);
    expect(workflow.blocked.join(" ")).toContain("stale annotation thread");
    expect(workflow.steps.find((step) => step.id === "reply_or_wait")).toMatchObject({ actor: "human", readOnly: true });
    expect(workflow.safety.join(" ")).toContain("one-time human receipt");
    expect(workflow.safety.join(" ")).toContain("ready does not approve");
  });

  it("waits for a human when the latest thread reply is from AI", () => {
    const next = structuredClone(snapshot);
    next.graph.annotations[0].anchorStatus = "anchored";
    next.graph.annotations[0].replies.push({ id: "reply_ai", author: "ai", body: "我已理解", createdAt: "2026-11-06T00:02:00.000Z" });
    const workflow = buildAgentWorkflow(next);
    expect(workflow.conversation.nextActor).toBe("human");
    const replyStep = workflow.steps.find((step) => step.id === "reply_or_wait");
    expect(replyStep.actor).toBe("human");
    expect(replyStep.tool).toBeUndefined();
  });

  it("allows an AI reply only for a clean thread ending with a human", () => {
    const next = structuredClone(snapshot);
    next.graph.annotations[0].anchorStatus = "anchored";
    const workflow = buildAgentWorkflow(next);
    expect(workflow.conversation.nextActor).toBe("ai");
    expect(workflow.blocked).toEqual([]);
    expect(workflow.reviewReadiness).toMatchObject({ version: 1, readOnly: true, grantsWriteAuthority: false });
    expect(["ready", "review", "blocked"]).toContain(workflow.reviewReadiness.status);
    expect(workflow.steps.find((step) => step.id === "reply_or_wait")).toMatchObject({
      actor: "ai",
      tool: "reply_to_visual_context",
      writes: "session",
    });
  });
});
