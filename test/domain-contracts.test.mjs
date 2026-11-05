import { describe, expect, it } from "vitest";
import { buildExportManifest, createSessionBundle, parseSessionBundle } from "../dist/domain/session-bundle.js";
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
    nodes: [{ id: "readme", label: "README.md", kind: "documentation", path: "README.md", x: 42, y: 84, metadata: { layoutSource: "human" } }],
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
  focus: {
    version: 1,
    nodeId: "readme",
    nodeLabel: "README.md",
    nodePath: "README.md",
    graphRevision: 2,
    updatedAt: "2026-11-06T00:02:00.000Z",
    source: "human",
  },
  graphDiffs: [{
    version: 1,
    fromRevision: 1,
    toRevision: 2,
    createdAt: "2026-11-06T00:01:00.000Z",
    source: "human",
    diagramId: "diagram_contract",
    nodes: { added: 0, removed: 0, updated: 1 },
    edges: { added: 0, removed: 0, updated: 0 },
    items: [{
      entity: "node",
      change: "updated",
      id: "readme",
      label: "README.md",
      fields: [{ field: "path", before: "README.md", after: "README.zh.md" }],
    }],
    summary: ["0 nodes added, 0 removed, 1 updated"],
  }],
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
    bundle.session.graph.annotations[0].anchorStatus = "outdated";
    bundle.session.graph.annotations[0].nodeLabel = "README.md";
    bundle.session.graph.annotations[0].graphRevision = 2;
    const parsed = parseSessionBundle(JSON.parse(JSON.stringify(bundle)));
    expect(parsed.session.graph.annotations[0]).toMatchObject({
      anchorStatus: "outdated",
      nodeLabel: "README.md",
      graphRevision: 2,
    });
    expect(parsed.session.graph.annotations[0].replies).toHaveLength(1);
    expect(parsed.session.graph.nodes[0]).toMatchObject({ x: 42, y: 84 });
    const nonFiniteCoordinate = JSON.parse(JSON.stringify(bundle));
    nonFiniteCoordinate.session.graph.nodes[0].x = "not-a-number";
    expect(() => parseSessionBundle(nonFiniteCoordinate)).toThrow(/nodes\[0\]\.x must be a finite number/);
    expect(parsed.session.graphDiffs).toHaveLength(1);
    expect(parsed.session.focus).toMatchObject({ nodeId: "readme", source: "human" });
    expect(parsed.session.graphDiffs[0].items[0].fields[0]).toMatchObject({ field: "path", after: "README.zh.md" });
    const injectedFocus = JSON.parse(JSON.stringify(bundle));
    injectedFocus.session.focus.source = "ai";
    expect(() => parseSessionBundle(injectedFocus)).toThrow(/focus.source must be human/);
    const malformed = JSON.parse(JSON.stringify(bundle));
    malformed.session.graph.annotations[0].replies = "broken";
    expect(() => parseSessionBundle(malformed)).toThrow(/replies must be an array/);
    const malformedDiffs = JSON.parse(JSON.stringify(bundle));
    malformedDiffs.session.graphDiffs = "broken";
    expect(() => parseSessionBundle(malformedDiffs)).toThrow(/graphDiffs must be an array/);
    const injectedDiffItem = JSON.parse(JSON.stringify(bundle));
    injectedDiffItem.session.graphDiffs[0].items = ["not-an-object"];
    expect(() => parseSessionBundle(injectedDiffItem)).toThrow(/items\[0\] must be an object/);
    const injectedDiffField = JSON.parse(JSON.stringify(bundle));
    injectedDiffField.session.graphDiffs[0].items[0].fields[0].after = { nested: "object" };
    expect(() => parseSessionBundle(injectedDiffField)).toThrow(/after must be a string/);
    const injectedDiffProperty = JSON.parse(JSON.stringify(bundle));
    injectedDiffProperty.session.graphDiffs[0].items[0].grant = "write-everything";
    expect(() => parseSessionBundle(injectedDiffProperty)).toThrow(/unknown property grant/);
    expect(() => parseSessionBundle({ ...malformed, kind: "other" })).toThrow(/version 1/);
  });

  it("builds a deterministic, credential-free export manifest", () => {
    const exportedAt = "2026-11-06T00:05:00.000Z";
    const bundle = createSessionBundle(baseSession, exportedAt);
    const manifest = buildExportManifest(bundle);
    expect(manifest).toMatchObject({
      version: 1,
      kind: "ai-draw-export-manifest",
      sessionId: "session_contract",
      graphRevision: 2,
      exportedAt,
      suggestedFilename: "ai-draw-session-session_contract.json",
      safety: {
        readOnly: true,
        grantsWriteAuthority: false,
        excludesApprovalGrants: true,
        excludesGraphHistory: true,
        excludesViewport: true,
        projectWritesRequireHumanApproval: true,
      },
    });
    expect(manifest.contents.graph).toMatchObject({ included: true, nodes: 1, edges: 0, annotations: 1, replies: 1, sourceEvidence: 0 });
    expect(manifest.contents.proposals).toMatchObject({ included: true, count: 1, approvedStateDowngraded: 1 });
    expect(manifest.excluded.map((item) => item.field)).toEqual(expect.arrayContaining(["approvalId", "approvalGrant", "approvalExpiresAt", "graphHistory", "viewport"]));
    expect(JSON.stringify(manifest)).not.toContain("grantHash");
    expect(Object.keys(manifest.excluded.find((item) => item.field === "approvalGrant") ?? {})).toEqual(["field", "reason"]);
    expect(buildExportManifest(bundle)).toEqual(manifest);
    expect(() => buildExportManifest({ ...bundle, version: 2 })).toThrow(/version 1/);
    const injected = JSON.parse(JSON.stringify(bundle));
    injected.session.proposals[0].metadata = { approvalGrant: "secret" };
    expect(() => buildExportManifest(injected)).toThrow(/unknown proposal metadata/);
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
