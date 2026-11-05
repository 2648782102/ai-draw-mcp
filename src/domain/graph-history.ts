import type { GraphHistoryEntry, GraphHistoryState } from "./types.js";

function assertEntry(value: unknown, label: string): GraphHistoryEntry {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  const entry = value as Record<string, unknown>;
  if (entry.version !== 1) throw new Error(`${label} has unsupported version`);
  if (typeof entry.graphRevision !== "number" || !Number.isFinite(entry.graphRevision))
    throw new Error(`${label}.graphRevision must be a finite number`);
  if (typeof entry.createdAt !== "string" || !Number.isFinite(Date.parse(entry.createdAt)))
    throw new Error(`${label}.createdAt must be a valid timestamp`);
  if (entry.source !== "human" && entry.source !== "ai" && entry.source !== "system")
    throw new Error(`${label}.source is invalid`);
  return value as GraphHistoryEntry;
}

export function parseGraphHistory(value: unknown, limit: number): GraphHistoryState | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("session.graphHistory must be an object");
  const history = value as Record<string, unknown>;
  if (history.version !== 1) throw new Error("session.graphHistory has unsupported version");
  if (!Array.isArray(history.past) || !Array.isArray(history.future))
    throw new Error("session.graphHistory past/future must be arrays");
  return {
    version: 1,
    past: history.past.slice(-limit).map((entry, index) => assertEntry(entry, `session.graphHistory.past[${index}]`)),
    future: history.future.slice(-limit).map((entry, index) => assertEntry(entry, `session.graphHistory.future[${index}]`)),
  };
}
