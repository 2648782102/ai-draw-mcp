import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildSelectionWorkorder } from "../domain/selection-workorder.js";
import { errorResult, jsonLine, type ToolContext } from "./_shared.js";

export function registerGetSelectionWorkorder(server: McpServer, ctx: ToolContext) {
  server.tool(
    "get_selection_workorder",
    "把人在面板中多选的节点范围整理成 version 1 SELECTION_WORKORDER_JSON：只读的预提案工作单包含选中节点与内部连线、安全相对候选路径、范围内的人类意图、file:line 证据、就绪状态、待确认缺口与下一步。" +
    " 当人说「这几个模块要改」并已勾选节点时使用；它不生成文件内容/逐行 diff，不创建提案、不读取项目文件、不签发凭据、不扩大写入路径，也不授权项目写入。进入候选 changes 后仍须 preflight_visual_proposal、人工审阅完整 diff 与一次性确认号。只要单个对象线索时用 get_node_context，只要原始选择范围时用 get_selection_scope。",
    {
      item_limit: z.number().int().min(1).max(12).optional().describe("Maximum bounded nodes, paths, edges, intent, and evidence entries (default 8)"),
    },
    async ({ item_limit }) => {
      try {
        const workorder = buildSelectionWorkorder(ctx.sessions.getSnapshot(), { itemLimit: item_limit });
        return {
          content: [{
            type: "text" as const,
            text: [
              `🧾 Selection workorder · ${workorder.selectedCount}/${workorder.selectionLimit} nodes · ${workorder.source} · ${workorder.reviewReadiness.status} · read-only`,
              `Session ${workorder.sessionId} · graphRevision ${workorder.graphRevision} · selectionRevision ${workorder.selectionRevision ?? "none"}`,
              `Candidate paths ${workorder.safePaths.length} · internal edges ${workorder.internalEdges.length} · intent ${workorder.intent.length} · gaps ${workorder.gaps.length}`,
              ``,
              jsonLine({
                version: "1",
                selectedCount: String(workorder.selectedCount),
                reviewReadiness: workorder.reviewReadiness.status,
                gaps: String(workorder.gaps.length),
                readOnly: "true",
              }),
              ``,
              "SELECTION_WORKORDER_JSON:",
              JSON.stringify(workorder, null, 2),
              ``,
              "SELECTION_WORKORDER_JSON is a read-only pre-proposal checklist. It contains no candidate file content and grants no project-write authority.",
            ].join("\n"),
          }],
        };
      } catch (err) {
        return errorResult("get_selection_workorder", err);
      }
    },
  );
}
