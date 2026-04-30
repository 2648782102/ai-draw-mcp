import { z } from "zod";
import { nanoid } from "nanoid";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderSvgAndRespond, errorResult, type ToolContext } from "./_shared.js";

export function registerRenderSvg(server: McpServer, ctx: ToolContext) {
  server.tool(
    "render_svg",
    "将任意 SVG（片段或内层元素）包装为完整矢量图并推送到实时预览面板；面板左侧为 SVG 源码，可保存写回。" +
    " 与 Mermaid 工具互补：适合图标、自定义布局、非 Mermaid 语法图形。可选 output_format: png 时用 sharp 从 SVG 导出 PNG。" +
    " 注意：svg_content 应为内层 SVG 元素，不含 <svg> 根标签。",
    {
      title:         z.string().optional(),
      svg_content:   z.string().describe("Inner SVG elements markup (without <svg> root tag)"),
      width:         z.number().optional(),
      height:        z.number().optional(),
      background:    z.string().optional(),
      output_format: z.enum(["svg", "png"]).optional(),
    },
    async ({ title, svg_content, width, height, background, output_format }) => {
      const id = nanoid(10);
      const diagramTitle = title ?? `SVG ${id}`;
      try {
        return await renderSvgAndRespond({
          id,
          title: diagramTitle,
          svgContent: svg_content,
          width,
          height,
          background,
          format: output_format ?? ctx.config.defaultFormat,
          ctx,
        });
      } catch (err) {
        return errorResult("render_svg", err);
      }
    }
  );
}
