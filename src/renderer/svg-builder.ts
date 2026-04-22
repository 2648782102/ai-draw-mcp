/**
 * Minimal SVG builder utilities for free-form drawing.
 * Wraps raw SVG content with proper headers / viewBox.
 */

export interface SvgWrapOptions {
  width?: number;
  height?: number;
  background?: string;
}

export function wrapSvg(
  innerSvg: string,
  options: SvgWrapOptions = {}
): string {
  const { width = 800, height = 600, background } = options;
  const bgRect = background
    ? `<rect width="100%" height="100%" fill="${background}" />`
    : "";

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    bgRect,
    innerSvg,
    `</svg>`,
  ].join("\n");
}
