import { describe, expect, it } from "vitest";
import { inspectProposalChanges } from "../dist/domain/proposal-preflight.js";

const workspaceRoot = "/tmp/ai-draw-preflight-workspace";
const graph = {
  version: 1,
  diagramId: "diagram_preflight",
  nodes: [
    { id: "readme", label: "README.md", kind: "documentation", path: "README.md" },
    { id: "docs", label: "docs/", kind: "directory", path: "docs" },
  ],
  edges: [],
  annotations: [],
};

describe("proposal preflight", () => {
  it("rejects duplicate, unsafe, and mismatched file operations", async () => {
    const summary = await inspectProposalChanges({
      workspaceRoot,
      graph,
      changes: [
        { id: "one", kind: "update", path: "README.md", content: "# Demo\n" },
        { id: "two", kind: "create", path: "README.md", content: "# Duplicate\n" },
        { id: "three", kind: "update", path: "../outside.txt", content: "nope" },
        { id: "four", kind: "delete", path: "old.txt" },
      ],
      stats: new Map([
        [`${workspaceRoot}/README.md`, { isFile: () => true }],
      ]),
      contents: new Map([[`${workspaceRoot}/README.md`, "# Demo\n"]]),
    });
    expect(summary.safe).toBe(false);
    expect(summary.blockers).toBeGreaterThan(0);
    expect(summary.findings.map((finding) => finding.code)).toContain("duplicate_path");
    expect(summary.findings.map((finding) => finding.code)).toContain("unsafe_path");
    expect(summary.findings.map((finding) => finding.code)).toContain("unsupported_kind");
    expect(summary.findings.map((finding) => finding.code)).toContain("create_overwrite");
    expect(summary.findings.map((finding) => finding.code)).toContain("no_content_change");
    expect(summary.guidance).toContain("Fix every blocker");
  });

  it("accepts a safe new file and reports graph references", async () => {
    const summary = await inspectProposalChanges({
      workspaceRoot,
      graph,
      changes: [{ id: "one", kind: "create", path: "docs/NEW.md", content: "# New\n" }],
      stats: new Map([[`${workspaceRoot}/docs/NEW.md`, null]]),
      contents: new Map(),
    });
    expect(summary).toMatchObject({ version: 1, safe: true, blockers: 0, files: 1, newFiles: 1 });
    expect(summary.graphReferencedPaths).toEqual([]);
  });
});
