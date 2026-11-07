import { describe, expect, it } from "vitest";
import {
  MCP_INSTRUCTIONS,
  buildAgentBrief,
  buildAgentCapabilities,
  buildAgentDiagnostics,
  buildAgentSessionProjection,
} from "../dist/infra/agent-context.js";

const snapshot = {
  version: 1,
  id: "session_agent_context",
  title: "Agent context",
  createdAt: "2026-11-07T00:00:00.000Z",
  updatedAt: "2026-11-07T00:10:00.000Z",
  workspaceRoot: "/private/workspace",
  graphRevision: 2,
  graph: {
    version: 1,
    diagramId: "diagram_agent_context",
    nodes: [{ id: "readme", label: "README.md", kind: "documentation", path: "README.md" }],
    edges: [],
    annotations: [],
  },
  messages: [],
  proposals: [{
    id: "proposal_approved",
    sessionId: "session_agent_context",
    title: "Update README",
    summary: "Credential boundary",
    graphRevision: 2,
    status: "approved",
    createdAt: "2026-11-07T00:05:00.000Z",
    approvedAt: "2026-11-07T00:06:00.000Z",
    changes: [{ id: "change_docs", kind: "update", path: "README.md", content: "# Demo\n" }],
    createdBy: "ai",
    contentHash: "sha256_agent_context",
    approvalId: "must-not-leak-id",
    approvalGrant: "must-not-leak-grant",
    approvalExpiresAt: "2026-11-07T00:16:00.000Z",
    metadata: { approvalGrant: "must-not-leak-metadata", event: "proposal_approved", approvalId: "must-not-leak-message-id" },
  }],
};

const sessions = { getSnapshot: () => snapshot };

describe("agent-first MCP context", () => {
  it("publishes agent-first instructions without making the browser the primary surface", () => {
    expect(MCP_INSTRUCTIONS).toContain("Prefer MCP tools and resources directly inside the agent");
    expect(MCP_INSTRUCTIONS).toContain("do not open a browser unless the human explicitly asks");
    expect(MCP_INSTRUCTIONS).toContain("ai-draw://board/session");
  });

  it("projects credential-free bundles and derived resources without mutating session state", () => {
    const bundle = buildAgentSessionProjection(sessions);
    const serialized = JSON.stringify({
      bundle,
      brief: buildAgentBrief(sessions),
      capabilities: buildAgentCapabilities(sessions, "0.3.4"),
      diagnostics: buildAgentDiagnostics(sessions),
    });
    expect(bundle.kind).toBe("ai-draw-session-bundle");
    expect(bundle.exportManifest).toMatchObject({ version: 1, kind: "ai-draw-export-manifest" });
    expect(bundle.session.proposals[0].status).toBe("pending");
    for (const credential of ["must-not-leak"]) {
      expect(serialized).not.toContain(credential);
    }
    expect(serialized).not.toContain('"approvalGrant":');
    expect(serialized).not.toContain('"approvalExpiresAt":');
    expect(serialized).not.toContain('"approvalId":');
    expect(snapshot.proposals[0].status).toBe("approved");
    expect(snapshot.proposals[0].approvalGrant).toBe("must-not-leak-grant");
  });
});
