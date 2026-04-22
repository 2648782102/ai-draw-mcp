import { z } from "zod";
import open from "open";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DiagramStore } from "../storage/diagram-store.js";
import type { AppConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";

/**
 * Register `open_preview` — open the diagram preview in the default browser.
 */
export function registerOpenPreview(
  server: McpServer,
  store: DiagramStore,
  config: AppConfig
) {
  server.tool(
    "open_preview",
    "Open the diagram preview page in the default browser. " +
      "Optionally specify a diagram ID to jump directly to that diagram.",
    {
      diagram_id: z
        .string()
        .optional()
        .describe("Specific diagram ID to preview. If omitted, opens the gallery."),
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

      try {
        await open(url);
        return {
          content: [{ type: "text" as const, text: `🌐 已在浏览器中打开: ${url}` }],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`open_preview failed: ${message}`);
        return {
          content: [{ type: "text" as const, text: `❌ 无法打开浏览器: ${message}\n请手动访问: ${url}` }],
          isError: true,
        };
      }
    }
  );
}
