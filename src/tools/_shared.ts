/**
 * tools/_shared.ts — Tool shared layer
 *
 * Everything a tool file needs, in one import:
 *   ToolContext            — { store, config, preview }
 *   renderMermaidAndRespond — full Mermaid pipeline: render→save→store→notify→open→respond
 *   renderSvgAndRespond    — full SVG pipeline
 *   errorResult            — uniform error response
 *   jsonLine               — machine-readable JSON line for model parsing
 *   RenderOpts / SvgOpts   — parameter types for the two pipelines
 *   ToolResult             — MCP tool return type
 *
 * Tool files ONLY import from here (and nanoid/zod/@modelcontextprotocol/sdk).
 * They do NOT import directly from infra/.
 */

import { renderMermaidToSvg, renderMermaidToPng, saveSvg, wrapSvg, svgToPng } from "../infra/renderer.js";
import { openPanelInIDE } from "../infra/ide-opener.js";
import { logger } from "../infra/logger.js";
import { SERVER_VERSION } from "../infra/version.js";
import type { DiagramStore } from "../infra/store.js";
import type { PreviewServer } from "../infra/preview-server.js";
import type { SessionStore } from "../infra/session-store.js";
import type { VisualSyncService } from "../infra/visual-sync-service.js";
import type { AppConfig, DiagramType, MermaidTheme, OutputFormat } from "../infra/config.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

// ─── Re-export infra types tools may need ─────────────────────────────────────
export type { DiagramType, MermaidTheme, OutputFormat };
export { SERVER_VERSION };

// ─── ToolContext ──────────────────────────────────────────────────────────────

export interface ToolContext {
  store: DiagramStore;
  config: AppConfig;
  preview: PreviewServer;
  sessions: SessionStore;
  visualSync: VisualSyncService;
}

// ─── ToolResult ───────────────────────────────────────────────────────────────

export type ToolResult = CallToolResult;

// ─── Panel URL helpers ────────────────────────────────────────────────────────

export function panelBaseUrl(config: AppConfig): string {
  return `http://${config.previewHost}:${config.previewPort}`;
}

export function panelDiagramUrl(config: AppConfig, id: string): string {
  return `${panelBaseUrl(config)}/diagram/${encodeURIComponent(id)}`;
}

// ─── Response formatters ──────────────────────────────────────────────────────

export function jsonLine(payload: Record<string, string | undefined>): string {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload)) if (v !== undefined) clean[k] = v;
  return `JSON: ${JSON.stringify(clean)}`;
}

/**
 * One-line hint shown in MCP tool responses.
 * Agent-first: the URL is optional; the browser is never required to consume tool output.
 */
export function openHint(httpPanelUrl: string, _config: AppConfig): string {
  return [
    `可选面板地址：${httpPanelUrl}`,
    `（AI 直接消费本工具返回的结构化结果即可；只有人需要看画布时才调用 open_preview 或打开该地址）`,
  ].join("\n");
}

function workflowHint(kind: "mermaid" | "svg"): string {
  if (kind === "svg")
    return "提示：SVG 模式；agent 可直接继续处理 ID 与资产路径。管理：list_diagrams、delete_diagram；人需要查看时才用 open_preview。";
  return "提示：可用 update_diagram(diagram_id, mermaid_code) 迭代；list_diagrams 查看全部；delete_diagram 删除；人需要查看时才用 open_preview。";
}

export function errorResult(toolName: string, err: unknown): ToolResult {
  const message = err instanceof Error ? err.message : String(err);
  logger.error(`${toolName} failed: ${message}`);
  return { content: [{ type: "text", text: `❌ 渲染失败: ${message}` }], isError: true };
}

// ─── Mermaid render pipeline ──────────────────────────────────────────────────

export interface RenderOpts {
  id: string;
  title: string;
  diagramType: DiagramType;
  mermaidCode: string;
  theme: MermaidTheme;
  format: OutputFormat;
  ctx: ToolContext;
}

export async function renderMermaidAndRespond(opts: RenderOpts): Promise<ToolResult> {
  const { id, title, diagramType, mermaidCode, theme, format, ctx } = opts;
  const { store, config, preview } = ctx;

  const svg = await renderMermaidToSvg(mermaidCode, theme);
  const svgPath = await saveSvg(svg, config.outputDir, `${id}.svg`);

  let pngPath: string | undefined;
  if (format === "png")
    pngPath = await renderMermaidToPng(mermaidCode, config.outputDir, `${id}.png`, theme);

  await store.add({ id, title, type: diagramType, createdAt: new Date().toISOString(), svgPath, pngPath, mermaidCode });

  const panelUrl = panelDiagramUrl(config, id);
  if (config.autoOpenPanel) await openPanelInIDE(panelUrl);
  preview.notifyNewDiagram(id, title, mermaidCode);

  const lines = [
    `✅ 图表「${title}」已生成并写入 MCP 会话`,
    ``,
    `ID: ${id}`,
    `面板: ${panelUrl}`,
    `SVG: ${svgPath}`,
    pngPath ? `PNG: ${pngPath}` : null,
    ``,
    jsonLine({ id, title, panelUrl, svgPath, pngPath }),
    ``,
    openHint(panelUrl, config),
    ``,
    workflowHint("mermaid"),
  ].filter((l) => l !== null).join("\n");

  return { content: [{ type: "text", text: lines }] };
}

// ─── SVG render pipeline ──────────────────────────────────────────────────────

export interface SvgOpts {
  id: string;
  title: string;
  svgContent: string;
  width?: number;
  height?: number;
  background?: string;
  format: OutputFormat;
  ctx: ToolContext;
}

export async function renderSvgAndRespond(opts: SvgOpts): Promise<ToolResult> {
  const { id, title, svgContent, width, height, background, format, ctx } = opts;
  const { store, config, preview } = ctx;

  const fullSvg = wrapSvg(svgContent, { width, height, background });
  const svgPath = await saveSvg(fullSvg, config.outputDir, `${id}.svg`);

  let pngPath: string | undefined;
  if (format === "png") pngPath = await svgToPng(svgPath, config.outputDir);

  await store.add({ id, title, type: "custom", createdAt: new Date().toISOString(), svgPath, pngPath });

  const panelUrl = panelDiagramUrl(config, id);
  if (config.autoOpenPanel) await openPanelInIDE(panelUrl);
  preview.notifyNewDiagram(id, title, "");

  const lines = [
    `✅ SVG 图「${title}」已生成并写入 MCP 会话`,
    ``,
    `ID: ${id}`,
    `面板: ${panelUrl}`,
    `SVG: ${svgPath}`,
    pngPath ? `PNG: ${pngPath}` : null,
    ``,
    jsonLine({ id, title, panelUrl, svgPath, pngPath }),
    ``,
    openHint(panelUrl, config),
    ``,
    workflowHint("svg"),
  ].filter((l) => l !== null).join("\n");

  return { content: [{ type: "text", text: lines }] };
}
