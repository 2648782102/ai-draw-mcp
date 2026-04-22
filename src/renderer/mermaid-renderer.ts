import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { MermaidTheme } from "../utils/types.js";
import { logger } from "../utils/logger.js";

const execAsync = promisify(exec);

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

    const mmdcBin = resolveCliPath();
    const cmd = `"${mmdcBin}" -i "${inputFile}" -o "${outputFile}" -t ${theme} --quiet`;

    logger.debug(`Running mmdc: ${cmd}`);
    await execAsync(cmd, { timeout: 30_000 });

    const svg = await fs.readFile(outputFile, "utf-8");
    return svg;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Resolve the path to the mmdc CLI binary.
 * Prefer local node_modules/.bin, fall back to global.
 */
function resolveCliPath(): string {
  const local = path.resolve(
    process.cwd(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? "mmdc.cmd" : "mmdc"
  );
  return local;
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
