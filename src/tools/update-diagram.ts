import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderMermaidAndRespond, errorResult, jsonLine, openHint, panelDiagramUrl, type ToolContext } from "./_shared.js";
import { renderMermaidToSvg, saveSvg } from "../infra/renderer.js";

export function registerUpdateDiagram(server: McpServer, ctx: ToolContext) {
  server.tool(
    "update_diagram",
    "按 ID 覆盖已有图的 Mermaid 源码并重新渲染 SVG，实时同步到预览面板（适合迭代流程图/时序图等）。" +
    " diagram_id 须为上次 render_* 或 list_diagrams 返回的 id；纯 SVG 图请用面板编辑保存。",
    {
      diagram_id:    z.string().describe("ID of the diagram to update"),
      mermaid_code:  z.string().describe("New Mermaid DSL code"),
      title:         z.string().optional().describe("Optionally update the title"),
      theme:         z.enum(["default", "dark", "forest", "neutral"]).optional(),
    },
    async ({ diagram_id, mermaid_code, title, theme }) => {
      try {
        const record = ctx.store.get(diagram_id);
        if (!record)
          return { content: [{ type: "text" as const, text: `❌ 找不到 ID 为 ${diagram_id} 的图表` }], isError: true };

        const svg = await renderMermaidToSvg(mermaid_code, theme ?? ctx.config.defaultTheme);
        const svgPath = await saveSvg(svg, ctx.config.outputDir, `${diagram_id}.svg`);

        record.mermaidCode = mermaid_code;
        record.svgPath = svgPath;
        if (title) record.title = title;
        await ctx.store.add(record);

        ctx.preview.notifyDiagramUpdate(diagram_id, record.title, mermaid_code);

        const panelUrl = panelDiagramUrl(ctx.config, diagram_id);
        return {
          content: [{
            type: "text" as const,
            text: [
              `✅ 图表「${record.title}」已更新并推送到面板`,
              ``,
              `ID: ${diagram_id}`,
              `面板: ${panelUrl}`,
              `SVG: ${svgPath}`,
              ``,
              jsonLine({ id: diagram_id, title: record.title, panelUrl, svgPath, pngPath: record.pngPath }),
              ``,
              openHint(panelUrl, ctx.config),
              ``,
              "提示：可用 update_diagram 继续迭代；list_diagrams 查看全部；delete_diagram 删除。",
            ].join("\n"),
          }],
        };
      } catch (err) {
        return errorResult("update_diagram", err);
      }
    }
  );
}
