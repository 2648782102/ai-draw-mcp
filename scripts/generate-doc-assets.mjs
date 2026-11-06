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
<title id="title">AI Draw MCP 结构化上下文工具链</title>
<desc id="desc">AI 通过 MCP 工具扫描项目并生成结构化上下文，人做轻量纠错或审阅提案，AI 读取上下文并凭人工凭据安全写入，再次扫描保持图与代码一致。</desc>
${defs}
<rect width="1200" height="520" fill="url(#bg)"/>
${label(600, 54, "AI Draw MCP · AI 可调用的结构化上下文工具链", 26, "#ffffff", "700")}
${label(600, 84, "本地优先 · MCP stdio · 一次性人工批准 · 失败自动回滚", 14, "#93a4c3", "400")}
${rect(60, 135, 200, 92, "#162842")}${label(160, 170, "AI", 20, "#7aa2f7")}${label(160, 198, "scan_project", 14, "#d8e2f5")}
${rect(310, 135, 200, 92, "#162842")}${label(410, 170, "项目结构图", 18, "#ffffff")}${label(410, 198, "VisualGraph", 13, "#93a4c3", "400")}
${rect(560, 135, 200, 92, "#213252")}${label(660, 170, "人 · 薄辅助层", 18, "#9ece6a")}${label(660, 198, "纠错 / 上下文信号", 13, "#d8e2f5")}
${rect(810, 135, 200, 92, "#162842")}${label(910, 170, "AI", 20, "#7aa2f7")}${label(910, 198, "get_visual_context", 13, "#d8e2f5")}
${rect(310, 330, 200, 92, "#2b2350")}${label(410, 365, "变更提案", 18, "#bb9af7")}${label(410, 393, "逐行 diff + 影响摘要", 12, "#d8e2f5")}
${rect(560, 330, 200, 92, "#203b32")}${label(660, 365, "人类批准", 18, "#9ece6a")}${label(660, 393, "一次性确认号", 13, "#d8e2f5")}
${rect(810, 330, 200, 92, "#162842")}${label(910, 365, "AI", 20, "#7aa2f7")}${label(910, 393, "apply_visual_proposal", 12, "#d8e2f5")}
${arrow(260, 181, 310, 181)}${arrow(510, 181, 560, 181)}${arrow(760, 181, 810, 181)}
${arrow(910, 227, 910, 285)}${arrow(810, 330, 760, 330)}${arrow(560, 330, 510, 330)}${arrow(310, 330, 260, 330)}
${arrow(160, 330, 160, 227)}
${label(1010, 180, "读取机器可读上下文投影", 14, "#93a4c3", "400", "start")}
${label(1010, 370, "SHA-256 内容哈希", 14, "#93a4c3", "400", "start")}
${label(1010, 395, "路径安全 / 原子写入 / 回滚", 13, "#93a4c3", "400", "start")}
${label(600, 478, "解决批注线程 ≠ 批准变更 · 时间线只是只读派生视图 · 项目写入始终需要人类确认号", 13, "#f0a868", "500")}
</svg>`;

const workbenchDiagram = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="620" viewBox="0 0 1200 620" role="img" aria-labelledby="title desc">
<title id="title">上下文审阅台概念预览</title>
<desc id="desc">三栏工作台：项目图节点编辑、活动时间线与节点批注线程、变更提案与人工批准。</desc>
${defs}
<rect width="1200" height="620" fill="url(#bg)"/>
<rect x="24" y="24" width="1152" height="572" rx="16" fill="#111a2c" stroke="#2b3a55" stroke-width="1.5"/>
<rect x="24" y="24" width="1152" height="48" rx="16" fill="#18243a"/>
${label(48, 54, "上下文审阅台", 17, "#ffffff", "700", "start")}
${label(260, 54, "session · revision · workspace", 12, "#93a4c3", "400", "start")}
${label(1148, 54, "💬 协作", 13, "#d8e2f5", "600", "end")}
<rect x="40" y="88" width="360" height="492" rx="10" fill="#0e1727" stroke="#2b3a55"/>
<rect x="40" y="88" width="360" height="34" rx="10" fill="#17243a"/>
${label(58, 110, "项目图 · 节点编辑", 13, "#ffffff", "600", "start")}
${rect(58, 138, 150, 48, "#1d3152")}${label(133, 168, "src / tools", 13, "#d8e2f5")}
${rect(238, 138, 145, 48, "#1d3152")}${label(310, 168, "src / domain", 13, "#d8e2f5")}
${rect(148, 220, 150, 48, "#203b32")}${label(223, 250, "shared / 公共层", 12, "#d8e2f5")}
<path d="M 133 186 L 223 220" stroke="#7aa2f7" stroke-width="2" fill="none"/>
<path d="M 310 186 L 223 220" stroke="#7aa2f7" stroke-width="2" fill="none"/>
${label(58, 310, "+ 节点   + 连线   保存图形", 12, "#93a4c3", "400", "start")}
${label(58, 345, "选中节点后批注会绑定到它", 12, "#93a4c3", "400", "start")}
${label(58, 380, "图形修订通过 WebSocket 同步", 12, "#93a4c3", "400", "start")}
<rect x="416" y="88" width="360" height="492" rx="10" fill="#0e1727" stroke="#2b3a55"/>
<rect x="416" y="88" width="360" height="34" rx="10" fill="#17243a"/>
${label(434, 110, "时间线 · 上下文信号 · 批注", 13, "#ffffff", "600", "start")}
${label(434, 144, "活动时间线 · 12 个派生事件 · 下一棒 AI", 11, "#f0a868", "500", "start")}
${rect(434, 158, 324, 42, "#17243a")}${label(452, 184, "批注 → 回复 → 提案 → 批准 → 应用", 12, "#d8e2f5", "500", "start")}
${rect(434, 212, 324, 42, "#17243a")}${label(452, 238, "消息 / 线程状态 / 提案生命周期", 11, "#93a4c3", "400", "start")}
${rect(434, 278, 324, 96, "#213252")}${label(452, 304, "@ shared · 待讨论 · 等待 AI 回复", 11, "#9ece6a", "500", "start")}
${label(452, 330, "把 utils 抽成公共层", 13, "#ffffff", "600", "start")}
${label(452, 354, "AI：我会在提案里更新 import", 11, "#93a4c3", "400", "start")}
${label(452, 392, "回复这条批注，AI 会读取…", 11, "#93a4c3", "400", "start")}
${label(434, 442, "解决 / 重开只是对话状态", 11, "#f0a868", "500", "start")}
${label(434, 466, "不等于批准变更", 11, "#f0a868", "500", "start")}
<rect x="792" y="88" width="368" height="492" rx="10" fill="#0e1727" stroke="#2b3a55"/>
<rect x="792" y="88" width="368" height="34" rx="10" fill="#17243a"/>
${label(810, 110, "变更提案 · 人工确认", 13, "#ffffff", "600", "start")}
${rect(810, 138, 332, 74, "#1d2f4c")}${label(828, 164, "提案：目录迁移与 import 更新", 13, "#ffffff", "600", "start")}
${label(828, 188, "rev 4 · hash 8f3c… · 2 files", 11, "#93a4c3", "400", "start")}
${rect(810, 226, 332, 54, "#17243a")}${label(828, 258, "2 files · +18 / −4 lines · safe paths only", 11, "#9ece6a", "500", "start")}
${rect(810, 294, 332, 126, "#111c30")}${label(828, 320, "查看逐行差异", 12, "#d8e2f5", "600", "start")}
${label(828, 348, '- import { x } from "../utils"', 11, "#ff9b95", "400", "start")}
${label(828, 372, '+ import { x } from "../shared"', 11, "#9be29f", "400", "start")}
${label(828, 400, "批准只签发一次性凭据，不写文件", 11, "#f0a868", "500", "start")}
${rect(828, 442, 140, 38, "#203b32")}${label(898, 466, "批准", 13, "#9ece6a")}
${rect(986, 442, 140, 38, "#3a2028")}${label(1056, 466, "拒绝", 13, "#ff9b95")}
${label(810, 520, "确认号 → apply_visual_proposal", 11, "#93a4c3", "400", "start")}
${label(810, 546, "失败自动回滚", 11, "#93a4c3", "400", "start")}
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
