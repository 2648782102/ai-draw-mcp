import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildChangeTemplateDraft, listChangeTemplates, type ChangeTemplateId } from "../domain/change-templates.js";
import { errorResult, jsonLine, type ToolContext } from "./_shared.js";

const templateIds = ["update_documentation", "add_test", "create_module"] as const;

export function registerListChangeTemplates(server: McpServer, ctx: ToolContext) {
  server.tool(
    "list_change_templates",
    "列出常用的只读变更提案模板，或把模板展开成候选 changes 草稿。" +
    " AI 扫描项目、读取 get_visual_context 后，可用它把「更新文档 / 添加测试 / 创建模块」这类常见意图快速变成可预检的候选变更；" +
    " 本工具绝不创建提案、写项目文件、批准变更或签发确认号。展开草稿后必须先调用 preflight_visual_proposal，再调用 create_visual_proposal。",
    {
      template_id: z.enum(templateIds).optional()
        .describe("Expand one template into a draft; omit to list all available templates"),
      path: z.string().optional().describe("Workspace-relative target path; required by some templates when no graph node path is available"),
      node_id: z.string().optional().describe("VisualGraph node ID from get_visual_context"),
      title: z.string().optional().describe("Template-specific short title or identifier"),
      content: z.string().optional().describe("Full UTF-8 file content for update_documentation"),
    },
    async ({ template_id, path, node_id, title, content }) => {
      try {
        if (!template_id) {
          const payload = listChangeTemplates();
          return {
            content: [{
              type: "text" as const,
              text: [
                `📋 ${payload.templates.length} 个只读变更模板`,
                ...payload.templates.map((template) => `- ${template.id}: ${template.title} — ${template.description}`),
                ``,
                jsonLine({ version: "1", templates: String(payload.templates.length) }),
                ``,
                "TEMPLATES_JSON:",
                JSON.stringify(payload, null, 2),
              ].join("\n"),
            }],
          };
        }
        const draft = buildChangeTemplateDraft(ctx.sessions.getSnapshot(), {
          templateId: template_id as ChangeTemplateId,
          path,
          nodeId: node_id,
          title,
          content,
        });
        return {
          content: [{
            type: "text" as const,
            text: [
              `📝 变更模板草稿「${draft.title}」`,
              `Template: ${draft.templateId}`,
              `Graph revision: ${draft.graphRevision}`,
              `Changes: ${draft.changes.length}`,
              `Cited graph nodes: ${draft.citedNodeIds.length}`,
              ``,
              jsonLine({
                version: "1",
                templateId: draft.templateId,
                graphRevision: String(draft.graphRevision),
                changes: String(draft.changes.length),
              }),
              ``,
              "DRAFT_JSON:",
              JSON.stringify(draft, null, 2),
              ``,
              draft.guidance,
            ].join("\n"),
          }],
        };
      } catch (err) {
        return errorResult("list_change_templates", err);
      }
    },
  );
}
