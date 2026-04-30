import { z } from "zod";
import { nanoid } from "nanoid";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderMermaidAndRespond, errorResult, type ToolContext } from "./_shared.js";

const nodeSchema: z.ZodType<{ label: string; children?: Array<{ label: string; children?: unknown[] }> }> =
  z.lazy(() => z.object({ label: z.string(), children: z.array(nodeSchema).optional() }));

function toLines(node: { label: string; children?: unknown[] }, depth: number): string[] {
  const lines = [`${"  ".repeat(depth)}${node.label}`];
  if (Array.isArray(node.children))
    for (const c of node.children as Array<{ label: string; children?: unknown[] }>)
      lines.push(...toLines(c, depth + 1));
  return lines;
}

export function registerRenderMindmap(server: McpServer, ctx: ToolContext) {
  server.tool(
    "render_mindmap",
    "从树形 root 生成 mindmap 并推送预览；适合大纲/知识树。",
    {
      title:         z.string().optional(),
      root:          nodeSchema.describe("Root node of the mindmap tree"),
      theme:         z.enum(["default", "dark", "forest", "neutral"]).optional(),
      output_format: z.enum(["svg", "png"]).optional(),
    },
    async ({ title, root, theme, output_format }) => {
      const id = nanoid(10);
      try {
        const mermaidCode = ["mindmap", ...toLines(root, 1)].join("\n");
        return await renderMermaidAndRespond({
          id,
          title: title ?? `Mindmap ${id}`,
          diagramType: "mindmap",
          mermaidCode,
          theme: theme ?? ctx.config.defaultTheme,
          format: output_format ?? ctx.config.defaultFormat,
          ctx,
        });
      } catch (err) {
        return errorResult("render_mindmap", err);
      }
    }
  );
}
