/**
 * End-to-end collaboration demo using a temporary workspace.
 *
 * Run after `npm run build`:
 *   node examples/collab-demo.mjs
 *
 * It never modifies the repository; all project changes happen under a
 * temporary directory and are cleaned up on exit.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-draw-demo-"));
const workspaceRoot = path.join(tempDir, "demo-project");
const outputDir = path.join(tempDir, "output");
await fs.mkdir(workspaceRoot, { recursive: true });
await fs.writeFile(path.join(workspaceRoot, "README.md"), "# Demo Project\n", "utf8");

process.env.AI_DRAW_WORKSPACE_ROOT = workspaceRoot;
process.env.OUTPUT_DIR = outputDir;
process.env.PREVIEW_PORT = "3434";
process.env.LOG_LEVEL = "error";
process.env.PUPPETEER_EXECUTABLE_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const { createServer } = await import(path.join(packageRoot, "dist/server.js"));
const { preview, sessions } = await createServer();
await preview.start();

const base = "http://127.0.0.1:3434";
const html = await fetch(`${base}/`).then((response) => response.text());
const token = html.match(/const PANEL_TOKEN = "([^"]+)"/)?.[1];
if (!token) throw new Error("Panel token was not injected");
const headers = { "Content-Type": "application/json", "X-AI-Draw-Token": token };

async function request(url, options = {}) {
  const response = await fetch(`${base}${url}`, { headers, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

try {
  console.log("1/6 扫描临时工作区…");
  const graph = {
    version: 1,
    diagramId: "diagram_demo",
    nodes: [
      { id: "root", label: "demo-project/", kind: "package", path: "." },
      { id: "readme", label: "README.md", kind: "documentation", path: "README.md" },
    ],
    edges: [{ id: "edge_root_readme", from: "root", to: "readme", label: "contains", kind: "contains" }],
    annotations: [],
  };
  await request("/api/collab/graph", { method: "PUT", body: JSON.stringify(graph) });

  console.log("2/6 人类在面板里发消息、加批注…");
  await request("/api/collab/messages", {
    method: "POST",
    body: JSON.stringify({ body: "请把 README 改成中文并说明协作流程", author: "human" }),
  });
  await request("/api/collab/annotations", {
    method: "POST",
    body: JSON.stringify({ body: "README 需要中文说明", nodeId: "readme" }),
  });

  console.log("3/6 AI 在面板里回信并标记已处理…");
  const context = await request("/api/collab/session");
  await sessions.addMessage("ai", "已理解：将更新 README 并保留项目结构图。", { status: "answered" });
  await sessions.markMessage(context.messages.at(-1).id, "answered");
  await sessions.resolveAnnotations([context.graph.annotations[0].id]);

  console.log("4/6 AI 创建提案，面板展示逐行差异…");
  const proposal = await request("/api/collab/proposals", {
    method: "POST",
    body: JSON.stringify({
      title: "中文化 README",
      summary: "加入中文说明与双向协作流程",
      changes: [{
        kind: "update",
        path: "README.md",
        content: "# 演示项目\n\n这是人与 AI 双向协作的可视化工作区示例。\n",
      }],
    }),
  });
  const diff = await request(`/api/collab/proposals/${proposal.id}/diff`);
  console.log(`    差异行数: ${diff.diffs[0].lines.length}，内容哈希: ${proposal.contentHash.slice(0, 12)}…`);

  console.log("5/6 人类批准，生成一次性确认号…");
  const approval = await request(`/api/collab/proposals/${proposal.id}/approve`, {
    method: "POST",
    body: JSON.stringify({ approvedBy: "human" }),
  });
  console.log(`    approval_id: ${approval.receipt.approvalId}`);
  console.log("    批准本身不会写文件：README 仍为初始内容。");
  console.log("6/6 AI 凭确认号应用提案…");
  await sessions.consumeApproval(approval.receipt);
  const applied = await sessions.applyProposal(proposal.id, "human");
  if (applied.status !== "applied") throw new Error(applied.error || "Proposal failed");

  const finalReadme = await fs.readFile(path.join(workspaceRoot, "README.md"), "utf8");
  if (!finalReadme.includes("双向协作")) throw new Error("README was not updated");
  console.log(`✅ 完成：${finalReadme.trim().split("\n").at(-1)}`);
  console.log(`   会话: ${outputDir}/.ai-draw/session.json`);
} finally {
  await preview.stop();
  await fs.rm(tempDir, { recursive: true, force: true });
}
