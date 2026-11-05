import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildSelectionScope } from "../domain/selection.js";
import { errorResult, jsonLine, type ToolContext } from "./_shared.js";

export function registerGetSelectionScope(server: McpServer, ctx: ToolContext) {
  server.tool(
    "get_selection_scope",
    "读取人在面板中多选节点形成的 version 1 SELECTION_SCOPE_JSON：有界节点列表、选中范围内的内部连线、安全相对 file:line 证据、焦点是否包含其中与下一步提示。" +
    " 当人说「这几个模块」「当前选中范围」时使用；本工具只读，不改选择、不读取项目文件、不创建消息/提案、不签发凭据，也不授权项目写入。需要单个对象细节时用 get_node_context，需要完整会话时用 get_visual_context。",
    {
      evidence_limit: z.number().int().min(1).max(60).optional().describe("Maximum safe file:line evidence entries (default 20)"),
      edge_limit: z.number().int().min(1).max(120).optional().describe("Maximum internal edges (default 40)"),
    },
    async ({ evidence_limit, edge_limit }) => {
      try {
        const scope = buildSelectionScope(ctx.sessions.getSnapshot(), {
          evidenceLimit: evidence_limit,
          edgeLimit: edge_limit,
        });
        return {
          content: [{
            type: "text" as const,
            text: [
              `🎯 Selection scope · ${scope.selectedCount}/${scope.limit} nodes · ${scope.source} · read-only`,
              `Session ${scope.sessionId} · graphRevision ${scope.graphRevision} · selectionRevision ${scope.selectionRevision ?? "none"}`,
              `Internal edges ${scope.edges.length}/${scope.totalEdges} · safe evidence ${scope.evidence.length}/${scope.totalEvidence}`,
              ``,
              jsonLine({
                version: "1",
                selectedCount: String(scope.selectedCount),
                source: scope.source,
                readOnly: "true",
              }),
              ``,
              "SELECTION_SCOPE_JSON:",
              JSON.stringify(scope, null, 2),
              ``,
              "SELECTION_SCOPE_JSON is descriptive only. A selected range never grants project-write authority.",
            ].join("\n"),
          }],
        };
      } catch (err) {
        return errorResult("get_selection_scope", err);
      }
    },
  );
}
