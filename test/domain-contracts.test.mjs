import { describe, expect, it } from "vitest";
import { createSessionBundle, parseSessionBundle } from "../dist/domain/session-bundle.js";
import { summarizeProposalImpact } from "../dist/domain/impact.js";
import { assertSafeWorkspacePath, isPathInside, toWorkspaceRelative } from "../dist/domain/path-safety.js";
import { proposalContentHash, assertProposalHash } from "../dist/domain/proposal-hash.js";
import { grantFromReceipt, isGrantValid } from "../dist/domain/approval.js";

const workspaceRoot = "/tmp/ai-draw-contract-workspace";

const baseSession = {
  version: 1,
  id: "session_contract",
  title: "Contract test",
  createdAt: "2026-11-06T00:00:00.000Z",
  updatedAt: "2026-11-06T00:01:00.000Z",
  workspaceRoot,
  graphRevision: 2,
  graph: {
    version: 1,
    diagramId: "diagram_contract",
    nodes: [{ id: "readme", label: "README.md", kind: "documentation", path: "README.md" }],
    edges: [],
    annotations: [{
      id: "ann_contract",
      nodeId: "readme",
      body: "Add Chinese notes",
      author: "human",
      createdAt: "2026-11-06T00:01:00.000Z",
      replies: [{
        id: "reply_contract",
        author: "ai",
        body: "I will update it.",
        createdAt: "2026-11-06T00:02:00.000Z",
        status: "answered",
      }],
    }],
  },
  messages: [{
    id: "msg_contract",
    sessionId: "session_contract",
    author: "human",
    body: "Please update the README",
    createdAt: "2026-11-06T00:01:00.000Z",
    graphRevision: 2,
    status: "pending",
  }],
  proposals: [{
    id: "proposal_contract",
    sessionId: "session_contract",
    title: "Update README",
    summary: "Add Chinese notes",
    graphRevision: 2,
    status: "approved",
    createdAt: "2026-11-06T00:03:00.000Z",
    approvedAt: "2026-11-06T00:04:00.000Z",
    changes: [{ id: "change_1", kind: "update", path: "README.md", content: "# 演示\n" }],
    createdBy: "ai",
    contentHash: "not-real",
  }],
};

describe("session bundle contract", () => {
  it("keeps annotation replies and never exports an approved grant", () => {
    const bundle = createSessionBundle(baseSession, "2026-11-06T00:05:00.000Z");
    const serialized = JSON.stringify(bundle);
    expect(bundle).toMatchObject({ kind: "ai-draw-session-bundle", version: 1 });
    expect(bundle.session.graph.annotations[0].replies[0]).toMatchObject({
      author: "ai",
      body: "I will update it.",
    });
    expect(bundle.session.proposals[0]).toMatchObject({ status: "pending" });
    expect(bundle.session.proposals[0].approvedAt).toBeUndefined();
    expect(bundle.session.proposals[0].metadata).toMatchObject({ importedApprovalStateCleared: true });
    expect(serialized).not.toContain("grantHash");
    expect(serialized).not.toContain("approvalId");
  });

  it("round-trips valid bundles and rejects malformed replies", () => {
    const bundle = createSessionBundle(baseSession);
    const parsed = parseSessionBundle(JSON.parse(JSON.stringify(bundle)));
    expect(parsed.session.graph.annotations[0].replies).toHaveLength(1);
    const malformed = JSON.parse(JSON.stringify(bundle));
    malformed.session.graph.annotations[0].replies = "broken";
    expect(() => parseSessionBundle(malformed)).toThrow(/replies must be an array/);
    expect(() => parseSessionBundle({ ...malformed, kind: "other" })).toThrow(/version 1/);
  });
});

describe("proposal impact and hashes", () => {
  it("summarizes line counts, file counts, bytes, and safety notes", () => {
    const proposal = {
      ...baseSession.proposals[0],
      contentHash: proposalContentHash(baseSession.proposals[0]),
    };
    const impact = summarizeProposalImpact(proposal, [{
      path: "README.md",
      kind: "update",
      before: "# Demo\n",
      after: "# 演示\n",
      lines: [
        { type: "remove", text: "# Demo" },
        { type: "add", text: "# 演示" },
        { type: "context", text: "" },
      ],
      truncated: false,
    }]);
    expect(impact).toMatchObject({
      files: 1,
      updated: 1,
      created: 0,
      directories: 0,
      addedLines: 1,
      removedLines: 1,
      existingFiles: 1,
      newFiles: 0,
      safePathsOnly: true,
    });
    expect(impact.contentBytes).toBeGreaterThan(0);
    expect(impact.notes.join(" ")).toContain("SHA-256");
    expect(() => assertProposalHash(proposal)).not.toThrow();
    expect(() => assertProposalHash({ ...proposal, contentHash: "wrong" })).toThrow(/mismatch/);
  });
});

describe("path safety", () => {
  it("allows only workspace-relative UTF-8 targets and normalizes them", () => {
    const absolute = assertSafeWorkspacePath(workspaceRoot, "docs/README.md");
    expect(absolute).toBe(`${workspaceRoot}/docs/README.md`);
    expect(toWorkspaceRelative(workspaceRoot, absolute)).toBe("docs/README.md");
    expect(isPathInside(workspaceRoot, absolute)).toBe(true);
    expect(isPathInside(workspaceRoot, "/tmp/outside")).toBe(false);
  });

  it("rejects escapes, protected paths, root writes, and lockfiles", () => {
    for (const unsafe of [
      "../outside.txt",
      ".git/config",
      "node_modules/unsafe.txt",
      "dist/unsafe.txt",
      ".env.local",
      "package-lock.json",
      ".",
    ]) {
      expect(() => assertSafeWorkspacePath(workspaceRoot, unsafe)).toThrow();
    }
  });
});

describe("approval grants", () => {
  const receipt = {
    approvalId: "approval_contract",
    proposalId: "proposal_contract",
    grantHash: "a".repeat(64),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };

  it("accepts a matching one-time receipt before expiry", () => {
    const grant = grantFromReceipt(receipt);
    expect(isGrantValid(grant, receipt)).toBe(true);
    expect(isGrantValid({ ...grant, usedAt: new Date().toISOString() }, receipt)).toBe(false);
  });

  it("rejects tampered, mismatched, and expired receipts", () => {
    const grant = grantFromReceipt(receipt);
    expect(isGrantValid(grant, { ...receipt, grantHash: "b".repeat(64) })).toBe(false);
    expect(isGrantValid(grant, { ...receipt, proposalId: "other" })).toBe(false);
    expect(isGrantValid({ ...grant, expiresAt: new Date(Date.now() - 60_000).toISOString() }, {
      ...receipt,
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    })).toBe(false);
  });
});
