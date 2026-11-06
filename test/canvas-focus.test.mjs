import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const packageRoot = process.cwd();
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-draw-canvas-focus-"));

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function resolveChrome() {
  const configured = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (configured && existsSync(configured)) return configured;
  const candidates = [
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const { createServer } = await import(path.join(packageRoot, "dist/server.js"));

describe("canvas focus interaction", () => {
  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    delete process.env.AI_DRAW_WORKSPACE_ROOT;
    delete process.env.OUTPUT_DIR;
    delete process.env.PREVIEW_PORT;
  });

  it("clicks a real graph node, follows transforms, and keeps dragging safe", async () => {
    const chromePath = resolveChrome();
    if (!chromePath) return;

    const puppeteer = (await import("puppeteer")).default;
    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: chromePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    process.env.AI_DRAW_WORKSPACE_ROOT = tempDir;
    process.env.OUTPUT_DIR = path.join(tempDir, "output");
    process.env.PREVIEW_PORT = String(port);
    await fs.mkdir(path.join(tempDir, "src"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "README.md"), "# Demo\n", "utf8");
    await fs.writeFile(path.join(tempDir, "src", "index.ts"), "export function start() {}\n", "utf8");
    const { preview, visualSync } = await createServer();
    await preview.start();
    const scan = await visualSync.sync({
      title: "Focus regression",
      source: "ai",
      openPanel: false,
      render: false,
    });

    try {
      const page = await browser.newPage();
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(`${base}/diagram/${scan.id}`, { waitUntil: "networkidle2" });
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: "networkidle2" });
      await page.waitForSelector("#diagramRender svg");
      await page.click("#btnCollaborate");
      await page.waitForSelector("#graphEditor .graph-row");
      await page.click("#btnCloseCollab");
      await page.keyboard.press("3");
      await page.waitForFunction(() => document.querySelector("#workspace").dataset.view === "canvas");

      const nodes = await page.evaluate(() => {
        const groups = [...document.querySelectorAll("#diagramRender svg g.nodes > g.node")];
        return groups.map((group) => {
          const rect = group.querySelector("rect.basic.label-container, rect, polygon, path, ellipse, circle").getBoundingClientRect();
          return { label: group.textContent.replace(/\s+/g, " ").trim(), x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        });
      });
      expect(nodes.length).toBeGreaterThan(1);
      const target = nodes.find((node) => node.label === "index.ts") ?? nodes.at(-1);
      expect(target).toBeTruthy();

      await page.mouse.click(target.x, target.y);
      await page.waitForFunction((label) => document.querySelector("#canvasObjectLabel").textContent.trim() === label, { timeout: 5000 }, target.label);
      await page.waitForFunction(() => getComputedStyle(document.querySelector("#canvasFocusRing")).display === "block");
      const focus = await page.evaluate(() => {
        const ring = document.querySelector("#canvasFocusRing");
        const halo = document.querySelector("#canvasFocusHalo");
        const badge = document.querySelector("#canvasFocusLabel");
        const ripple = document.querySelector("#canvasFocusRipple");
        const group = [...document.querySelectorAll("#diagramRender svg g.nodes > g.node")]
          .find((element) => ring.dataset.focusNodeId && element.id.includes(ring.dataset.focusNodeId));
        const shape = group?.querySelector("rect.basic.label-container, rect, polygon, path, ellipse, circle");
        const shapeRect = shape?.getBoundingClientRect();
        const ringRect = ring.getBoundingClientRect();
        return {
          label: document.querySelector("#canvasObjectLabel").textContent.trim(),
          labelText: group?.textContent?.replace(/\s+/g, " ").trim() || "",
          halo: halo.dataset.visible,
          badge: badge.dataset.visible,
          badgeText: badge.textContent,
          rippleTriggeredBy: ripple.dataset.triggeredBy,
          ringId: ring.dataset.focusNodeId,
          aligned: Boolean(shapeRect) && Math.abs(ringRect.left - (shapeRect.left - 5)) < 2 && Math.abs(ringRect.top - (shapeRect.top - 5)) < 2,
        };
      });
      expect(focus.labelText).toBe(focus.label);
      expect(focus.ringId).toMatch(/^node_/);
      expect(focus.halo).toBe("true");
      expect(focus.badge).toBe("true");
      expect(focus.badgeText).toContain(focus.label);
      expect(focus.aligned).toBe(true);
      expect(focus.rippleTriggeredBy).toBe(focus.ringId);

      const objectCard = await page.evaluate(() => ({
        relatedCount: Number(document.querySelector("#canvasRelatedCount").textContent),
        revision: document.querySelector("#canvasFocusRevision").textContent,
        relatedDisabled: document.querySelector("#btnCanvasRelatedNode").disabled,
        ringId: document.querySelector("#canvasFocusRing").dataset.focusNodeId,
      }));
      expect(objectCard.relatedCount).toBeGreaterThan(0);
      expect(objectCard.revision).toMatch(/^rev \d+$/);
      expect(objectCard.relatedDisabled).toBe(false);
      expect(objectCard.ringId).toBe(focus.ringId);

      await page.evaluate(() => {
        window.copiedFocusContext = "";
        navigator.clipboard.writeText = async (text) => { window.copiedFocusContext = text; };
      });
      await page.click("#btnCanvasCopyFocus");
      const clipboard = await page.evaluate(() => window.copiedFocusContext);
      expect(clipboard).toContain(focus.label);
      expect(clipboard).toContain("get_node_context");
      expect(clipboard).toContain("不授权写入");
      expect(clipboard).not.toContain("receipt");
      expect(clipboard).not.toContain(tempDir);
      await page.click("#btnCanvasRelatedNode");
      await page.waitForFunction((previous) => document.querySelector("#canvasObjectLabel").textContent.trim() !== previous, { timeout: 5000 }, focus.label);
      expect(await page.$eval("#canvasFocusRing", (element) => element.dataset.focusNodeId)).toBeTruthy();

      const beforeDrag = await page.$eval("#canvasObjectLabel", (element) => element.textContent);
      const relatedLabel = beforeDrag.trim();
      const ringAfterRelated = await page.$eval("#canvasFocusRing", (element) => element.dataset.focusNodeId);
      expect(ringAfterRelated).toBeTruthy();
      await page.mouse.move(target.x, target.y);
      await page.mouse.down();
      await page.mouse.move(target.x + 48, target.y + 24, { steps: 6 });
      await page.mouse.up();
      expect(await page.$eval("#canvasObjectLabel", (element) => element.textContent)).toBe(beforeDrag);
      await page.click("#btnCanvasZoomIn");
      await page.waitForFunction(() => Number(document.querySelector("#canvasZoomLabel").textContent.replace("%", "")) > 90);
      expect(await page.evaluate(() => {
        const ring = document.querySelector("#canvasFocusRing");
        const group = [...document.querySelectorAll("#diagramRender svg g.nodes > g.node")]
          .find((element) => ring.dataset.focusNodeId && element.id.includes(ring.dataset.focusNodeId));
        const shape = group?.querySelector("rect.basic.label-container, rect, polygon, path, ellipse, circle");
        const shapeRect = shape?.getBoundingClientRect();
        const ringRect = ring.getBoundingClientRect();
        return Boolean(shapeRect) && Math.abs(ringRect.width - (shapeRect.width + 10)) < 2;
      })).toBe(true);
      expect(pageErrors).toEqual([]);
    } finally {
      await browser.close();
      await preview.stop().catch(() => {});
    }
  }, 60_000);
});
