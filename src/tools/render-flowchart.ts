import { z } from "zod";
import { nanoid } from "nanoid";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderMermaidAndRespond, errorResult, type ToolContext } from "./_shared.js";

const SHAPE_MAP: Record<string, [string, string]> = {
  rect:         ["[",  "]"],
  round:        ["(",  ")"],
  stadium:      ["([", "])"],
  subroutine:   ["[[", "]]"],
  cylinder:     ["[(", ")]"],
  circle:       ["((", "))"],
  diamond:      ["{",  "}"],
  hexagon:      ["{{", "}}"],
  parallelogram:["[/", "/]"],
  trapezoid:    ["[/", "\\]"],
};
const EDGE_MAP: Record<string, string> = {
  solid:  "-->",
  dashed: "-.->",
  dotted: "-..->",
  thick:  "==>",
};

export function registerRenderFlowchart(server: McpServer, ctx: ToolContext) {
  server.tool(
    "render_flowchart",
    "从结构化 nodes/edges 生成 Mermaid flowchart 并推送预览；比手写 DSL 更不易出错。" +
    " 需要任意 Mermaid 语法时用 render_diagram。",
    {
      title: z.string().optional(),
      direction: z.enum(["TB", "TD", "BT", "LR", "RL"]).optional(),
      nodes: z.array(z.object({
        id:    z.string(),
        label: z.string(),
        shape: z.enum(["rect","round","stadium","subroutine","cylinder","circle","diamond","hexagon","parallelogram","trapezoid"]).optional(),
      })).describe("Flowchart nodes"),
      edges: z.array(z.object({
        from:  z.string(),
        to:    z.string(),
        label: z.string().optional(),
        style: z.enum(["solid", "dashed", "dotted", "thick"]).optional(),
      })).describe("Flowchart edges"),
      theme:         z.enum(["default", "dark", "forest", "neutral"]).optional(),
      output_format: z.enum(["svg", "png"]).optional(),
    },
    async ({ title, direction, nodes, edges, theme, output_format }) => {
      const id = nanoid(10);
      try {
        const lines: string[] = [`graph ${direction ?? "TD"}`];
        for (const n of nodes) {
          const [o, c] = SHAPE_MAP[n.shape ?? "rect"] ?? ["[", "]"];
          lines.push(`  ${n.id}${o}"${n.label}"${c}`);
        }
        for (const e of edges) {
          const arrow = EDGE_MAP[e.style ?? "solid"] ?? "-->";
          lines.push(`  ${e.from} ${arrow}${e.label ? `|"${e.label}"|` : ""} ${e.to}`);
        }
        return await renderMermaidAndRespond({
          id,
          title: title ?? `Flowchart ${id}`,
          diagramType: "flowchart",
          mermaidCode: lines.join("\n"),
          theme: theme ?? ctx.config.defaultTheme,
          format: output_format ?? ctx.config.defaultFormat,
          ctx,
        });
      } catch (err) {
        return errorResult("render_flowchart", err);
      }
    }
  );
}
