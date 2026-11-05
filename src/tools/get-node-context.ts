import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildNodeContext } from "../domain/node-context.js";
import { errorResult, jsonLine, type ToolContext } from "./_shared.js";

export function registerGetNodeContext(server: McpServer, ctx: ToolContext) {
  server.tool(
    "get_node_context",
    "读取一个图节点的紧凑上下文：节点字段、file:line 源码证据、命中该节点的批注线程、入/出连线及相邻节点、相关图形修订差异与人类焦点。" +
    " node_id 可省略，此时使用 get_visual_context.focus 的人类选中节点；适合 AI 在解释节点、回复线程或起草提案前避免拼装完整上下文。" +
    " 本工具只读，不创建提案、不写会话或项目文件、不批准变更、不签发凭据；需要全量会话时改用 get_visual_context。",
    {
      node_id: z.string().optional().describe("Graph node ID; defaults to the current human-selected focus"),
      graph_diff_limit: z.number().int().min(1).max(20).optional().describe("Maximum recent graph diffs to inspect (default 5)"),
    },
    async ({ node_id, graph_diff_limit }) => {
      try {
        const context = buildNodeContext(ctx.sessions.getSnapshot(), node_id, graph_diff_limit ?? 5);
        return {
          content: [{
            type: "text" as const,
            text: [
              `🔎 Node context · ${context.node.label} (${context.nodeId}) · graphRevision ${context.graphRevision}`,
              `Source evidence: ${context.node.sourceEvidence.length} · annotation threads: ${context.annotationThreads.length} (${context.staleThreadCount} stale)`,
              `Edges: ${context.edges.length} · related graph diffs: ${context.graphDiffs?.length ?? 0} · human focus: ${context.focus.active ? "active" : "no"}`,
              ``,
              jsonLine({
                version: "1",
                sessionId: context.sessionId,
                graphRevision: String(context.graphRevision),
                nodeId: context.nodeId,
                threads: String(context.annotationThreads.length),
                edges: String(context.edges.length),
                sourceEvidence: String(context.node.sourceEvidence.length),
              }),
              ``,
              "NODE_CONTEXT_JSON:",
              JSON.stringify(context, null, 2),
              ``,
              "NODE_CONTEXT_JSON is descriptive only. Stale threads are not current intent; only apply_visual_proposal with a human-approved one-time receipt can write project files.",
            ].join("\n"),
          }],
        };
      } catch (err) {
        return errorResult("get_node_context", err);
      }
    },
  );
}
