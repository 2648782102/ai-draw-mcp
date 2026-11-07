import path from "node:path";
import { makeId, nowIso } from "../domain/ids.js";
import { mergeScannedGraph } from "../domain/visual-graph-merge.js";
import type { ScanPreservationSummary, VisualGraph } from "../domain/types.js";
import type { DiagramStore } from "./store.js";
import type { AppConfig } from "./config.js";
import type { PreviewServer } from "./preview-server.js";
import type { SessionStore } from "./session-store.js";
import { openPanelInIDE } from "./ide-opener.js";
import { renderMermaidToPng, renderMermaidToSvg, saveSvg } from "./renderer.js";
import { scanProject, scanToVisualGraph } from "./project-scanner.js";

export interface VisualSyncOptions {
  title?: string;
  maxDepth?: number;
  maxFiles?: number;
  groupSummary?: boolean;
  includeHidden?: boolean;
  format?: AppConfig["defaultFormat"];
  source: "ai" | "human";
  openPanel?: boolean;
  render?: boolean;
}

export interface VisualSyncResult {
  id: string;
  title: string;
  panelUrl: string;
  svgPath: string;
  pngPath?: string;
  workspaceRoot: string;
  graphRevision: number;
  graph: VisualGraph;
  mermaidCode: string;
  scan: Awaited<ReturnType<typeof scanProject>>;
  preservation: ScanPreservationSummary;
}

function mermaidSafe(value: string): string {
  return value
    .replace(/["[\]{}|<>]/g, " ")
    .replace(/[📁…]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function graphToMermaid(nodes: VisualGraph["nodes"], edges: VisualGraph["edges"]): string {
  const lines = ["%%{init: {'flowchart': {'nodeSpacing': 18, 'rankSpacing': 42, 'padding': 8}}}%%", "flowchart TB"];
  for (const node of nodes) {
    const label = mermaidSafe(node.label);
    const shape = node.kind === "directory" ? `["📁 ${label}"]` : `["${label}"]`;
    lines.push(`  ${node.id}${shape}`);
  }
  for (const edge of edges) {
    const arrow = edge.kind === "imports" ? "-.->" : "-->";
    const label = edge.label ? `|"${mermaidSafe(edge.label)}"|` : "";
    lines.push(`  ${edge.from} ${arrow}${label} ${edge.to}`);
  }
  return lines.join("\n");
}

export class VisualSyncService {
  private syncQueue: Promise<void> = Promise.resolve();

  constructor(
    private deps: {
      store: DiagramStore;
      config: AppConfig;
      sessions: SessionStore;
      get preview(): PreviewServer;
    },
  ) {}

  async sync(options: VisualSyncOptions): Promise<VisualSyncResult> {
    const operation = this.syncQueue.then(() => this.runSync(options));
    this.syncQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  private async runSync(options: VisualSyncOptions): Promise<VisualSyncResult> {
    const { store, config, sessions, preview } = this.deps;
    const scan = await scanProject({
      workspaceRoot: config.workspaceRoot,
      maxDepth: options.maxDepth,
      maxFiles: options.maxFiles,
      includeHidden: options.includeHidden,
      groupSummary: options.groupSummary,
    });
    const activeDiagramId = sessions.getSnapshot().activeDiagramId;
    const activeRecord = activeDiagramId ? store.get(activeDiagramId) : undefined;
    const diagramId = options.source === "human" && activeDiagramId && activeRecord?.visualSync
      ? activeDiagramId
      : makeId("diagram");
    const scanned = scanToVisualGraph(scan, diagramId);
    const merged = mergeScannedGraph(scanned, sessions.getGraph(), sessions.getFocus());
    const id = diagramId;
    const graph = merged.graph;
    const title = options.title?.trim()
      || (store.get(id)?.title)
      || `${config.workspaceRoot.split("/").pop() ?? "Project"} structure`;
    const mermaidCode = graphToMermaid(graph.nodes, graph.edges);
    const format = options.format ?? config.defaultFormat;
    const existing = store.get(id);
    const shouldRender = options.render !== false;
    const svgPath = shouldRender
      ? await saveSvg(await renderMermaidToSvg(mermaidCode, config.defaultTheme), config.outputDir, `${id}.svg`)
      : existing?.svgPath ?? path.join(config.outputDir, `${id}.svg`);
    const pngPath = shouldRender && format === "png"
      ? await renderMermaidToPng(mermaidCode, config.outputDir, `${id}.png`, config.defaultTheme)
      : existing?.pngPath;
    await store.add({
      id,
      title,
      type: "architecture",
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
      svgPath,
      pngPath,
      mermaidCode,
      visualSync: true,
    });
    if (shouldRender) {
      if (existing) preview.notifyDiagramUpdate(id, title, mermaidCode);
      else preview.notifyNewDiagram(id, title, mermaidCode);
    }

    await sessions.setGraph(graph, id, options.source);
    const focusRevision = sessions.getSnapshot().graphRevision;
    await sessions.replaceFocus(merged.focus
      ? { ...merged.focus, graphRevision: focusRevision }
      : undefined);
    await sessions.addMessage(
      options.source === "human" ? "system" : "ai",
      options.source === "human"
        ? `已从工作区重新同步图形；保留 ${merged.preservation.preservedCoordinates} 个节点坐标（${merged.preservation.humanCoordinates} 个人工布局），${merged.preservation.detachedAnnotations} 条批注失锚，收集 ${scan.stats.totalEvidence} 条只读源码证据。`
        : `已生成项目结构图：${title}；收集 ${scan.stats.evidencedNodes} 个节点的 ${scan.stats.totalEvidence} 条只读 file:line 证据。`,
      {
        diagramId: id,
        metadata: {
          event: "project_scan",
          source: options.source,
          stats: scan.stats,
          sourceEvidence: { evidencedNodes: scan.stats.evidencedNodes, totalEvidence: scan.stats.totalEvidence },
          preservation: merged.preservation,
        },
      },
    );
    const snapshot = sessions.getSnapshot();
    preview.broadcast({
      type: "session_updated",
      reason: options.source === "human" ? "project_rescan" : "project_scan",
      sessionId: snapshot.id,
      graphRevision: snapshot.graphRevision,
      preservation: merged.preservation,
    });

    const panelUrl = `http://${config.previewHost}:${config.previewPort}/diagram/${encodeURIComponent(id)}`;
    const shouldOpenPanel = options.openPanel ?? config.autoOpenPanel;
    if (shouldOpenPanel) await openPanelInIDE(panelUrl);
    return {
      id,
      title,
      panelUrl,
      svgPath,
      pngPath,
      workspaceRoot: config.workspaceRoot,
      graphRevision: snapshot.graphRevision,
      graph,
      mermaidCode,
      scan,
      preservation: merged.preservation,
    };
  }
}
