import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { openHint, panelBaseUrl, panelDiagramUrl, type ToolContext } from "./_shared.js";
import { openPanelInIDE } from "../infra/ide-opener.js";

export function registerOpenPreview(server: McpServer, ctx: ToolContext) {
  server.tool(
    "open_preview",
    "仅当人明确想查看共享画板时，才请求 IDE 或浏览器打开实时预览面板；AI 正常读取图形上下文、证据、批注、提案不应调用本工具。" +
    " 支持 Cursor、VS Code、Windsurf、Trae、Zed 等编辑器：检测宿主后用 --open-url 在内置浏览器打开，无法自动打开时返回 http:// 地址供人手动打开。",
    {
      diagram_id: z.string().optional().describe("Diagram ID to open directly (omit for gallery)"),
    },
    async ({ diagram_id }) => {
      let url: string;
      if (diagram_id) {
        const record = ctx.store.get(diagram_id);
        if (!record)
          return { content: [{ type: "text" as const, text: `❌ 找不到 ID 为 ${diagram_id} 的图表` }], isError: true };
        url = panelDiagramUrl(ctx.config, diagram_id);
      } else {
        url = panelBaseUrl(ctx.config);
      }

      const opened = await openPanelInIDE(url, true);
      return {
        content: [{
          type: "text" as const,
          text: [
            opened ? `✅ 已请求在编辑器中打开: ${url}` : `⚠️ 无法自动打开面板。请复制到 Simple Browser: ${url}`,
            ``,
            openHint(url, ctx.config),
          ].join("\n"),
        }],
      };
    }
  );
}
