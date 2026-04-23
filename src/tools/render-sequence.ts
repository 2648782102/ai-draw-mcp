import { z } from "zod";
import { nanoid } from "nanoid";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderAndRespond, errorResponse, type ToolContext } from "./shared.js";

const ARROW: Record<string, string> = { solid: "->>", dashed: "-->>", solid_open: "->", dashed_open: "-->" };

export function registerRenderSequence(server: McpServer, ctx: ToolContext) {
  server.tool(
    "render_sequence",
    "Render a sequence diagram from structured actors and messages, pushed to the live editor panel.",
    {
      title: z.string().optional(),
      actors: z.array(z.object({ id: z.string(), label: z.string().optional(), type: z.enum(["participant","actor"]).optional() })),
      messages: z.array(z.object({ from: z.string(), to: z.string(), label: z.string(), arrow: z.enum(["solid","dashed","solid_open","dashed_open"]).optional() })),
      theme: z.enum(["default","dark","forest","neutral"]).optional(),
      output_format: z.enum(["svg","png"]).optional(),
    },
    async ({ title, actors, messages, theme, output_format }) => {
      const id = nanoid(10);
      try {
        const lines: string[] = ["sequenceDiagram"];
        for (const a of actors) lines.push(`  ${a.type === "actor" ? "actor" : "participant"} ${a.id}${a.label ? ` as ${a.label}` : ""}`);
        for (const m of messages) lines.push(`  ${m.from}${ARROW[m.arrow ?? "solid"] ?? "->>"}${m.to}: ${m.label}`);
        return await renderAndRespond({
          id, title: title ?? `Sequence ${id}`, diagramType: "sequence",
          mermaidCode: lines.join("\n"), theme: theme ?? ctx.config.defaultTheme,
          format: output_format ?? ctx.config.defaultFormat, ctx,
        });
      } catch (err) { return errorResponse("render_sequence", err); }
    }
  );
}
