import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(sourceDir, "../..");

/**
 * Repository root used for project scanning and change proposals.
 * `AI_DRAW_WORKSPACE_ROOT` allows an MCP host to point at the open project.
 */
export function resolveWorkspaceRoot(): string {
  const configured = process.env.AI_DRAW_WORKSPACE_ROOT?.trim();
  return configured ? path.resolve(configured) : packageRoot;
}

export { packageRoot };
