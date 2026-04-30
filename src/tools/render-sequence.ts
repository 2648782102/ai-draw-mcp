import { z } from "zod";
import { nanoid } from "nanoid";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderMermaidAndRespond, errorResult, type ToolContext } from "./_shared.js";

const ARROW: Record<string, string> = {
  solid:       "->>",
  dashed:      "-->>",
  solid_open:  "->",
  dashed_open: "-->",
};

export function registerRenderSequence(server: McpServer, ctx: ToolContext) {
  server.tool(
    "render_sequence",
    "从 actors + messages 生成时序图（sequenceDiagram）并推送预览；适合交互/API 调用链。任意语法请用 render_diagram。",
    {
      title: z.string().optional(),
      actors: z.array(z.object({
        id:    z.string(),
        label: z.string().optional(),
        type:  z.enum(["participant", "actor"]).optional(),
      })),
      messages: z.array(z.object({
        from:  z.string(),
        to:    z.string(),
        label: z.string(),
        arrow: z.enum(["solid", "dashed", "solid_open", "dashed_open"]).optional(),
      })),
      theme:         z.enum(["default", "dark", "forest", "neutral"]).optional(),
      output_format: z.enum(["svg", "png"]).optional(),
    },
    async ({ title, actors, messages, theme, output_format }) => {
      const id = nanoid(10);
      try {
        const lines: string[] = ["sequenceDiagram"];
        for (const a of actors)
          lines.push(`  ${a.type === "actor" ? "actor" : "participant"} ${a.id}${a.label ? ` as ${a.label}` : ""}`);
        for (const m of messages)
          lines.push(`  ${m.from}${ARROW[m.arrow ?? "solid"] ?? "->>"} ${m.to}: ${m.label}`);
        return await renderMermaidAndRespond({
          id,
          title: title ?? `Sequence ${id}`,
          diagramType: "sequence",
          mermaidCode: lines.join("\n"),
          theme: theme ?? ctx.config.defaultTheme,
          format: output_format ?? ctx.config.defaultFormat,
          ctx,
        });
      } catch (err) {
        return errorResult("render_sequence", err);
      }
    }
  );
}
