/**
 * infra/config.ts
 *
 * - AppConfig interface + loadConfig()
 * - ALL shared types and interfaces (DiagramRecord, DiagramType, etc.)
 *
 * To add a new env var: add field to AppConfig + read it in loadConfig().
 * To add a new type: add it here — do NOT create separate type files.
 */

import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { logger } from "./logger.js";
import { resolveWorkspaceRoot } from "./workspace.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");

// ─── Config ──────────────────────────────────────────────────────────────────

const themeSchema = z.enum(["default", "dark", "forest", "neutral"]);
const formatSchema = z.enum(["svg", "png"]);

export interface AppConfig {
  previewHost: string;
  /** vscode://<authority>/open?url=... — empty string disables the link */
  panelUriAuthority: string;
  previewPort: number;
  outputDir: string;
  defaultTheme: z.infer<typeof themeSchema>;
  defaultFormat: z.infer<typeof formatSchema>;
  workspaceRoot: string;
}

function parsePort(raw: string | undefined, fallback: number): number {
  const n = parseInt(raw ?? String(fallback), 10);
  if (!Number.isFinite(n) || n < 1 || n > 65535)
    throw new Error(`PREVIEW_PORT invalid (got ${JSON.stringify(raw)}). Use 1–65535, e.g. 3399.`);
  return n;
}

export function loadConfig(): AppConfig {
  const previewPort = parsePort(process.env.PREVIEW_PORT, 3399);
  const previewHost = (process.env.PREVIEW_HOST ?? "127.0.0.1").trim() || "127.0.0.1";
  const authRaw = process.env.AI_DRAW_URI_AUTHORITY;
  const panelUriAuthority = authRaw === "" ? "" : (authRaw ?? "2648782102.ai-draw-panel").trim();
  const outputDir = path.resolve(process.env.OUTPUT_DIR ?? path.join(PROJECT_ROOT, "output"));

  const themeRaw = process.env.DEFAULT_THEME;
  const themeParsed = themeSchema.safeParse(themeRaw);
  const defaultTheme = themeParsed.success ? themeParsed.data : "default";
  if (themeRaw && !themeParsed.success) logger.warn(`DEFAULT_THEME invalid (${JSON.stringify(themeRaw)}), falling back to "default"`);

  const formatRaw = process.env.DEFAULT_FORMAT;
  const formatParsed = formatSchema.safeParse(formatRaw);
  const defaultFormat = formatParsed.success ? formatParsed.data : "svg";
  if (formatRaw && !formatParsed.success) logger.warn(`DEFAULT_FORMAT invalid (${JSON.stringify(formatRaw)}), falling back to "svg"`);

  return {
    previewHost,
    panelUriAuthority,
    previewPort,
    outputDir,
    defaultTheme,
    defaultFormat,
    workspaceRoot: resolveWorkspaceRoot(),
  };
}

export async function ensureOutputDirWritable(outputDir: string): Promise<void> {
  await fs.mkdir(outputDir, { recursive: true });
  const probe = path.join(outputDir, ".ai-draw-write-probe");
  try {
    await fs.writeFile(probe, "ok", "utf-8");
    await fs.unlink(probe);
  } catch (e) {
    throw new Error(`OUTPUT_DIR not writable: ${outputDir}\n${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── Diagram types ────────────────────────────────────────────────────────────

export type DiagramType =
  | "flowchart" | "sequence" | "class" | "state" | "er"
  | "gantt" | "pie" | "mindmap" | "timeline" | "architecture" | "custom";

export type OutputFormat = "svg" | "png";
export type MermaidTheme = "default" | "dark" | "forest" | "neutral";
export type FlowDirection = "TB" | "TD" | "BT" | "LR" | "RL";
export type NodeShape = "rect" | "round" | "stadium" | "subroutine" | "cylinder" | "circle" | "diamond" | "hexagon" | "parallelogram" | "trapezoid";
export type EdgeStyle = "solid" | "dashed" | "dotted" | "thick";
export type MessageArrow = "solid" | "dashed" | "solid_open" | "dashed_open";
export type ComponentType = "service" | "database" | "cache" | "queue" | "gateway" | "client" | "external";
export type ClassRelation = "inheritance" | "composition" | "aggregation" | "association" | "dependency" | "realization";
export type MemberVisibility = "+" | "-" | "#" | "~";

export interface DiagramRecord {
  id: string;
  title: string;
  type: DiagramType;
  createdAt: string;
  updatedAt?: string;
  svgPath: string;
  pngPath?: string;
  mermaidCode?: string;
  visualSync?: boolean;
}
