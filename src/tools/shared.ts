import { renderMermaidToSvg, renderMermaidToPng, saveSvg } from "../renderer/index.js";
import type { DiagramStore } from "../storage/diagram-store.js";
import type { PreviewServer } from "../preview/preview-server.js";
import type { AppConfig } from "../utils/config.js";
import type { DiagramType, MermaidTheme, OutputFormat } from "../utils/types.js";
import { logger } from "../utils/logger.js";
import { openPanelInIDE } from "../utils/ide-opener.js";

type ContentItem =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

/** Shared context passed to all tool registration functions. */
export interface ToolContext {
  store: DiagramStore;
  config: AppConfig;
  preview: PreviewServer;
}

export interface RenderOpts {
  id: string;
  title: string;
  diagramType: DiagramType;
  mermaidCode: string;
  theme: MermaidTheme;
  format: OutputFormat;
  ctx: ToolContext;
}

/**
 * Shared render + save + push-to-panel logic for all Mermaid-based tools.
 * 1. Renders SVG (+ optional PNG)
 * 2. Saves to disk & store
 * 3. Pushes to the live panel via WebSocket
 * 4. Returns a text confirmation (no image blob — the panel shows it live)
 */
export async function renderAndRespond(opts: RenderOpts): Promise<{ content: ContentItem[] }> {
  const { id, title, diagramType, mermaidCode, theme, format, ctx } = opts;
  const { store, config, preview } = ctx;

  const svg = await renderMermaidToSvg(mermaidCode, theme);
  const svgPath = await saveSvg(svg, config.outputDir, `${id}.svg`);

  let pngPath: string | undefined;
  if (format === "png") {
    pngPath = await renderMermaidToPng(mermaidCode, config.outputDir, `${id}.png`, theme);
  }

  await store.add({
    id,
    title,
    type: diagramType,
    createdAt: new Date().toISOString(),
    svgPath,
    pngPath,
    mermaidCode,
  });

  const panelUrl = `http://localhost:${config.previewPort}/diagram/${id}`;

  // Auto-open panel in IDE on first render, then push via WebSocket
  await openPanelInIDE(panelUrl);
  preview.notifyNewDiagram(id, title, mermaidCode);

  const content: ContentItem[] = [
    {
      type: "text",
      text: [
        `✅ 图表「${title}」已推送到编辑器面板`,
        ``,
        `ID: ${id}`,
        `面板: ${panelUrl}`,
        `SVG: ${svgPath}`,
        pngPath ? `PNG: ${pngPath}` : null,
      ]
        .filter((l) => l !== null)
        .join("\n"),
    },
  ];

  return { content };
}

export function errorResponse(toolName: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  logger.error(`${toolName} failed: ${message}`);
  return {
    content: [{ type: "text" as const, text: `❌ 渲染失败: ${message}` }],
    isError: true,
  };
}
