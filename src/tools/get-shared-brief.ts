import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildSharedBrief } from "../domain/shared-brief.js";
import { errorResult, jsonLine, type ToolContext } from "./_shared.js";

export function registerGetSharedBrief(server: McpServer, ctx: ToolContext) {
  server.tool(
    "get_shared_brief",
    "读取当前协作会话的紧凑共享简报：会话/图形版本、人类焦点、就绪阻塞、待处理消息、有效与失锚批注、最近图形修订、file:line 证据、提案/活动计数与下一步。" +
    " 适合 AI 接手会话、人类把交接信息贴到 Issue/对话，或面板显示同一份只读摘要；用 BRIEF_JSON 减少读取完整上下文前的拼装成本。" +
    " 本工具只读、不持久化简报、不写会话或项目文件、不改变焦点/线程/提案、不批准变更、不签发凭据；需要完整原文时改用 get_visual_context，需要单节点细节时用 get_node_context。",
    {
      message_limit: z.number().int().min(1).max(20).optional().describe("Maximum compact intent items per section (default 5)"),
      graph_diff_limit: z.number().int().min(1).max(10).optional().describe("Maximum recent graph diffs to inspect (default 3)"),
      activity_limit: z.number().int().min(1).max(20).optional().describe("Maximum derived activity events for chronology (default 5)"),
    },
    async ({ message_limit, graph_diff_limit, activity_limit }) => {
      try {
        const brief = buildSharedBrief(ctx.sessions.getSnapshot(), {
          messageLimit: message_limit ?? 5,
          graphDiffLimit: graph_diff_limit ?? 3,
          activityLimit: activity_limit ?? 5,
        });
        return {
          content: [{
            type: "text" as const,
            text: [
              `📝 Shared brief · session ${brief.sessionId} · graphRevision ${brief.graphRevision}`,
              `Focus: ${brief.focus ? `${brief.focus.nodeLabel} (${brief.focus.nodeId})` : "none"} · blockers: ${brief.intent.blockers.length}`,
              `Pending messages: ${brief.status.conversation.pendingMessages} · active threads: ${brief.intent.activeThreads.length} · stale: ${brief.status.conversation.staleThreads}`,
              `Graph: ${brief.status.graph ? `${brief.status.graph.nodes} nodes / ${brief.status.graph.edges} edges` : "missing"} · evidence: ${brief.status.sourceEvidence.items}`,
              `Pending proposals: ${brief.status.proposals.pending} · approved: ${brief.status.proposals.approved} · next actor: ${brief.status.conversation.nextActor}`,
              ...brief.intent.blockers.map((blocker) => `- ${blocker}`),
              ``,
              jsonLine({
                version: "1",
                sessionId: brief.sessionId,
                graphRevision: String(brief.graphRevision),
                blockers: String(brief.intent.blockers.length),
                pendingMessages: String(brief.status.conversation.pendingMessages),
              }),
              ``,
              "BRIEF_JSON:",
              JSON.stringify(brief, null, 2),
              ``,
              "BRIEF_JSON is descriptive only. It excludes approval grants, omits stale threads from current intent, and never authorizes project writes.",
            ].join("\n"),
          }],
        };
      } catch (err) {
        return errorResult("get_shared_brief", err);
      }
    },
  );
}
