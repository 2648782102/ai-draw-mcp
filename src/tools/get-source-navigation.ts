import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildSourceNavigation } from "../domain/source-navigation.js";
import { errorResult, jsonLine, type ToolContext } from "./_shared.js";

export function registerGetSourceNavigation(server: McpServer, ctx: ToolContext) {
  server.tool(
    "get_source_navigation",
    "把当前 VisualGraph 的只读 file:line 源码证据投影成可复制的 IDE 跳转清单，帮助人和 AI 从图节点定位到代码/文档位置。" +
    " 可传 node_id 只看人类焦点或指定节点；返回 version 1 SOURCE_NAVIGATION_JSON，包含工作区相对 file:line、VS Code/Cursor URI 文本、命令行提示和固定只读安全标记。" +
    " 本工具只读、不自动打开文件、不启动 IDE、不执行命令、不写会话或项目文件、不签发批准凭据；需要单节点批注/连线/差异时用 get_node_context，准备项目写入前仍需完整逐行 diff 与人工批准。",
    {
      node_id: z.string().optional().describe("Optional graph node ID; omit to list bounded evidence from all nodes"),
      limit: z.number().int().min(1).max(60).optional().describe("Maximum navigation items to return (default 30)"),
    },
    async ({ node_id, limit }) => {
      try {
        const navigation = buildSourceNavigation(ctx.sessions.getSnapshot(), {
          nodeId: node_id,
          limit: limit ?? 30,
        });
        return {
          content: [{
            type: "text" as const,
            text: [
              `🔗 Source navigation · session ${navigation.sessionId} · graphRevision ${navigation.graphRevision}`,
              `Scope: ${navigation.nodeId ?? "all nodes"} · items: ${navigation.returnedItems}/${navigation.totalEvidence} · read-only`,
              `Copy text is relative and contains no absolute workspace path or approval credential.`,
              ``,
              jsonLine({
                version: "1",
                sessionId: navigation.sessionId,
                graphRevision: String(navigation.graphRevision),
                nodeId: navigation.nodeId ?? "all",
                items: String(navigation.returnedItems),
              }),
              ``,
              "SOURCE_NAVIGATION_JSON:",
              JSON.stringify(navigation, null, 2),
              ``,
              "SOURCE_NAVIGATION_JSON is descriptive only. The server does not open files or execute editor commands; it never authorizes project writes.",
            ].join("\n"),
          }],
        };
      } catch (err) {
        return errorResult("get_source_navigation", err);
      }
    },
  );
}
