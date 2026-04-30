import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { panelDiagramUrl, type ToolContext } from "./_shared.js";

export function registerListDiagrams(server: McpServer, ctx: ToolContext) {
  server.tool(
    "list_diagrams",
    "列出本机 OUTPUT_DIR 中已保存的图表清单（含 ID、类型、预览链接）。获取 diagram_id 以便 update_diagram / delete_diagram。",
    {
      type: z.enum(["flowchart","sequence","class","state","er","gantt","pie","mindmap","timeline","architecture","custom"])
        .optional().describe("Filter by diagram type"),
      limit: z.number().optional().describe("Max number of results (default 20)"),
    },
    async ({ type, limit }) => {
      const diagrams = type ? ctx.store.listByType(type) : ctx.store.list();
      const sliced = diagrams.slice(0, limit ?? 20);

      if (sliced.length === 0)
        return { content: [{ type: "text" as const, text: "📭 暂无图表记录" }] };

      const lines = sliced.map((d, i) =>
        `${i + 1}. [${d.type}] ${d.title}  (ID: ${d.id}, ${d.createdAt})\n` +
        `   Preview: ${panelDiagramUrl(ctx.config, d.id)}`
      );

      const machine = sliced.map((d) => ({
        id: d.id, title: d.title, type: d.type, panelUrl: panelDiagramUrl(ctx.config, d.id),
      }));

      return {
        content: [{
          type: "text" as const,
          text: [
            `📊 共 ${diagrams.length} 张图表（显示前 ${sliced.length} 张）:`,
            ``,
            lines.join("\n\n"),
            ``,
            `JSON: ${JSON.stringify({ diagrams: machine, total: diagrams.length, shown: sliced.length })}`,
          ].join("\n"),
        }],
      };
    }
  );
}
