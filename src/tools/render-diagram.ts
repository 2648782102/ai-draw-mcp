import { z } from "zod";
import { nanoid } from "nanoid";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderAndRespond, errorResponse, type ToolContext } from "./shared.js";

export function registerRenderDiagram(server: McpServer, ctx: ToolContext) {
  server.tool(
    "render_diagram",
    "Render any Mermaid diagram from raw Mermaid DSL code and push it to the live editor panel. " +
      "Supports flowchart, sequence, class, state, ER, gantt, pie, mindmap, timeline and more.",
    {
      title: z.string().optional().describe("Human-readable title for this diagram"),
      mermaid_code: z.string().describe("Mermaid DSL source code for the diagram"),
      theme: z.enum(["default", "dark", "forest", "neutral"]).optional(),
      output_format: z.enum(["svg", "png"]).optional(),
    },
    async ({ title, mermaid_code, theme, output_format }) => {
      const id = nanoid(10);
      try {
        return await renderAndRespond({
          id,
          title: title ?? `Diagram ${id}`,
          diagramType: "custom",
          mermaidCode: mermaid_code,
          theme: theme ?? ctx.config.defaultTheme,
          format: output_format ?? ctx.config.defaultFormat,
          ctx,
        });
      } catch (err) {
        return errorResponse("render_diagram", err);
      }
    }
  );
}
