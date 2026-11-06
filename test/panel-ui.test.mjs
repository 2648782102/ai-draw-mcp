import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const packageRoot = process.cwd();
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-draw-panel-ui-"));
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

async function seedProposalCard(base) {
  const html = await fetch(base).then((response) => response.text());
  const token = html.match(/const PANEL_TOKEN = "([^"]+)"/)?.[1];
  const headers = { "Content-Type": "application/json", "X-AI-Draw-Token": token };
  const proposal = await fetch(`${base}/api/collab/proposals`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: "把 README 改成中文",
      summary: "根据图形批注更新说明，并在卡片里展示完整审阅路径。",
      changes: [
        { kind: "update", path: "README.md", content: "# 演示项目\n\n这是双向协作示例。\n" },
        { kind: "create", path: "docs/ui-preview.md", content: "# 提案卡片预览\n" },
      ],
    }),
  }).then((response) => response.json());
  expect(proposal.id).toBeTruthy();
  expect(proposal.contentHash).toMatch(/^[a-f0-9]{64}$/);
  await fetch(`${base}/api/collab/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ body: "请根据图形更新说明，但不要直接写项目文件。", author: "human" }),
  });
  await fetch(`${base}/api/collab/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ body: "已生成变更提案，等待人工审阅完整逐行差异。", author: "ai" }),
  });
  return { id: proposal.id };
}

const port = await freePort();
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
    await seedProposalCard(base);

    try {
      const page = await browser.newPage();
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.setViewport({ width: 1440, height: 900 });
      await page.goto(base, { waitUntil: "networkidle2" });

      expect(await page.$(".brand-mark")).toBeTruthy();
      expect(await page.$("#btnRender.primary")).toBeTruthy();
      expect(await page.$('.view-switch button[data-view-target="split"].active')).toBeTruthy();
      expect(await page.$eval("#diagramSearch", (element) => element.placeholder)).toContain("搜索图表");
      expect(await page.$eval(".sidebar-empty", (element) => element.textContent)).toContain("还没有图表");
      expect(await page.$eval("#welcomeCard", (element) => element.hidden)).toBe(false);
      const welcome = await page.evaluate(() => ({
        kicker: document.querySelector(".welcome-kicker").textContent,
        title: document.querySelector("#welcomeCard h2").textContent,
        features: [...document.querySelectorAll(".welcome-feature strong")].map((element) => element.textContent),
        nodes: [...document.querySelectorAll(".welcome-node")].map((element) => element.textContent),
        center: document.querySelector(".welcome-flow-center").textContent,
        width: Math.round(document.querySelector("#welcomeCard").getBoundingClientRect().width),
        visualWidth: Math.round(document.querySelector(".welcome-visual").getBoundingClientRect().width),
      }));
      expect(welcome.kicker).toContain("HUMAN ↔ AI");
      expect(welcome.title).toContain("从一张图开始");
      expect(welcome.features).toContain("4 / 5 / 6");
      expect(welcome.nodes.length).toBe(4);
      expect(welcome.center).toContain("共同");
      expect(welcome.width).toBeGreaterThan(520);
      expect(welcome.visualWidth).toBeGreaterThan(180);
      expect(await page.$eval("#minimap", (element) => getComputedStyle(element).display)).toBe("none");

      const diagramsBefore = await fetch(`${base}/api/diagrams`).then((response) => response.json());
      await page.click("#btnLoadExample");
      await page.waitForFunction(() => Boolean(document.querySelector("#diagramRender svg")));
      expect(await page.$eval("#welcomeCard", (element) => element.hidden)).toBe(true);
      expect(await page.$eval("#minimap", (element) => getComputedStyle(element).display)).toBe("block");
      expect(await page.$eval("#diagramCount", (element) => element.textContent)).toBe("0");
      expect(await page.$eval("#diagramTitle", (element) => element.textContent)).toContain("示例");
      const diagramsAfter = await fetch(`${base}/api/diagrams`).then((response) => response.json());
      expect(diagramsAfter.length).toBe(diagramsBefore.length);

      await page.keyboard.press("3");
      expect(await page.$eval("#workspace", (element) => element.dataset.view)).toBe("canvas");
      expect(await page.$eval("#editorPane", (element) => getComputedStyle(element).display)).toBe("none");
      expect(await page.$eval(".canvas-chip", (element) => getComputedStyle(element).display)).toBe("flex");
      await page.keyboard.press("1");
      expect(await page.$eval("#workspace", (element) => element.dataset.view)).toBe("split");

      await page.click("#btnAppearance");
      const appearanceOpen = await page.evaluate(() => ({
        visible: !document.querySelector("#appearancePopover").hidden,
        expanded: document.querySelector("#btnAppearance").getAttribute("aria-expanded"),
        groups: document.querySelectorAll(".appearance-group").length,
        shortcuts: document.querySelectorAll(".appearance-shortcuts kbd").length,
        activeTheme: document.querySelector('[data-ui-theme].active')?.dataset.uiTheme,
      }));
      expect(appearanceOpen).toMatchObject({ visible: true, expanded: "true", groups: 4, shortcuts: 5, activeTheme: "dark" });
      expect(await page.$$eval(".appearance-shortcuts kbd", (elements) => elements.map((element) => element.textContent).join(" "))).toContain("4 / 5 / 6");
      await page.click('[data-ui-theme="light"]');
      expect(await page.$eval("body", (element) => element.classList.contains("theme-light"))).toBe(true);
      await page.click('[data-density="compact"]');
      expect(await page.$eval("body", (element) => element.classList.contains("density-compact"))).toBe(true);
      await page.click('[data-preview-bg="dark"]');
      expect(await page.$eval("#previewWrap", (element) => element.classList.contains("dark-bg"))).toBe(true);
      await page.click('[data-sidebar="collapsed"]');
      expect(await page.$eval("#sidebar", (element) => element.classList.contains("collapsed"))).toBe(true);
      expect(await page.$eval('[data-preview-bg="dark"]', (element) => element.classList.contains("active"))).toBe(true);
      await page.click('[data-ui-theme="dark"]');
      await page.click('[data-density="comfortable"]');
      await page.click('[data-preview-bg="light"]');
      await page.click('[data-sidebar="open"]');
      await page.keyboard.press("Escape");
      expect(await page.$eval("#appearancePopover", (element) => element.hidden)).toBe(true);
      expect(await page.$eval("#btnAppearance", (element) => element.getAttribute("aria-expanded"))).toBe("false");

      await page.keyboard.press("c");
      await page.waitForFunction(() => !document.querySelector("#collabShell").hidden);
      await page.waitForSelector("#overviewRevision");
      await page.waitForSelector(".proposal-card.status-pending");
      const desktop = await page.evaluate(() => ({
        stats: document.querySelectorAll(".overview-stat").length,
        drawers: document.querySelectorAll(".signal-drawer").length,
        docks: document.querySelectorAll(".section-dock").length,
        journeySteps: document.querySelectorAll(".journey-step").length,
        activeJourney: document.querySelector(".journey-step.active")?.dataset.journey,
        proposalBadge: document.querySelector("#journeyProposalCount")?.textContent,
        graphGuide: Boolean(document.querySelector(".graph-guide")),
        proposalCards: document.querySelectorAll(".proposal-card").length,
        scrollWidth: document.body.scrollWidth,
        clientWidth: document.body.clientWidth,
      }));
      expect(desktop).toMatchObject({
        stats: 6,
        drawers: 2,
        docks: 2,
        journeySteps: 4,
        activeJourney: "graph",
        proposalBadge: "1",
        graphGuide: true,
        proposalCards: 1,
        scrollWidth: 1440,
        clientWidth: 1440,
      });
      const journey = await page.evaluate(() => ({
        graphState: document.querySelector('[data-journey="graph"]').dataset.state,
        dialogState: document.querySelector('[data-journey="dialog"]').dataset.state,
        proposalState: document.querySelector('[data-journey="proposals"]').dataset.state,
        reviewState: document.querySelector('[data-journey="review"]').dataset.state,
        reviewHint: document.querySelector('[data-journey-hint="review"]').textContent,
      }));
      expect(journey.dialogState).toBe("ready");
      expect(journey.proposalState).toBe("busy");
      expect(journey.reviewState).toBe("busy");
      expect(journey.reviewHint).toContain("批准前先看完整 diff");
      await page.click('[data-journey="proposals"]');
      expect(await page.$eval("#collabShell", (element) => element.dataset.tab)).toBe("proposals");
      expect(await page.$eval('[data-journey="proposals"]', (element) => element.getAttribute("aria-current"))).toBe("step");
      await page.keyboard.press("4");
      expect(await page.$eval("#collabShell", (element) => element.dataset.tab)).toBe("graph");
      await page.click('[data-journey="dialog"]');
      expect(await page.$eval('[data-journey="dialog"]', (element) => element.classList.contains("active"))).toBe(true);
      await page.$eval('[data-tab-target="dialog"]', (element) => {
        element.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      });
      expect(await page.$eval("#collabShell", (element) => element.dataset.tab)).toBe("proposals");
      await page.click('[data-journey="dialog"]');
      await page.$eval('[data-history-target="chat"]', (element) => {
        element.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      });
      expect(await page.$eval('[data-history-target="activity"]', (element) => element.getAttribute("aria-selected"))).toBe("true");
      await page.$eval('[data-history-target="chat"]', (element) => element.click());
      const proposalCard = await page.evaluate(() => {
        const card = document.querySelector(".proposal-card.status-pending");
        const badge = card.querySelector(".proposal-badge");
        const approve = card.querySelector("[data-approve]");
        return {
          title: card.querySelector("h4").textContent,
          badge: badge.textContent.trim(),
          statusColor: getComputedStyle(badge).color,
          accentColor: getComputedStyle(card).borderLeftColor,
          metrics: [...card.querySelectorAll(".proposal-metric strong")].map((element) => element.textContent),
          facts: [...card.querySelectorAll(".proposal-facts code")].map((element) => element.textContent),
          files: [...card.querySelectorAll(".proposal-files code")].map((element) => element.textContent),
          checklist: card.querySelector(".proposal-checklist").textContent,
          impact: card.querySelector("[data-impact]").textContent,
          diffSummary: card.querySelector(".proposal-diff summary").textContent,
          approveLabel: approve.textContent.trim(),
          approveWeight: getComputedStyle(approve).fontWeight,
          rejectWeight: getComputedStyle(card.querySelector("[data-reject]")).fontWeight,
          rejectLabel: card.querySelector("[data-reject]").textContent.trim(),
        };
      });
      expect(proposalCard.title).toContain("把 README 改成中文");
      expect(proposalCard.badge).toContain("待人工审阅");
      expect(proposalCard.statusColor).toBe(proposalCard.accentColor);
      expect(proposalCard.metrics).toEqual(["rev 0", "2 个文件 / 路径"]);
      expect(proposalCard.facts.join(" ")).toContain("SHA-256");
      expect(proposalCard.files.join(" ")).toContain("README.md");
      expect(proposalCard.files.join(" ")).toContain("docs/ui-preview.md");
      expect(proposalCard.checklist).toContain("批准前检查");
      expect(proposalCard.checklist).toContain("一次性确认号");
      expect(proposalCard.impact).toContain("影响摘要 · 2 个路径");
      expect(proposalCard.impact).toContain("安全路径");
      expect(proposalCard.impact).toContain("内容大小");
      expect(proposalCard.diffSummary).toContain("查看完整逐行差异");
      expect(proposalCard.diffSummary).toContain("只读");
      expect(proposalCard.approveLabel).toContain("批准并签发确认号");
      expect(Number(proposalCard.approveWeight)).toBeGreaterThan(Number(proposalCard.rejectWeight));
      expect(proposalCard.rejectLabel).toContain("拒绝提案");
      await page.$eval(".proposal-diff", (element) => { element.open = true; });
      await page.waitForFunction(() => document.querySelector(".proposal-diff.loaded"));
      expect(await page.$eval(".proposal-diff.loaded pre", (element) => element.textContent)).toContain("演示项目");
      expect(await page.$eval(".proposal-diff.loaded summary", (element) => element.textContent)).toContain("✓");
      expect(await page.$eval("#collabHealth", (element) => element.className)).toContain("health-card");
      expect(await page.$eval("#healthProgressLabel", (element) => element.textContent)).toMatch(/\/ 4 步/);
      expect(await page.$eval(".graph-guide", (element) => element.textContent)).toContain("先生成一张项目结构图");
      expect(await page.$eval(".graph-row-header", (element) => getComputedStyle(element).position)).toBe("sticky");
      const chat = await page.evaluate(() => ({
        bubbles: document.querySelectorAll("#chatLog .chat-item").length,
        authors: [...document.querySelectorAll("#chatLog .chat-item")].map((element) => element.querySelector(".chat-meta strong")?.textContent),
        statuses: [...document.querySelectorAll("#chatLog .chat-item")].map((element) => element.querySelector(".chat-status")?.textContent),
        times: [...document.querySelectorAll("#chatLog time")].map((element) => element.textContent),
        avatars: document.querySelectorAll("#chatLog .chat-avatar").length,
        pendingTab: document.querySelector('[data-history-target="chat"]').dataset.hasPending,
        chatCount: document.querySelector('[data-history-count="chat"]').textContent,
        systemAvatar: document.querySelectorAll("#chatLog .chat-item.system .chat-avatar").length,
        evidenceItems: document.querySelectorAll(".evidence-item").length,
      }));
      expect(chat.bubbles).toBe(3);
      expect(chat.authors).toEqual(["人", "人", "AI"]);
      expect(chat.statuses).toEqual(["等待 AI", "等待 AI", "已回复"]);
      expect(chat.times.every((time) => time.includes("刚刚"))).toBe(true);
      expect(chat.avatars).toBe(3);
      expect(chat.pendingTab).toBe("true");
      expect(chat.chatCount).toBe("3");
      expect(chat.systemAvatar).toBe(0);
      expect(chat.evidenceItems).toBe(0);
      expect(await page.$eval('[data-history-count="activity"]', (element) => Number(element.textContent))).toBeGreaterThan(0);
      await page.click("#btnAddNode");
      await page.waitForSelector("#graphEditor .graph-row.is-dirty");
      const stableDirtyRows = await page.evaluate(() => {
        const rows = [...document.querySelectorAll("#graphEditor .graph-row")];
        const dirty = rows.filter((row) => row.classList.contains("is-dirty"));
        const label = document.querySelector("#graphEditor .node-label");
        label.value = "稳定 ID 回归";
        label.dispatchEvent(new Event("input", { bubbles: true }));
        return {
          firstId: dirty[0]?.dataset.nodeId,
          dirtyRows: document.querySelectorAll("#graphEditor .graph-row.is-dirty").length,
          badge: document.querySelector("#graphDirtyCount").textContent,
        };
      });
      expect(stableDirtyRows.firstId).toBeTruthy();
      expect(stableDirtyRows.dirtyRows).toBe(1);
      expect(stableDirtyRows.badge).toBe("1");
      await page.$eval("#graphEditor .node-label", (element) => {
        element.value = "人工编辑模块";
        element.dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(await page.$eval("#graphDirtyHint", (element) => element.hidden)).toBe(false);
      expect(await page.$eval("#graphDirtyCount", (element) => element.textContent)).toBe("1");
      await page.click("#btnSaveGraph");
      await page.waitForFunction(() => document.querySelector("#graphDirtyHint").hidden);
      expect(await page.$eval("#btnSaveGraph", (element) => element.classList.contains("has-dirty"))).toBe(false);
      expect(await page.$eval("#graphDirtyCount", (element) => element.hidden)).toBe(true);
      expect(await page.$$eval(".history-tab", (elements) => elements.length)).toBe(4);
      await page.$eval('[data-history-target="diffs"]', (element) => element.click());
      await page.waitForFunction(() => document.querySelector('[data-history-pane="diffs"]').classList.contains("active"));
      expect(await page.$eval('[data-history-target="diffs"]', (element) => element.classList.contains("active"))).toBe(true);
      expect(await page.$eval('[data-history-target="diffs"]', (element) => element.getAttribute("aria-selected"))).toBe("true");
      expect(await page.$eval('[data-history-pane="diffs"]', (element) => element.getAttribute("role"))).toBe("tabpanel");
      expect(await page.$eval('[data-history-pane="diffs"] #graphDiffSummary', (element) => element.textContent)).toContain("图形修订差异");
      expect(await page.$eval('[data-history-pane="diffs"] .graph-diff-list details', (element) => element.textContent)).toContain("人工编辑模块");
      await page.$eval('[data-history-target="annotations"]', (element) => element.click());
      expect(await page.$eval('[data-history-pane="annotations"] .history-empty', (element) => element.textContent)).toContain("还没有图形批注");
      await page.$eval('[data-history-target="activity"]', (element) => element.click());
      expect(await page.$$eval('[data-history-pane="activity"] .activity-item', (elements) => elements.length)).toBeGreaterThan(0);
      await page.$eval('[data-history-target="chat"]', (element) => element.click());

      await page.click("#btnGraphMore");
      expect(await page.$eval("#graphMoreActions", (element) => element.classList.contains("open"))).toBe(true);
      await page.$eval("#messageInput", (element) => {
        element.value = "前端交互回归";
        element.dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(await page.$eval("#messageCount", (element) => element.textContent)).toBe("6 / 2000");
      expect(await page.$eval(".safety-note", (element) => element.textContent)).toContain("写入闸门");

      page.once("dialog", async (dialog) => dialog.accept());
      await page.click(".proposal-card.status-pending [data-approve]");
      await page.waitForFunction(() => !document.querySelector("#receiptBackdrop").hidden);
      const receipt = await page.evaluate(() => ({
        title: document.querySelector("#receiptTitle").textContent,
        fields: [...document.querySelectorAll("#receiptGrid label")].map((element) => element.textContent),
        values: [...document.querySelectorAll(".receipt-value")].map((element) => element.textContent),
        warning: document.querySelector(".receipt-warning").textContent,
        expires: document.querySelector("#receiptExpires").textContent,
        buttons: [...document.querySelectorAll(".receipt-actions button")].map((element) => element.textContent.trim()),
      }));
      expect(receipt.title).toContain("一次性确认号已签发");
      expect(receipt.fields).toEqual(["提案 ID", "批准 ID", "确认号", "有效期至"]);
      expect(receipt.values.every(Boolean)).toBe(true);
      expect(receipt.warning).toContain("apply_visual_proposal");
      expect(receipt.expires).toContain("有效期约 10 分钟");
      expect(receipt.buttons[0]).toContain("复制完整确认号");
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.querySelector("#receiptBackdrop").hidden);

      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.querySelector("#collabShell").hidden);

      await page.setViewport({ width: 820, height: 820 });
      await page.keyboard.press("c");
      await page.waitForFunction(() => !document.querySelector("#collabShell").hidden);
      await page.click('[data-tab-target="dialog"]');
      const mobile = await page.evaluate(() => ({
        activeTab: document.querySelector("#collabShell").dataset.tab,
        selectedTab: document.querySelector('[data-tab-target="dialog"]').getAttribute("aria-selected"),
        panelRole: document.querySelector("#collabSectionDialog").getAttribute("role"),
        visibleSections: [...document.querySelectorAll(".collab-section")]
          .filter((section) => getComputedStyle(section).display !== "none").length,
        scrollWidth: document.body.scrollWidth,
        clientWidth: document.body.clientWidth,
      }));
      expect(mobile).toMatchObject({
        activeTab: "dialog",
        selectedTab: "true",
        panelRole: "tabpanel",
        visibleSections: 1,
        scrollWidth: 820,
        clientWidth: 820,
      });
      await page.setViewport({ width: 560, height: 820 });
      const compact = await page.evaluate(() => ({
        headerHeight: document.querySelector(".header").getBoundingClientRect().height,
        themeHidden: getComputedStyle(document.querySelector("#selTheme")).display === "none",
        sidebarHidden: getComputedStyle(document.querySelector("#btnToggleSidebar")).display === "none",
        scrollWidth: document.body.scrollWidth,
        clientWidth: document.body.clientWidth,
      }));
      expect(compact).toMatchObject({
        headerHeight: 50,
        themeHidden: true,
        sidebarHidden: true,
        scrollWidth: 560,
        clientWidth: 560,
      });
      expect(pageErrors).toEqual([]);
    } finally {
      await browser.close();
      await preview.stop().catch(() => {});
    }
  }, 30_000);
});
