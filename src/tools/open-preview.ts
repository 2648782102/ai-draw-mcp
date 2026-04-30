import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { openHint, panelBaseUrl, panelDiagramUrl, type ToolContext } from "./_shared.js";
import { openPanelInIDE } from "../infra/ide-opener.js";

export function registerOpenPreview(server: McpServer, ctx: ToolContext) {
  server.tool(
    "open_preview",
    "在 IDE 内打开实时预览面板：优先用 vscode:// 协议经 AI Draw 扩展打开 Simple Browser，回退为 Cursor --open-url + http。" +
    " 若用户点击聊天里的普通 http 链会进外置浏览器，应使用本工具或见返回中的 vscode:// 可点击链。",
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
