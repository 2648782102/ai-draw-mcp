import type { SessionViewport } from "./types.js";

const SCALE_MIN = 0.05;
const SCALE_MAX = 20;
const OFFSET_MIN = -100_000;
const OFFSET_MAX = 100_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertFinite(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} must be a finite number`);
  return value;
}

function assertIsoTimestamp(value: unknown, label: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} must be a valid timestamp`);
  }
  return value;
}

export function parseViewport(input: unknown): SessionViewport {
  if (!isRecord(input)) throw new Error("viewport must be an object");
  if (input.version !== 1) throw new Error("viewport has unsupported version");
  if (input.source !== "human") throw new Error("viewport.source must be human");
  for (const key of Object.keys(input)) {
    if (!["version", "scale", "x", "y", "updatedAt", "source"].includes(key)) {
      throw new Error(`viewport has unknown property ${key}`);
    }
  }
  const scale = assertFinite(input.scale, "viewport.scale");
  const x = assertFinite(input.x, "viewport.x");
  const y = assertFinite(input.y, "viewport.y");
  if (scale < SCALE_MIN || scale > SCALE_MAX) throw new Error("viewport.scale is out of range");
  if (x < OFFSET_MIN || x > OFFSET_MAX || y < OFFSET_MIN || y > OFFSET_MAX) {
    throw new Error("viewport.x/y is out of range");
  }
  return {
    version: 1,
    scale,
    x,
    y,
    updatedAt: assertIsoTimestamp(input.updatedAt, "viewport.updatedAt"),
    source: "human",
  };
}

export function buildViewport(scale: unknown, x: unknown, y: unknown, updatedAt = new Date().toISOString()): SessionViewport {
  return parseViewport({ version: 1, scale, x, y, updatedAt, source: "human" });
}
