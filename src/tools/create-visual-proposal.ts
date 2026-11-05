import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResult, jsonLine, type ToolContext } from "./_shared.js";

const changeSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(["create", "update", "mkdir"]),
  path: z.string().describe("Workspace-relative path"),
  content: z.string().optional().describe("Full UTF-8 content for create/update"),
  encoding: z.literal("utf8").optional(),
  rationale: z.string().optional(),
});

export function registerCreateVisualProposal(server: McpServer, ctx: ToolContext) {
  server.tool(
    "create_visual_proposal",
    "根据面板里的人类批注/对话，创建一组待确认的项目变更提案。" +
    " 提案只写入协作会话，不修改项目文件；人类在面板查看逐行差异并批准后，apply_visual_proposal 才会凭一次性确认号原子地应用。" +
    " 危险路径、删除、锁文件、.git/env/node_modules/dist 等会被拒绝。",
    {
      title: z.string().describe("Short human-readable proposal title"),
      summary: z.string().describe("What will change and why"),
      diagram_id: z.string().optional(),
      changes: z.array(changeSchema).min(1).describe("Safe workspace file changes"),
      metadata: z.record(z.unknown()).optional(),
    },
    async ({ title, summary, diagram_id, changes, metadata }) => {
      try {
        const normalized = changes.map((change, index) => ({
          ...change,
          id: change.id ?? `change_${index + 1}`,
        }));
        const proposal = await ctx.sessions.createProposal({
          title,
          summary,
          diagramId: diagram_id,
          changes: normalized,
          createdBy: "ai",
          metadata: metadata as Record<string, unknown> | undefined,
        });
        await ctx.sessions.addMessage("ai", `已生成变更提案「${title}」，等待人类确认。`, {
          diagramId: diagram_id,
          status: "answered",
          metadata: { proposalId: proposal.id, event: "proposal_created" },
        });
        ctx.preview.broadcast({
          type: "proposal_created",
          proposal,
          sessionId: ctx.sessions.getSnapshot().id,
        });
        return {
          content: [{
            type: "text" as const,
            text: [
              `✅ 提案「${title}」已创建，等待人类在面板中确认`,
              ``,
              `ID: ${proposal.id}`,
              `Status: ${proposal.status}`,
              `Changes: ${proposal.changes.length}`,
              `Graph revision: ${proposal.graphRevision}`,
              `Content hash: ${proposal.contentHash}`,
              ``,
              jsonLine({
                id: proposal.id,
                title: proposal.title,
                status: proposal.status,
                changes: String(proposal.changes.length),
                contentHash: proposal.contentHash,
              }),
              ``,
              "PROPOSAL_JSON:",
              JSON.stringify(proposal, null, 2),
              ``,
              "提示：不要让 AI 直接改项目文件；人类批准并复制确认号后，再调用 apply_visual_proposal。",
            ].join("\n"),
          }],
        };
      } catch (err) {
        return errorResult("create_visual_proposal", err);
      }
    },
  );
}
