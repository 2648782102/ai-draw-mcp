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
await fs.writeFile(path.join(tempDir, "README.md"), "# Demo\n", "utf8");

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
const { preview } = await createServer();
await preview.start();

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
  await page.screenshot({ path: path.join(outputDir, "preview-panel.png") });
  await page.keyboard.press("c");
  await page.waitForFunction(() => !document.querySelector("#collabShell").hidden);
  await page.waitForSelector("#overviewRevision");
  await page.waitForSelector(".proposal-card.status-pending .impact-grid");
  await page.waitForFunction(() => {
    const shell = document.querySelector("#collabShell");
    return Number(getComputedStyle(shell).opacity) >= 0.99;
  });
  await new Promise((resolve) => setTimeout(resolve, 400));
  await page.screenshot({ path: path.join(outputDir, "collaboration-workbench-panel.png") });
  console.log("✅ Captured docs/preview-panel.png and docs/collaboration-workbench-panel.png");
} finally {
  await browser.close();
  await preview.stop().catch(() => {});
  await fs.rm(tempDir, { recursive: true, force: true });
}
