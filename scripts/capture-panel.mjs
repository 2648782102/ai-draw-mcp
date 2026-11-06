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
  const focusNode = scanResult.graph.nodes.find((node) => node.path?.includes("src")) ?? scanResult.graph.nodes[0];
  if (focusNode) {
    const focusResponse = await fetch(`${base}/api/collab/focus`, {
      method: "POST",
      headers,
      body: JSON.stringify({ nodeId: focusNode.id, confirmedBy: "human" }),
    });
    if (!focusResponse.ok) throw new Error(`Unable to seed selected node: HTTP ${focusResponse.status}`);
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
  await page.goto(base, { waitUntil: "networkidle2" });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${base}/diagram/${scanResult.id}`, { waitUntil: "networkidle2" });
  await page.waitForSelector("#diagramRender svg");
  await page.waitForFunction(() => document.querySelector("#welcomeCard").hidden);
  await page.keyboard.press("f");
  await new Promise((resolve) => setTimeout(resolve, 450));
  await page.screenshot({ path: path.join(outputDir, "preview-panel.png") });
  await page.keyboard.press("3");
  await page.waitForFunction(() => document.querySelector("#workspace").dataset.view === "canvas");
  await page.waitForSelector("#diagramRender svg");
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".canvas-dock")).display === "flex");
  await page.keyboard.press("f");
  await new Promise((resolve) => setTimeout(resolve, 450));
  await page.screenshot({ path: path.join(outputDir, "canvas-workbench-panel.png") });
  await page.click("#btnCanvasHelp");
  await page.waitForFunction(() => !document.querySelector("#shortcutBackdrop").hidden);
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector("#shortcutBackdrop")).opacity) >= 0.99);
  await new Promise((resolve) => setTimeout(resolve, 250));
  await page.screenshot({ path: path.join(outputDir, "canvas-shortcuts-panel.png") });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.querySelector("#shortcutBackdrop").hidden);
  await page.keyboard.press("c");
  await page.waitForFunction(() => !document.querySelector("#collabShell").hidden);
  await page.waitForSelector("#overviewRevision");
  await page.waitForSelector(".proposal-card.status-pending .impact-grid");
  await page.waitForSelector("#chatLog .chat-item.ai");
  await page.evaluate(() => {
    const diff = document.querySelector(".proposal-card.status-pending .proposal-diff");
    diff.open = true;
  });
  await page.waitForSelector(".proposal-card.status-pending .proposal-diff.loaded");
  await page.evaluate(() => {
    const card = document.querySelector(".proposal-card.status-pending");
    card.querySelector(".proposal-diff").scrollIntoView({ block: "center" });
    const pane = document.querySelector("#collabSectionProposals .section-scroll");
    if (pane) pane.scrollTop = Math.max(0, pane.scrollHeight - pane.clientHeight);
  });
  await page.waitForFunction(() => {
    const shell = document.querySelector("#collabShell");
    return Number(getComputedStyle(shell).opacity) >= 0.99;
  });
  await new Promise((resolve) => setTimeout(resolve, 400));
  await page.screenshot({ path: path.join(outputDir, "collaboration-workbench-panel.png") });
  await page.click("#btnFocusMode");
  await page.waitForFunction(() => document.querySelector("#collabShell").classList.contains("focus-mode"));
  await new Promise((resolve) => setTimeout(resolve, 250));
  await page.screenshot({ path: path.join(outputDir, "collaboration-focus-panel.png") });
  console.log("✅ Captured docs/preview-panel.png, docs/canvas-workbench-panel.png, docs/canvas-shortcuts-panel.png, docs/collaboration-workbench-panel.png and docs/collaboration-focus-panel.png");
} finally {
  await browser.close();
  await preview.stop().catch(() => {});
  await fs.rm(tempDir, { recursive: true, force: true });
}
