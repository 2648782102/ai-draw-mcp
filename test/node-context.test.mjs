import { describe, expect, it } from "vitest";
import { buildNodeContext } from "../dist/domain/node-context.js";

const snapshot = {
  version: 1,
  id: "session_node",
  title: "Node context",
  createdAt: "2026-11-06T00:00:00.000Z",
  updatedAt: "2026-11-06T00:10:00.000Z",
  workspaceRoot: "/tmp/ai-draw-node",
  graphRevision: 3,
  activeDiagramId: "diagram_node",
  graph: {
    version: 1,
    diagramId: "diagram_node",
    nodes: [
      {
        id: "service",
        label: "Service",
        kind: "file",
        path: "src/service.ts",
        group: "src",
        x: 120,
        y: 80,
        metadata: { layoutSource: "human" },
        sourceEvidence: [{
          version: 1,
          kind: "definition",
          path: "src/service.ts",
          line: 2,
          excerpt: "export class Service {}",
        }],
      },
      { id: "helper", label: "Helper", kind: "file", path: "src/helper.ts" },
      { id: "readme", label: "README", kind: "documentation", path: "README.md" },
    ],
    edges: [
      { id: "edge_import", from: "service", to: "helper", label: "./helper.js", kind: "imports" },
      { id: "edge_contains", from: "readme", to: "service", label: "contains", kind: "contains" },
    ],
    annotations: [
      {
        id: "thread_current",
        nodeId: "service",
        nodeLabel: "Service",
        nodePath: "src/service.ts",
        anchorStatus: "anchored",
        body: "Please rename this module",
        author: "human",
        createdAt: "2026-11-06T00:01:00.000Z",
        replies: [{ id: "reply_ai", author: "ai", body: "Understood", createdAt: "2026-11-06T00:02:00.000Z", status: "pending" }],
      },
      {
        id: "thread_stale",
        nodeId: "service",
        nodeLabel: "Old Service",
        nodePath: "src/service.ts",
        anchorStatus: "outdated",
        body: "Old discussion",
        author: "human",
        createdAt: "2026-11-06T00:01:00.000Z",
      },
      {
        id: "thread_other",
        nodeId: "readme",
        body: "Unrelated",
        author: "human",
        createdAt: "2026-11-06T00:01:00.000Z",
      },
    ],
  },
  focus: {
    version: 1,
    nodeId: "service",
    nodeLabel: "Service",
    nodePath: "src/service.ts",
    graphRevision: 3,
    updatedAt: "2026-11-06T00:09:00.000Z",
    source: "human",
  },
  graphDiffs: [
    {
      version: 1,
      fromRevision: 2,
      toRevision: 3,
      createdAt: "2026-11-06T00:08:00.000Z",
      source: "human",
      diagramId: "diagram_node",
      nodes: { added: 0, removed: 0, updated: 1 },
      edges: { added: 0, removed: 0, updated: 1 },
      items: [
        { entity: "node", change: "updated", id: "service", label: "Service", fields: [{ field: "label", before: "Old Service", after: "Service" }] },
        { entity: "edge", change: "updated", id: "edge_import", label: "Service → Helper" },
        { entity: "node", change: "updated", id: "readme", label: "README" },
      ],
      summary: ["1 node updated", "1 edge updated"],
    },
  ],
  messages: [],
  proposals: [],
};

describe("read-only node context", () => {
  it("aggregates one node's evidence, threads, edges, focus, and related diffs", () => {
    const context = buildNodeContext(snapshot, undefined, 5);
    expect(context).toMatchObject({ version: 1, nodeId: "service", graphRevision: 3 });
    expect(context.node.sourceEvidence[0]).toMatchObject({ path: "src/service.ts", line: 2 });
    expect(context.annotationThreads.map((thread) => thread.id)).toEqual(["thread_current", "thread_stale"]);
    expect(context.staleThreadCount).toBe(1);
    expect(context.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({ direction: "outgoing", otherNodeId: "helper", otherNodeLabel: "Helper" }),
      expect.objectContaining({ direction: "incoming", otherNodeId: "readme" }),
    ]));
    expect(context.graphDiffs?.[0].items.map((item) => item.id)).toEqual(["service", "edge_import"]);
    expect(context.focus).toMatchObject({ active: true, source: "human" });
    expect(context.safety).toMatchObject({ readOnly: true, grantsWriteAuthority: false });
    expect(context.relatedNodeLabels).toEqual({ helper: "Helper", readme: "README" });
  });

  it("uses an explicit node ID and rejects missing graphs or unknown nodes", () => {
    const explicit = buildNodeContext(snapshot, "helper", 1);
    expect(explicit.nodeId).toBe("helper");
    expect(explicit.focus).toMatchObject({ active: false, stale: true });
    expect(explicit.edges).toHaveLength(1);
    expect(explicit.annotationThreads).toEqual([]);
    expect(() => buildNodeContext({ ...snapshot, graph: undefined, focus: undefined }, undefined)).toThrow(/No VisualGraph/);
    expect(() => buildNodeContext({ ...snapshot, focus: undefined }, undefined)).toThrow(/Provide node_id/);
    expect(() => buildNodeContext(snapshot, "missing")).toThrow(/Unknown graph node/);
  });

  it("is exported as a versioned shared contract and named by the workflow", async () => {
    const [{ buildAgentWorkflow }, types] = await Promise.all([
      import("../dist/domain/agent-workflow.js"),
      import("node:fs/promises").then((fs) => fs.readFile(new URL("../src/domain/types.ts", import.meta.url), "utf8")),
    ]);
    expect(types).toContain("export interface NodeContext");
    const workflow = buildAgentWorkflow(snapshot);
    expect(workflow.steps.find((step) => step.id === "visual_context")?.output).toContain("NODE_CONTEXT_JSON");
  });
});
