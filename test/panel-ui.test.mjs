import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const packageRoot = process.cwd();
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-draw-panel-ui-"));
const port = 4417;
const base = `http://127.0.0.1:${port}`;

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

const { createServer } = await import(path.join(packageRoot, "dist/server.js"));

describe("collaboration panel UI", () => {
  afterAll(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    delete process.env.AI_DRAW_WORKSPACE_ROOT;
    delete process.env.OUTPUT_DIR;
    delete process.env.PREVIEW_PORT;
  });

  it("opens with the shortcut, groups context, and switches responsive tabs", async () => {
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
    const { preview } = await createServer();
    await preview.start();

    try {
      const page = await browser.newPage();
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(base, { waitUntil: "networkidle2" });

      expect(await page.$(".brand-mark")).toBeTruthy();
      expect(await page.$("#btnRender.primary")).toBeTruthy();

      await page.keyboard.press("c");
      await page.waitForFunction(() => !document.querySelector("#collabShell").hidden);
      await page.waitForSelector("#overviewRevision");
      const desktop = await page.evaluate(() => ({
        stats: document.querySelectorAll(".overview-stat").length,
        drawers: document.querySelectorAll(".signal-drawer").length,
        docks: document.querySelectorAll(".section-dock").length,
        emptyState: Boolean(document.querySelector(".empty-state")),
        scrollWidth: document.body.scrollWidth,
        clientWidth: document.body.clientWidth,
      }));
      expect(desktop).toMatchObject({
        stats: 6,
        drawers: 2,
        docks: 2,
        emptyState: true,
        scrollWidth: 1440,
        clientWidth: 1440,
      });

      await page.click("#btnGraphMore");
      expect(await page.$eval("#graphMoreActions", (element) => element.classList.contains("open"))).toBe(true);
      await page.$eval("#messageInput", (element) => {
        element.value = "前端交互回归";
        element.dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(await page.$eval("#messageCount", (element) => element.textContent)).toBe("6 / 2000");
      expect(await page.$eval(".safety-note", (element) => element.textContent)).toContain("写入闸门");

      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.querySelector("#collabShell").hidden);

      await page.setViewport({ width: 820, height: 820 });
      await page.keyboard.press("c");
      await page.waitForFunction(() => !document.querySelector("#collabShell").hidden);
      await page.click('[data-tab-target="dialog"]');
      const mobile = await page.evaluate(() => ({
        activeTab: document.querySelector("#collabShell").dataset.tab,
        visibleSections: [...document.querySelectorAll(".collab-section")]
          .filter((section) => getComputedStyle(section).display !== "none").length,
        scrollWidth: document.body.scrollWidth,
        clientWidth: document.body.clientWidth,
      }));
      expect(mobile).toMatchObject({
        activeTab: "dialog",
        visibleSections: 1,
        scrollWidth: 820,
        clientWidth: 820,
      });
      expect(pageErrors).toEqual([]);
    } finally {
      await browser.close();
      await preview.stop().catch(() => {});
    }
  }, 30_000);
});
