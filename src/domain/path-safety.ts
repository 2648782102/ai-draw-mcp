import path from "node:path";
import fs from "node:fs/promises";

const DENIED_SEGMENTS = new Set([".git", "node_modules", "dist", "coverage"]);
const DENIED_BASENAMES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "Cargo.lock",
]);

export function isPathInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function assertSafeWorkspacePath(workspaceRoot: string, relativeOrAbsolute: string): string {
  const normalized = path.normalize(relativeOrAbsolute);
  const candidate = path.isAbsolute(normalized)
    ? normalized
    : path.resolve(workspaceRoot, normalized);
  if (!isPathInside(workspaceRoot, candidate))
    throw new Error(`Path escapes workspace: ${relativeOrAbsolute}`);

  const relative = path.relative(workspaceRoot, candidate);
  const segments = relative.split(path.sep).filter(Boolean);
  if (segments.some((segment) => DENIED_SEGMENTS.has(segment) || segment.startsWith(".env")))
    throw new Error(`Protected path: ${relative}`);
  if (segments.some((segment) => DENIED_BASENAMES.has(segment)))
    throw new Error(`Generated lockfile cannot be changed: ${relative}`);
  if (relative === "" || relative === ".")
    throw new Error("Workspace root cannot be changed directly");
  return candidate;
}

export async function readTextFileSafe(workspaceRoot: string, relativeOrAbsolute: string): Promise<string> {
  const absolute = assertSafeWorkspacePath(workspaceRoot, relativeOrAbsolute);
  return fs.readFile(absolute, "utf8");
}

export async function writeTextFileSafe(
  workspaceRoot: string,
  relativeOrAbsolute: string,
  content: string,
): Promise<void> {
  const absolute = assertSafeWorkspacePath(workspaceRoot, relativeOrAbsolute);
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, content, "utf8");
}

export function toWorkspaceRelative(workspaceRoot: string, absolute: string): string {
  const relative = path.relative(workspaceRoot, absolute);
  return relative.split(path.sep).join("/") || ".";
}
