import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const COLLAB_TOOLS = [
  "scan_project",
  "get_visual_context",
  "create_visual_proposal",
  "apply_visual_proposal",
  "reply_to_visual_context",
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

describe("MCP server", () => {
  it("registers legacy and collaboration tools", async () => {
    await withClient(3421, async (client) => {
      const { tools } = await client.listTools();
      const names = tools.map((tool) => tool.name);
      expect(names.length).toBeGreaterThanOrEqual(16);
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
      expect(payload.nextActions.join(" ")).toContain("create_visual_proposal");
    });
  }, 30_000);
});
