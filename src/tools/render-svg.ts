import { z } from "zod";
import { nanoid } from "nanoid";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { wrapSvg, saveSvg } from "../renderer/index.js";
import { svgToPng, pngToBase64 } from "../renderer/index.js";
import { DiagramStore } from "../storage/diagram-store.js";
import type { AppConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";

/**
 * Register `render_svg` — free-form SVG drawing.
 * AI provides raw SVG markup; we wrap it and save.
 */
export function registerRenderSvg(
  server: McpServer,
  store: DiagramStore,
  config: AppConfig
) {
  server.tool(
    "render_svg",
    "Render a custom diagram from raw SVG markup. " +
      "Provide the inner SVG elements (rect, circle, text, path, etc.) and we wrap them with proper headers.",
    {
      title: z.string().optional(),
      svg_content: z.string().describe("Inner SVG elements markup"),
      width: z.number().optional().describe("Canvas width in px (default 800)"),
      height: z.number().optional().describe("Canvas height in px (default 600)"),
      background: z.string().optional().describe("Background color (e.g. #ffffff)"),
      output_format: z.enum(["svg", "png"]).optional(),
    },
    async ({ title, svg_content, width, height, background, output_format }) => {
      const id = nanoid(10);
      const diagramTitle = title ?? `SVG ${id}`;
      const fmt = output_format ?? config.defaultFormat;

      try {
        const fullSvg = wrapSvg(svg_content, { width, height, background });
        const svgPath = await saveSvg(fullSvg, config.outputDir, `${id}.svg`);

        let pngPath: string | undefined;
        let imageBase64: string | undefined;
        if (fmt === "png") {
          pngPath = await svgToPng(svgPath, config.outputDir);
          imageBase64 = await pngToBase64(pngPath);
        }

        await store.add({
          id,
          title: diagramTitle,
          type: "custom",
          createdAt: new Date().toISOString(),
          svgPath,
          pngPath,
        });

        const previewUrl = `http://localhost:${config.previewPort}/diagram/${id}`;
        const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [
          { type: "text", text: `✅ SVG 图「${diagramTitle}」已生成` },
        ];
        if (imageBase64) {
          content.push({ type: "image", data: imageBase64, mimeType: "image/png" });
        }
        content.push({
          type: "text",
          text: `ID: ${id}\nSVG: ${svgPath}${pngPath ? `\nPNG: ${pngPath}` : ""}\nPreview: ${previewUrl}`,
        });
        return { content };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`render_svg failed: ${message}`);
        return {
          content: [{ type: "text" as const, text: `❌ 渲染失败: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
