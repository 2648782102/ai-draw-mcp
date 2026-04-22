import { z } from "zod";
import { nanoid } from "nanoid";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderMermaidToSvg, saveSvg } from "../renderer/index.js";
import { svgToPng, pngToBase64 } from "../renderer/index.js";
import { DiagramStore } from "../storage/diagram-store.js";
import type { AppConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";

/**
 * Register the `render_diagram` tool — accepts raw Mermaid DSL,
 * the most flexible drawing tool.
 */
export function registerRenderDiagram(
  server: McpServer,
  store: DiagramStore,
  config: AppConfig
) {
  server.tool(
    "render_diagram",
    "Render any Mermaid diagram from raw Mermaid DSL code. " +
      "Supports flowchart, sequence, class, state, ER, gantt, pie, mindmap, timeline and more. " +
      "Returns the rendered image.",
    {
      title: z
        .string()
        .optional()
        .describe("Human-readable title for this diagram"),
      mermaid_code: z
        .string()
        .describe("Mermaid DSL source code for the diagram"),
      theme: z
        .enum(["default", "dark", "forest", "neutral"])
        .optional()
        .describe("Mermaid theme to use (default: default)"),
      output_format: z
        .enum(["svg", "png"])
        .optional()
        .describe("Output format (default: svg)"),
    },
    async ({ title, mermaid_code, theme, output_format }) => {
      const id = nanoid(10);
      const diagramTitle = title ?? `Diagram ${id}`;
      const fmt = output_format ?? config.defaultFormat;

      try {
        const svg = await renderMermaidToSvg(mermaid_code, theme ?? config.defaultTheme);
        const svgPath = await saveSvg(svg, config.outputDir, `${id}.svg`);

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
          mermaidCode: mermaid_code,
        });

        const previewUrl = `http://localhost:${config.previewPort}/diagram/${id}`;

        const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [
          { type: "text", text: `✅ 图表「${diagramTitle}」已生成` },
        ];

        if (imageBase64) {
          content.push({
            type: "image",
            data: imageBase64,
            mimeType: "image/png",
          });
        }

        content.push({
          type: "text",
          text: [
            `ID: ${id}`,
            `SVG: ${svgPath}`,
            pngPath ? `PNG: ${pngPath}` : null,
            `Preview: ${previewUrl}`,
          ]
            .filter(Boolean)
            .join("\n"),
        });

        return { content };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`render_diagram failed: ${message}`);
        return {
          content: [{ type: "text" as const, text: `❌ 渲染失败: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
