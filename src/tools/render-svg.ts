import { z } from "zod";
import { nanoid } from "nanoid";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { wrapSvg, saveSvg } from "../renderer/index.js";
import { errorResponse, type ToolContext } from "./shared.js";
import { openPanelInIDE } from "../utils/ide-opener.js";

export function registerRenderSvg(server: McpServer, ctx: ToolContext) {
  server.tool(
    "render_svg",
    "Render a custom diagram from raw SVG markup and push to the live panel.",
    {
      title: z.string().optional(),
      svg_content: z.string().describe("Inner SVG elements markup"),
      width: z.number().optional(), height: z.number().optional(),
      background: z.string().optional(),
      output_format: z.enum(["svg","png"]).optional(),
    },
    async ({ title, svg_content, width, height, background }) => {
      const id = nanoid(10);
      const diagramTitle = title ?? `SVG ${id}`;
      try {
        const fullSvg = wrapSvg(svg_content, { width, height, background });
        const svgPath = await saveSvg(fullSvg, ctx.config.outputDir, `${id}.svg`);
        await ctx.store.add({ id, title: diagramTitle, type: "custom", createdAt: new Date().toISOString(), svgPath });

        const url = `http://localhost:${ctx.config.previewPort}/diagram/${id}`;
        await openPanelInIDE(url);
        ctx.preview.notifyNewDiagram(id, diagramTitle, "");

        return {
          content: [{
            type: "text" as const,
            text: `✅ SVG 图「${diagramTitle}」已推送到面板\n\nID: ${id}\n面板: http://localhost:${ctx.config.previewPort}/diagram/${id}\nSVG: ${svgPath}`,
          }],
        };
      } catch (err) { return errorResponse("render_svg", err); }
    }
  );
}
