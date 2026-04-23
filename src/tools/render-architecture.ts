import { z } from "zod";
import { nanoid } from "nanoid";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderAndRespond, errorResponse, type ToolContext } from "./shared.js";

const ICON: Record<string, string> = { service:"🔧", database:"🗄️", cache:"⚡", queue:"📨", gateway:"🚪", client:"👤", external:"🌐" };
const EDGE: Record<string, string> = { solid:"-->", dashed:"-.->", dotted:"-..->", thick:"==>" };

export function registerRenderArchitecture(server: McpServer, ctx: ToolContext) {
  server.tool(
    "render_architecture",
    "Render an architecture / component diagram, pushed to the live editor panel.",
    {
      title: z.string().optional(),
      components: z.array(z.object({ id: z.string(), label: z.string(), type: z.enum(["service","database","cache","queue","gateway","client","external"]).optional(), group: z.string().optional() })),
      connections: z.array(z.object({ from: z.string(), to: z.string(), label: z.string().optional(), style: z.enum(["solid","dashed","dotted","thick"]).optional() })),
      theme: z.enum(["default","dark","forest","neutral"]).optional(),
      output_format: z.enum(["svg","png"]).optional(),
    },
    async ({ title, components, connections, theme, output_format }) => {
      const id = nanoid(10);
      try {
        const lines: string[] = ["graph TB"];
        const groups = new Map<string, typeof components>();
        const ungrouped: typeof components = [];
        for (const c of components) c.group ? (groups.has(c.group) ? groups.get(c.group)!.push(c) : groups.set(c.group, [c])) : ungrouped.push(c);
        for (const c of ungrouped) lines.push(`  ${c.id}["${ICON[c.type ?? "service"] ?? ""} ${c.label}"]`);
        for (const [g, ms] of groups) {
          lines.push(`  subgraph ${g.replace(/\s+/g, "_")}["${g}"]`);
          for (const c of ms) lines.push(`    ${c.id}["${ICON[c.type ?? "service"] ?? ""} ${c.label}"]`);
          lines.push("  end");
        }
        for (const cn of connections) lines.push(`  ${cn.from} ${EDGE[cn.style ?? "solid"] ?? "-->"}${cn.label ? `|"${cn.label}"|` : ""} ${cn.to}`);
        return await renderAndRespond({
          id, title: title ?? `Architecture ${id}`, diagramType: "architecture",
          mermaidCode: lines.join("\n"), theme: theme ?? ctx.config.defaultTheme,
          format: output_format ?? ctx.config.defaultFormat, ctx,
        });
      } catch (err) { return errorResponse("render_architecture", err); }
    }
  );
}
