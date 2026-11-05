import crypto from "node:crypto";
import { makeId, nowIso } from "./ids.js";

export interface ApprovalGrant {
  approvalId: string;
  proposalId: string;
  grantHash: string;
  issuedAt: string;
  expiresAt: string;
  usedAt?: string;
  proposalHash?: string;
}

export interface ApprovalReceipt {
  approvalId: string;
  proposalId: string;
  expiresAt: string;
  grantHash: string;
}

const TTL_MS = 10 * 60 * 1000;

function digest(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function issueApproval(proposalId: string): ApprovalReceipt {
  const approvalId = makeId("approval");
  const issuedAt = nowIso();
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
  const grantHash = digest(`${approvalId}:${proposalId}:${expiresAt}:${crypto.randomBytes(24).toString("hex")}`);
  return { approvalId, proposalId, expiresAt, grantHash };
}

export function grantFromReceipt(receipt: ApprovalReceipt): ApprovalGrant {
  return {
    approvalId: receipt.approvalId,
    proposalId: receipt.proposalId,
    grantHash: receipt.grantHash,
    issuedAt: nowIso(),
    expiresAt: receipt.expiresAt,
  };
}

export function isGrantValid(grant: ApprovalGrant, receipt: ApprovalReceipt): boolean {
  if (grant.usedAt) return false;
  if (Date.parse(grant.expiresAt) < Date.now()) return false;
  if (grant.approvalId !== receipt.approvalId || grant.proposalId !== receipt.proposalId) return false;
  if (grant.expiresAt !== receipt.expiresAt) return false;
  const provided = Buffer.from(receipt.grantHash, "hex");
  const expected = Buffer.from(grant.grantHash, "hex");
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}
