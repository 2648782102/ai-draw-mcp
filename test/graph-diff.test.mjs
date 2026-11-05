import { describe, expect, it } from "vitest";
import { diffVisualGraph } from "../dist/domain/graph-diff.js";

const before = {
  version: 1,
  diagramId: "diagram_graph_diff",
  nodes: [
    { id: "utils", label: "utils", kind: "module", path: "src/utils", group: "src" },
    { id: "docs", label: "docs", kind: "directory", path: "docs", group: "docs" },
  ],
  edges: [{ id: "edge_1", from: "utils", to: "docs", label: "contains", kind: "contains" }],
  annotations: [],
};

const after = {
  version: 1,
  diagramId: "diagram_graph_diff",
  nodes: [
    { id: "utils", label: "shared", kind: "package", path: "src/shared", group: "shared" },
    { id: "new_file", label: "index.ts", kind: "file", path: "src/shared/index.ts", group: "shared" },
  ],
  edges: [{ id: "edge_1", from: "utils", to: "new_file", label: "exports", kind: "imports" }],
  annotations: [],
};

describe("graph revision diff", () => {
  it("records exact node and edge field changes", () => {
    const diff = diffVisualGraph(before, after, {
      fromRevision: 3,
      toRevision: 4,
      createdAt: "2026-11-06T00:00:00.000Z",
      source: "human",
    });
    expect(diff).toMatchObject({ version: 1, fromRevision: 3, toRevision: 4, source: "human" });
    expect(diff.nodes).toMatchObject({ added: 1, removed: 1, updated: 1 });
    expect(diff.edges.updated).toBe(1);
    const updatedNode = diff.items.find((item) => item.entity === "node" && item.change === "updated");
    expect(updatedNode?.fields?.map((field) => field.field)).toEqual(expect.arrayContaining(["label", "kind", "path", "group"]));
    expect(updatedNode?.fields?.find((field) => field.field === "path")).toMatchObject({
      before: "src/utils",
      after: "src/shared",
    });
  });

  it("treats a missing previous graph as additions", () => {
    const diff = diffVisualGraph(undefined, before, {
      fromRevision: 0,
      toRevision: 1,
      createdAt: "2026-11-06T00:00:00.000Z",
      source: "ai",
    });
    expect(diff.nodes.added).toBe(2);
    expect(diff.edges.added).toBe(1);
    expect(diff.items.every((item) => item.change === "added")).toBe(true);
  });
});
