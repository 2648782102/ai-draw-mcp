import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const COLLAB_TOOLS = [
  "scan_project",
  "get_visual_context",
  "create_visual_proposal",
  "apply_visual_proposal",
  "reply_to_visual_context",
  "preflight_visual_proposal",
  "list_change_templates",
];

async function withClient(port, callback) {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    env: {
      ...process.env,
      PREVIEW_PORT: String(port),
      LOG_LEVEL: "error",
      AI_DRAW_WORKSPACE_ROOT: process.cwd(),
    },
  });
  const client = new Client({ name: "ai-draw-tests", version: "1.0.0" });
  try {
    await client.connect(transport);
    await callback(client);
  } finally {
    await client.close();
  }
}

function textOf(result) {
  return result.content.map((item) => item.text ?? "").join("\n");
}

function jsonAfter(text, marker) {
  const start = text.indexOf(marker) + marker.length;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === "\"") inString = false;
      continue;
    }
    if (character === "\"") inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) { end = index + 1; break; }
    }
  }
  if (end < 0) throw new Error(`No complete JSON object after ${marker}`);
  return JSON.parse(text.slice(start, end));
}

describe("MCP server", () => {
  it("registers legacy and collaboration tools", async () => {
    await withClient(3421, async (client) => {
      const { tools } = await client.listTools();
      const names = tools.map((tool) => tool.name);
      expect(names).toHaveLength(18);
      expect(names).toContain("render_diagram");
      expect(names).toContain("delete_diagram");
      for (const name of COLLAB_TOOLS) expect(names).toContain(name);
    });
  });

  it("renders and deletes a diagram through the full pipeline", async () => {
    await withClient(3422, async (client) => {
      const rendered = await client.callTool({
        name: "render_diagram",
        arguments: { title: "Vitest Diagram", mermaid_code: "graph TD\n  A[Start] --> B[End]" },
      });
      const text = textOf(rendered);
      const id = text.match(/ID:\s*(\S+)/)?.[1];
      expect(id).toBeTruthy();

      const deleted = await client.callTool({
        name: "delete_diagram",
        arguments: { diagram_id: id },
      });
      expect(textOf(deleted)).toContain("已删除");
    });
  }, 30_000);

  it("returns node-linked visual intent for AI agents", async () => {
    await withClient(3423, async (client) => {
      const snapshot = await client.callTool({ name: "get_visual_context", arguments: {} });
      const text = textOf(snapshot);
      expect(text).toContain("CONTEXT_JSON:");
      const jsonStart = text.indexOf("CONTEXT_JSON:") + "CONTEXT_JSON:".length;
      const payload = JSON.parse(text.slice(jsonStart));
      expect(payload.intentSummary).toBeTruthy();
      expect(payload.intentSummary).toHaveProperty("intentByNode");
      expect(payload.intentSummary).toHaveProperty("edgeLabels");
      expect(payload.annotationThreads).toBeTruthy();
      expect(payload.intentSummary.annotationThreads).toBeTruthy();
      expect(payload.intentSummary).toHaveProperty("nextActor");
      expect(payload.activityTimeline).toMatchObject({ version: 1 });
      expect(payload.diagnostics).toMatchObject({ version: 1 });
      expect(payload.diagnostics.safety.projectWritesRequireHumanApproval).toBe(true);
      expect(payload).toHaveProperty("focus");
      expect(payload.intentSummary).toHaveProperty("focus");
      expect(Array.isArray(payload.graphDiffs)).toBe(true);
      expect(payload.intentSummary.guidance).toContain("activityTimeline");
      expect(payload.nextActions.join(" ")).toContain("create_visual_proposal");
    });
  }, 30_000);

  it("preflights candidate changes without writing files or creating proposals", async () => {
    await withClient(3424, async (client) => {
      const relativePath = `test/preflight-${Date.now()}.md`;
      const result = await client.callTool({
        name: "preflight_visual_proposal",
        arguments: {
          changes: [{ kind: "create", path: relativePath, content: "# Preflight\n" }],
        },
      });
      const text = textOf(result);
      expect(text).toContain("PREFLIGHT_JSON:");
      const jsonStart = text.indexOf("PREFLIGHT_JSON:") + "PREFLIGHT_JSON:".length;
      const summary = JSON.parse(text.slice(jsonStart));
      expect(summary).toMatchObject({ version: 1, files: 1, newFiles: 1 });
      expect(summary.safe).toBe(true);
      expect(summary.findings.every((finding) => finding.severity !== "blocker")).toBe(true);
      expect(text).not.toContain("PROPOSAL_JSON:");
    });
  }, 30_000);

  it("lists change templates and expands a read-only draft", async () => {
    await withClient(3426, async (client) => {
      const listed = textOf(await client.callTool({ name: "list_change_templates", arguments: {} }));
      expect(listed).toContain("TEMPLATES_JSON:");
      const templates = jsonAfter(listed, "TEMPLATES_JSON:");
      expect(templates.templates.map((template) => template.id)).toContain("update_documentation");

      const expanded = textOf(await client.callTool({
        name: "list_change_templates",
        arguments: {
          template_id: "create_module",
          path: "examples/template-stub.ts",
          title: "templateStub",
        },
      }));
      expect(expanded).toContain("DRAFT_JSON:");
      const draft = jsonAfter(expanded, "DRAFT_JSON:");
      expect(draft.changes[0]).toMatchObject({ kind: "create", path: "examples/template-stub.ts" });
      expect(expanded).not.toContain("PROPOSAL_JSON:");
      expect(expanded).toContain("preflight_visual_proposal");
    });
  }, 30_000);

  it("scans into stable project nodes and returns a preservation contract for agents", async () => {
    await withClient(3427, async (client) => {
      const first = textOf(await client.callTool({
        name: "scan_project",
        arguments: { title: "Stable scan", open_panel: false },
      }));
      expect(first).toContain("PRESERVATION_JSON:");
      const firstPreservation = jsonAfter(first, "PRESERVATION_JSON:");
      expect(firstPreservation).toMatchObject({ version: 1, strategy: "stable-path-merge" });
      const firstNodes = JSON.parse(first.match(/Nodes\/edges \(structured\): (\{.*\})/)?.[1] ?? "{}");
      expect(firstNodes.nodes.length).toBeGreaterThan(1);
      expect(firstNodes.nodes.every((node) => /^node_[0-9a-f]{12}$/.test(node.id))).toBe(true);

      const second = textOf(await client.callTool({
        name: "scan_project",
        arguments: { title: "Stable scan", open_panel: false },
      }));
      const secondNodes = JSON.parse(second.match(/Nodes\/edges \(structured\): (\{.*\})/)?.[1] ?? "{}");
      expect(secondNodes.nodes.map((node) => node.id)).toEqual(firstNodes.nodes.map((node) => node.id));
      const secondPreservation = jsonAfter(second, "PRESERVATION_JSON:");
      expect(secondPreservation.matchedNodes).toBe(firstNodes.nodes.length);
      expect(secondPreservation.newNodes).toBe(0);
      expect(secondPreservation.removedNodes).toBe(0);
      expect(second).not.toContain("grantHash");
    });
  }, 30_000);
});
