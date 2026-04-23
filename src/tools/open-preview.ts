import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DiagramStore } from "../storage/diagram-store.js";
import type { AppConfig } from "../utils/config.js";
import { openPanelInIDE } from "../utils/ide-opener.js";

export function registerOpenPreview(
  server: McpServer,
  store: DiagramStore,
  config: AppConfig
) {
  server.tool(
    "open_preview",
    "Open the diagram editor panel inside the IDE. " +
      "Optionally specify a diagram ID to jump directly to that diagram.",
    {
      diagram_id: z.string().optional().describe("Diagram ID to preview"),
    },
    async ({ diagram_id }) => {
      const base = `http://localhost:${config.previewPort}`;
      let url: string;

      if (diagram_id) {
        const record = store.get(diagram_id);
        if (!record) {
          return {
            content: [{ type: "text" as const, text: `❌ 找不到 ID 为 ${diagram_id} 的图表` }],
            isError: true,
          };
        }
        url = `${base}/diagram/${diagram_id}`;
      } else {
        url = base;
      }

      const opened = await openPanelInIDE(url, true);
      return {
        content: [{
          type: "text" as const,
          text: opened
            ? `✅ 面板已在编辑器中打开: ${url}`
            : `⚠️ 无法自动打开面板，请手动访问: ${url}`,
        }],
      };
    }
  );
}
