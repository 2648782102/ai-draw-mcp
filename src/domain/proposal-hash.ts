import crypto from "node:crypto";
import type { ChangeProposal } from "./types.js";

export function proposalContentHash(input: {
  title: string;
  summary: string;
  changes: Array<{ kind: string; path: string; content?: string }>;
}): string {
  const canonical = JSON.stringify({
    title: input.title,
    summary: input.summary,
    changes: input.changes.map((change) => ({
      kind: change.kind,
      path: change.path,
      content: change.content ?? "",
    })),
  });
  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
}

export function assertProposalHash(proposal: ChangeProposal): void {
  const expected = proposalContentHash(proposal);
  if (!proposal.contentHash) throw new Error("Proposal content hash is missing");
  if (proposal.contentHash !== expected) throw new Error("Proposal content hash mismatch");
}
