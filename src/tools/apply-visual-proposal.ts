import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResult, jsonLine, type ToolContext } from "./_shared.js";

export function registerApplyVisualProposal(server: McpServer, ctx: ToolContext) {
  server.tool(
    "apply_visual_proposal",
    "将已被人类批准的变更提案应用到工作区，失败时自动回滚已写入的文件。" +
    " 必须提供面板批准时生成的一次性 approval_id、approval_grant 与 approval_expires_at；仅接受已批准且内容哈希未变的提案。",
    {
      proposal_id: z.string().describe("Proposal ID"),
      approval_id: z.string().describe("One-time approval ID shown by the panel"),
      approval_grant: z.string().describe("One-time approval grant shown by the panel"),
      approval_expires_at: z.string().describe("Approval expiry shown by the panel"),
      approved_by: z.literal("human").describe("Must be human; enforces human-in-the-loop"),
    },
    async ({ proposal_id, approval_id, approval_grant, approval_expires_at, approved_by }) => {
      try {
        const before = ctx.sessions.getProposal(proposal_id);
        if (!before)
          return { content: [{ type: "text" as const, text: `❌ 找不到提案 ${proposal_id}` }], isError: true };
        if (before.status !== "approved")
          return {
            content: [{ type: "text" as const, text: `❌ 提案尚未被人类批准（当前 ${before.status}）` }],
            isError: true,
          };

        await ctx.sessions.consumeApproval({
          approvalId: approval_id,
          proposalId: proposal_id,
          grantHash: approval_grant,
          expiresAt: approval_expires_at,
        });

        const result = await ctx.sessions.applyProposal(proposal_id, approved_by);
        const ok = result.status === "applied";
        await ctx.sessions.markMessageForProposal(proposal_id, ok ? "applied" : "rejected").catch(() => {});
        ctx.preview.broadcast({ type: "proposal_updated", proposal: result });
        if (ok) {
          ctx.preview.broadcast({
            type: "session_updated",
            reason: "proposal_applied",
            sessionId: ctx.sessions.getSnapshot().id,
          });
        }
        return {
          content: [{
            type: "text" as const,
            text: [
              `${ok ? "✅" : "❌"} 提案「${result.title}」${ok ? "已应用" : "应用失败并回滚"}`,
              ``,
              `ID: ${result.id}`,
              `Status: ${result.status}`,
              result.error ? `Error: ${result.error}` : null,
              `Applied changes: ${result.changes.length}`,
              ``,
              jsonLine({ id: result.id, status: result.status, error: result.error }),
            ].filter((line) => line !== null).join("\n"),
          }],
          isError: !ok,
        };
      } catch (err) {
        return errorResult("apply_visual_proposal", err);
      }
    },
  );
}
