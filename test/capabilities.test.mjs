import { describe, expect, it } from "vitest";
import { buildCapabilities, SERVER_TOOL_COUNT } from "../dist/domain/capabilities.js";

const snapshot = {
  version: 1,
  id: "session_capabilities",
  title: "Capabilities",
  createdAt: "2026-11-06T00:00:00.000Z",
  updatedAt: "2026-11-06T00:10:00.000Z",
  workspaceRoot: "/private/workspace",
  graphRevision: 2,
  activeDiagramId: "diagram_capabilities",
  graph: {
    version: 1,
    diagramId: "diagram_capabilities",
    nodes: [{ id: "readme", label: "README.md", kind: "documentation", path: "README.md" }],
    edges: [],
    annotations: [],
  },
  messages: [],
  proposals: [{
    id: "proposal_approved",
    sessionId: "session_capabilities",
    title: "Update README",
    summary: "Safety note",
    graphRevision: 2,
    status: "approved",
    createdAt: "2026-11-06T00:05:00.000Z",
    approvedAt: "2026-11-06T00:06:00.000Z",
    changes: [{ id: "change_docs", kind: "update", path: "README.md", content: "# Demo\n" }],
    createdBy: "ai",
    contentHash: "sha256_capabilities",
    approvalId: "must-not-leak-id",
    approvalGrant: "must-not-leak-grant",
    approvalExpiresAt: "2026-11-06T00:16:00.000Z",
    metadata: { approvalGrant: "must-not-leak-metadata" },
  }],
};

describe("read-only capabilities catalogue", () => {
  it("enumerates the tool surface, JSON contracts, and safe next action without secrets", () => {
    const capabilities = buildCapabilities(snapshot, "0.3.3");
    const serialized = JSON.stringify(capabilities);
    expect(SERVER_TOOL_COUNT).toBe(25);
    expect(capabilities).toMatchObject({
      version: 1,
      readOnly: true,
      serverVersion: "0.3.3",
      sessionId: "session_capabilities",
      graphRevision: 2,
      toolCount: 25,
    });
    expect(capabilities.tools).toHaveLength(25);
    expect(new Set(capabilities.tools.map((tool) => tool.name)).size).toBe(25);
    expect(capabilities.tools.filter((tool) => tool.writes === "project").map((tool) => tool.name)).toEqual(["apply_visual_proposal"]);
    expect(capabilities.tools.find((tool) => tool.name === "get_capabilities")).toMatchObject({ output: "CAPABILITIES_JSON", readOnly: true, writes: "none" });
    expect(capabilities.contracts.map((contract) => contract.marker)).toContain("CAPABILITIES_JSON");
    expect(capabilities.workflow).toMatchObject({ version: 1, steps: 8, projectWriteTool: "apply_visual_proposal" });
    expect(capabilities.nextAction).toContain("get_visual_context");
    expect(capabilities.copyText).toContain("25 tools");
    expect(capabilities.safety).toMatchObject({
      readOnly: true,
      grantsWriteAuthority: false,
      excludesApprovalGrants: true,
      projectWritesRequireHumanApproval: true,
      excludesWorkspaceAbsolutePaths: true,
    });
    for (const unsafe of ["must-not-leak", "approvalGrant", "/private/workspace"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("uses workflow blockers to recommend the next safe action", () => {
    const blocked = {
      ...snapshot,
      graph: {
        ...snapshot.graph,
        nodes: [{ id: "service", label: "Service", kind: "file", path: "src/service.ts" }],
        annotations: [{
          id: "thread_stale",
          nodeId: "service",
          nodeLabel: "Old Service",
          anchorStatus: "outdated",
          body: "Old discussion",
          author: "human",
          createdAt: "2026-11-06T00:01:00.000Z",
        }],
      },
      messages: [{
        id: "msg_pending",
        sessionId: "session_capabilities",
        author: "human",
        body: "Please reply first",
        createdAt: "2026-11-06T00:07:00.000Z",
        status: "pending",
      }],
    };
    const capabilities = buildCapabilities(blocked, "0.3.3");
    expect(capabilities.workflow.blocked.length).toBeGreaterThan(0);
    expect(capabilities.nextAction).toContain("Resolve WORKFLOW_JSON blockers");
    expect(capabilities.copyText).toContain("workflow blocked");
  });
});
