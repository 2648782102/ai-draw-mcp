import { describe, expect, it } from "vitest";
import { buildChangeTemplateDraft, listChangeTemplates } from "../dist/domain/change-templates.js";

const snapshot = {
  version: 1,
  id: "session_templates",
  title: "Template test",
  createdAt: "2026-11-06T00:00:00.000Z",
  updatedAt: "2026-11-06T00:05:00.000Z",
  workspaceRoot: "/workspace",
  graphRevision: 7,
  graph: {
    version: 1,
    diagramId: "diagram_templates",
    nodes: [
      { id: "readme", label: "README.md", kind: "documentation", path: "README.md" },
      { id: "module", label: "shared", kind: "module", path: "src/shared/index.ts" },
    ],
    edges: [],
    annotations: [],
  },
  messages: [],
  proposals: [],
};

describe("read-only change templates", () => {
  it("lists composable templates with their required inputs", () => {
    const payload = listChangeTemplates();
    expect(payload.version).toBe(1);
    expect(payload.templates.map((template) => template.id)).toEqual([
      "update_documentation",
      "add_test",
      "create_module",
    ]);
    expect(payload.templates.every((template) => template.nextTools.includes("preflight_visual_proposal"))).toBe(true);
  });

  it("expands a documentation update from a graph node without creating a proposal", () => {
    const draft = buildChangeTemplateDraft(snapshot, {
      templateId: "update_documentation",
      nodeId: "readme",
      content: "# 中文说明\n",
    });
    expect(draft).toMatchObject({ version: 1, templateId: "update_documentation", graphRevision: 7 });
    expect(draft.citedNodeIds).toEqual(["readme"]);
    expect(draft.changes[0]).toMatchObject({ kind: "update", path: "README.md", encoding: "utf8" });
    expect(draft.guidance).toContain("does not create a proposal");
  });

  it("derives a test path from a source node and keeps starter content reviewable", () => {
    const draft = buildChangeTemplateDraft(snapshot, {
      templateId: "add_test",
      nodeId: "module",
      title: "keeps graph contracts",
    });
    expect(draft.changes[0]).toMatchObject({ kind: "create", path: "src/shared/index.test.ts" });
    expect(draft.changes[0].content).toContain("keeps graph contracts");
    expect(draft.changes[0].rationale).toContain("review");
  });

  it("rejects unsafe paths, missing nodes, and missing update content", () => {
    expect(() => buildChangeTemplateDraft(snapshot, {
      templateId: "update_documentation",
      path: "../outside.md",
      content: "nope",
    })).toThrow(/safe workspace-relative/);
    expect(() => buildChangeTemplateDraft(snapshot, { templateId: "add_test", nodeId: "missing" })).toThrow(/not found/);
    expect(() => buildChangeTemplateDraft(snapshot, { templateId: "update_documentation", path: "README.md" })).toThrow(/content is required/);
  });
});
