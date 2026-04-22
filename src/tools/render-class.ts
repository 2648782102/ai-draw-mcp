import { z } from "zod";
import { nanoid } from "nanoid";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderMermaidToSvg, saveSvg } from "../renderer/index.js";
import { svgToPng, pngToBase64 } from "../renderer/index.js";
import { DiagramStore } from "../storage/diagram-store.js";
import type { AppConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";

const RELATION_MAP: Record<string, string> = {
  inheritance: "--|>",
  composition: "--*",
  aggregation: "--o",
  association: "-->",
  dependency: "..>",
  realization: "..|>",
};

/**
 * Register `render_class_diagram` — UML class diagram from structured input.
 */
export function registerRenderClassDiagram(
  server: McpServer,
  store: DiagramStore,
  config: AppConfig
) {
  server.tool(
    "render_class_diagram",
    "Render a UML class diagram from structured class definitions and relations.",
    {
      title: z.string().optional(),
      classes: z
        .array(
          z.object({
            name: z.string(),
            annotation: z.string().optional().describe("e.g. interface, abstract, service"),
            members: z
              .array(
                z.object({
                  name: z.string(),
                  type: z.string().optional(),
                  visibility: z.enum(["+", "-", "#", "~"]).optional(),
                })
              )
              .optional(),
            methods: z
              .array(
                z.object({
                  name: z.string(),
                  type: z.string().optional().describe("Return type"),
                  visibility: z.enum(["+", "-", "#", "~"]).optional(),
                })
              )
              .optional(),
          })
        )
        .describe("Class definitions"),
      relations: z
        .array(
          z.object({
            from: z.string(),
            to: z.string(),
            type: z.enum([
              "inheritance", "composition", "aggregation",
              "association", "dependency", "realization",
            ]),
            label: z.string().optional(),
          })
        )
        .describe("Relations between classes"),
      theme: z.enum(["default", "dark", "forest", "neutral"]).optional(),
      output_format: z.enum(["svg", "png"]).optional(),
    },
    async ({ title, classes, relations, theme, output_format }) => {
      const id = nanoid(10);
      const diagramTitle = title ?? `Class Diagram ${id}`;
      const fmt = output_format ?? config.defaultFormat;

      try {
        const lines: string[] = ["classDiagram"];

        for (const cls of classes) {
          lines.push(`  class ${cls.name} {`);
          if (cls.annotation) {
            lines.push(`    <<${cls.annotation}>>`);
          }
          for (const m of cls.members ?? []) {
            const vis = m.visibility ?? "+";
            lines.push(`    ${vis}${m.type ? m.type + " " : ""}${m.name}`);
          }
          for (const m of cls.methods ?? []) {
            const vis = m.visibility ?? "+";
            lines.push(`    ${vis}${m.name}()${m.type ? " " + m.type : ""}`);
          }
          lines.push("  }");
        }

        for (const rel of relations) {
          const arrow = RELATION_MAP[rel.type] ?? "-->";
          const label = rel.label ? ` : ${rel.label}` : "";
          lines.push(`  ${rel.from} ${arrow} ${rel.to}${label}`);
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
          type: "class",
          createdAt: new Date().toISOString(),
          svgPath,
          pngPath,
          mermaidCode,
        });

        const previewUrl = `http://localhost:${config.previewPort}/diagram/${id}`;
        const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [
          { type: "text", text: `✅ 类图「${diagramTitle}」已生成` },
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
        logger.error(`render_class_diagram failed: ${message}`);
        return {
          content: [{ type: "text" as const, text: `❌ 渲染失败: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
