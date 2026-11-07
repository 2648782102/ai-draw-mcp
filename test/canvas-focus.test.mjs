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
    const panelHtml = await fetch(base).then((response) => response.text());
    const token = panelHtml.match(/const PANEL_TOKEN = "([^"]+)"/)[1];
    const seededNode = scan.graph.nodes.find((node) => node.label === "index.ts") ?? scan.graph.nodes.at(-1);
    const annotationResponse = await fetch(`${base}/api/collab/annotations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-AI-Draw-Token": token },
      body: JSON.stringify({ nodeId: seededNode.id, body: "请解释这个对象与相邻模块的关系，先不要写文件。" }),
    });
    expect(annotationResponse.ok).toBe(true);
    const messageResponse = await fetch(`${base}/api/collab/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-AI-Draw-Token": token },
      body: JSON.stringify({ body: "请沿真实边检查这个对象的上下文，先不要写项目文件。", author: "human" }),
    });
    expect(messageResponse.ok).toBe(true);

    const tokenHeaders = { "Content-Type": "application/json", "X-AI-Draw-Token": token };
    const sessionBeforeHover = await fetch(`${base}/api/collab/session`, { headers: tokenHeaders }).then((response) => response.json());

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
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.querySelector("#collabShell").hidden, { timeout: 5000 });
      await page.keyboard.press("3");
      await page.waitForFunction(() => document.querySelector("#workspace").dataset.view === "canvas");
      const focusRingBeforeHover = await page.$eval("#canvasFocusRing", (element) => element.dataset.focusNodeId);

      const nodes = await page.evaluate(() => {
        const groups = [...document.querySelectorAll("#diagramRender svg g.nodes > g.node")];
        return groups.map((group) => {
          const rect = group.querySelector("rect.basic.label-container, rect, polygon, path, ellipse, circle").getBoundingClientRect();
          return { label: group.textContent.replace(/\s+/g, " ").trim(), x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        });
      });
      expect(nodes.length).toBeGreaterThan(1);
      const target = nodes.find((node) => node.label === seededNode.label) ?? nodes.at(-1);
      expect(target).toBeTruthy();

      await page.mouse.move(target.x, target.y);
      await page.waitForFunction(() => document.querySelector("#canvasHoverCard").dataset.visible === "true", { timeout: 10000 });
      const hover = await page.evaluate((label) => {
        const card = document.querySelector("#canvasHoverCard");
        const wrapRect = document.querySelector("#previewWrap").getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const group = [...document.querySelectorAll("#diagramRender svg g.nodes > g.node")]
          .find((element) => element.textContent.replace(/\s+/g, " ").trim() === label);
        const shapeRect = group?.querySelector("rect.basic.label-container, rect, polygon, path, ellipse, circle")?.getBoundingClientRect();
        return {
          label: document.querySelector("#canvasHoverLabel").textContent,
          path: document.querySelector("#canvasHoverPath").textContent,
          focus: document.querySelector("#canvasHoverFocus").textContent,
          focusHint: document.querySelector("#canvasHoverCard").dataset.focusHint,
          related: document.querySelector("#canvasHoverRelated").textContent,
          evidence: document.querySelector("#canvasHoverEvidence").textContent,
          open: document.querySelector("#canvasHoverOpen").textContent,
          note: document.querySelector(".canvas-hover-note").textContent,
          trace: document.querySelector("#canvasHoverTrace").textContent,
          visible: card.dataset.visible,
          nodeId: card.dataset.nodeId,
          selectedNodeId: document.querySelector("#canvasFocusRing").dataset.focusNodeId,
          inCanvas: cardRect.left >= wrapRect.left - 1 && cardRect.right <= wrapRect.right + 1
            && cardRect.top >= wrapRect.top - 1 && cardRect.bottom <= wrapRect.bottom + 1,
          nearShape: Boolean(shapeRect) && Math.abs(cardRect.left + cardRect.width / 2 - (shapeRect.left + shapeRect.width / 2)) < 160,
          hoveredNodes: document.querySelectorAll("#diagramRender svg .node.is-hovered").length,
          relatedNodes: document.querySelectorAll("#diagramRender svg .node.is-related").length,
          highlightedEdges: document.querySelectorAll("#diagramRender svg .flowchart-link.is-hover-path").length,
        };
      }, target.label);
      expect(hover.visible).toBe("true");
      expect(hover.label).toBe(target.label);
      expect(hover.path).toContain("src/index.ts");
      expect(hover.focus).toContain("Enter 聚焦");
      expect(hover.note).toContain("悬停只预览");
      expect(hover.focusHint).toContain("Enter");
      expect(Number(hover.related)).toBeGreaterThan(0);
      expect(Number(hover.evidence)).toBeGreaterThanOrEqual(0);
      expect(Number(hover.open)).toBeGreaterThan(0);
      expect(hover.note).toContain("不批准或写文件");
      expect(hover.trace).toMatch(/已点亮 \d+ 条真实关系|当前无直接关系路径/);
      expect(hover.nodeId).toMatch(/^node_/);
      expect(hover.selectedNodeId).toBe(focusRingBeforeHover);
      expect(hover.inCanvas).toBe(true);
      expect(hover.nearShape).toBe(true);
      expect(hover.hoveredNodes).toBe(1);
      expect(hover.relatedNodes).toBe(Number(hover.related));
      expect(hover.highlightedEdges).toBeGreaterThan(0);
      const sessionAfterHover = await fetch(`${base}/api/collab/session`, { headers: tokenHeaders }).then((response) => response.json());
      expect(sessionAfterHover.focus ?? null).toEqual(sessionBeforeHover.focus ?? null);
      expect(sessionAfterHover.graphRevision).toBe(sessionBeforeHover.graphRevision);
      expect(sessionAfterHover.messages?.length ?? 0).toBe(sessionBeforeHover.messages?.length ?? 0);
      expect(sessionAfterHover.proposals?.length ?? 0).toBe(sessionBeforeHover.proposals?.length ?? 0);
      await page.waitForFunction((focusNodeId) => document.querySelector("#canvasFocusRing").dataset.focusNodeId === focusNodeId, { timeout: 5000 }, focusRingBeforeHover);

      const hoverLeftBeforeZoom = await page.$eval("#canvasHoverCard", (element) => element.style.left);
      await page.click("#btnCanvasZoomIn");
      await page.waitForFunction(() => Number(document.querySelector("#canvasZoomLabel").textContent.replace("%", "")) > 90);
      await page.mouse.move(target.x + 1, target.y + 1);
      const hoverAfterZoom = await page.evaluate(() => ({
        visible: document.querySelector("#canvasHoverCard").dataset.visible,
        left: document.querySelector("#canvasHoverCard").style.left,
      }));
      expect(hoverAfterZoom.visible).toBe("true");
      expect(hoverAfterZoom.left).not.toBe(hoverLeftBeforeZoom);

      await page.keyboard.press("p");
      expect(await page.$eval("#canvasHoverCard", (element) => element.dataset.visible)).toBe("false");
      expect(await page.$$eval("#diagramRender svg .node.is-related", (elements) => elements.length)).toBe(0);
      expect(await page.$$eval("#diagramRender svg .flowchart-link.is-hover-path", (elements) => elements.length)).toBe(0);
      expect(await page.$$eval("#diagramRender svg .flowchart-link.is-focus-path", (elements) => elements.length)).toBeGreaterThan(0);
      await page.mouse.move(target.x + 2, target.y + 2);
      expect(await page.$eval("#canvasHoverCard", (element) => element.dataset.visible)).toBe("false");
      const steadyFocusPaths = await page.$$eval("#diagramRender svg .flowchart-link.is-focus-path", (elements) => elements.length);
      expect(steadyFocusPaths).toBeGreaterThan(0);
      expect(await page.$eval("#canvasFrame", (element) => Number(element.dataset.focusPaths))).toBeGreaterThan(0);
      expect(await page.$eval("#canvasRelatedStat", (element) => Number(element.dataset.focusPaths))).toBeGreaterThan(0);
      await page.keyboard.press("p");
      await page.mouse.move(target.x + 3, target.y + 3);
      await page.waitForFunction(() => document.querySelector("#canvasHoverCard").dataset.visible === "true");
      const previewBefore = await page.$eval("#canvasHoverCard", (element) => ({ nodeId: element.dataset.nodeId, label: document.querySelector("#canvasHoverLabel").textContent }));
      await page.keyboard.press("ArrowRight");
      const previewAfter = await page.$eval("#canvasHoverCard", (element) => ({ nodeId: element.dataset.nodeId, label: document.querySelector("#canvasHoverLabel").textContent }));
      expect(previewAfter.nodeId).not.toBe(previewBefore.nodeId);
      expect(previewAfter.label).not.toBe(previewBefore.label);
      expect(await page.$$eval("#diagramRender svg .flowchart-link.is-hover-path", (elements) => elements.length)).toBeGreaterThan(0);
      expect(await page.$eval("#canvasFocusRing", (element) => element.dataset.focusNodeId)).toBe(focusRingBeforeHover);
      await page.keyboard.press("Enter");
      await page.waitForFunction((nodeId) => document.querySelector("#canvasFocusRing").dataset.focusNodeId === nodeId, { timeout: 5000 }, previewAfter.nodeId);
      expect(await page.$eval("#canvasHoverFocus", (element) => element.textContent)).toBe("当前焦点");
      await page.keyboard.press("Escape");
      await page.keyboard.press("0");
      await page.keyboard.press("f");

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
      const focusContext = await page.evaluate(() => {
        const label = document.querySelector("#canvasFocusLabel");
        label.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
        const card = document.querySelector("#canvasFocusContext");
        return {
          hasContext: label.dataset.hasContext,
          visible: card.dataset.visible,
          gradient: getComputedStyle(card).backgroundImage,
          label: document.querySelector("#canvasFocusContextLabel").textContent,
          edges: Number(document.querySelector("#canvasFocusContextEdges").textContent),
          threads: Number(document.querySelector("#canvasFocusContextThreads").textContent),
          foot: document.querySelector(".canvas-focus-context-foot").textContent,
        };
      });
      expect(focusContext.hasContext).toBe("true");
      expect(focusContext.visible).toBe("true");
      expect(focusContext.gradient).toBe("none");
      expect(focusContext.label).toContain(focus.label);
      expect(focusContext.edges).toBeGreaterThan(0);
      expect(focusContext.foot).toContain("不批准提案");
      const sessionBeforeFocusLabel = await fetch(`${base}/api/collab/session`, { headers: tokenHeaders }).then((response) => response.json());
      await page.$eval("#canvasFocusLabel", (element) => element.click());
      await page.waitForFunction(() => !document.querySelector("#collabShell").hidden);
      expect(await page.$eval("#collabShell", (element) => element.dataset.tab)).toBe("dialog");
      expect(await page.$eval('[data-history-pane="chat"]', (element) => element.classList.contains("active"))).toBe(true);
      const sessionAfterFocusLabel = await fetch(`${base}/api/collab/session`, { headers: tokenHeaders }).then((response) => response.json());
      expect(sessionAfterFocusLabel.focus?.nodeId).toBe(sessionBeforeFocusLabel.focus?.nodeId);
      expect(sessionAfterFocusLabel.messages?.length ?? 0).toBe(sessionBeforeFocusLabel.messages?.length ?? 0);
      expect(sessionAfterFocusLabel.graphRevision).toBe(sessionBeforeFocusLabel.graphRevision);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.querySelector("#collabShell").hidden, { timeout: 5000 });

      const objectCard = await page.evaluate(() => ({
        relatedCount: Number(document.querySelector("#canvasRelatedCount").textContent),
        revision: document.querySelector("#canvasFocusRevision").textContent,
        relatedDisabled: document.querySelector("#btnCanvasRelatedNode").disabled,
        ringId: document.querySelector("#canvasFocusRing").dataset.focusNodeId,
        conversationOpen: Number(document.querySelector("#canvasObjectConversation").dataset.openThreads),
        conversationSummary: document.querySelector("#canvasConversationSummary").textContent,
        focusBadge: document.querySelector("#canvasFocusLabel").textContent,
      }));
      expect(objectCard.relatedCount).toBeGreaterThan(0);
      expect(objectCard.revision).toMatch(/^rev \d+$/);
      expect(objectCard.relatedDisabled).toBe(false);
      expect(objectCard.ringId).toBe(focus.ringId);
      expect(objectCard.conversationOpen).toBeGreaterThan(0);
      expect(objectCard.conversationSummary).toContain("开放");
      expect(objectCard.focusBadge).toContain("开放讨论");
      const relationMap = await page.evaluate(() => {
        const map = document.querySelector("#canvasRelationMap");
        const buttons = [...document.querySelectorAll("#canvasRelationNodes button[data-node-id]")];
        return {
          state: map.dataset.state,
          edges: Number(map.dataset.edges),
          inbound: Number(map.dataset.inbound),
          outbound: Number(map.dataset.outbound),
          inboundCount: Number(document.querySelector("#canvasRelationInbound").textContent),
          outboundCount: Number(document.querySelector("#canvasRelationOutbound").textContent),
          inboundBar: document.querySelector("#canvasRelationInboundBar").style.width,
          outboundBar: document.querySelector("#canvasRelationOutboundBar").style.width,
          total: document.querySelector("#canvasRelationTotal").textContent,
          buttons: buttons.length,
          directions: buttons.map((button) => button.dataset.direction),
          nodeIds: buttons.map((button) => button.dataset.nodeId),
          foot: document.querySelector(".canvas-relation-foot").textContent,
        };
      });
      expect(relationMap.state).toBe("active");
      expect(relationMap.edges).toBeGreaterThan(0);
      expect(relationMap.inbound + relationMap.outbound).toBe(relationMap.edges);
      expect(relationMap.inboundCount).toBe(relationMap.inbound);
      expect(relationMap.outboundCount).toBe(relationMap.outbound);
      expect(relationMap.inboundBar).toMatch(/^\d+%$/);
      expect(relationMap.outboundBar).toMatch(/^\d+%$/);
      expect(relationMap.total).toContain(`${relationMap.edges} 条真实连线`);
      expect(relationMap.buttons).toBeGreaterThan(0);
      expect(relationMap.directions.every((direction) => ["inbound", "outbound"].includes(direction))).toBe(true);
      expect(relationMap.nodeIds.every((nodeId) => nodeId.startsWith("node_"))).toBe(true);
      expect(relationMap.foot).toContain("不批准或写文件");
      const handoffStars = await page.evaluate(() => {
        const track = document.querySelector("#handoffDialogTrack");
        const stars = [...track.querySelectorAll(".dialog-star")];
        return {
          visible: getComputedStyle(track).display !== "none",
          stars: stars.length,
          authors: stars.map((star) => star.dataset.author),
          pending: stars.filter((star) => star.dataset.status === "pending").length,
          messageCount: Number(track.dataset.messageCount),
        };
      });
      expect(handoffStars.visible).toBe(true);
      expect(handoffStars.stars).toBeGreaterThan(0);
      expect(handoffStars.authors).toContain("human");
      expect(handoffStars.pending).toBeGreaterThan(0);
      expect(handoffStars.messageCount).toBeGreaterThan(0);
      const sessionBeforeStar = await fetch(`${base}/api/collab/session`, { headers: tokenHeaders }).then((response) => response.json());
      await page.$eval("#handoffDialogTrack .dialog-star", (element) => element.click());
      await page.waitForFunction(() => !document.querySelector("#collabShell").hidden);
      expect(await page.$eval("#collabShell", (element) => element.dataset.tab)).toBe("dialog");
      expect(await page.$eval('[data-history-pane="chat"]', (element) => element.classList.contains("active"))).toBe(true);
      const sessionAfterStar = await fetch(`${base}/api/collab/session`, { headers: tokenHeaders }).then((response) => response.json());
      expect(sessionAfterStar.messages?.length ?? 0).toBe(sessionBeforeStar.messages?.length ?? 0);
      expect(sessionAfterStar.proposals?.length ?? 0).toBe(sessionBeforeStar.proposals?.length ?? 0);
      expect(sessionAfterStar.graphRevision).toBe(sessionBeforeStar.graphRevision);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.querySelector("#collabShell").hidden, { timeout: 5000 });
      const threadBadgeHandle = await page.waitForFunction(() => {
        const badge = document.querySelector("#canvasThreadLayer .canvas-thread-badge");
        if (!badge) return false;
        const group = [...document.querySelectorAll("#diagramRender svg g.nodes > g.node")]
          .find((candidate) => candidate.id.includes(badge.dataset.nodeId));
        const shapeRect = group?.querySelector("rect.basic.label-container, rect, polygon, path, ellipse, circle")?.getBoundingClientRect();
        const aligned = Boolean(shapeRect) && Math.abs(badge.getBoundingClientRect().left - (shapeRect.left - 2)) < 4;
        return aligned ? { state: badge.dataset.state, text: badge.textContent, aligned } : false;
      }, { timeout: 5000 });
      const threadBadge = await threadBadgeHandle.jsonValue();
      expect(threadBadge.state).toBe("open");
      expect(threadBadge.text).toContain("条讨论");
      expect(threadBadge.aligned).toBe(true);

      await page.click("#btnCanvasOpenConversation");
      await page.waitForFunction(() => !document.querySelector("#collabShell").hidden, { timeout: 5000 });
      const conversation = await page.evaluate(() => ({
        tab: document.querySelector("#collabShell").dataset.tab,
        history: document.querySelector('[data-history-pane="annotations"]').classList.contains("active"),
        threads: document.querySelectorAll("#annotationList .annotation-thread").length,
      }));
      expect(conversation.tab).toBe("dialog");
      expect(conversation.history).toBe(true);
      expect(conversation.threads).toBeGreaterThan(0);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.querySelector("#collabShell").hidden, { timeout: 5000 });

      await page.$eval("#btnCanvasOpenConversation", (element) => element.click());
      await page.waitForFunction(() => !document.querySelector("#collabShell").hidden, { timeout: 5000 });
      expect(await page.$eval("#collabShell", (element) => element.dataset.tab)).toBe("dialog");
      expect(await page.$eval('[data-history-pane="annotations"]', (element) => element.classList.contains("active"))).toBe(true);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.querySelector("#collabShell").hidden, { timeout: 5000 });

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

      const relationTarget = await page.evaluate(() => {
        const focusNodeId = document.querySelector("#canvasFocusRing").dataset.focusNodeId;
        const button = [...document.querySelectorAll("#canvasRelationNodes button[data-node-id]")]
          .find((candidate) => candidate.dataset.nodeId !== focusNodeId);
        return button ? { nodeId: button.dataset.nodeId, label: button.querySelector("strong").textContent.trim() } : null;
      });
      expect(relationTarget).toBeTruthy();
      const sessionBeforeRelationClick = await fetch(`${base}/api/collab/session`, { headers: tokenHeaders }).then((response) => response.json());
      await page.evaluate((nodeId) => {
        const button = document.querySelector(`#canvasRelationNodes button[data-node-id="${CSS.escape(nodeId)}"]`);
        if (!button) throw new Error("Relation target disappeared");
        button.click();
      }, relationTarget.nodeId);
      await page.waitForFunction((label) => document.querySelector("#canvasObjectLabel").textContent.trim() === label, { timeout: 5000 }, relationTarget.label);
      expect(await page.$eval("#canvasFocusRing", (element) => element.dataset.focusNodeId)).toBe(relationTarget.nodeId);
      expect(await page.$eval("#canvasRelationMap", (element) => element.dataset.state)).toBe("active");
      const sessionAfterRelationClick = await fetch(`${base}/api/collab/session`, { headers: tokenHeaders }).then((response) => response.json());
      expect(sessionAfterRelationClick.focus?.nodeId).toBe(relationTarget.nodeId);
      expect(sessionAfterRelationClick.graphRevision).toBe(sessionBeforeRelationClick.graphRevision);
      expect(sessionAfterRelationClick.messages?.length ?? 0).toBe(sessionBeforeRelationClick.messages?.length ?? 0);
      expect(sessionAfterRelationClick.proposals?.length ?? 0).toBe(sessionBeforeRelationClick.proposals?.length ?? 0);

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
      await page.waitForFunction(() => {
        const ring = document.querySelector("#canvasFocusRing");
        const group = [...document.querySelectorAll("#diagramRender svg g.nodes > g.node")]
          .find((element) => ring.dataset.focusNodeId && element.id.includes(ring.dataset.focusNodeId));
        const shape = group?.querySelector("rect.basic.label-container, rect, polygon, path, ellipse, circle");
        const shapeRect = shape?.getBoundingClientRect();
        const ringRect = ring.getBoundingClientRect();
        return Boolean(shapeRect) && Math.abs(ringRect.width - (shapeRect.width + 10)) < 2;
      }, { timeout: 5000 });
      expect(pageErrors).toEqual([]);
    } finally {
      await browser.close();
      await preview.stop().catch(() => {});
    }
  }, 60_000);
});
