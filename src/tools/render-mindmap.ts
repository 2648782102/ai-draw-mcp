import { z } from "zod";
import { nanoid } from "nanoid";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderMermaidToSvg, saveSvg } from "../renderer/index.js";
import { svgToPng, pngToBase64 } from "../renderer/index.js";
import { DiagramStore } from "../storage/diagram-store.js";
import type { AppConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";

// Zod schema for a recursive tree structure (max 6 levels deep)
const mindmapNodeSchema: z.ZodType<{
  label: string;
  children?: Array<{ label: string; children?: unknown[] }>;
}> = z.lazy(() =>
  z.object({
    label: z.string(),
    children: z.array(mindmapNodeSchema).optional(),
  })
);

function buildMindmapLines(node: { label: string; children?: unknown[] }, depth: number): string[] {
  const indent = "  ".repeat(depth);
  const lines: string[] = [`${indent}${node.label}`];
  if (Array.isArray(node.children)) {
    for (const child of node.children as Array<{ label: string; children?: unknown[] }>) {
      lines.push(...buildMindmapLines(child, depth + 1));
    }
  }
  return lines;
}

/**
 * Register `render_mindmap` — mindmap from a tree structure.
 */
export function registerRenderMindmap(
  server: McpServer,
  store: DiagramStore,
  config: AppConfig
) {
  server.tool(
    "render_mindmap",
    "Render a mindmap from a hierarchical tree structure with a root node and nested children.",
    {
      title: z.string().optional(),
      root: mindmapNodeSchema.describe("Root node of the mindmap tree"),
      theme: z.enum(["default", "dark", "forest", "neutral"]).optional(),
      output_format: z.enum(["svg", "png"]).optional(),
    },
    async ({ title, root, theme, output_format }) => {
      const id = nanoid(10);
      const diagramTitle = title ?? `Mindmap ${id}`;
      const fmt = output_format ?? config.defaultFormat;

      try {
        const bodyLines = buildMindmapLines(root, 1);
        const mermaidCode = ["mindmap", ...bodyLines].join("\n");

        const svg = await renderMermaidToSvg(mermaidCode, theme ?? config.defaultTheme);
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
          type: "mindmap",
          createdAt: new Date().toISOString(),
          svgPath,
          pngPath,
          mermaidCode,
        });

        const previewUrl = `http://localhost:${config.previewPort}/diagram/${id}`;
        const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [
          { type: "text", text: `✅ 思维导图「${diagramTitle}」已生成` },
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
        logger.error(`render_mindmap failed: ${message}`);
        return {
          content: [{ type: "text" as const, text: `❌ 渲染失败: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
