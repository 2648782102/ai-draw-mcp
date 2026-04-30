/**
 * infra/renderer.ts
 *
 * All rendering functions in one place:
 *   renderMermaidToSvg   — Mermaid DSL → SVG string (via mmdc/Puppeteer)
 *   renderMermaidToPng   — Mermaid DSL → PNG file  (via mmdc/Puppeteer)
 *   saveSvg              — write SVG string to disk
 *   wrapSvg              — wrap inner SVG elements in a full <svg> root
 *   svgToPng             — SVG file → PNG file      (via sharp)
 *   svgToBase64          — SVG file → data-URI string
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { MermaidTheme } from "./config.js";
import { logger } from "./logger.js";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");

// ─── Mermaid rendering (mmdc / Puppeteer) ────────────────────────────────────

export async function renderMermaidToSvg(mermaidCode: string, theme: MermaidTheme = "default"): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-draw-"));
  const inputFile = path.join(tmpDir, "input.mmd");
  const outputFile = path.join(tmpDir, "output.svg");
  try {
    await fs.writeFile(inputFile, mermaidCode, "utf-8");
    await runMmdc(inputFile, outputFile, theme);
    return await fs.readFile(outputFile, "utf-8");
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function renderMermaidToPng(
  mermaidCode: string,
  outputDir: string,
  filename: string,
  theme: MermaidTheme = "default"
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true });
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-draw-"));
  const inputFile = path.join(tmpDir, "input.mmd");
  const outputFile = path.join(outputDir, filename);
  try {
    await fs.writeFile(inputFile, mermaidCode, "utf-8");
    await runMmdc(inputFile, outputFile, theme);
    logger.info(`PNG saved: ${outputFile}`);
    return outputFile;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function runMmdc(inputFile: string, outputFile: string, theme: MermaidTheme): Promise<void> {
  const bin = process.platform === "win32"
    ? path.join(PROJECT_ROOT, "node_modules", ".bin", "mmdc.cmd")
    : path.join(PROJECT_ROOT, "node_modules", ".bin", "mmdc");
  const cmd = `"${bin}" -i "${inputFile}" -o "${outputFile}" -t ${theme} --quiet`;
  logger.debug(`Running mmdc: ${cmd}`);
  await execAsync(cmd, { timeout: 30_000 });
}

// ─── SVG helpers ─────────────────────────────────────────────────────────────

export async function saveSvg(svgContent: string, outputDir: string, filename: string): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, filename);
  await fs.writeFile(filePath, svgContent, "utf-8");
  logger.info(`SVG saved: ${filePath}`);
  return filePath;
}

export interface WrapSvgOptions { width?: number; height?: number; background?: string; }

/**
 * Wrap inner SVG elements (NOT a full <svg> document) into a complete SVG root.
 * If svg_content is already a full <svg>...</svg>, pass it directly to saveSvg instead.
 */
export function wrapSvg(innerSvg: string, options: WrapSvgOptions = {}): string {
  const { width = 800, height = 600, background } = options;
  const bgRect = background ? `<rect width="100%" height="100%" fill="${background}" />` : "";
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    bgRect,
    innerSvg,
    `</svg>`,
  ].join("\n");
}

// ─── PNG export ───────────────────────────────────────────────────────────────

export async function svgToPng(svgPath: string, outputDir?: string): Promise<string> {
  const svgBuffer = await fs.readFile(svgPath);
  const parsed = path.parse(svgPath);
  const pngPath = path.join(outputDir ?? parsed.dir, `${parsed.name}.png`);
  await sharp(svgBuffer).png().toFile(pngPath);
  logger.info(`PNG exported: ${pngPath}`);
  return pngPath;
}

export async function svgToBase64(svgPath: string): Promise<string> {
  const buf = await fs.readFile(svgPath);
  return `data:image/svg+xml;base64,${buf.toString("base64")}`;
}
