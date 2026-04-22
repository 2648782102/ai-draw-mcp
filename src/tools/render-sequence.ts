import { z } from "zod";
import { nanoid } from "nanoid";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderMermaidToSvg, saveSvg } from "../renderer/index.js";
import { svgToPng, pngToBase64 } from "../renderer/index.js";
import { DiagramStore } from "../storage/diagram-store.js";
import type { AppConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";

const ARROW_MAP: Record<string, string> = {
  solid: "->>",
  dashed: "-->>",
  solid_open: "->",
  dashed_open: "-->",
};

/**
 * Register `render_sequence` — structured input for sequence diagrams.
 */
export function registerRenderSequence(
  server: McpServer,
  store: DiagramStore,
  config: AppConfig
) {
  server.tool(
    "render_sequence",
    "Render a sequence diagram from structured actors and messages.",
    {
      title: z.string().optional().describe("Diagram title"),
      actors: z
        .array(
          z.object({
            id: z.string(),
            label: z.string().optional(),
            type: z.enum(["participant", "actor"]).optional(),
          })
        )
        .describe("Participants / actors"),
      messages: z
        .array(
          z.object({
            from: z.string(),
            to: z.string(),
            label: z.string(),
            arrow: z
              .enum(["solid", "dashed", "solid_open", "dashed_open"])
              .optional(),
          })
        )
        .describe("Messages between actors"),
      theme: z.enum(["default", "dark", "forest", "neutral"]).optional(),
      output_format: z.enum(["svg", "png"]).optional(),
    },
    async ({ title, actors, messages, theme, output_format }) => {
      const id = nanoid(10);
      const diagramTitle = title ?? `Sequence ${id}`;
      const fmt = output_format ?? config.defaultFormat;

      try {
        const lines: string[] = ["sequenceDiagram"];

        for (const actor of actors) {
          const keyword = actor.type === "actor" ? "actor" : "participant";
          const display = actor.label ? ` as ${actor.label}` : "";
          lines.push(`  ${keyword} ${actor.id}${display}`);
        }

        for (const msg of messages) {
          const arrow = ARROW_MAP[msg.arrow ?? "solid"] ?? "->>";
          lines.push(`  ${msg.from}${arrow}${msg.to}: ${msg.label}`);
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
          type: "sequence",
          createdAt: new Date().toISOString(),
          svgPath,
          pngPath,
          mermaidCode,
        });

        const previewUrl = `http://localhost:${config.previewPort}/diagram/${id}`;
        const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [
          { type: "text", text: `✅ 时序图「${diagramTitle}」已生成` },
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
        logger.error(`render_sequence failed: ${message}`);
        return {
          content: [{ type: "text" as const, text: `❌ 渲染失败: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
