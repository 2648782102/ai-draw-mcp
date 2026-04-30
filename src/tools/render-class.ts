import { z } from "zod";
import { nanoid } from "nanoid";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderMermaidAndRespond, errorResult, type ToolContext } from "./_shared.js";

const REL: Record<string, string> = {
  inheritance:  "--|>",
  composition:  "--*",
  aggregation:  "--o",
  association:  "-->",
  dependency:   "..>",
  realization:  "..|>",
};

export function registerRenderClassDiagram(server: McpServer, ctx: ToolContext) {
  server.tool(
    "render_class_diagram",
    "从 classes + relations 生成 classDiagram 并推送预览；适合领域模型。复杂 UML 可改用 render_diagram 手写 DSL。",
    {
      title: z.string().optional(),
      classes: z.array(z.object({
        name:       z.string(),
        annotation: z.string().optional(),
        members:    z.array(z.object({
          name:       z.string(),
          type:       z.string().optional(),
          visibility: z.enum(["+", "-", "#", "~"]).optional(),
        })).optional(),
        methods: z.array(z.object({
          name:       z.string(),
          type:       z.string().optional(),
          visibility: z.enum(["+", "-", "#", "~"]).optional(),
        })).optional(),
      })),
      relations: z.array(z.object({
        from:  z.string(),
        to:    z.string(),
        type:  z.enum(["inheritance", "composition", "aggregation", "association", "dependency", "realization"]),
        label: z.string().optional(),
      })),
      theme:         z.enum(["default", "dark", "forest", "neutral"]).optional(),
      output_format: z.enum(["svg", "png"]).optional(),
    },
    async ({ title, classes, relations, theme, output_format }) => {
      const id = nanoid(10);
      try {
        const lines: string[] = ["classDiagram"];
        for (const c of classes) {
          lines.push(`  class ${c.name} {`);
          if (c.annotation) lines.push(`    <<${c.annotation}>>`);
          for (const m of c.members ?? []) lines.push(`    ${m.visibility ?? "+"}${m.type ? m.type + " " : ""}${m.name}`);
          for (const m of c.methods ?? []) lines.push(`    ${m.visibility ?? "+"}${m.name}()${m.type ? " " + m.type : ""}`);
          lines.push("  }");
        }
        for (const r of relations)
          lines.push(`  ${r.from} ${REL[r.type] ?? "-->"} ${r.to}${r.label ? ` : ${r.label}` : ""}`);
        return await renderMermaidAndRespond({
          id,
          title: title ?? `Class Diagram ${id}`,
          diagramType: "class",
          mermaidCode: lines.join("\n"),
          theme: theme ?? ctx.config.defaultTheme,
          format: output_format ?? ctx.config.defaultFormat,
          ctx,
        });
      } catch (err) {
        return errorResult("render_class_diagram", err);
      }
    }
  );
}
