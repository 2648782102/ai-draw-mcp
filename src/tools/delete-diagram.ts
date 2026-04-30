import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResult, panelBaseUrl, type ToolContext } from "./_shared.js";

export function registerDeleteDiagram(server: McpServer, ctx: ToolContext) {
  server.tool(
    "delete_diagram",
    "从本机删除指定图表：移除清单记录并删除关联的 SVG/PNG 文件，并通知已打开的预览面板刷新。" +
    " 适合清理草稿或释放磁盘；删除后 ID 不可再用于 update_diagram。",
    {
      diagram_id: z.string().describe("要删除的图表 ID（来自 list_diagrams 或上次 render 返回的 JSON 行）"),
    },
    async ({ diagram_id }) => {
      try {
        const record = ctx.store.get(diagram_id);
        if (!record)
          return { content: [{ type: "text" as const, text: `❌ 找不到 ID 为 ${diagram_id} 的图表` }], isError: true };

        const title = record.title;
        await ctx.store.remove(diagram_id);
        ctx.preview.notifyDiagramRemoved(diagram_id);

        return {
          content: [{
            type: "text" as const,
            text: [
              `✅ 已删除图表「${title}」`,
              ``,
              `ID: ${diagram_id}`,
              `面板: ${panelBaseUrl(ctx.config)}/`,
              ``,
              `JSON: ${JSON.stringify({ deleted: true, id: diagram_id, title })}`,
            ].join("\n"),
          }],
        };
      } catch (err) {
        return errorResult("delete_diagram", err);
      }
    }
  );
}
