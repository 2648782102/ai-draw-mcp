import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { logger } from "../utils/logger.js";

/**
 * Convert an SVG file to PNG using sharp.
 * Returns the absolute path of the generated PNG.
 */
export async function svgToPng(
  svgPath: string,
  outputDir?: string
): Promise<string> {
  const svgBuffer = await fs.readFile(svgPath);
  const parsed = path.parse(svgPath);
  const pngFilename = `${parsed.name}.png`;
  const pngPath = path.join(outputDir ?? parsed.dir, pngFilename);

  await sharp(svgBuffer).png().toFile(pngPath);
  logger.info(`PNG exported: ${pngPath}`);
  return pngPath;
}

/**
 * Read an SVG file and return the content as a base64 data-URI string.
 */
export async function svgToBase64(svgPath: string): Promise<string> {
  const buf = await fs.readFile(svgPath);
  return `data:image/svg+xml;base64,${buf.toString("base64")}`;
}

/**
 * Read a PNG file and return the content as a base64 string (no URI prefix).
 */
export async function pngToBase64(pngPath: string): Promise<string> {
  const buf = await fs.readFile(pngPath);
  return buf.toString("base64");
}
