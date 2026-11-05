import { describe, expect, it } from "vitest";
import { buildSourceNavigation } from "../dist/domain/source-navigation.js";

const snapshot = {
  version: 1,
  id: "session_navigation",
  title: "Source navigation",
  createdAt: "2026-11-06T00:00:00.000Z",
  updatedAt: "2026-11-06T00:00:00.000Z",
  workspaceRoot: "/workspace",
  graphRevision: 2,
  activeDiagramId: "diagram_navigation",
  graph: {
    version: 1,
    diagramId: "diagram_navigation",
    nodes: [
      {
        id: "service",
        label: "Service",
        kind: "file",
        path: "src/service.ts",
        sourceEvidence: [
          { version: 1, kind: "definition", path: "src/service.ts", line: 7, excerpt: "export class Service {}" },
          { version: 1, kind: "import", path: "../outside.ts", line: 2, excerpt: "unsafe" },
          { version: 1, kind: "import", path: "/etc/passwd", line: 1, excerpt: "absolute" },
          { version: 1, kind: "import", path: ".env.local", line: 1, excerpt: "secret-like" },
          { version: 1, kind: "import", path: "src/service.ts", line: 0, excerpt: "bad line" },
        ],
      },
      {
        id: "readme",
        label: "README",
        kind: "documentation",
        path: "README.md",
        sourceEvidence: [
          { version: 1, kind: "heading", path: "README.md", line: 1, excerpt: "# Demo" },
        ],
      },
    ],
    edges: [],
    annotations: [],
  },
  messages: [],
  proposals: [],
};

describe("read-only source navigation", () => {
  it("returns bounded, relative copyable navigation without opening files", () => {
    const navigation = buildSourceNavigation(snapshot, { limit: 1 });
    const serialized = JSON.stringify(navigation);
    expect(navigation).toMatchObject({ version: 1, readOnly: true, totalEvidence: 2, returnedItems: 1 });
    expect(navigation.items[0]).toMatchObject({
      nodeId: "service",
      kind: "definition",
      fileLine: "src/service.ts:7:1",
      vscodeUri: "vscode://file/src/service.ts:7:1",
      cursorUri: "cursor://file/src/service.ts:7:1",
      editorCommand: "code --goto src/service.ts:7:1",
    });
    expect(navigation.copyText).toContain("src/service.ts:7:1");
    expect(navigation.safety).toMatchObject({
      readOnly: true,
      grantsWriteAuthority: false,
      excludesAbsolutePaths: true,
      doesNotOpenFiles: true,
      projectWritesRequireHumanApproval: true,
    });
    for (const unsafe of ["../outside.ts", "/etc/passwd", ".env.local", "bad line", "approvalGrant", "grantHash"]) {
      expect(serialized).not.toContain(unsafe);
    }
  });

  it("scopes to one node and rejects an unknown node", () => {
    const navigation = buildSourceNavigation(snapshot, { nodeId: "readme" });
    expect(navigation).toMatchObject({ nodeId: "readme", totalEvidence: 1, returnedItems: 1 });
    expect(navigation.items[0].path).toBe("README.md");
    expect(() => buildSourceNavigation(snapshot, { nodeId: "missing" })).toThrow(/Unknown graph node/);
  });

  it("requires a graph and reports an empty read-only copy text", () => {
    expect(() => buildSourceNavigation({ ...snapshot, graph: undefined })).toThrow(/No VisualGraph/);
    const empty = buildSourceNavigation({ ...snapshot, graph: { ...snapshot.graph, nodes: [] } });
    expect(empty).toMatchObject({ version: 1, readOnly: true, totalEvidence: 0, returnedItems: 0 });
    expect(empty.copyText).toContain("No bounded source evidence");
  });
});
