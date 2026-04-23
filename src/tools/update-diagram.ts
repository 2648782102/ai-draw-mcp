import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderMermaidToSvg, saveSvg } from "../renderer/index.js";
import { errorResponse, type ToolContext } from "./shared.js";
/**
 * Register `update_diagram` — AI can modify an existing diagram's Mermaid code.
 * The updated code is pushed to the panel in real-time.
 */
export function registerUpdateDiagram(server: McpServer, ctx: ToolContext) {
  server.tool(
    "update_diagram",
    "Update an existing diagram's Mermaid code and push the change to the live editor panel. " +
      "Use this to modify a previously created diagram.",
    {
      diagram_id: z.string().describe("ID of the diagram to update"),
      mermaid_code: z.string().describe("New Mermaid DSL code"),
      title: z.string().optional().describe("Optionally update the title"),
      theme: z.enum(["default", "dark", "forest", "neutral"]).optional(),
    },
    async ({ diagram_id, mermaid_code, title, theme }) => {
      try {
        const record = ctx.store.get(diagram_id);
        if (!record) {
          return {
            content: [{ type: "text" as const, text: `❌ 找不到 ID 为 ${diagram_id} 的图表` }],
            isError: true,
          };
        }

        const svg = await renderMermaidToSvg(mermaid_code, theme ?? ctx.config.defaultTheme);
        const svgPath = await saveSvg(svg, ctx.config.outputDir, `${diagram_id}.svg`);

        record.mermaidCode = mermaid_code;
        record.svgPath = svgPath;
        if (title) record.title = title;
        await ctx.store.add(record);

        ctx.preview.notifyDiagramUpdate(diagram_id, record.title, mermaid_code);

        return {
          content: [{
            type: "text" as const,
            text: [
              `✅ 图表「${record.title}」已更新并推送到面板`,
              ``,
              `ID: ${diagram_id}`,
              `面板: http://localhost:${ctx.config.previewPort}/diagram/${diagram_id}`,
            ].join("\n"),
          }],
        };
      } catch (err) {
        return errorResponse("update_diagram", err);
      }
    }
  );
}
