import type { ProposalFileDiff } from "./diff.js";
import type { ChangeProposal } from "./types.js";

export interface ProposalImpactSummary {
  files: number;
  created: number;
  updated: number;
  directories: number;
  addedLines: number;
  removedLines: number;
  existingFiles: number;
  newFiles: number;
  contentBytes: number;
  safePathsOnly: boolean;
  notes: string[];
}

export function summarizeProposalImpact(
  proposal: ChangeProposal,
  diffs: ProposalFileDiff[],
): ProposalImpactSummary {
  let addedLines = 0;
  let removedLines = 0;
  let existingFiles = 0;
  let newFiles = 0;
  for (const diff of diffs) {
    addedLines += diff.lines.filter((line) => line.type === "add").length;
    removedLines += diff.lines.filter((line) => line.type === "remove").length;
    if (diff.before) existingFiles += 1;
    else newFiles += 1;
  }
  const counts = { create: 0, update: 0, mkdir: 0 };
  for (const change of proposal.changes) {
    if (change.kind === "create" || change.kind === "update" || change.kind === "mkdir")
      counts[change.kind] += 1;
  }
  const contentBytes = proposal.changes.reduce(
    (total, change) => total + Buffer.byteLength(change.content ?? "", "utf8"),
    0,
  );
  const notes: string[] = [];
  if (proposal.contentHash) notes.push("SHA-256 content hash binds approval to this exact proposal.");
  if (counts.create && !counts.update) notes.push("Creates only new files; existing files are not overwritten.");
  if (counts.update) notes.push("Updates existing UTF-8 text files with atomic writes and rollback.");
  if (counts.mkdir) notes.push("Creates directories only; no deletion is performed.");
  return {
    files: proposal.changes.length,
    created: counts.create,
    updated: counts.update,
    directories: counts.mkdir,
    addedLines,
    removedLines,
    existingFiles,
    newFiles,
    contentBytes,
    safePathsOnly: true,
    notes,
  };
}
