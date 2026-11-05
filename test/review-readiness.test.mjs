import { describe, expect, it } from "vitest";
import { buildReviewReadiness } from "../dist/domain/review-readiness.js";

const snapshot = {
  version: 1,
  id: "session_readiness",
  title: "Review readiness",
  createdAt: "2026-11-06T00:00:00.000Z",
  updatedAt: "2026-11-06T00:10:00.000Z",
  workspaceRoot: "/workspace",
  graphRevision: 3,
  activeDiagramId: "diagram_readiness",
  graph: {
    version: 1,
    diagramId: "diagram_readiness",
    nodes: [
      { id: "readme", label: "README.md", kind: "documentation", path: "README.md" },
      { id: "service", label: "Service", kind: "file", path: "src/service.ts" },
    ],
    edges: [],
    annotations: [
      {
        id: "thread_stale",
        nodeId: "service",
        nodeLabel: "Old Service",
        anchorStatus: "outdated",
        body: "Old discussion",
        author: "human",
        createdAt: "2026-11-06T00:01:00.000Z",
      },
      {
        id: "thread_waiting",
        nodeId: "readme",
        nodeLabel: "README.md",
        nodePath: "README.md",
        anchorStatus: "anchored",
        body: "Please wait for me",
        author: "human",
        createdAt: "2026-11-06T00:02:00.000Z",
        replies: [{ id: "reply_ai", author: "ai", body: "Understood", createdAt: "2026-11-06T00:03:00.000Z" }],
      },
    ],
  },
  messages: [{
    id: "msg_pending",
    sessionId: "session_readiness",
    author: "human",
    body: "Review safety notes first",
    createdAt: "2026-11-06T00:04:00.000Z",
    status: "pending",
  }],
  proposals: [{
    id: "proposal_approved",
    sessionId: "session_readiness",
    title: "Update README",
    summary: "Safety note",
    graphRevision: 3,
    status: "approved",
    createdAt: "2026-11-06T00:05:00.000Z",
    approvedAt: "2026-11-06T00:06:00.000Z",
    changes: [{
      id: "change_docs",
      kind: "update",
      path: "README.md",
      content: "# Demo\n\nSafety note\n",
    }],
    createdBy: "ai",
    contentHash: "sha256_readiness",
    approvalId: "must-not-leak-id",
    approvalGrant: "must-not-leak-grant",
    approvalExpiresAt: "2026-11-06T00:16:00.000Z",
    metadata: { approvalGrant: "must-not-leak-metadata" },
  }],
};

describe("read-only review readiness", () => {
  it("aggregates brief blockers and trail gaps without approval secrets", () => {
    const readiness = buildReviewReadiness(snapshot);
    const serialized = JSON.stringify(readiness);
    expect(readiness).toMatchObject({ version: 1, sessionId: "session_readiness", graphRevision: 3, status: "blocked" });
    expect(readiness.brief.blockers.length).toBeGreaterThan(0);
    expect(readiness.decisionTrail.gaps.length).toBeGreaterThan(0);
    expect(readiness.reviewPoints.map((point) => point.source)).toEqual(expect.arrayContaining(["brief", "decision_trail"]));
    expect(readiness.reviewPoints.some((point) => point.severity === "action")).toBe(true);
    expect(readiness.safety).toMatchObject({
      readOnly: true,
      grantsWriteAuthority: false,
      excludesApprovalGrants: true,
      projectWritesRequireHumanApproval: true,
    });
    expect(readiness.guidance.join(" ")).toContain("full proposal line diff");
    for (const secret of ["must-not-leak-id", "must-not-leak-grant", "must-not-leak-metadata", "approvalExpiresAt"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("becomes ready only when neither source reports blockers or gaps", () => {
    const clean = {
      ...snapshot,
      graph: { ...snapshot.graph, annotations: [] },
      messages: [],
      proposals: [],
    };
    const readiness = buildReviewReadiness(clean);
    expect(readiness).toMatchObject({ version: 1, status: "ready" });
    expect(readiness.brief.blockers).toEqual([]);
    expect(readiness.decisionTrail.gaps).toEqual([]);
    expect(readiness.reviewPoints).toEqual([]);
  });
});
