import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResult, jsonLine, type ToolContext } from "./_shared.js";

export function registerReplyToVisualContext(server: McpServer, ctx: ToolContext) {
  server.tool(
    "reply_to_visual_context",
    "让 AI 在双向协作面板中回复人类的图形修改、批注或聊天消息，并可把指定消息标记成已回答。" +
    " 这是人在面板里能直接看到 AI 回应的桥梁；不会修改项目文件，也不会创建或应用变更提案。",
    {
      body: z.string().min(1).describe("Message shown to the human in the collaboration panel"),
      diagram_id: z.string().optional(),
      resolves_message_ids: z.array(z.string()).optional()
        .describe("Human message IDs to mark as answered"),
      resolves_annotation_ids: z.array(z.string()).optional()
        .describe("Annotation IDs to mark as resolved"),
      status: z.enum(["answered", "pending"]).optional()
        .describe("Most replies use answered; use pending to ask the human for clarification"),
    },
    async ({ body, diagram_id, resolves_message_ids, resolves_annotation_ids, status }) => {
      try {
        for (const id of resolves_message_ids ?? []) await ctx.sessions.markMessage(id, "answered");
        if ((resolves_annotation_ids ?? []).length > 0)
          await ctx.sessions.resolveAnnotations(resolves_annotation_ids!);

        const message = await ctx.sessions.addMessage("ai", body.trim(), {
          diagramId: diagram_id,
          status: status ?? "answered",
          metadata: {
            event: "ai_reply",
            resolvedMessageIds: resolves_message_ids ?? [],
            resolvedAnnotationIds: resolves_annotation_ids ?? [],
          },
        });
        ctx.preview.broadcast({ type: "chat_message", message });
        const snapshot = ctx.sessions.getSnapshot();
        return {
          content: [{
            type: "text" as const,
            text: [
              "✅ 回复已推送到协作面板",
              ``,
              `ID: ${message.id}`,
              `Status: ${message.status}`,
              `Graph revision: ${snapshot.graphRevision}`,
              ``,
              jsonLine({ id: message.id, status: message.status ?? "answered" }),
              ``,
              "提示：人类的旧消息不会自动消失；用 resolves_message_ids 标记已回答，用 resolves_annotation_ids 标记批注已解决。",
            ].join("\n"),
          }],
        };
      } catch (err) {
        return errorResult("reply_to_visual_context", err);
      }
    },
  );
}
