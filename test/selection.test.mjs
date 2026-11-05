import { describe, expect, it } from "vitest";
import {
  buildSelection,
  buildSelectionScope,
  parseSelection,
  SELECTION_LIMIT,
} from "../dist/domain/selection.js";

const graph = {
  version: 1,
  diagramId: "diagram_selection",
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
      sourceEvidence: [
        { version: 1, kind: "definition", path: "src/service.ts", line: 3, excerpt: "export class Service" },
        { version: 1, kind: "import", path: "/absolute/secret.ts", line: 4, excerpt: "unsafe" },
      ],
    },
    { id: "controller", label: "Controller", kind: "file", path: "../outside.ts" },
  ],
  edges: [
    { id: "edge_internal", from: "readme", to: "service", label: "mentions", kind: "contains" },
    { id: "edge_external", from: "service", to: "controller", label: "uses", kind: "imports" },
  ],
  annotations: [],
};

const snapshot = {
  version: 1,
  id: "session_selection",
  title: "Selection",
  createdAt: "2026-11-06T00:00:00.000Z",
  updatedAt: "2026-11-06T00:10:00.000Z",
  workspaceRoot: "/private/workspace",
  graphRevision: 4,
  graph,
  focus: {
    version: 1,
    nodeId: "readme",
    nodeLabel: "README.md",
    nodePath: "README.md",
    graphRevision: 4,
    updatedAt: "2026-11-06T00:09:00.000Z",
    source: "human",
  },
  viewport: {
    version: 1,
    scale: 1.25,
    x: -12,
    y: 8,
    updatedAt: "2026-11-06T00:09:30.000Z",
    source: "human",
  },
  messages: [],
  proposals: [],
};

describe("bounded human selection", () => {
  it("builds and validates a bounded human selection", () => {
    const selection = buildSelection(["readme", "service", "readme"], graph, 4, "2026-11-06T00:11:00.000Z");
    expect(selection).toMatchObject({
      version: 1,
      nodeIds: ["readme", "service"],
      graphRevision: 4,
      source: "human",
    });
    expect(parseSelection(selection)).toEqual(selection);
    expect(SELECTION_LIMIT).toBe(24);
    expect(() => buildSelection(["missing"], graph, 4)).toThrow(/Unknown selection node/);
    expect(() => buildSelection(Array.from({ length: 25 }, (_, index) => "readme" + index), graph, 4)).toThrow();
    expect(() => parseSelection({ ...selection, source: "ai" })).toThrow(/source must be human/);
    expect(() => parseSelection({ ...selection, unexpected: true })).toThrow(/unknown property/);
    expect(() => parseSelection({ ...selection, nodeIds: ["readme", "readme"] })).toThrow(/duplicates/);
  });

  it("projects selected nodes, internal edges, and safe relative evidence only", () => {
    const selection = buildSelection(["readme", "service"], graph, 4, "2026-11-06T00:11:00.000Z");
    const scope = buildSelectionScope({ ...snapshot, selection }, { evidenceLimit: 1, edgeLimit: 1 });
    const serialized = JSON.stringify(scope);
    expect(scope).toMatchObject({
      version: 1,
      readOnly: true,
      sessionId: "session_selection",
      graphRevision: 4,
      selectionRevision: 4,
      source: "human",
      limit: 24,
      selectedCount: 2,
      totalEdges: 1,
      totalEvidence: 2,
    });
    expect(scope.nodes.map((node) => node.nodeId)).toEqual(["readme", "service"]);
    expect(scope.nodes.find((node) => node.nodeId === "controller")).toBeUndefined();
    expect(scope.edges).toEqual([{ id: "edge_internal", from: "readme", to: "service", label: "mentions", kind: "contains" }]);
    expect(scope.evidence).toHaveLength(1);
    expect(scope.evidence[0].fileLine).toBe("README.md:1:1");
    expect(scope.focus).toMatchObject({ nodeId: "readme", included: true });
    expect(scope.viewport).toMatchObject({ scale: 1.25 });
    expect(scope.safety).toMatchObject({
      readOnly: true,
      grantsWriteAuthority: false,
      excludesApprovalGrants: true,
      excludesAbsolutePaths: true,
      projectWritesRequireHumanApproval: true,
    });
    expect(scope.copyText).toContain("2 node(s)");
    expect(serialized).not.toContain("/private/workspace");
    expect(serialized).not.toContain("/absolute/secret.ts");
    expect(serialized).not.toContain("approvalGrant");
  });

  it("drops stale selection IDs and stays empty when no selection exists", () => {
    const stale = buildSelection(["readme"], graph, 1, "2026-11-06T00:01:00.000Z");
    const scope = buildSelectionScope({
      ...snapshot,
      graph: { ...graph, nodes: [graph.nodes[1]], edges: [] },
      selection: stale,
      focus: undefined,
      viewport: undefined,
    });
    expect(scope.selectedCount).toBe(0);
    expect(scope.source).toBe("none");
    expect(scope.selectionRevision).toBeNull();
    expect(scope.copyText).toContain("no active selection");
    expect(scope.evidence).toEqual([]);
  });
});
