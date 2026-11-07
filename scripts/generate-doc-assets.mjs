#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "docs");
const checkOnly = process.argv.includes("--check");

const escapeXml = (value) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rect = (left, top, width, height, fillColor, strokeColor = "#2b3a55") =>
  `<rect x="${left}" y="${top}" width="${width}" height="${height}" rx="12" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.5"/>`;
const label = (left, top, text, fontSize = 15, textColor = "#e8eef9", fontWeight = "600", textAnchor = "middle") =>
  `<text x="${left}" y="${top}" fill="${textColor}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" text-anchor="${textAnchor}">${escapeXml(text)}</text>`;
const arrow = (fromX, fromY, toX, toY, strokeColor = "#7aa2f7") =>
  `<path d="M ${fromX} ${fromY} C ${fromX + 45} ${fromY}, ${toX - 45} ${toY}, ${toX} ${toY}" fill="none" stroke="${strokeColor}" stroke-width="2.5" marker-end="url(#arrow)"/>`;
const defs = `<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#7aa2f7"/>
  </marker>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d1321"/><stop offset="1" stop-color="#17243c"/></linearGradient>
</defs>`;

const loopDiagram = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="520" viewBox="0 0 1200 520" role="img" aria-labelledby="title desc">
<title id="title">AI Draw MCP 人类与 AI 共享项目画布</title>
<desc id="desc">AI 通过 MCP 扫描项目并展示项目图，人类在同一画布编辑结构、选择范围和添加对象批注，AI 读取并回应。代码变更仍须完整 diff、人工批准和一次性确认号。</desc>
${defs}
<rect width="1200" height="520" fill="url(#bg)"/>
${label(600, 54, "AI Draw MCP · 人类与 AI 共享的项目画布", 26, "#ffffff", "700")}
${label(600, 84, "本机优先 · 共享图形上下文 · MCP 接入 · 人工批准", 14, "#93a4c3", "400")}
${rect(60, 135, 200, 92, "#162842")}${label(160, 170, "AI", 20, "#7aa2f7")}${label(160, 198, "scan_project", 14, "#d8e2f5")}
${rect(310, 135, 200, 92, "#162842")}${label(410, 170, "共享项目图", 18, "#ffffff")}${label(410, 198, "结构 · 证据 · 修订", 13, "#93a4c3", "400")}
${rect(560, 135, 200, 92, "#213252")}${label(660, 170, "人类", 18, "#9ece6a")}${label(660, 198, "编辑 · 选择 · 对象批注", 13, "#d8e2f5")}
${rect(810, 135, 200, 92, "#162842")}${label(910, 170, "AI", 20, "#7aa2f7")}${label(910, 198, "读取 · 解释 · 更新", 13, "#d8e2f5")}
${rect(310, 330, 200, 92, "#2b2350")}${label(410, 365, "变更提案", 18, "#bb9af7")}${label(410, 393, "逐行 diff + 影响摘要", 12, "#d8e2f5")}
${rect(560, 330, 200, 92, "#203b32")}${label(660, 365, "人类批准", 18, "#9ece6a")}${label(660, 393, "一次性确认号", 13, "#d8e2f5")}
${rect(810, 330, 200, 92, "#162842")}${label(910, 365, "AI", 20, "#7aa2f7")}${label(910, 393, "apply_visual_proposal", 12, "#d8e2f5")}
${arrow(260, 181, 310, 181)}${arrow(510, 181, 560, 181)}${arrow(760, 181, 810, 181)}
${arrow(910, 227, 910, 285)}${arrow(810, 330, 760, 330)}${arrow(560, 330, 510, 330)}${arrow(310, 330, 260, 330)}
${arrow(160, 330, 160, 227)}
${label(600, 478, "画布沟通 ≠ 项目写入授权 · 完整 diff 与人工批准后才可应用提案", 13, "#f0a868", "500")}
</svg>`;

const workbenchDiagram = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="620" viewBox="0 0 1200 620" role="img" aria-labelledby="title desc">
<title id="title">AI 与人类共享项目画布的交互方向</title>
<desc id="desc">目标工作区以项目图为中心。选择图形对象后，旁边显示来源证据、人类意图、AI 回应和关联提案；代码写入仍需人工批准。</desc>
${defs}
<rect width="1200" height="620" fill="url(#bg)"/>
<rect x="24" y="24" width="1152" height="572" rx="16" fill="#111a2c" stroke="#2b3a55" stroke-width="1.5"/>
<rect x="24" y="24" width="1152" height="48" rx="16" fill="#18243a"/>
${label(48, 54, "共享项目画布", 17, "#ffffff", "700", "start")}
${label(250, 54, "AI 项目理解 ↔ 人类意图 · 同会话可追溯", 12, "#93a4c3", "400", "start")}
${label(1148, 54, "本机项目 · rev 8", 12, "#d8e2f5", "600", "end")}
<rect x="40" y="88" width="760" height="492" rx="10" fill="#0e1727" stroke="#2b3a55"/>
${label(60, 116, "项目结构", 13, "#ffffff", "600", "start")}
${rect(100, 160, 190, 58, "#1d3152")}${label(195, 194, "src / tools", 14, "#d8e2f5")}
${rect(430, 160, 190, 58, "#213252", "#7aa2f7")}${label(525, 194, "src / domain", 14, "#ffffff")}
${rect(260, 320, 190, 58, "#1d3152")}${label(355, 354, "src / infra", 14, "#d8e2f5")}
<path d="M 290 190 C 340 190 365 190 430 190" stroke="#7aa2f7" stroke-width="2" fill="none"/>
<path d="M 525 218 C 525 275 430 285 390 320" stroke="#7aa2f7" stroke-width="2" fill="none"/>
${rect(476, 238, 285, 58, "#203b32")}${label(494, 261, "人 · 这个模块负责会话状态校验", 11, "#d8e2f5", "500", "start")}${label(494, 282, "绑定到 src / domain · rev 8", 10, "#9ece6a", "400", "start")}
${label(60, 540, "点击对象查看证据并补充意图；图形变化保留为新修订", 11, "#93a4c3", "400", "start")}
<rect x="816" y="88" width="344" height="492" rx="10" fill="#0e1727" stroke="#2b3a55"/>
<rect x="816" y="88" width="344" height="38" rx="10" fill="#17243a"/>
${label(836, 112, "src / domain", 14, "#ffffff", "600", "start")}
${label(836, 151, "源码证据", 11, "#93a4c3", "600", "start")}
${rect(836, 162, 304, 42, "#17243a")}${label(850, 188, "src/domain/session-store.ts · line 42", 10, "#d8e2f5", "400", "start")}
${label(836, 228, "围绕此对象", 11, "#93a4c3", "600", "start")}
${rect(836, 239, 304, 78, "#203b32")}${label(850, 262, "人 · 这个模块负责会话状态校验", 11, "#9ece6a", "500", "start")}${label(850, 286, "请保留批准前的提案校验。", 12, "#ffffff", "500", "start")}${label(850, 306, "选中 src / domain · rev 8", 10, "#93a4c3", "400", "start")}
${rect(836, 326, 304, 78, "#213252")}${label(850, 349, "AI · 已读取并回应", 11, "#7aa2f7", "500", "start")}${label(850, 373, "我会保留此边界，并检查关联调用。", 11, "#ffffff", "500", "start")}${label(850, 393, "关联 2 个节点 · 1 条源码证据", 10, "#93a4c3", "400", "start")}
${rect(836, 412, 304, 32, "#243247")}${label(850, 433, "继续回复此线程 · 人类可继续沟通", 11, "#9ece6a", "500", "start")}
${rect(836, 454, 304, 76, "#1d2f4c")}${label(850, 477, "相关提案 · 2 个文件", 11, "#ffffff", "600", "start")}${label(850, 500, "查看完整 diff 与影响摘要", 11, "#d8e2f5", "400", "start")}${label(850, 522, "人类批准后才可应用", 10, "#f0a868", "500", "start")}
${label(836, 556, "交流与批注不会授权项目写入", 10, "#93a4c3", "400", "start")}
</svg>`;

const assets = [
  { filename: "collaboration-loop.svg", content: loopDiagram },
  { filename: "collaboration-workbench.svg", content: workbenchDiagram },
];
let hasDrift = false;

for (const asset of assets) {
  const assetPath = path.join(outputDir, asset.filename);
  if (checkOnly) {
    let existing = null;
    try {
      existing = await fs.readFile(assetPath, "utf8");
    } catch {
      existing = null;
    }
    if (existing !== asset.content) {
      console.error(`❌ docs/${asset.filename} is out of date; run npm run docs:assets`);
      hasDrift = true;
    }
  } else {
    await fs.writeFile(assetPath, asset.content, "utf8");
  }
}

if (checkOnly && hasDrift) process.exit(1);
if (!checkOnly) console.log("✅ Wrote docs/collaboration-loop.svg and docs/collaboration-workbench.svg");
else console.log("✅ Documentation SVG assets are reproducible");
