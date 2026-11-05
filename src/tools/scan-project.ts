import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { errorResult, jsonLine, openHint, type ToolContext } from "./_shared.js";

export function registerScanProject(server: McpServer, ctx: ToolContext) {
  server.tool(
    "scan_project",
    "扫描当前工作区结构，生成或刷新可编辑的项目结构图，并把它设为双向协作会话的当前图。" +
    " 重复扫描会按路径使用确定性节点 ID，保留人工坐标、自定义标签、仍可锚定的批注线程与当前焦点；新增节点才自动排布。" +
    " AI 可用它快速理解项目，人类随后可在面板里改图、批注、发消息；返回结构化 nodes/edges、PRESERVATION_JSON 摘要和预览链接。" +
    " 扫描器会为小于 1 MiB 的源码/文档节点提取最多 5 条 version 1 file:line 证据（definition/import/heading），供 get_visual_context.sourceEvidence 只读引用；证据不构成批准或写入凭据。" +
    " 可用 open_panel=false 抑制自动打开面板；render=false 可跳过 mmdc 渲染，仅做无头图状态检查。" +
    " 只读扫描项目文件，不写源代码；图形与会话保存不等于项目写入授权。如需根据批注修改代码，请使用 get_visual_context 生成提案。",
    {
      title: z.string().optional().describe("Diagram title"),
      max_depth: z.number().int().min(1).max(8).optional().describe("Maximum directory depth (default 4)"),
      max_files: z.number().int().min(10).max(1000).optional().describe("Maximum nodes to include (default 400)"),
      include_hidden: z.boolean().optional().describe("Include dotfiles/directories other than protected ones (default false)"),
      output_format: z.enum(["svg", "png"]).optional(),
      open_panel: z.boolean().optional().describe("Open the preview panel in the IDE (default true); set false for headless workflows"),
      render: z.boolean().optional().describe("Render SVG/PNG assets (default true); set false only for fast headless graph/state checks"),
    },
    async ({ title, max_depth, max_files, include_hidden, output_format, open_panel, render }) => {
      try {
        const result = await ctx.visualSync.sync({
          title,
          maxDepth: max_depth,
          maxFiles: max_files,
          includeHidden: include_hidden,
          format: output_format ?? ctx.config.defaultFormat,
          source: "ai",
          openPanel: open_panel,
          render,
        });

        const context = [
          "",
          `Workspace: ${result.workspaceRoot}`,
          `Graph revision: ${result.graphRevision}`,
          `Stats: ${JSON.stringify(result.scan.stats)}`,
          `Preservation: ${JSON.stringify(result.preservation)}`,
          `Source evidence: ${result.scan.stats.evidencedNodes} nodes / ${result.scan.stats.totalEvidence} file:line references`,
          `PRESERVATION_JSON: ${JSON.stringify(result.preservation)}`,
          jsonLine({
            id: result.id,
            title: result.title,
            panelUrl: result.panelUrl,
            svgPath: result.svgPath,
            workspaceRoot: result.workspaceRoot,
            graphRevision: String(result.graphRevision),
            preservedCoordinates: String(result.preservation.preservedCoordinates),
            evidencedNodes: String(result.scan.stats.evidencedNodes),
            totalEvidence: String(result.scan.stats.totalEvidence),
          }),
          "",
          `Nodes/edges (structured): ${JSON.stringify({ nodes: result.graph.nodes, edges: result.graph.edges })}`,
          "",
          openHint(result.panelUrl, ctx.config),
          "",
          "提示：人类可在面板修改图、加批注并发消息；重新扫描不会无故移动人工摆放的节点。AI 调用 get_visual_context 读取这些变更，再生成待确认提案。",
        ].join("\n");
        return {
          content: [{
            type: "text" as const,
            text: [
              `✅ 项目结构图「${result.title}」已推送到编辑器面板`,
              `ID: ${result.id}`,
              `面板: ${result.panelUrl}`,
              `SVG: ${result.svgPath}`,
              result.pngPath ? `PNG: ${result.pngPath}` : "",
              "",
              context,
            ].filter(Boolean).join("\n"),
          }],
        };
      } catch (err) {
        return errorResult("scan_project", err);
      }
    },
  );
}
