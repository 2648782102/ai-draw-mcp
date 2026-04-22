import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DiagramStore } from "../storage/diagram-store.js";
import type { AppConfig } from "../utils/config.js";

/**
 * Register `list_diagrams` — list all generated diagrams.
 */
export function registerListDiagrams(
  server: McpServer,
  store: DiagramStore,
  config: AppConfig
) {
  server.tool(
    "list_diagrams",
    "List all previously generated diagrams with their IDs, titles, types, and preview URLs.",
    {
      type: z
        .enum([
          "flowchart", "sequence", "class", "state", "er",
          "gantt", "pie", "mindmap", "timeline", "architecture", "custom",
        ])
        .optional()
        .describe("Filter by diagram type"),
      limit: z.number().optional().describe("Max number of results (default 20)"),
    },
    async ({ type, limit }) => {
      const diagrams = type ? store.listByType(type) : store.list();
      const sliced = diagrams.slice(0, limit ?? 20);

      if (sliced.length === 0) {
        return {
          content: [{ type: "text" as const, text: "📭 暂无图表记录" }],
        };
      }

      const lines = sliced.map(
        (d, i) =>
          `${i + 1}. [${d.type}] ${d.title}  (ID: ${d.id}, ${d.createdAt})\n` +
          `   Preview: http://localhost:${config.previewPort}/diagram/${d.id}`
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `📊 共 ${diagrams.length} 张图表（显示前 ${sliced.length} 张）:\n\n${lines.join("\n\n")}`,
          },
        ],
      };
    }
  );
}
