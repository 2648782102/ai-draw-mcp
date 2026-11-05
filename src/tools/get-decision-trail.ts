import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildDecisionTrail } from "../domain/decision-trail.js";
import { errorResult, jsonLine, type ToolContext } from "./_shared.js";

export function registerGetDecisionTrail(server: McpServer, ctx: ToolContext) {
  server.tool(
    "get_decision_trail",
    "读取当前协作会话的 version 1 DECISION_TRAIL_JSON 只读决策链：把人的待处理消息、有效批注线程、失锚讨论、字段级图形修订、提案变更摘要、批准/应用状态与时间线按时间和证据类型聚合起来。" +
    " 适合 AI 复盘「为什么做这个改动」、人或 AI 在批准前检查意图与差异是否对齐、以及把可审计轨迹贴到 Issue；失锚讨论只作为历史证据，输出永不包含一次性确认号。" +
    " 本工具只读、不持久化决策链、不改变焦点/线程/提案、不写会话或项目文件、不批准变更、不签发凭据；需要完整逐行 diff 时用面板或 /api/collab/proposals/:id/diff，需要当前交接摘要时用 get_shared_brief。",
    {
      event_limit: z.number().int().min(1).max(120).optional().describe("Maximum chronological events to return (default 60)"),
      proposal_limit: z.number().int().min(1).max(20).optional().describe("Maximum recent proposals to inspect (default 6)"),
      graph_diff_limit: z.number().int().min(1).max(20).optional().describe("Maximum recent graph diffs to inspect (default 4)"),
      line_limit: z.number().int().min(1).max(40).optional().describe("Maximum proposed change lines per file (default 12)"),
    },
    async ({ event_limit, proposal_limit, graph_diff_limit, line_limit }) => {
      try {
        const trail = buildDecisionTrail(ctx.sessions.getSnapshot(), {
          eventLimit: event_limit ?? 60,
          proposalLimit: proposal_limit ?? 6,
          graphDiffLimit: graph_diff_limit ?? 4,
          lineLimit: line_limit ?? 12,
        });
        return {
          content: [{
            type: "text" as const,
            text: [
              `🧭 Decision trail · session ${trail.sessionId} · graphRevision ${trail.graphRevision}`,
              `Events: ${trail.counts.returnedEvents}/${trail.counts.events} · intent: ${trail.counts.intent} · graph diffs: ${trail.counts.graphDiffs} · proposals: ${trail.counts.proposals}`,
              `Focus: ${trail.focus ? `${trail.focus.nodeLabel} (${trail.focus.nodeId})` : "none"} · stale threads: ${trail.counts.staleThreads} · gaps: ${trail.gaps.length}`,
              ...trail.gaps.map((gap) => `- ${gap}`),
              ``,
              jsonLine({
                version: "1",
                sessionId: trail.sessionId,
                graphRevision: String(trail.graphRevision),
                events: String(trail.counts.returnedEvents),
                proposals: String(trail.counts.proposals),
              }),
              ``,
              "DECISION_TRAIL_JSON:",
              JSON.stringify(trail, null, 2),
              ``,
              "DECISION_TRAIL_JSON is descriptive only. It excludes approval grants, keeps stale threads out of current intent, and never authorizes project writes. Proposal change lines are a bounded projection; inspect the full line diff in the panel before approval.",
            ].join("\n"),
          }],
        };
      } catch (err) {
        return errorResult("get_decision_trail", err);
      }
    },
  );
}
