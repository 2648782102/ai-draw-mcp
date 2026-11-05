import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const packageRoot = process.cwd();
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-draw-collab-"));
const outputDir = path.join(tempDir, "output");
const workspaceRoot = path.join(tempDir, "workspace");
await fs.mkdir(workspaceRoot, { recursive: true });
await fs.writeFile(path.join(workspaceRoot, "README.md"), "# Demo\n", "utf8");

const { createServer } = await import(path.join(packageRoot, "dist/server.js"));

describe("collaboration session", () => {
  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("supports graph edits, diffs, AI replies, and a one-time approval grant", async () => {
    process.env.AI_DRAW_WORKSPACE_ROOT = workspaceRoot;
    process.env.OUTPUT_DIR = outputDir;
    process.env.PREVIEW_PORT = "3412";
    process.env.PUPPETEER_EXECUTABLE_PATH =
      process.env.PUPPETEER_EXECUTABLE_PATH ??
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

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

      const invalidGraphResponse = await fetch(`${base}/api/collab/graph`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          ...expandedGraph,
          edges: [{ id: "broken", from: "root", to: "missing", label: "broken" }],
        }),
      });
      expect(invalidGraphResponse.status).toBe(400);

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
      expect(sessions.getMessages().some((message) => message.body.includes("@ shared"))).toBe(true);

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
      const replySnapshot = sessions.getSnapshot();
      expect(replySnapshot.messages.find((message) => message.id === humanMessage.id).status).toBe("answered");
      expect(replySnapshot.graph.annotations[1].resolved).toBe(true);
      expect(replySnapshot.messages.some((message) => message.author === "ai" && message.body.includes("中文"))).toBe(true);

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

      const bundleResponse = await fetch(`${base}/api/collab/bundle`, { headers });
      expect(bundleResponse.ok).toBe(true);
      const bundle = await bundleResponse.json();
      expect(bundle.kind).toBe("ai-draw-session-bundle");
      expect(bundle.version).toBe(1);
      expect(JSON.stringify(bundle)).not.toContain(approval.receipt.grantHash);

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
    } finally {
      await preview.stop().catch(() => {});
      delete process.env.AI_DRAW_WORKSPACE_ROOT;
      delete process.env.OUTPUT_DIR;
      delete process.env.PREVIEW_PORT;
    }
  });
});

async function collabFetchGraph(base, headers) {
  const response = await fetch(`${base}/api/collab/graph`, { headers });
  expect(response.ok).toBe(true);
  return response.json();
}
