import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const packageRoot = process.cwd();
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-draw-collab-"));
const outputDir = path.join(tempDir, "output");
const workspaceRoot = path.join(tempDir, "workspace");
const rescanTempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-draw-rescan-"));
const rescanOutputDir = path.join(rescanTempDir, "output");
const rescanWorkspaceRoot = path.join(rescanTempDir, "workspace");
await fs.mkdir(workspaceRoot, { recursive: true });
await fs.writeFile(path.join(workspaceRoot, "README.md"), "# Demo\n", "utf8");
await fs.mkdir(path.join(rescanWorkspaceRoot, "src"), { recursive: true });
await fs.writeFile(path.join(rescanWorkspaceRoot, "README.md"), "# Rescan\n", "utf8");
await fs.writeFile(path.join(rescanWorkspaceRoot, "src", "index.ts"), "export const value = 1;\n", "utf8");

function configureChrome() {
  const configured = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (configured && existsSync(configured)) return configured;
  const candidates = [
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (found) {
    process.env.PUPPETEER_EXECUTABLE_PATH = found;
    return found;
  }
  return undefined;
}

const { createServer } = await import(path.join(packageRoot, "dist/server.js"));

describe("collaboration session", () => {
  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.rm(rescanTempDir, { recursive: true, force: true });
  });

  it("supports graph edits, diffs, AI replies, and a one-time approval grant", async () => {
    process.env.AI_DRAW_WORKSPACE_ROOT = workspaceRoot;
    process.env.OUTPUT_DIR = outputDir;
    process.env.PREVIEW_PORT = "3412";
    configureChrome();

    const { preview, sessions } = await createServer();
    await preview.start();

    try {
      const base = `http://127.0.0.1:3412`;
      const html = await fetch(`${base}/`).then((response) => response.text());
      const token = html.match(/const PANEL_TOKEN = "([^"]+)"/)?.[1];
      expect(token).toBeTruthy();
      const headers = { "Content-Type": "application/json", "X-AI-Draw-Token": token };
      const scanResponse = await fetch(`${base}/api/collab/session`, { headers });
      expect(scanResponse.ok).toBe(true);

      const graph = {
        version: 1,
        diagramId: "diagram_test",
        nodes: [{ id: "root", label: "workspace", kind: "package", path: "." }],
        edges: [],
        annotations: [{ id: "ann_1", body: "把说明改成中文", author: "human", createdAt: new Date().toISOString() }],
      };
      const graphResponse = await fetch(`${base}/api/collab/graph`, {
        method: "PUT",
        headers,
        body: JSON.stringify(graph),
      });
      expect(graphResponse.ok).toBe(true);

      const expandedGraph = {
        ...graph,
        nodes: [
          ...graph.nodes,
          { id: "new_module", label: "shared", kind: "module", group: "human" },
        ],
        edges: [{ id: "edge_1", from: "root", to: "new_module", label: "extract", kind: "human" }],
      };
      const expandedResponse = await fetch(`${base}/api/collab/graph`, {
        method: "PUT",
        headers,
        body: JSON.stringify(expandedGraph),
      });
      expect(expandedResponse.ok).toBe(true);
      const expandedSnapshot = sessions.getSnapshot();
      expect(expandedSnapshot.graph.nodes.map((node) => node.id)).toEqual(["root", "new_module"]);
      expect(expandedSnapshot.graph.edges[0]).toMatchObject({ from: "root", to: "new_module", label: "extract" });
      const graphDiffs = sessions.getGraphDiffs(5);
      expect(graphDiffs.at(-1)).toMatchObject({ version: 1, source: "human" });
      expect(graphDiffs.at(-1).items.some((item) => item.entity === "node" && item.change === "added")).toBe(true);
      const graphDiffResponse = await fetch(`${base}/api/collab/graph/diffs?limit=5`, { headers });
      expect(graphDiffResponse.ok).toBe(true);
      expect((await graphDiffResponse.json()).diffs.length).toBeGreaterThan(0);

      const focusResponse = await fetch(`${base}/api/collab/focus`, {
        method: "POST",
        headers,
        body: JSON.stringify({ nodeId: "new_module", confirmedBy: "human" }),
      });
      expect(focusResponse.ok).toBe(true);
      expect((await focusResponse.json()).focus).toMatchObject({
        version: 1,
        nodeId: "new_module",
        nodeLabel: "shared",
        source: "human",
      });
      expect(sessions.getFocus()).toMatchObject({ nodeId: "new_module" });
      const unauthorizedFocus = await fetch(`${base}/api/collab/focus`, {
        method: "POST",
        headers,
        body: JSON.stringify({ nodeId: "new_module", confirmedBy: "ai" }),
      });
      expect(unauthorizedFocus.status).toBe(403);

      const selectionResponse = await fetch(`${base}/api/collab/selection`, {
        method: "POST",
        headers,
        body: JSON.stringify({ nodeIds: ["root", "new_module", "root"], confirmedBy: "human" }),
      });
      expect(selectionResponse.ok).toBe(true);
      expect((await selectionResponse.json()).selection).toMatchObject({
        version: 1,
        nodeIds: ["root", "new_module"],
        graphRevision: expandedSnapshot.graphRevision,
        source: "human",
      });
      const selectionScope = await fetch(`${base}/api/collab/selection-scope?evidenceLimit=3&edgeLimit=4`, { headers })
        .then((response) => response.json());
      expect(selectionScope).toMatchObject({ version: 1, readOnly: true, selectedCount: 2, source: "human", limit: 24 });
      expect(selectionScope.safety).toMatchObject({ grantsWriteAuthority: false, projectWritesRequireHumanApproval: true });
      const selectionWorkorder = await fetch(`${base}/api/collab/selection-workorder?itemLimit=4`, { headers })
        .then((response) => response.json());
      expect(selectionWorkorder).toMatchObject({
        version: 1,
        readOnly: true,
        selectedCount: 2,
        selectionLimit: 24,
        freshness: {
          status: "current",
          selectionStale: false,
        },
      });
      expect(selectionWorkorder.safety).toMatchObject({
        grantsWriteAuthority: false,
        excludesProjectChangeContent: true,
        projectWritesRequireHumanApproval: true,
      });
      expect(selectionWorkorder.safePaths.some((item) => item.path === ".")).toBe(false);
      expect(JSON.stringify(selectionWorkorder)).not.toContain("approvalGrant");
      const savedSelection = sessions.getSelection();
      const graphAfterSelection = {
        ...expandedGraph,
        nodes: expandedGraph.nodes.map((node) => node.id === "new_module"
          ? { ...node, label: "shared reviewed" }
          : node),
      };
      const graphAfterSelectionResponse = await fetch(`${base}/api/collab/graph`, {
        method: "PUT",
        headers,
        body: JSON.stringify(graphAfterSelection),
      });
      expect(graphAfterSelectionResponse.ok).toBe(true);
      expect(sessions.getSelection()).toEqual(savedSelection);
      const staleWorkorder = await fetch(`${base}/api/collab/selection-workorder`, { headers })
        .then((response) => response.json());
      expect(staleWorkorder.freshness).toMatchObject({
        status: "stale",
        selectionStale: true,
        selectedAtRevision: expandedSnapshot.graphRevision,
        graphRevision: expandedSnapshot.graphRevision + 1,
      });
      expect(staleWorkorder.gaps.join(" ")).toContain("selection is stale");
      expect(staleWorkorder.copyText).toContain("Selection freshness: stale");
      expect(JSON.stringify(staleWorkorder)).not.toContain("approvalGrant");
      const unauthorizedSelection = await fetch(`${base}/api/collab/selection`, {
        method: "POST",
        headers,
        body: JSON.stringify({ nodeIds: ["root"], confirmedBy: "ai" }),
      });
      expect(unauthorizedSelection.status).toBe(403);
      const invalidSelection = await fetch(`${base}/api/collab/selection`, {
        method: "POST",
        headers,
        body: JSON.stringify({ nodeIds: ["missing"], confirmedBy: "human" }),
      });
      expect(invalidSelection.status).toBe(400);
      const unauthenticatedSelection = await fetch(`${base}/api/collab/selection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeIds: [], confirmedBy: "human" }),
      });
      expect(unauthenticatedSelection.status).toBe(401);
      const selectionState = sessions.getSnapshot();
      expect(selectionState.graphRevision).toBe(expandedSnapshot.graphRevision + 1);
      expect(selectionState.selection).toEqual(savedSelection);
      expect(selectionState.messages.length).toBeGreaterThan(expandedSnapshot.messages.length);
      expect(selectionState.graphDiffs.length).toBeGreaterThan(expandedSnapshot.graphDiffs.length);

      const viewportBefore = sessions.getSnapshot();
      const viewportResponse = await fetch(`${base}/api/collab/viewport`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          confirmedBy: "human",
          viewport: {
            version: 1,
            scale: 1.5,
            x: -12.5,
            y: 33.25,
            updatedAt: new Date().toISOString(),
            source: "human",
          },
        }),
      });
      expect(viewportResponse.ok).toBe(true);
      const viewportResult = await viewportResponse.json();
      expect(viewportResult.viewport).toMatchObject({ version: 1, scale: 1.5, source: "human" });
      const viewportAfter = sessions.getSnapshot();
      expect(viewportAfter.graphRevision).toBe(viewportBefore.graphRevision);
      expect(viewportAfter.messages).toHaveLength(viewportBefore.messages.length);
      expect(viewportAfter.graphDiffs).toEqual(viewportBefore.graphDiffs);
      expect(viewportAfter.viewport).toMatchObject({ scale: 1.5, x: -12.5, y: 33.25 });
      const briefWithViewport = await fetch(`${base}/api/collab/brief`, { headers }).then((response) => response.json());
      expect(briefWithViewport.viewport).toMatchObject({ scale: 1.5, source: "human" });
      expect(briefWithViewport.selection).toMatchObject({ selectedCount: 2, source: "human", readOnly: true });
      const unauthorizedViewport = await fetch(`${base}/api/collab/viewport`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          confirmedBy: "ai",
          viewport: { version: 1, scale: 1, x: 0, y: 0, updatedAt: new Date().toISOString(), source: "human" },
        }),
      });
      expect(unauthorizedViewport.status).toBe(403);
      const invalidViewport = await fetch(`${base}/api/collab/viewport`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          confirmedBy: "human",
          viewport: { version: 1, scale: Number.NaN, x: 0, y: 0, updatedAt: new Date().toISOString(), source: "human" },
        }),
      });
      expect(invalidViewport.status).toBe(400);
      const unauthenticatedViewport = await fetch(`${base}/api/collab/viewport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmedBy: "human",
          viewport: { version: 1, scale: 1, x: 0, y: 0, updatedAt: new Date().toISOString(), source: "human" },
        }),
      });
      expect(unauthenticatedViewport.status).toBe(401);

      const invalidGraphResponse = await fetch(`${base}/api/collab/graph`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          ...expandedGraph,
          edges: [{ id: "broken", from: "root", to: "missing", label: "broken" }],
        }),
      });
      expect(invalidGraphResponse.status).toBe(400);

      const invalidPathGraphResponse = await fetch(`${base}/api/collab/graph`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          ...expandedGraph,
          nodes: expandedGraph.nodes.map((node) => node.id === "new_module" ? { ...node, path: "  " } : node),
        }),
      });
      expect(invalidPathGraphResponse.status).toBe(400);

      const invalidEdgeKindResponse = await fetch(`${base}/api/collab/graph`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          ...expandedGraph,
          edges: expandedGraph.edges.map((edge) => ({ ...edge, kind: "  " })),
        }),
      });
      expect(invalidEdgeKindResponse.status).toBe(400);

      const messageResponse = await fetch(`${base}/api/collab/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ body: "请把 README 改成中文", author: "human" }),
      });
      expect(messageResponse.ok).toBe(true);
      const humanMessage = await messageResponse.json();

      const annotationResponse = await fetch(`${base}/api/collab/annotations`, {
        method: "POST",
        headers,
        body: JSON.stringify({ body: "这里需要中文说明", nodeId: "new_module" }),
      });
      expect(annotationResponse.ok).toBe(true);
      const graphAfterAnnotation = await collabFetchGraph(base, headers);
      expect(graphAfterAnnotation.annotations.length).toBe(2);
      expect(graphAfterAnnotation.annotations[1].nodeId).toBe("new_module");
      expect(graphAfterAnnotation.annotations[1].anchorStatus).toBe("anchored");
      expect(graphAfterAnnotation.annotations[1].nodeLabel).toBe("shared reviewed");
      expect(sessions.getMessages().some((message) => message.body.includes("@ shared reviewed"))).toBe(true);

      const threadReply = await fetch(`${base}/api/collab/annotations/${graphAfterAnnotation.annotations[1].id}/reply`, {
        method: "POST",
        headers,
        body: JSON.stringify({ body: "请补充中文说明", author: "human" }),
      });
      expect(threadReply.ok).toBe(true);
      const threadAfterReply = await collabFetchGraph(base, headers);
      expect(threadAfterReply.annotations[1].replies).toHaveLength(1);
      expect(threadAfterReply.annotations[1].replies[0]).toMatchObject({
        author: "human",
        body: "请补充中文说明",
        status: "pending",
      });

      const threadResolve = await fetch(`${base}/api/collab/annotations/${graphAfterAnnotation.annotations[1].id}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({ status: "resolved" }),
      });
      expect(threadResolve.ok).toBe(true);
      expect((await collabFetchGraph(base, headers)).annotations[1].resolved).toBe(true);

      const threadReopen = await fetch(`${base}/api/collab/annotations/${graphAfterAnnotation.annotations[1].id}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({ status: "open" }),
      });
      expect(threadReopen.ok).toBe(true);
      expect((await collabFetchGraph(base, headers)).annotations[1].resolved).toBe(false);

      const renamedGraph = {
        ...(await collabFetchGraph(base, headers)),
        nodes: (await collabFetchGraph(base, headers)).nodes.map((node) =>
          node.id === "new_module" ? { ...node, label: "shared-renamed", path: "src/shared.ts" } : node),
      };
      const renameResponse = await fetch(`${base}/api/collab/graph`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ ...renamedGraph, annotations: renamedGraph.annotations.map((annotation) => ({
          ...annotation,
          anchorStatus: annotation.nodeId === "new_module" ? undefined : annotation.anchorStatus,
        })) }),
      });
      expect(renameResponse.ok).toBe(true);
      const outdatedGraph = await collabFetchGraph(base, headers);
      expect(outdatedGraph.annotations[1].anchorStatus).toBe("outdated");
      expect(sessions.getAnnotationThreadSummary()).toMatchObject({ outdated: 1, nextActor: "human" });

      const unauthorizedAnchor = await fetch(`${base}/api/collab/annotations/${graphAfterAnnotation.annotations[1].id}/anchor`, {
        method: "POST",
        headers,
        body: JSON.stringify({ confirmedBy: "ai" }),
      });
      expect(unauthorizedAnchor.status).toBe(403);

      const reanchor = await fetch(`${base}/api/collab/annotations/${graphAfterAnnotation.annotations[1].id}/anchor`, {
        method: "POST",
        headers,
        body: JSON.stringify({ confirmedBy: "human" }),
      });
      expect(reanchor.ok).toBe(true);
      const reanchoredGraph = await collabFetchGraph(base, headers);
      expect(reanchoredGraph.annotations[1]).toMatchObject({
        anchorStatus: "anchored",
        nodeLabel: "shared-renamed",
        nodePath: "src/shared.ts",
      });

      const detachedGraph = await collabFetchGraph(base, headers);
      detachedGraph.nodes = detachedGraph.nodes.filter((node) => node.id !== "new_module");
      detachedGraph.edges = [];
      detachedGraph.annotations = detachedGraph.annotations.map((annotation) =>
        annotation.nodeId === "new_module"
          ? { ...annotation, anchorStatus: "detached" }
          : annotation);
      const detachedResponse = await fetch(`${base}/api/collab/graph`, {
        method: "PUT",
        headers,
        body: JSON.stringify(detachedGraph),
      });
      expect(detachedResponse.ok).toBe(true);
      const finalGraph = await collabFetchGraph(base, headers);
      const detachedAnnotation = finalGraph.annotations.find((annotation) => annotation.nodeLabel === "shared-renamed");
      expect(detachedAnnotation).toMatchObject({ anchorStatus: "detached", nodeId: "new_module" });
      expect(sessions.getFocus()).toBeUndefined();
      expect(sessions.getAnnotationThreadSummary().detached).toBe(1);

      const invalidThreadStatus = await fetch(`${base}/api/collab/annotations/${graphAfterAnnotation.annotations[1].id}/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({ status: "unresolved" }),
      });
      expect(invalidThreadStatus.status).toBe(400);

      const unknownNodeAnnotationResponse = await fetch(`${base}/api/collab/annotations`, {
        method: "POST",
        headers,
        body: JSON.stringify({ body: "Should fail", nodeId: "missing" }),
      });
      expect(unknownNodeAnnotationResponse.status).toBe(400);

      await sessions.addMessage("ai", "我已理解：把 README 改成中文。", {
        status: "answered",
        metadata: { event: "ai_reply" },
      });
      await sessions.markMessage(humanMessage.id, "answered");
      await sessions.resolveAnnotations([graphAfterAnnotation.annotations[1].id]);
      await sessions.updateAnnotation(graphAfterAnnotation.annotations[0].id, "reply", {
        author: "ai",
        body: "已收到，这条批注会在提案里处理。",
      });
      const replySnapshot = sessions.getSnapshot();
      expect(replySnapshot.messages.find((message) => message.id === humanMessage.id).status).toBe("answered");
      expect(replySnapshot.graph.annotations[1].resolved).toBe(true);
      expect(replySnapshot.messages.some((message) => message.author === "ai" && message.body.includes("中文"))).toBe(true);
      expect(replySnapshot.graph.annotations[0].replies[0]).toMatchObject({
        author: "ai",
        body: "已收到，这条批注会在提案里处理。",
      });

      const proposalResponse = await fetch(`${base}/api/collab/proposals`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: "更新 README",
          summary: "把说明改成中文",
          changes: [{ kind: "update", path: "README.md", content: "# 演示项目\n\n这是双向协作示例。\n" }],
        }),
      });
      expect(proposalResponse.ok).toBe(true);
      const proposal = await proposalResponse.json();

      const diffResponse = await fetch(`${base}/api/collab/proposals/${proposal.id}/diff`, { headers });
      expect(diffResponse.ok).toBe(true);
      const diffPayload = await diffResponse.json();
      expect(diffPayload.diffs[0].lines.some((line) => line.type === "add")).toBe(true);
      expect(proposal.contentHash).toBeTruthy();

      const impactResponse = await fetch(`${base}/api/collab/proposals/${proposal.id}/impact`, { headers });
      expect(impactResponse.ok).toBe(true);
      const impact = (await impactResponse.json()).impact;
      expect(impact).toMatchObject({ files: 1, updated: 1, existingFiles: 1, newFiles: 0, safePathsOnly: true });
      expect(impact.addedLines).toBeGreaterThan(0);
      expect(impact.contentBytes).toBeGreaterThan(0);

      const decisionTrailResponse = await fetch(`${base}/api/collab/decision-trail?eventLimit=30&lineLimit=4`, { headers });
      expect(decisionTrailResponse.ok).toBe(true);
      const decisionTrail = await decisionTrailResponse.json();
      expect(decisionTrail).toMatchObject({ version: 1, graphRevision: expect.any(Number) });
      expect(decisionTrail.proposals.some((item) => item.proposalId === proposal.id)).toBe(true);
      expect(decisionTrail.events.some((item) => item.proposalId === proposal.id)).toBe(true);
      expect(decisionTrail.safety).toMatchObject({ readOnly: true, grantsWriteAuthority: false, excludesApprovalGrants: true });
      expect(JSON.stringify(decisionTrail)).not.toContain("approvalGrant");

      const reviewReadinessResponse = await fetch(`${base}/api/collab/review-readiness`, { headers });
      expect(reviewReadinessResponse.ok).toBe(true);
      const reviewReadiness = await reviewReadinessResponse.json();
      expect(reviewReadiness).toMatchObject({ version: 1, graphRevision: expect.any(Number) });
      expect(["ready", "review", "blocked"]).toContain(reviewReadiness.status);
      expect(reviewReadiness.safety).toMatchObject({ readOnly: true, grantsWriteAuthority: false, excludesApprovalGrants: true });
      expect(JSON.stringify(reviewReadiness)).not.toContain("grantHash");

      const navigationResponse = await fetch(`${base}/api/collab/source-navigation?limit=5`, { headers });
      expect(navigationResponse.ok).toBe(true);
      const navigation = await navigationResponse.json();
      expect(navigation).toMatchObject({ version: 1, readOnly: true });
      expect(navigation.safety).toMatchObject({
        readOnly: true,
        grantsWriteAuthority: false,
        excludesAbsolutePaths: true,
        doesNotOpenFiles: true,
        projectWritesRequireHumanApproval: true,
      });
      expect(navigation.returnedItems).toBeLessThanOrEqual(5);
      expect(JSON.stringify(navigation)).not.toContain("grantHash");

      const capabilitiesResponse = await fetch(`${base}/api/collab/capabilities`, { headers });
      expect(capabilitiesResponse.ok).toBe(true);
      const capabilities = await capabilitiesResponse.json();
      expect(capabilities).toMatchObject({ version: 1, readOnly: true, toolCount: 26 });
      expect(capabilities.tools.filter((tool) => tool.writes === "project").map((tool) => tool.name)).toEqual(["apply_visual_proposal"]);
      expect(capabilities.workflow).toMatchObject({ version: 1, steps: 8, projectWriteTool: "apply_visual_proposal" });
      expect(JSON.stringify(capabilities)).not.toContain("approvalGrant");

      const activityResponse = await fetch(`${base}/api/collab/activity?limit=100`, { headers });
      expect(activityResponse.ok).toBe(true);
      const activity = (await activityResponse.json()).timeline;
      expect(activity).toMatchObject({ version: 1 });
      expect(activity.items.map((item) => item.kind)).toContain("annotation_replied");
      expect(activity.items.map((item) => item.kind)).toContain("graph_diff");
      expect(activity.items.map((item) => item.kind)).toContain("proposal_created");
      expect(activity.items.some((item) => item.proposalId === proposal.id)).toBe(true);
      expect((await collabFetchSession(base, headers)).focus).toBeUndefined();

      const unsafeResponse = await fetch(`${base}/api/collab/proposals`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: "Unsafe proposal",
          summary: "Should be rejected",
          changes: [{ kind: "update", path: "../outside.txt", content: "nope" }],
        }),
      });
      expect(unsafeResponse.status).toBe(400);

      const protectedResponse = await fetch(`${base}/api/collab/proposals`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: "Protected proposal",
          summary: "Should be rejected",
          changes: [{ kind: "create", path: "node_modules/unsafe.txt", content: "nope" }],
        }),
      });
      expect(protectedResponse.status).toBe(400);

      const unauthorized = await fetch(`${base}/api/collab/proposals/${proposal.id}/approve`, {
        method: "POST",
        headers,
        body: JSON.stringify({ approvedBy: "ai" }),
      });
      expect(unauthorized.status).toBe(403);

      const applied = await fetch(`${base}/api/collab/proposals/${proposal.id}/approve`, {
        method: "POST",
        headers,
        body: JSON.stringify({ approvedBy: "human" }),
      });
      expect(applied.ok).toBe(true);
      const approval = await applied.json();
      expect(approval.receipt.approvalId).toBeTruthy();
      expect(await fs.readFile(path.join(workspaceRoot, "README.md"), "utf8")).toBe("# Demo\n");

      await expect(sessions.consumeApproval({
        approvalId: approval.receipt.approvalId,
        proposalId: approval.receipt.proposalId,
        grantHash: "0".repeat(64),
        expiresAt: approval.receipt.expiresAt,
      })).rejects.toThrow(/Invalid|Unknown/);

      await expect(sessions.applyProposal(proposal.id, "human")).resolves.toMatchObject({ status: "applied" });
      expect(await fs.readFile(path.join(workspaceRoot, "README.md"), "utf8")).toContain("双向协作示例");
      expect(sessions.getSnapshot().graphRevision).toBeGreaterThanOrEqual(1);

      const appliedActivity = await fetch(`${base}/api/collab/activity?limit=100`, { headers })
        .then((response) => response.json());
      expect(appliedActivity.timeline.items.some((item) => item.proposalStatus === "applied")).toBe(true);

      const diagnosticsResponse = await fetch(`${base}/api/collab/diagnostics`, { headers });
      expect(diagnosticsResponse.ok).toBe(true);
      const diagnostics = (await diagnosticsResponse.json()).diagnostics;
      expect(diagnostics).toMatchObject({ version: 1, graphRevision: sessions.getSnapshot().graphRevision });
      expect(diagnostics.proposals.applied).toBe(1);
      expect(diagnostics.safety.projectWritesRequireHumanApproval).toBe(true);
      expect(diagnostics.nextActions.join(" ")).toContain("scan_project again");

      const bundleResponse = await fetch(`${base}/api/collab/bundle`, { headers });
      expect(bundleResponse.ok).toBe(true);
      const bundle = await bundleResponse.json();
      expect(bundle.kind).toBe("ai-draw-session-bundle");
      expect(bundle.version).toBe(1);
      expect(JSON.stringify(bundle)).not.toContain(approval.receipt.grantHash);
      expect(JSON.stringify(bundle)).not.toContain("selection");
      expect(bundle.session.graph.annotations[0].replies[0].body).toContain("已收到");

      const manifestResponse = await fetch(`${base}/api/collab/bundle/manifest`, { headers });
      expect(manifestResponse.ok).toBe(true);
      const manifest = await manifestResponse.json();
      expect(manifest).toMatchObject({ version: 1, kind: "ai-draw-export-manifest", sessionId: bundle.session.id });
      expect(manifest.contents.proposals.count).toBeGreaterThan(0);
      expect(manifest.contents.selection).toMatchObject({ included: false, count: 0 });
      expect(manifest.safety).toMatchObject({ readOnly: true, grantsWriteAuthority: false, excludesApprovalGrants: true });
      expect(JSON.stringify(manifest)).not.toContain(approval.receipt.grantHash);

      const manifestAnnotatedBundle = { ...bundle, exportManifest: manifest };
      const manifestImport = await fetch(`${base}/api/collab/bundle/import`, {
        method: "POST",
        headers,
        body: JSON.stringify({ bundle: manifestAnnotatedBundle, confirmedBy: "human" }),
      });
      expect(manifestImport.ok).toBe(true);

      const malformedThreadBundle = await fetch(`${base}/api/collab/bundle/import`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          bundle: {
            ...bundle,
            session: {
              ...bundle.session,
              graph: {
                ...bundle.session.graph,
                annotations: [{ ...bundle.session.graph.annotations[0], replies: "not-an-array" }],
              },
            },
          },
          confirmedBy: "human",
        }),
      });
      expect(malformedThreadBundle.status).toBe(400);

      const rejectedBundleImport = await fetch(`${base}/api/collab/bundle/import`, {
        method: "POST",
        headers,
        body: JSON.stringify({ bundle, confirmedBy: "ai" }),
      });
      expect(rejectedBundleImport.status).toBe(403);

      const invalidBundleImport = await fetch(`${base}/api/collab/bundle/import`, {
        method: "POST",
        headers,
        body: JSON.stringify({ bundle: { kind: "wrong" }, confirmedBy: "human" }),
      });
      expect(invalidBundleImport.status).toBe(400);

      const restoredBundle = await fetch(`${base}/api/collab/bundle/import`, {
        method: "POST",
        headers,
        body: JSON.stringify({ bundle, confirmedBy: "human" }),
      });
      expect(restoredBundle.ok).toBe(true);
      expect(sessions.getSnapshot().proposals[0].status).toBe("applied");
      const restoredSelectionScope = await fetch(`${base}/api/collab/selection-scope`, { headers })
        .then((response) => response.json());
      expect(restoredSelectionScope).toMatchObject({ selectedCount: 0, source: "none", selectionRevision: null });
      const restoredWorkorder = await fetch(`${base}/api/collab/selection-workorder`, { headers })
        .then((response) => response.json());
      expect(restoredWorkorder).toMatchObject({
        selectedCount: 0,
        source: "none",
        selectionRevision: null,
        freshness: {
          status: "none",
          selectionStale: false,
          selectedAtRevision: null,
        },
        safePaths: [],
      });
      expect(restoredWorkorder.gaps.join(" ")).toContain("No active human selection");
    } finally {
      await preview.stop().catch(() => {});
      delete process.env.AI_DRAW_WORKSPACE_ROOT;
      delete process.env.OUTPUT_DIR;
      delete process.env.PREVIEW_PORT;
    }
  });

  it("preserves human graph state through a human-confirmed rescan", async () => {
    process.env.AI_DRAW_WORKSPACE_ROOT = rescanWorkspaceRoot;
    process.env.OUTPUT_DIR = rescanOutputDir;
    process.env.PREVIEW_PORT = "3413";
    configureChrome();

    const { preview, sessions, visualSync } = await createServer();
    await preview.start();
    try {
      const base = "http://127.0.0.1:3413";
      const html = await fetch(`${base}/`).then((response) => response.text());
      const token = html.match(/const PANEL_TOKEN = "([^"]+)"/)?.[1];
      expect(token).toBeTruthy();
      const headers = { "Content-Type": "application/json", "X-AI-Draw-Token": token };

      const initial = await visualSync.sync({ source: "ai", title: "Rescan baseline", openPanel: false, render: false });
      const readmeNode = initial.graph.nodes.find((node) => node.path === "README.md");
      const srcNode = initial.graph.nodes.find((node) => node.path === "src");
      expect(readmeNode).toBeTruthy();
      const originalDiagramId = initial.id;

      const humanGraph = {
        ...initial.graph,
        nodes: initial.graph.nodes.map((node) => node.id === readmeNode.id
          ? { ...node, label: "项目说明.md", x: 987, y: 654, metadata: { ...(node.metadata ?? {}), layoutSource: "human" } }
          : node),
        annotations: [{
          id: "ann_rescan",
          nodeId: readmeNode.id,
          nodeLabel: "项目说明.md",
          nodePath: "README.md",
          anchorStatus: "anchored",
          body: "这里补充架构说明",
          author: "human",
          createdAt: new Date().toISOString(),
        }],
      };
      const saved = await fetch(`${base}/api/collab/graph`, {
        method: "PUT",
        headers,
        body: JSON.stringify(humanGraph),
      });
      expect(saved.ok).toBe(true);
      const focused = await fetch(`${base}/api/collab/focus`, {
        method: "POST",
        headers,
        body: JSON.stringify({ nodeId: readmeNode.id, confirmedBy: "human" }),
      });
      expect(focused.ok).toBe(true);

      const selectionBeforeRescan = await fetch(`${base}/api/collab/selection`, {
        method: "POST",
        headers,
        body: JSON.stringify({ nodeIds: [readmeNode.id], confirmedBy: "human" }),
      });
      expect(selectionBeforeRescan.ok).toBe(true);
      const savedSelection = (await selectionBeforeRescan.json()).selection;
      expect(savedSelection).toMatchObject({ version: 1, source: "human", nodeIds: [readmeNode.id] });

      await fs.writeFile(path.join(rescanWorkspaceRoot, "src", "new.ts"), "export const next = 2;\n", "utf8");
      const unauthorized = await fetch(`${base}/api/collab/rescan`, {
        method: "POST",
        headers,
        body: JSON.stringify({ confirmedBy: "ai", render: false }),
      });
      expect(unauthorized.status).toBe(403);
      const invalidRender = await fetch(`${base}/api/collab/rescan`, {
        method: "POST",
        headers,
        body: JSON.stringify({ confirmedBy: "human", render: "no" }),
      });
      expect(invalidRender.status).toBe(400);

      const rescan = await fetch(`${base}/api/collab/rescan`, {
        method: "POST",
        headers,
        body: JSON.stringify({ confirmedBy: "human", render: false }),
      });
      expect(rescan.ok).toBe(true);
      const rescanResult = await rescan.json();
      expect(rescanResult.diagramId).toBe(originalDiagramId);
      expect(rescanResult.preservation).toMatchObject({
        version: 1,
        strategy: "stable-path-merge",
        humanCoordinates: 1,
        preservedLabels: 1,
        detachedAnnotations: 0,
        preservedFocus: true,
      });
      expect(rescanResult.preservation.newNodes).toBeGreaterThanOrEqual(1);
      const rescanWorkorder = await fetch(`${base}/api/collab/selection-workorder`, { headers })
        .then((response) => response.json());
      expect(rescanWorkorder.freshness).toMatchObject({
        status: "stale",
        selectionStale: true,
        selectedAtRevision: savedSelection.graphRevision,
        graphRevision: rescanResult.graphRevision,
      });
      expect(rescanWorkorder.gaps.join(" ")).toContain("selection is stale");
      expect(rescanWorkorder.copyText).toContain("Selection freshness: stale");
      expect(JSON.stringify(rescanWorkorder)).not.toContain("approvalGrant");
      expect(sessions.getSelection()).toEqual(savedSelection);
      expect(sessions.getSnapshot().selection).toEqual(savedSelection);
      const evidenceResponse = await fetch(`${base}/api/collab/source-evidence`, { headers });
      expect(evidenceResponse.ok).toBe(true);
      const evidence = await evidenceResponse.json();
      expect(evidence).toMatchObject({ version: 1, total: expect.any(Number) });
      expect(evidence.items.every((item) => item.version === 1 && Number.isInteger(item.line) && item.line >= 1)).toBe(true);
      expect(evidence.items.every((item) => typeof item.path === "string" && typeof item.excerpt === "string")).toBe(true);
      const nodeContextResponse = await fetch(`${base}/api/collab/node-context?nodeId=${encodeURIComponent(readmeNode.id)}&diffLimit=5`, { headers });
      expect(nodeContextResponse.ok).toBe(true);
      const nodeContext = await nodeContextResponse.json();
      expect(nodeContext).toMatchObject({ version: 1, nodeId: readmeNode.id, graphRevision: rescanResult.graphRevision });
      expect(nodeContext.safety).toMatchObject({ readOnly: true, grantsWriteAuthority: false });
      expect(Array.isArray(nodeContext.annotationThreads)).toBe(true);
      expect(Array.isArray(nodeContext.edges)).toBe(true);
      expect(sessions.getFocus()).toMatchObject({ nodeId: readmeNode.id, source: "human" });

      const briefResponse = await fetch(`${base}/api/collab/brief?messageLimit=5&graphDiffLimit=3&activityLimit=5`, { headers });
      expect(briefResponse.ok).toBe(true);
      const brief = await briefResponse.json();
      expect(brief).toMatchObject({ version: 1, graphRevision: rescanResult.graphRevision });
      expect(brief.safety).toMatchObject({ readOnly: true, grantsWriteAuthority: false, excludesApprovalGrants: true });
      expect(brief.focus).toMatchObject({ nodeId: readmeNode.id, source: "human" });
      expect(Array.isArray(brief.intent.blockers)).toBe(true);
      expect(JSON.stringify(brief)).not.toContain("approvalId");
      expect(JSON.stringify(brief)).not.toContain("grantHash");

      const after = await collabFetchGraph(base, headers);
      const preservedReadme = after.nodes.find((node) => node.id === readmeNode.id);
      expect(preservedReadme).toMatchObject({ label: "项目说明.md", x: 987, y: 654 });
      expect(preservedReadme.metadata.layoutSource).toBe("human");
      expect(after.nodes.some((node) => node.path === "src/new.ts")).toBe(true);
      expect(after.nodes.find((node) => node.path === "src")?.id).toBe(srcNode.id);
      expect(after.annotations[0]).toMatchObject({ nodeId: readmeNode.id, anchorStatus: "anchored", body: "这里补充架构说明" });
      expect(sessions.getFocus()).toMatchObject({ nodeId: readmeNode.id, source: "human", graphRevision: rescanResult.graphRevision });
      expect(sessions.getGraphDiffs(5).at(-1)).toMatchObject({ source: "human" });

      await fs.rm(path.join(rescanWorkspaceRoot, "src", "new.ts"));
      const removed = await fetch(`${base}/api/collab/rescan`, {
        method: "POST",
        headers,
        body: JSON.stringify({ confirmedBy: "human", render: false }),
      });
      expect(removed.ok).toBe(true);
      const removedResult = await removed.json();
      expect(removedResult.preservation.removedNodes).toBeGreaterThanOrEqual(1);
      expect((await collabFetchGraph(base, headers)).nodes.some((node) => node.path === "src/new.ts")).toBe(false);
      expect((await collabFetchSession(base, headers)).focus).toMatchObject({ nodeId: readmeNode.id });
      expect(await fs.readFile(path.join(rescanWorkspaceRoot, "README.md"), "utf8")).toBe("# Rescan\n");

      const invalidCoordinate = await fetch(`${base}/api/collab/graph`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ ...after, nodes: after.nodes.map((node) => node.id === readmeNode.id ? { ...node, x: "oops" } : node) }),
      });
      expect(invalidCoordinate.status).toBe(400);
    } finally {
      await preview.stop().catch(() => {});
      delete process.env.AI_DRAW_WORKSPACE_ROOT;
      delete process.env.OUTPUT_DIR;
      delete process.env.PREVIEW_PORT;
    }
  }, 15_000);

  it("undoes and redoes only visual graph state with human confirmation", async () => {
    const historyTempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-draw-history-"));
    const historyOutputDir = path.join(historyTempDir, "output");
    const historyWorkspaceRoot = path.join(historyTempDir, "workspace");
    await fs.mkdir(historyWorkspaceRoot, { recursive: true });
    await fs.writeFile(path.join(historyWorkspaceRoot, "README.md"), "# History stays unchanged\n", "utf8");
    process.env.AI_DRAW_WORKSPACE_ROOT = historyWorkspaceRoot;
    process.env.OUTPUT_DIR = historyOutputDir;
    process.env.PREVIEW_PORT = "3414";

    const { preview, sessions } = await createServer();
    await preview.start();
    try {
      const base = "http://127.0.0.1:3414";
      const html = await fetch(`${base}/`).then((response) => response.text());
      const token = html.match(/const PANEL_TOKEN = "([^"]+)"/)?.[1];
      expect(token).toBeTruthy();
      const headers = { "Content-Type": "application/json", "X-AI-Draw-Token": token };

      const firstGraph = {
        version: 1,
        diagramId: "diagram_history",
        nodes: [{ id: "readme", label: "README.md", kind: "documentation", path: "README.md" }],
        edges: [],
        annotations: [],
      };
      const first = await fetch(`${base}/api/collab/graph`, {
        method: "PUT", headers, body: JSON.stringify(firstGraph),
      });
      expect(first.ok).toBe(true);
      const secondGraph = {
        ...firstGraph,
        nodes: [{ ...firstGraph.nodes[0], label: "项目说明.md", x: 120, metadata: { layoutSource: "human" } }],
      };
      const second = await fetch(`${base}/api/collab/graph`, {
        method: "PUT", headers, body: JSON.stringify(secondGraph),
      });
      expect(second.ok).toBe(true);

      const available = await fetch(`${base}/api/collab/graph/history`, { headers }).then((response) => response.json());
      expect(available.history).toMatchObject({ version: 1, undo: 1, redo: 0 });
      const unauthorized = await fetch(`${base}/api/collab/graph/undo`, {
        method: "POST", headers, body: JSON.stringify({ confirmedBy: "ai" }),
      });
      expect(unauthorized.status).toBe(403);

      const undone = await fetch(`${base}/api/collab/graph/undo`, {
        method: "POST", headers, body: JSON.stringify({ confirmedBy: "human" }),
      }).then((response) => response.json());
      expect(undone.ok).toBe(true);
      expect(undone.history).toMatchObject({ undo: 0, redo: 1 });
      const graphAfterUndo = await collabFetchGraph(base, headers);
      expect(graphAfterUndo.nodes[0].label).toBe("README.md");
      expect(graphAfterUndo.nodes[0].x).toBeUndefined();
      expect(sessions.getGraphDiffs(5).at(-1).items.some((item) => item.entity === "node")).toBe(true);
      expect(await fs.readFile(path.join(historyWorkspaceRoot, "README.md"), "utf8")).toBe("# History stays unchanged\n");

      const redone = await fetch(`${base}/api/collab/graph/redo`, {
        method: "POST", headers, body: JSON.stringify({ confirmedBy: "human" }),
      }).then((response) => response.json());
      expect(redone.ok).toBe(true);
      expect(redone.history).toMatchObject({ undo: 1, redo: 0 });
      const graphAfterRedo = await collabFetchGraph(base, headers);
      expect(graphAfterRedo.nodes[0]).toMatchObject({ label: "项目说明.md", x: 120 });

      const bundle = await fetch(`${base}/api/collab/bundle`, { headers }).then((response) => response.json());
      expect(JSON.stringify(bundle)).not.toContain("graphHistory");
      expect(JSON.stringify(bundle)).not.toContain("approvalId");
      expect(sessions.getSnapshot().proposals).toEqual([]);
      expect(sessions.getSnapshot().messages.at(-1).metadata?.event).toBe("graph_redo");
      expect(await fs.readFile(path.join(historyWorkspaceRoot, "README.md"), "utf8")).toBe("# History stays unchanged\n");
    } finally {
      await preview.stop().catch(() => {});
      delete process.env.AI_DRAW_WORKSPACE_ROOT;
      delete process.env.OUTPUT_DIR;
      delete process.env.PREVIEW_PORT;
      await fs.rm(historyTempDir, { recursive: true, force: true });
    }
  }, 30_000);
});

async function collabFetchGraph(base, headers) {
  const response = await fetch(`${base}/api/collab/graph`, { headers });
  expect(response.ok).toBe(true);
  return response.json();
}

async function collabFetchSession(base, headers) {
  const response = await fetch(`${base}/api/collab/session`, { headers });
  expect(response.ok).toBe(true);
  return response.json();
}
