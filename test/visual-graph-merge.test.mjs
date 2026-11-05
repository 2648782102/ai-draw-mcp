import { describe, expect, it } from "vitest";
import { mergeScannedGraph } from "../dist/domain/visual-graph-merge.js";

const scanned = {
  version: 1,
  diagramId: "diagram_scan",
  nodes: [
    { id: "node_root", label: "workspace", kind: "package", path: ".", group: "root", x: 0, y: 0, metadata: { layoutSource: "auto" } },
    { id: "node_readme", label: "README.md", kind: "documentation", path: "README.md", group: "root", x: 180, y: 0, metadata: { layoutSource: "auto" } },
    { id: "node_src", label: "src/", kind: "directory", path: "src", group: "src", x: 360, y: 0, metadata: { layoutSource: "auto" } },
  ],
  edges: [{ id: "edge_root", from: "node_root", to: "node_readme", label: "contains", kind: "contains" }],
  annotations: [],
};

describe("visual graph merge", () => {
  it("preserves human layout, custom labels, threads and focus across stable-path rescans", () => {
    const current = {
      ...scanned,
      nodes: [
        { ...scanned.nodes[0], label: "我的工作区", x: 11, y: 22, metadata: { layoutSource: "human" } },
        { ...scanned.nodes[1], x: 333, y: 444, metadata: { layoutSource: "human" } },
        { ...scanned.nodes[2], x: 555, y: 666, metadata: { layoutSource: "human" } },
      ],
      annotations: [{
        id: "ann_1",
        nodeId: "node_readme",
        nodeLabel: "README.md",
        nodePath: "README.md",
        anchorStatus: "anchored",
        body: "请补充中文说明",
        author: "human",
        createdAt: "2026-11-06T00:00:00.000Z",
      }],
    };
    const focus = {
      version: 1,
      nodeId: "node_readme",
      nodeLabel: "README.md",
      nodePath: "README.md",
      graphRevision: 2,
      updatedAt: "2026-11-06T00:00:00.000Z",
      source: "human",
    };
    const result = mergeScannedGraph(scanned, current, focus);
    expect(result.graph.nodes.map((node) => node.id)).toEqual(scanned.nodes.map((node) => node.id));
    expect(result.graph.nodes[0]).toMatchObject({ label: "我的工作区", x: 11, y: 22 });
    expect(result.graph.nodes[1]).toMatchObject({ x: 333, y: 444 });
    expect(result.graph.nodes[2].metadata.layoutSource).toBe("human");
    expect(result.graph.annotations[0]).toMatchObject({ nodeId: "node_readme", anchorStatus: "anchored" });
    expect(result.focus).toMatchObject({ nodeId: "node_readme", source: "human" });
    expect(result.preservation).toMatchObject({
      version: 1,
      strategy: "stable-path-merge",
      matchedNodes: 3,
      newNodes: 0,
      removedNodes: 0,
      preservedCoordinates: 3,
      humanCoordinates: 3,
      preservedLabels: 1,
      carriedAnnotations: 1,
      detachedAnnotations: 0,
      preservedFocus: true,
    });
  });

  it("remaps legacy random IDs by path, keeps new nodes auto-placed, and detaches abandoned threads", () => {
    const current = {
      ...scanned,
      nodes: [
        { ...scanned.nodes[0], id: "node_legacy_root", x: 90, y: 80, metadata: { layoutSource: "human" } },
        { ...scanned.nodes[1], id: "node_legacy_readme", label: "说明.md", x: 10, y: 20, metadata: { layoutSource: "human" } },
        { id: "node_deleted", label: "old.ts", kind: "file", path: "src/old.ts", x: 7, y: 9 },
      ],
      annotations: [
        {
          id: "ann_readme",
          nodeId: "node_legacy_readme",
          nodeLabel: "说明.md",
          nodePath: "README.md",
          anchorStatus: "anchored",
          body: "这里要改",
          author: "human",
          createdAt: "2026-11-06T00:00:00.000Z",
        },
        {
          id: "ann_deleted",
          nodeId: "node_deleted",
          nodeLabel: "old.ts",
          nodePath: "src/old.ts",
          anchorStatus: "anchored",
          body: "旧节点讨论",
          author: "human",
          createdAt: "2026-11-06T00:00:00.000Z",
        },
      ],
    };
    const result = mergeScannedGraph(scanned, current, undefined);
    const readme = result.graph.nodes.find((node) => node.path === "README.md");
    const src = result.graph.nodes.find((node) => node.path === "src");
    expect(readme).toMatchObject({ id: "node_readme", label: "说明.md", x: 10, y: 20 });
    expect(src).toMatchObject({ x: 0, y: 0, metadata: { layoutSource: "auto" } });
    expect(result.graph.annotations.find((item) => item.id === "ann_readme")).toMatchObject({
      nodeId: "node_readme",
      anchorStatus: "anchored",
    });
    expect(result.graph.annotations.find((item) => item.id === "ann_deleted")).toMatchObject({
      nodeId: "node_deleted",
      anchorStatus: "detached",
    });
    expect(result.preservation).toMatchObject({
      matchedNodes: 2,
      newNodes: 1,
      removedNodes: 1,
      preservedCoordinates: 2,
      preservedLabels: 1,
      carriedAnnotations: 1,
      detachedAnnotations: 1,
      preservedFocus: false,
    });
    const occupied = result.graph.nodes.map((node) => `${node.x}:${node.y}`);
    expect(new Set(occupied).size).toBe(occupied.length);
  });

  it("marks a matched thread outdated when the scanned node path or label changed", () => {
    const current = {
      ...scanned,
      annotations: [{
        id: "ann_path",
        nodeId: "node_readme",
        nodeLabel: "README.md",
        nodePath: "README.md",
        anchorStatus: "anchored",
        body: "旧路径",
        author: "human",
        createdAt: "2026-11-06T00:00:00.000Z",
      }],
      nodes: [scanned.nodes[1]],
    };
    const changedScanned = {
      ...scanned,
      nodes: [{ ...scanned.nodes[1], label: "GUIDE.md" }],
      edges: [],
    };
    const result = mergeScannedGraph(changedScanned, current, undefined);
    expect(result.graph.annotations[0].anchorStatus).toBe("outdated");
    expect(result.graph.annotations[0].nodeId).toBe("node_readme");
    expect(result.preservation.detachedAnnotations).toBe(0);
    expect(result.preservation.carriedAnnotations).toBe(1);
  });
});
