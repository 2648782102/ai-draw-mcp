import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildAgentWorkflow } from "../domain/agent-workflow.js";
import { errorResult, jsonLine, type ToolContext } from "./_shared.js";

export function registerGetAgentWorkflow(server: McpServer, ctx: ToolContext) {
  server.tool(
    "get_agent_workflow",
    "返回当前会话的可复现人机协作工作流：先读本契约，再 get_visual_context、对话交接、只读模板草稿、preflight、提案、人类批准与一次性确认号，最后 apply 和安全重新扫描。" +
    " 每一步都有 requires/produces/readOnly/writes/grantsWriteAuthority 字段与 blocked 就绪提示，适合 coding agent 校验前后条件、避免自行发明顺序或跳过人类批准。" +
    " 本工具只读，不创建提案、不写会话或项目文件、不批准变更、不签发凭据；需要完整上下文时改用 get_visual_context。",
    {
      include_completed: z.boolean().optional().describe("Include readiness hints for pending/approved proposals (default true)"),
    },
    async ({ include_completed }) => {
      try {
        const workflow = buildAgentWorkflow(ctx.sessions.getSnapshot());
        const payload = include_completed === false
          ? { ...workflow, conversation: undefined, proposals: undefined, graph: undefined, blocked: [] }
          : workflow;
        return {
          content: [{
            type: "text" as const,
            text: [
              `🧭 Agent workflow · ${workflow.steps.length} steps · graphRevision ${workflow.graphRevision}`,
              `Next actor: ${workflow.conversation?.nextActor ?? "unknown"} · pending messages: ${workflow.conversation?.pendingMessages ?? 0}`,
              `Pending proposals: ${workflow.proposals?.pending ?? 0} · approved: ${workflow.proposals?.approved ?? 0}`,
              `Stale annotation threads: ${workflow.graph?.staleAnnotations ?? 0}`,
              `Readiness blockers: ${workflow.blocked.length}`,
              ...workflow.blocked.map((blocker) => `- ${blocker}`),
              ``,
              jsonLine({
                version: "1",
                sessionId: workflow.sessionId,
                graphRevision: String(workflow.graphRevision),
                steps: String(workflow.steps.length),
                blocked: String(workflow.blocked.length),
              }),
              ``,
              "WORKFLOW_JSON:",
              JSON.stringify(payload, null, 2),
              ``,
              "This workflow is descriptive only. Read blocked before step 5, never skip human review, and remember that only apply_visual_proposal with a valid one-time receipt can write project files.",
            ].join("\n"),
          }],
        };
      } catch (err) {
        return errorResult("get_agent_workflow", err);
      }
    },
  );
}
