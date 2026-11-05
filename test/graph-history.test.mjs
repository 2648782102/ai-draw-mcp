import { describe, expect, it } from "vitest";
import { parseGraphHistory } from "../dist/domain/graph-history.js";

const graph = {
  version: 1,
  diagramId: "diagram_history",
  nodes: [{ id: "readme", label: "README.md", kind: "documentation", path: "README.md" }],
  edges: [],
  annotations: [],
};

const entry = {
  version: 1,
  graph,
  graphRevision: 1,
  source: "human",
  createdAt: "2026-11-06T00:00:00.000Z",
};

describe("graph history contract", () => {
  it("parses bounded past/future entries", () => {
    expect(parseGraphHistory(undefined, 12)).toBeUndefined();
    expect(parseGraphHistory({ version: 1, past: [entry], future: [] }, 12)).toMatchObject({
      version: 1,
      past: [{ graphRevision: 1, source: "human" }],
      future: [],
    });
  });

  it("rejects malformed, unsupported, or non-finite history", () => {
    expect(() => parseGraphHistory({ version: 2, past: [], future: [] }, 12)).toThrow(/unsupported version/);
    expect(() => parseGraphHistory({ version: 1, past: "no", future: [] }, 12)).toThrow(/past\/future must be arrays/);
    expect(() => parseGraphHistory({ version: 1, past: [{ ...entry, graphRevision: Infinity }], future: [] }, 12))
      .toThrow(/graphRevision must be a finite number/);
    expect(() => parseGraphHistory({ version: 1, past: [{ ...entry, source: "agent" }], future: [] }, 12))
      .toThrow(/source is invalid/);
  });
});
