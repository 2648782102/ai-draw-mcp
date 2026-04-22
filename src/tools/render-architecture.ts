import { z } from "zod";
import { nanoid } from "nanoid";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderMermaidToSvg, saveSvg } from "../renderer/index.js";
import { svgToPng, pngToBase64 } from "../renderer/index.js";
import { DiagramStore } from "../storage/diagram-store.js";
import type { AppConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";

const ICON_MAP: Record<string, string> = {
  service: "🔧",
  database: "🗄️",
  cache: "⚡",
  queue: "📨",
  gateway: "🚪",
  client: "👤",
  external: "🌐",
};

const EDGE_MAP: Record<string, string> = {
  solid: "-->",
  dashed: "-.->",
  dotted: "-..->",
  thick: "==>",
};

/**
 * Register `render_architecture` — structured component/architecture diagrams.
 * Uses Mermaid flowchart with subgraphs for groups.
 */
export function registerRenderArchitecture(
  server: McpServer,
  store: DiagramStore,
  config: AppConfig
) {
  server.tool(
    "render_architecture",
    "Render an architecture / component diagram from structured components and connections. " +
      "Components can be grouped by layer (e.g. 'Frontend', 'Backend', 'Data').",
    {
      title: z.string().optional().describe("Diagram title"),
      components: z
        .array(
          z.object({
            id: z.string(),
            label: z.string(),
            type: z
              .enum(["service", "database", "cache", "queue", "gateway", "client", "external"])
              .optional(),
            group: z.string().optional().describe("Group / layer name"),
          })
        )
        .describe("Architecture components"),
      connections: z
        .array(
          z.object({
            from: z.string(),
            to: z.string(),
            label: z.string().optional(),
            style: z.enum(["solid", "dashed", "dotted", "thick"]).optional(),
          })
        )
        .describe("Connections between components"),
      theme: z.enum(["default", "dark", "forest", "neutral"]).optional(),
      output_format: z.enum(["svg", "png"]).optional(),
    },
    async ({ title, components, connections, theme, output_format }) => {
      const id = nanoid(10);
      const diagramTitle = title ?? `Architecture ${id}`;
      const fmt = output_format ?? config.defaultFormat;

      try {
        const lines: string[] = ["graph TB"];

        const groups = new Map<string, typeof components>();
        const ungrouped: typeof components = [];
        for (const c of components) {
          if (c.group) {
            if (!groups.has(c.group)) groups.set(c.group, []);
            groups.get(c.group)!.push(c);
          } else {
            ungrouped.push(c);
          }
        }

        for (const c of ungrouped) {
          const icon = ICON_MAP[c.type ?? "service"] ?? "";
          lines.push(`  ${c.id}["${icon} ${c.label}"]`);
        }

        for (const [groupName, members] of groups) {
          lines.push(`  subgraph ${groupName.replace(/\s+/g, "_")}["${groupName}"]`);
          for (const c of members) {
            const icon = ICON_MAP[c.type ?? "service"] ?? "";
            lines.push(`    ${c.id}["${icon} ${c.label}"]`);
          }
          lines.push("  end");
        }

        for (const conn of connections) {
          const arrow = EDGE_MAP[conn.style ?? "solid"] ?? "-->";
          const labelPart = conn.label ? `|"${conn.label}"|` : "";
          lines.push(`  ${conn.from} ${arrow}${labelPart} ${conn.to}`);
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
          type: "architecture",
          createdAt: new Date().toISOString(),
          svgPath,
          pngPath,
          mermaidCode,
        });

        const previewUrl = `http://localhost:${config.previewPort}/diagram/${id}`;
        const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [
          { type: "text", text: `✅ 架构图「${diagramTitle}」已生成` },
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
        logger.error(`render_architecture failed: ${message}`);
        return {
          content: [{ type: "text" as const, text: `❌ 渲染失败: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
