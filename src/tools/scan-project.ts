import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeId } from "../domain/ids.js";
import { scanProject, scanToVisualGraph } from "../infra/project-scanner.js";
import { jsonLine, openHint, panelDiagramUrl, renderMermaidAndRespond, errorResult, type ToolContext } from "./_shared.js";

function graphToMermaid(nodes: Array<{ id: string; label: string; kind: string }>, edges: Array<{ from: string; to: string; label?: string; kind?: string }>): string {
  const lines = ["graph LR"];
  for (const node of nodes) {
    const shape = node.kind === "directory" ? `["📁 ${node.label}"]` : `["${node.label}"]`;
    lines.push(`  ${node.id}${shape}`);
  }
  for (const edge of edges) {
    const arrow = edge.kind === "imports" ? "-.->" : "-->";
    lines.push(`  ${edge.from} ${arrow}${edge.label ? `|"${edge.label}"|` : ""} ${edge.to}`);
  }
  return lines.join("\n");
}

export function registerScanProject(server: McpServer, ctx: ToolContext) {
  server.tool(
    "scan_project",
    "扫描当前工作区结构，生成可编辑的项目结构图，并把它设为双向协作会话的当前图。" +
    " AI 可用它快速理解项目，人类随后可在面板里改图、批注、发消息；返回结构化 nodes/edges 和预览链接。" +
    " 只读扫描，不会修改项目文件；如需根据批注修改代码，请使用 get_visual_context 生成提案。",
    {
      title: z.string().optional().describe("Diagram title"),
      max_depth: z.number().int().min(1).max(8).optional().describe("Maximum directory depth (default 4)"),
      max_files: z.number().int().min(10).max(1000).optional().describe("Maximum nodes to include (default 400)"),
      include_hidden: z.boolean().optional().describe("Include dotfiles/directories other than protected ones (default false)"),
      output_format: z.enum(["svg", "png"]).optional(),
    },
    async ({ title, max_depth, max_files, include_hidden, output_format }) => {
      const id = makeId("diagram");
      try {
        const scan = await scanProject({
          workspaceRoot: ctx.config.workspaceRoot,
          maxDepth: max_depth,
          maxFiles: max_files,
          includeHidden: include_hidden,
        });
        const graph = scanToVisualGraph(scan, id);
        const mermaidCode = graphToMermaid(graph.nodes, graph.edges);
        const diagramTitle = title ?? `${scan.workspaceRoot.split("/").pop() ?? "Project"} structure`;

        await ctx.sessions.setGraph(graph, id);
        await ctx.sessions.addMessage("ai", `已生成项目结构图：${diagramTitle}`, {
          diagramId: id,
          metadata: { event: "project_scan", stats: scan.stats },
        });

        const result = await renderMermaidAndRespond({
          id,
          title: diagramTitle,
          diagramType: "architecture",
          mermaidCode,
          theme: ctx.config.defaultTheme,
          format: output_format ?? ctx.config.defaultFormat,
          ctx,
        });

        ctx.preview.broadcast({
          type: "session_updated",
          reason: "project_scan",
          sessionId: ctx.sessions.getSnapshot().id,
          graphRevision: ctx.sessions.getSnapshot().graphRevision,
        });

        const context = [
          "",
          `Workspace: ${scan.workspaceRoot}`,
          `Graph revision: ${ctx.sessions.getSnapshot().graphRevision}`,
          `Stats: ${JSON.stringify(scan.stats)}`,
          jsonLine({
            id,
            title: diagramTitle,
            panelUrl: panelDiagramUrl(ctx.config, id),
            workspaceRoot: scan.workspaceRoot,
            graphRevision: String(ctx.sessions.getSnapshot().graphRevision),
          }),
          "",
          `Nodes/edges (structured): ${JSON.stringify({ nodes: graph.nodes, edges: graph.edges })}`,
          "",
          openHint(panelDiagramUrl(ctx.config, id), ctx.config),
          "",
          "提示：人类可在面板修改图、加批注并发消息；AI 调用 get_visual_context 读取这些变更，再生成待确认提案。",
        ].join("\n");
        return {
          content: [{ type: "text" as const, text: `${extractText(result)}\n${context}` }],
        };
      } catch (err) {
        return errorResult("scan_project", err);
      }
    },
  );
}

function extractText(result: { content: Array<{ type: string; text?: string }> }): string {
  return result.content.map((item) => item.text ?? "").join("\n");
}
