import { z } from "zod";
import { nanoid } from "nanoid";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderMermaidToSvg, saveSvg } from "../renderer/index.js";
import { svgToPng, pngToBase64 } from "../renderer/index.js";
import { DiagramStore } from "../storage/diagram-store.js";
import type { AppConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";

const SHAPE_MAP: Record<string, [string, string]> = {
  rect: ["[", "]"],
  round: ["(", ")"],
  stadium: ["([", "])"],
  subroutine: ["[[", "]]"],
  cylinder: ["[(", ")]"],
  circle: ["((", "))"],
  diamond: ["{", "}"],
  hexagon: ["{{", "}}"],
  parallelogram: ["[/", "/]"],
  trapezoid: ["[/", "\\]"],
};

const EDGE_MAP: Record<string, string> = {
  solid: "-->",
  dashed: "-.->",
  dotted: "-..->",
  thick: "==>",
};

/**
 * Register `render_flowchart` — structured input for flowcharts.
 * Converts JSON nodes/edges into Mermaid flowchart DSL.
 */
export function registerRenderFlowchart(
  server: McpServer,
  store: DiagramStore,
  config: AppConfig
) {
  server.tool(
    "render_flowchart",
    "Render a flowchart from structured nodes and edges. " +
      "Easier than writing raw Mermaid — just provide nodes (id, label, shape) and edges (from, to, label).",
    {
      title: z.string().optional().describe("Diagram title"),
      direction: z
        .enum(["TB", "TD", "BT", "LR", "RL"])
        .optional()
        .describe("Flow direction (default: TD)"),
      nodes: z
        .array(
          z.object({
            id: z.string(),
            label: z.string(),
            shape: z
              .enum([
                "rect", "round", "stadium", "subroutine",
                "cylinder", "circle", "diamond", "hexagon",
                "parallelogram", "trapezoid",
              ])
              .optional(),
          })
        )
        .describe("Flowchart nodes"),
      edges: z
        .array(
          z.object({
            from: z.string(),
            to: z.string(),
            label: z.string().optional(),
            style: z.enum(["solid", "dashed", "dotted", "thick"]).optional(),
          })
        )
        .describe("Flowchart edges"),
      theme: z.enum(["default", "dark", "forest", "neutral"]).optional(),
      output_format: z.enum(["svg", "png"]).optional(),
    },
    async ({ title, direction, nodes, edges, theme, output_format }) => {
      const id = nanoid(10);
      const diagramTitle = title ?? `Flowchart ${id}`;
      const dir = direction ?? "TD";
      const fmt = output_format ?? config.defaultFormat;

      try {
        const lines: string[] = [`graph ${dir}`];

        for (const node of nodes) {
          const [open, close] = SHAPE_MAP[node.shape ?? "rect"] ?? ["[", "]"];
          lines.push(`  ${node.id}${open}"${node.label}"${close}`);
        }

        for (const edge of edges) {
          const arrow = EDGE_MAP[edge.style ?? "solid"] ?? "-->";
          const labelPart = edge.label ? `|"${edge.label}"|` : "";
          lines.push(`  ${edge.from} ${arrow}${labelPart} ${edge.to}`);
        }

        const mermaidCode = lines.join("\n");
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
          type: "flowchart",
          createdAt: new Date().toISOString(),
          svgPath,
          pngPath,
          mermaidCode,
        });

        const previewUrl = `http://localhost:${config.previewPort}/diagram/${id}`;
        const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [
          { type: "text", text: `✅ 流程图「${diagramTitle}」已生成` },
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
        logger.error(`render_flowchart failed: ${message}`);
        return {
          content: [{ type: "text" as const, text: `❌ 渲染失败: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
