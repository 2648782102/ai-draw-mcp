import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResult, jsonLine, type ToolContext } from "./_shared.js";
import { inspectProposalChanges } from "../domain/proposal-preflight.js";

const changeSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(["create", "update", "mkdir"]),
  path: z.string().describe("Workspace-relative path"),
  content: z.string().optional().describe("Full UTF-8 content for create/update"),
  encoding: z.literal("utf8").optional(),
  rationale: z.string().optional(),
});

export function registerPreflightVisualProposal(server: McpServer, ctx: ToolContext) {
  server.tool(
    "preflight_visual_proposal",
    "在 create_visual_proposal 之前只读检查候选变更：路径安全、目标文件是否存在、create/update 是否写反、重复路径、重复内容、编码与体积。" +
    " 返回 blockers/warnings 与当前图引用路径；本工具绝不写项目文件、不创建提案，也不签发批准凭据。",
    {
      changes: z.array(changeSchema).min(1).describe("Candidate workspace file changes"),
      include_graph: z.boolean().optional().describe("Compare paths with the current visual graph (default true)"),
    },
    async ({ changes, include_graph }) => {
      try {
        const snapshot = ctx.sessions.getSnapshot();
        const summary = await inspectProposalChanges({
          workspaceRoot: ctx.config.workspaceRoot,
          changes: changes.map((change, index) => ({
            ...change,
            id: change.id ?? `change_${index + 1}`,
          })),
          graph: include_graph === false ? undefined : snapshot.graph,
        });
        return {
          content: [{
            type: "text" as const,
            text: [
              summary.safe
                ? `✅ 提案预检通过：${summary.files} 个变更，${summary.warnings} 条警告`
                : `⚠️ 提案预检发现 ${summary.blockers} 个阻断项，请勿创建提案`,
              ``,
              `Workspace: ${ctx.config.workspaceRoot}`,
              `Graph revision: ${snapshot.graphRevision}`,
              `Blockers: ${summary.blockers} · warnings: ${summary.warnings} · unchanged: ${summary.unchanged}`,
              `Graph referenced paths: ${summary.graphReferencedPaths.length}`,
              ``,
              jsonLine({
                safe: String(summary.safe),
                blockers: String(summary.blockers),
                warnings: String(summary.warnings),
                graphRevision: String(snapshot.graphRevision),
              }),
              ``,
              summary.guidance,
              ``,
              "PREFLIGHT_JSON:",
              JSON.stringify(summary, null, 2),
            ].join("\n"),
          }],
        };
      } catch (err) {
        return errorResult("preflight_visual_proposal", err);
      }
    },
  );
}
