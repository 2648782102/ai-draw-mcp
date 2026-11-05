import type { GraphNode, SessionSnapshot, VisualGraph } from "./types.js";

export type ChangeTemplateId = "update_documentation" | "add_test" | "create_module";

export interface ChangeTemplateArgument {
  name: "path" | "node_id" | "title" | "content";
  label: string;
  description: string;
  required: boolean;
  kind: "path" | "node" | "text" | "content";
  example?: string;
  defaultValue?: string;
}

export interface ChangeTemplate {
  id: ChangeTemplateId;
  title: string;
  description: string;
  intent: string;
  arguments: ChangeTemplateArgument[];
  nextTools: string[];
}

export interface ChangeTemplateDraft {
  version: 1;
  templateId: ChangeTemplateId;
  title: string;
  summary: string;
  graphRevision: number;
  citedNodeIds: string[];
  changes: Array<{
    id: string;
    kind: "create" | "update";
    path: string;
    content: string;
    encoding: "utf8";
    rationale: string;
  }>;
  guidance: string;
}

export const CHANGE_TEMPLATES: ChangeTemplate[] = [
  {
    id: "update_documentation",
    title: "Update documentation",
    description: "Draft a UTF-8 update for an existing documentation file selected from the graph or supplied as a workspace-relative path.",
    intent: "Use when a human asks to rewrite or extend existing README/docs content after editing the visual graph.",
    arguments: [
      { name: "path", label: "Target path", description: "Workspace-relative documentation file path; defaults to the selected node path.", required: false, kind: "path", example: "README.md" },
      { name: "node_id", label: "Graph node", description: "Optional VisualGraph node that anchors the intent and supplies a default path.", required: false, kind: "node", example: "node_readme" },
      { name: "content", label: "Full file content", description: "The complete UTF-8 content to propose, not a patch fragment.", required: true, kind: "content", example: "# Project\n" },
    ],
    nextTools: ["preflight_visual_proposal", "create_visual_proposal"],
  },
  {
    id: "add_test",
    title: "Add a focused test",
    description: "Draft a new UTF-8 test file beside a selected source node, with a small starter test and explicit human review notes.",
    intent: "Use after a visual change identifies a module that needs a regression test.",
    arguments: [
      { name: "node_id", label: "Graph node", description: "Selected source/document node used to derive a nearby test path.", required: true, kind: "node", example: "node_module" },
      { name: "path", label: "Test path", description: "Optional workspace-relative test path; overrides the derived path.", required: false, kind: "path", example: "test/module.test.mjs" },
      { name: "title", label: "Test title", description: "Short test case description placed in the starter test.", required: false, kind: "text", example: "keeps the graph contract", defaultValue: "keeps the visual contract" },
    ],
    nextTools: ["preflight_visual_proposal", "create_visual_proposal"],
  },
  {
    id: "create_module",
    title: "Create a module stub",
    description: "Draft a new UTF-8 TypeScript module stub from a selected group/path, without overwriting existing files.",
    intent: "Use when a human adds or renames a graph node and wants a minimal file scaffold for the new module.",
    arguments: [
      { name: "path", label: "Module path", description: "Workspace-relative .ts/.tsx/.mjs path; defaults from the selected node path or group.", required: false, kind: "path", example: "src/shared/index.ts" },
      { name: "node_id", label: "Graph node", description: "Optional VisualGraph node that supplies the module name and path.", required: false, kind: "node", example: "node_shared" },
      { name: "title", label: "Export name", description: "Identifier used in the generated export stub.", required: false, kind: "text", example: "sharedModule", defaultValue: "visualModule" },
    ],
    nextTools: ["preflight_visual_proposal", "create_visual_proposal"],
  },
];

const isSafeRelativePath = (value: string): boolean => {
  if (!value || value !== value.trim() || value.startsWith("/") || value.includes("\\")) return false;
  const segments = value.split("/");
  return segments.every((segment) => segment !== "" && segment !== "." && segment !== "..")
    && !segments.some((segment) => /^(?:node_modules|dist|\.git)$/i.test(segment))
    && !/(?:^|\/)\.env(?:\.|$)/i.test(value)
    && !/package(?:-lock)?\.json$|pnpm-lock\.yaml$|yarn\.lock$/i.test(value);
};

function requireSafePath(value: string | undefined, label: string): string {
  if (!value || !isSafeRelativePath(value)) throw new Error(`${label} must be a safe workspace-relative UTF-8 file path`);
  return value;
}

function requireNode(graph: VisualGraph | undefined, nodeId: string): GraphNode {
  const node = graph?.nodes.find((item) => item.id === nodeId);
  if (!node) throw new Error(`Graph node not found: ${nodeId}`);
  return node;
}

function identifier(value: string | undefined): string {
  const cleaned = (value ?? "visualModule").replace(/[^A-Za-z0-9_$]/g, "_");
  return /^[A-Za-z_$]/.test(cleaned) ? cleaned : `module_${cleaned || "stub"}`;
}

function requireContent(value: string | undefined): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("content is required for update_documentation");
  return value;
}

export function listChangeTemplates(): { version: 1; templates: ChangeTemplate[] } {
  return { version: 1, templates: CHANGE_TEMPLATES.map((template) => ({ ...template, arguments: template.arguments.map((argument) => ({ ...argument })), nextTools: [...template.nextTools] })) };
}

export function buildChangeTemplateDraft(
  snapshot: SessionSnapshot,
  input: {
    templateId: ChangeTemplateId;
    path?: string;
    nodeId?: string;
    title?: string;
    content?: string;
  },
): ChangeTemplateDraft {
  const template = CHANGE_TEMPLATES.find((item) => item.id === input.templateId);
  if (!template) throw new Error(`Unknown change template: ${input.templateId}`);
  const node = input.nodeId ? requireNode(snapshot.graph, input.nodeId) : undefined;
  const citedNodeIds = node ? [node.id] : [];
  const nodePath = node?.path && node.path !== "." && !node.path.endsWith("/") && isSafeRelativePath(node.path) ? node.path : undefined;
  let title: string;
  let summary: string;
  let changes: ChangeTemplateDraft["changes"];

  if (template.id === "update_documentation") {
    const path = requireSafePath(input.path ?? nodePath, "path");
    const content = requireContent(input.content);
    title = `Update ${path}`;
    summary = `Draft a human-reviewed UTF-8 update for ${path}, anchored to graph revision ${snapshot.graphRevision}${node ? ` and node ${node.label}` : ""}.`;
    changes = [{
      id: "change_documentation",
      kind: "update",
      path,
      content,
      encoding: "utf8",
      rationale: node ? `Derived from selected graph node ${node.label} (${node.id}).` : "Derived from the requested documentation path.",
    }];
  } else if (template.id === "add_test") {
    if (!node) throw new Error("add_test requires node_id");
    const sourcePath = requireSafePath(nodePath, "node path");
    const testExtension = /\.(?:mjs|js|jsx)$/i.test(sourcePath) ? ".mjs" : ".ts";
    const derivedPath = `${sourcePath.replace(/\.[^./]+$/, "")}.test${testExtension}`;
    const path = requireSafePath(input.path ?? derivedPath, "path");
    const testTitle = input.title?.trim() || "keeps the visual contract";
    title = `Add test for ${node.label}`;
    summary = `Draft a focused regression test near ${sourcePath} for graph revision ${snapshot.graphRevision}. The human must review the full file before approval.`;
    changes = [{
      id: "change_test",
      kind: "create",
      path,
      content: `import { describe, expect, it } from "vitest";\n\ndescribe(${JSON.stringify(node.label)}, () => {\n  it(${JSON.stringify(testTitle)}, () => {\n    expect(${JSON.stringify(sourcePath)}).toBeTruthy();\n  });\n});\n`,
      encoding: "utf8",
      rationale: `Starter test derived from selected graph node ${node.label} (${node.id}); a human must review and replace the placeholder assertion before approval.`,
    }];
  } else {
    const selectedPath = input.path ?? nodePath ?? (node?.group ? `${node.group}/${node.label}` : undefined);
    const fallbackPath = node ? `src/${node.label.replace(/[^A-Za-z0-9_-]/g, "-").toLowerCase()}.ts` : undefined;
    const candidatePath = selectedPath ?? fallbackPath ?? "src/visual-module.ts";
    const path = requireSafePath(/\.[^./]+$/.test(candidatePath) ? candidatePath : `${candidatePath}.ts`, "path");
    const exportName = identifier(input.title);
    title = `Create ${path}`;
    summary = `Draft a minimal UTF-8 module stub at ${path} for graph revision ${snapshot.graphRevision}${node ? ` and node ${node.label}` : ""}. The human must review the scaffold before approval.`;
    changes = [{
      id: "change_module",
      kind: "create",
      path,
      content: `export interface ${exportName[0].toUpperCase()}${exportName.slice(1)}State {\n  version: 1;\n}\n\nexport function create${exportName[0].toUpperCase()}${exportName.slice(1)}State(): ${exportName[0].toUpperCase()}${exportName.slice(1)}State {\n  return { version: 1 };\n}\n`,
      encoding: "utf8",
      rationale: node ? `Module stub derived from selected graph node ${node.label} (${node.id}).` : "Module stub derived from the requested path.",
    }];
  }

  return {
    version: 1,
    templateId: template.id,
    title,
    summary,
    graphRevision: snapshot.graphRevision,
    citedNodeIds,
    changes,
    guidance: "This is a read-only draft. It does not create a proposal, write files, or issue an approval receipt. Call preflight_visual_proposal with these changes, then create_visual_proposal only after the human is ready to review a line diff.",
  };
}
