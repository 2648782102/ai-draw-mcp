import { describe, expect, it } from "vitest";
import { buildViewport, parseViewport } from "../dist/domain/viewport.js";
import { buildSharedBrief } from "../dist/domain/shared-brief.js";
import { buildSessionDiagnostics } from "../dist/domain/session-diagnostics.js";

const snapshot = {
  version: 1,
  id: "session_viewport",
  title: "Viewport",
  createdAt: "2026-11-06T00:00:00.000Z",
  updatedAt: "2026-11-06T00:10:00.000Z",
  workspaceRoot: "/workspace",
  graphRevision: 2,
  graph: {
    version: 1,
    diagramId: "diagram_viewport",
    nodes: [{ id: "readme", label: "README.md", kind: "documentation", path: "README.md" }],
    edges: [],
    annotations: [],
  },
  viewport: {
    version: 1,
    scale: 1.25,
    x: -20,
    y: 40,
    updatedAt: "2026-11-06T00:09:00.000Z",
    source: "human",
  },
  messages: [],
  proposals: [],
};

describe("read-only viewport attention context", () => {
  it("parses bounded human viewport values", () => {
    const viewport = buildViewport(2.5, 12.3, -8.7, "2026-11-06T00:09:00.000Z");
    expect(viewport).toMatchObject({ version: 1, scale: 2.5, source: "human" });
    expect(() => buildViewport(Number.NaN, 0, 0)).toThrow(/finite/);
    expect(() => buildViewport(0.01, 0, 0)).toThrow(/out of range/);
    expect(() => buildViewport(1, 200_000, 0)).toThrow(/out of range/);
    expect(() => parseViewport({ ...viewport, source: "ai" })).toThrow(/source must be human/);
    expect(() => parseViewport({ ...viewport, grant: "write" })).toThrow(/unknown property/);
    expect(() => parseViewport({ ...viewport, updatedAt: "not-a-date" })).toThrow(/valid timestamp/);
  });

  it("exposes viewport in brief and diagnostics without write authority", () => {
    const brief = buildSharedBrief(snapshot);
    expect(brief.viewport).toMatchObject({ version: 1, scale: 1.25, source: "human" });
    expect(brief.safety).toMatchObject({ readOnly: true, grantsWriteAuthority: false });
    const diagnostics = buildSessionDiagnostics(snapshot);
    expect(diagnostics.viewport).toMatchObject({ scale: 1.25, x: -20, y: 40, source: "human" });
    expect(diagnostics.safety.projectWritesRequireHumanApproval).toBe(true);
  });
});
