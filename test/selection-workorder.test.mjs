import { describe, expect, it } from "vitest";
import { buildSelectionWorkorder } from "../dist/domain/selection-workorder.js";
import { buildSelection } from "../dist/domain/selection.js";

const graph = {
  version: 1,
  diagramId: "diagram_workorder",
  nodes: [
    {
      id: "readme",
      label: "README.md",
      kind: "documentation",
      path: "README.md",
      sourceEvidence: [{ version: 1, kind: "heading", path: "README.md", line: 1, excerpt: "# Demo" }],
    },
    {
      id: "service",
      label: "Service",
      kind: "file",
      path: "src/service.ts",
      sourceEvidence: [{ version: 1, kind: "definition", path: "src/service.ts", line: 3, excerpt: "export class Service" }],
    },
    { id: "unsafe", label: "Secret", kind: "file", path: "/absolute/secret.ts" },
    { id: "folder", label: "Folder", kind: "package", path: "." },
  ],
  edges: [{ id: "edge_1", from: "readme", to: "service", label: "mentions", kind: "contains" }],
  annotations: [{
    id: "ann_1",
    nodeId: "service",
    nodeLabel: "Service",
    body: "Add a regression test for this module",
    author: "human",
    createdAt: "2026-11-06T00:05:00.000Z",
  }],
};

const snapshot = {
  version: 1,
  id: "session_workorder",
  title: "Workorder test",
  createdAt: "2026-11-06T00:00:00.000Z",
  updatedAt: "2026-11-06T00:10:00.000Z",
  workspaceRoot: "/private/workspace",
  graphRevision: 4,
  graph,
  focus: undefined,
  messages: [{
    id: "msg_1",
    sessionId: "session_workorder",
    author: "human",
    body: "Please update these selected modules",
    createdAt: "2026-11-06T00:06:00.000Z",
    status: "pending",
  }],
  proposals: [],
};

describe("read-only selection workorder", () => {
  it("turns a bounded selection into a safe pre-proposal checklist", () => {
    const selection = buildSelection(["readme", "service", "readme"], graph, 4, "2026-11-06T00:11:00.000Z");
    const workorder = buildSelectionWorkorder({ ...snapshot, selection }, { itemLimit: 6 });
    const serialized = JSON.stringify(workorder);
    expect(workorder).toMatchObject({
      version: 1,
      readOnly: true,
      sessionId: "session_workorder",
      graphRevision: 4,
      selectionRevision: 4,
      source: "human",
      selectedCount: 2,
      selectionLimit: 24,
    });
    expect(workorder.nodes.map((node) => node.nodeId)).toEqual(["readme", "service"]);
    expect(workorder.safePaths.map((item) => item.path)).toEqual(["README.md", "src/service.ts"]);
    expect(workorder.intent.map((item) => item.kind)).toEqual(["message", "annotation"]);
    expect(workorder.internalEdges).toHaveLength(1);
    expect(workorder.evidence[0].fileLine).toBe("README.md:1:1");
    expect(workorder.safety).toMatchObject({
      readOnly: true,
      grantsWriteAuthority: false,
      excludesProjectChangeContent: true,
      projectWritesRequireHumanApproval: true,
    });
    expect(workorder.copyText).toContain("Selection workorder");
    expect(serialized).not.toContain("approvalGrant");
    expect(serialized).not.toContain("/private/workspace");
    expect(serialized).not.toContain("/absolute/secret.ts");
    expect(serialized).not.toContain('"content":');
    expect(Object.keys(workorder)).not.toContain("changes");
  });

  it("reports gaps for missing selection, unsafe-only nodes, and blocked readiness", () => {
    const empty = buildSelectionWorkorder(snapshot);
    expect(empty.selectedCount).toBe(0);
    expect(empty.gaps.join(" ")).toContain("No active human selection");
    expect(empty.safePaths).toEqual([]);

    const unsafeOnly = buildSelectionWorkorder({
      ...snapshot,
      selection: buildSelection(["unsafe", "folder"], graph, 4, "2026-11-06T00:11:00.000Z"),
    });
    expect(unsafeOnly.selectedCount).toBe(2);
    expect(unsafeOnly.safePaths).toEqual([]);
    expect(unsafeOnly.gaps.join(" ")).toContain("no safe workspace-relative file paths");
    expect(JSON.stringify(unsafeOnly)).not.toContain("/absolute/secret.ts");
  });

  it("stays read-only when a pending proposal blocks the next draft", () => {
    const selection = buildSelection(["readme"], graph, 4, "2026-11-06T00:11:00.000Z");
    const blocked = {
      ...snapshot,
      selection,
      proposals: [{
        id: "proposal_pending",
        sessionId: snapshot.id,
        title: "Pending",
        summary: "Needs review",
        graphRevision: 4,
        status: "pending",
        createdAt: "2026-11-06T00:09:00.000Z",
        changes: [],
        createdBy: "ai",
      }],
    };
    const workorder = buildSelectionWorkorder(blocked);
    expect(workorder.reviewReadiness.status).toBe("blocked");
    expect(workorder.gaps.join(" ")).toContain("pending proposal");
    expect(workorder.nextActions.join(" ")).toContain("preflight_visual_proposal");
    expect(JSON.stringify(workorder)).not.toContain("proposal_pending");
  });
});
