#!/usr/bin/env node
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs");
const port = Number(process.env.CAPTURE_PORT ?? 4418);
const base = `http://127.0.0.1:${port}`;
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-draw-capture-"));
await fs.mkdir(path.join(tempDir, "src", "infra"), { recursive: true });
await fs.mkdir(path.join(tempDir, "src", "tools"), { recursive: true });
await fs.mkdir(path.join(tempDir, "docs"), { recursive: true });
await Promise.all([
  fs.writeFile(path.join(tempDir, "README.md"), "# Demo\n\nHuman and AI share one visual context.\n", "utf8"),
  fs.writeFile(path.join(tempDir, "package.json"), '{"name":"demo","private":true}\n', "utf8"),
  fs.writeFile(path.join(tempDir, "src", "index.ts"), "export function start() {}\n", "utf8"),
  fs.writeFile(path.join(tempDir, "src", "infra", "preview-server.ts"), "export class PreviewServer {}\n", "utf8"),
  fs.writeFile(path.join(tempDir, "src", "infra", "store.ts"), "export class DiagramStore {}\n", "utf8"),
  fs.writeFile(path.join(tempDir, "src", "tools", "scan-project.ts"), "export function scanProject() {}\n", "utf8"),
  fs.writeFile(path.join(tempDir, "docs", "ARCHITECTURE.md"), "# Architecture\n\nVisual context stays read-only until human approval.\n", "utf8"),
]);

function resolveChrome() {
  const configured = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (configured && existsSync(configured)) return configured;
  const candidates = [
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error("Chrome not found; set PUPPETEER_EXECUTABLE_PATH");
  return found;
}

process.env.AI_DRAW_WORKSPACE_ROOT = tempDir;
process.env.OUTPUT_DIR = path.join(tempDir, "output");
process.env.PREVIEW_PORT = String(port);

const { createServer } = await import(path.join(root, "dist/server.js"));
const { preview, visualSync } = await createServer();
await preview.start();

const scanResult = await visualSync.sync({
  title: "示例 · 人机协作项目结构",
  maxDepth: 4,
  maxFiles: 40,
  source: "ai",
  openPanel: false,
  render: false,
});

async function seedProposalCard() {
  const html = await fetch(base).then((response) => response.text());
  const token = html.match(/const PANEL_TOKEN = "([^"]+)"/)?.[1];
  if (!token) throw new Error("Panel token not found");
  const response = await fetch(`${base}/api/collab/proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-AI-Draw-Token": token },
    body: JSON.stringify({
      title: "把 README 改成中文",
      summary: "根据图形批注更新说明；批准前仍须逐行 diff、人工确认与一次性确认号。",
      changes: [
        { kind: "update", path: "README.md", content: "# 演示项目\n\n这是双向协作示例。\n" },
        { kind: "create", path: "docs/ui-preview.md", content: "# 提案卡片预览\n" },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Unable to seed proposal card: HTTP ${response.status}`);
  const headers = { "Content-Type": "application/json", "X-AI-Draw-Token": token };
  for (const message of [
    { author: "human", body: "请根据图形更新说明，但不要直接写项目文件。" },
    { author: "ai", body: "已生成变更提案，等待人工审阅完整逐行差异。" },
  ]) {
    const chatResponse = await fetch(`${base}/api/collab/messages`, {
      method: "POST",
      headers,
      body: JSON.stringify(message),
    });
    if (!chatResponse.ok) throw new Error(`Unable to seed chat message: HTTP ${chatResponse.status}`);
  }
  const focusNode = scanResult.graph.nodes.find((node) => node.label === "index.ts") ?? scanResult.graph.nodes[0];
  if (focusNode) {
    const focusResponse = await fetch(`${base}/api/collab/focus`, {
      method: "POST",
      headers,
      body: JSON.stringify({ nodeId: focusNode.id, confirmedBy: "human" }),
    });
    if (!focusResponse.ok) throw new Error(`Unable to seed selected node: HTTP ${focusResponse.status}`);
    const annotationResponse = await fetch(`${base}/api/collab/annotations`, {
      method: "POST",
      headers,
      body: JSON.stringify({ nodeId: focusNode.id, body: "请解释这个对象与相邻模块的关系，先不要写文件。" }),
    });
    if (!annotationResponse.ok) throw new Error(`Unable to seed focused annotation: HTTP ${annotationResponse.status}`);
    const thread = await annotationResponse.json();
    const replyResponse = await fetch(`${base}/api/collab/annotations/${encodeURIComponent(thread.annotation.id)}/reply`, {
      method: "POST",
      headers,
      body: JSON.stringify({ author: "ai", body: "这个对象连接项目入口与基础设施；改动会先生成完整 diff，不会直接写文件。" }),
    });
    if (!replyResponse.ok) throw new Error(`Unable to seed AI reply: HTTP ${replyResponse.status}`);
  }
}

await seedProposalCard();

const browser = await puppeteer.launch({
  headless: "new",
  executablePath: resolveChrome(),
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${base}/diagram/${scanResult.id}`, { waitUntil: "networkidle2" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle2" });
  await page.waitForSelector("#diagramRender svg");
  await page.waitForFunction(() => document.querySelector("#welcomeCard").hidden);
  await page.keyboard.press("f");
  await page.keyboard.press("3");
  await page.waitForFunction(() => document.querySelector("#workspace").dataset.view === "canvas");
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".canvas-dock")).display === "flex");
  await page.waitForFunction(() => document.querySelectorAll("#canvasDock .canvas-dock-route-step").length === 3);
  await page.keyboard.press("f");
  await page.evaluate(() => document.querySelector("#btnCollaborate").click());
  await page.waitForSelector("#graphEditor .graph-row");
  await page.waitForSelector("#annotationList .annotation-thread");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.querySelector("#collabShell").hidden);
  await page.waitForFunction(() => {
    const parts = document.querySelector("#canvasObjectIndex").textContent.split("/").map((part) => Number(part.trim()));
    return parts[0] > 0 && parts[1] > 1;
  });
  await new Promise((resolve) => setTimeout(resolve, 450));
  const targetNode = await page.evaluate(() => {
    const groups = [...document.querySelectorAll("#diagramRender svg g.nodes > g.node")];
    const target = groups.find((group) => (group.textContent || "").includes("index.ts"));
    if (!target) return null;
    const rect = target.querySelector("rect.basic.label-container, rect, polygon, path, ellipse, circle").getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
  if (!targetNode) throw new Error("Focus target node not found in rendered graph");
  await page.mouse.click(targetNode.x, targetNode.y);
  await page.waitForFunction(() => document.querySelector("#canvasObjectLabel").textContent.trim() === "index.ts", { timeout: 5000 });
  await page.waitForFunction(() => Number(document.querySelector("#flowLens").dataset.focusEdges) > 0, { timeout: 5000 });
  await page.waitForFunction(() => Number(document.querySelector("#canvasObjectConversation").dataset.openThreads) > 0, { timeout: 5000 });
  await page.waitForSelector("#canvasThreadLayer .canvas-thread-badge");
  await page.waitForFunction(() => {
    const ring = document.querySelector("#canvasFocusRing");
    const halo = document.querySelector("#canvasFocusHalo");
    const badge = document.querySelector("#canvasFocusLabel");
    const ripple = document.querySelector("#canvasFocusRipple");
    const focusLabel = document.querySelector("#canvasObjectLabel").textContent.trim();
    const ringId = ring.dataset.focusNodeId;
    const focusNode = [...document.querySelectorAll("#diagramRender svg g.nodes > g.node")]
      .find((group) => ringId && group.id.includes(ringId));
    const ringText = focusNode?.textContent?.replace(/\s+/g, " ").trim() || "";
    return getComputedStyle(ring).display === "block"
      && ringId
      && (ringText === focusLabel || ringText === `📁 ${focusLabel}`)
      && halo.dataset.visible === "true"
      && badge.dataset.visible === "true"
      && (ripple.dataset.active === "false" || ripple.dataset.triggeredBy === ringId)
      && badge.textContent.includes(focusLabel);
  }, { timeout: 5000 });
  await page.waitForFunction(() => document.querySelector("#canvasFocusRipple").dataset.active === "false", { timeout: 5000 });
  await page.mouse.move(targetNode.x, targetNode.y);
  await page.waitForFunction(() => document.querySelector("#canvasHoverCard").dataset.visible === "true", { timeout: 5000 });
  await page.waitForFunction(() => document.querySelectorAll("#diagramRender svg .flowchart-link.is-hover-path").length > 0, { timeout: 5000 });
  await page.waitForFunction(() => Number(document.querySelector("#canvasRelationMap").dataset.edges) > 0, { timeout: 5000 });
  await new Promise((resolve) => setTimeout(resolve, 220));
  await page.mouse.move(20, 20);
  await page.waitForFunction(() => document.querySelector("#canvasHoverCard").dataset.visible === "false");
  await page.waitForFunction(() => document.querySelectorAll("#canvasBoardThread .canvas-board-entry.ai").length > 0, { timeout: 5000 });
  await new Promise((resolve) => setTimeout(resolve, 260));
  await page.screenshot({ path: path.join(outputDir, "shared-board-panel.png") });
  console.log("✅ Captured docs/shared-board-panel.png");
} finally {
  await browser.close();
  await preview.stop().catch(() => {});
  await fs.rm(tempDir, { recursive: true, force: true });
}
