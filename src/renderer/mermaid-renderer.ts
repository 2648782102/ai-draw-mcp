import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import type { MermaidTheme } from "../utils/types.js";
import { logger } from "../utils/logger.js";

const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");

/**
 * Renders Mermaid DSL text into an SVG string using @mermaid-js/mermaid-cli (mmdc).
 *
 * We shell out to `mmdc` instead of running mermaid in-process because
 * mermaid relies on a browser DOM. mmdc bundles Puppeteer internally.
 */
export async function renderMermaidToSvg(
  mermaidCode: string,
  theme: MermaidTheme = "default"
): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-draw-"));
  const inputFile = path.join(tmpDir, "input.mmd");
  const outputFile = path.join(tmpDir, "output.svg");

  try {
    await fs.writeFile(inputFile, mermaidCode, "utf-8");
    await runMmdc(inputFile, outputFile, theme);
    const svg = await fs.readFile(outputFile, "utf-8");
    return svg;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Renders Mermaid DSL directly to a PNG file via mmdc (Puppeteer/Chromium).
 * This preserves CJK fonts that sharp-based SVG→PNG conversion would lose.
 */
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

async function runMmdc(
  inputFile: string,
  outputFile: string,
  theme: MermaidTheme
): Promise<void> {
  const mmdcBin = resolveCliPath();
  const cmd = `"${mmdcBin}" -i "${inputFile}" -o "${outputFile}" -t ${theme} --quiet`;
  logger.debug(`Running mmdc: ${cmd}`);
  await execAsync(cmd, { timeout: 30_000 });
}

/**
 * Resolve the path to the mmdc CLI binary.
 * Uses the project's own node_modules (relative to this file),
 * so it works regardless of the process's cwd.
 */
function resolveCliPath(): string {
  const binName = process.platform === "win32" ? "mmdc.cmd" : "mmdc";
  const fromProject = path.join(PROJECT_ROOT, "node_modules", ".bin", binName);
  return fromProject;
}

/**
 * Save an SVG string to disk and return the absolute path.
 */
export async function saveSvg(
  svgContent: string,
  outputDir: string,
  filename: string
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, filename);
  await fs.writeFile(filePath, svgContent, "utf-8");
  logger.info(`SVG saved: ${filePath}`);
  return filePath;
}
