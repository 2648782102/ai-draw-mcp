import { z } from "zod";
import { nanoid } from "nanoid";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderMermaidAndRespond, errorResult, type ToolContext } from "./_shared.js";

export function registerRenderDiagram(server: McpServer, ctx: ToolContext) {
  server.tool(
    "render_diagram",
    "通用 Mermaid：直接提交完整 DSL，渲染后推送到本机实时预览面板（可编辑、保存写回）。" +
    " 当你已有 Mermaid 字符串、或结构化工具（render_flowchart 等）不适用时用本工具。" +
    " 支持 flowchart / sequenceDiagram / classDiagram / stateDiagram / erDiagram / gantt / pie / mindmap 等。",
    {
      title: z.string().optional().describe("Human-readable title for this diagram"),
      mermaid_code: z.string().describe("Mermaid DSL source code for the diagram"),
      theme: z.enum(["default", "dark", "forest", "neutral"]).optional(),
      output_format: z.enum(["svg", "png"]).optional(),
    },
    async ({ title, mermaid_code, theme, output_format }) => {
      const id = nanoid(10);
      try {
        return await renderMermaidAndRespond({
          id,
          title: title ?? `Diagram ${id}`,
          diagramType: "custom",
          mermaidCode: mermaid_code,
          theme: theme ?? ctx.config.defaultTheme,
          format: output_format ?? ctx.config.defaultFormat,
          ctx,
        });
      } catch (err) {
        return errorResult("render_diagram", err);
      }
    }
  );
}
