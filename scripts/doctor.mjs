#!/usr/bin/env node
/**
 * Environment check for ai-draw-mcp (Node, mmdc, sharp, preview port, mermaid dist).
 */
import { execFile, exec } from "node:child_process";
import { promisify } from "node:util";
const execAsyncShell = promisify(exec);
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";
import os from "node:os";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

let ok = true;
function pass(msg) { console.log(`✅ ${msg}`); }
function fail(msg) { console.error(`❌ ${msg}`); ok = false; }
function warn(msg) { console.warn(`⚠️  ${msg}`); }
function info(msg) { console.log(`ℹ️  ${msg}`); }

// ── Node.js version ──────────────────────────────────────────────
const nodeMajor = parseInt(process.version.slice(1).split(".")[0], 10);
if (nodeMajor >= 20) pass(`Node.js ${process.version} (>=20)`);
else fail(`Node.js ${process.version} — 需要 >= 20`);

// ── mmdc ─────────────────────────────────────────────────────────
const mmdcWin  = path.join(root, "node_modules", ".bin", "mmdc.cmd");
const mmdcUnix = path.join(root, "node_modules", ".bin", "mmdc");
const mmdc = process.platform === "win32" ? mmdcWin : mmdcUnix;
if (fs.existsSync(mmdc)) pass(`mmdc 存在: ${mmdc}`);
else fail("未找到 mmdc，请在本目录执行 npm install");

try {
  const q = process.platform === "win32" ? `"${mmdc}"` : JSON.stringify(mmdc);
  await execAsyncShell(`${q} --version`, { cwd: root, timeout: 25000 });
  pass("mmdc --version 可执行");

  const probeDir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-draw-doctor-"));
  const input = path.join(probeDir, "input.mmd");
  const output = path.join(probeDir, "output.svg");
  const puppeteerConfig = path.join(probeDir, "puppeteer.json");
  fs.writeFileSync(input, "graph TD\n  A[Doctor] --> B[OK]\n", "utf8");
  try {
    const noSandbox = process.env.MERMAID_CHROME_NO_SANDBOX === "1"
      || process.env.CI === "true"
      || process.env.GITHUB_ACTIONS === "true";
    const configArg = noSandbox ? ` -p ${JSON.stringify(puppeteerConfig)}` : "";
    if (noSandbox) {
      fs.writeFileSync(puppeteerConfig, JSON.stringify({ args: ["--no-sandbox", "--disable-setuid-sandbox"] }), "utf8");
    }
    await execAsyncShell(`${q} -i ${JSON.stringify(input)} -o ${JSON.stringify(output)} -t default --quiet${configArg}`, {
      cwd: root,
      timeout: 60000,
    });
    if (fs.existsSync(output) && fs.statSync(output).size > 0) pass("mmdc 最小 Mermaid 渲染可执行");
    else fail("mmdc 渲染未生成 SVG");
  } finally {
    fs.rmSync(probeDir, { recursive: true, force: true });
  }
} catch (e) {
  try {
    await execAsyncShell("npx -y @mermaid-js/mermaid-cli --version", { cwd: root, timeout: 30000 });
    warn("仅 npx mmdc --version 可用；请安装 Puppeteer Chrome 或设置 PUPPETEER_EXECUTABLE_PATH");
  } catch (e2) {
    fail(`mmdc 执行失败: ${e?.message ?? e}（npx 回退: ${e2?.message ?? e2}）`);
  }
}

// ── dist/index.js ────────────────────────────────────────────────
const distIndex = path.join(root, "dist", "index.js");
if (fs.existsSync(distIndex)) pass("已构建 dist/index.js");
else warn("未找到 dist/index.js — 请运行 npm run build");

// ── Preview port ─────────────────────────────────────────────────
const port = parseInt(process.env.PREVIEW_PORT ?? "3399", 10);
const inUse = await new Promise((resolve) => {
  const s = net.createConnection({ port, host: "127.0.0.1" }, () => { s.end(); resolve(true); });
  s.on("error", () => resolve(false));
});
if (inUse) warn(`端口 ${port} 已被占用（可能 MCP 已在运行）`);
else pass(`端口 ${port} 空闲`);

// ── OUTPUT_DIR ───────────────────────────────────────────────────
const outDir = process.env.OUTPUT_DIR
  ? path.resolve(process.env.OUTPUT_DIR)
  : path.join(root, "output");
try {
  fs.mkdirSync(outDir, { recursive: true });
  const probe = path.join(outDir, ".doctor-write-probe");
  fs.writeFileSync(probe, "ok", "utf-8");
  fs.unlinkSync(probe);
  pass(`OUTPUT_DIR 可写: ${outDir}`);
} catch (e) {
  fail(`OUTPUT_DIR 不可写: ${outDir} — ${e?.message ?? e}`);
}

// ── Mermaid local dist (panel uses mermaid.min.js) ───────────────
const mermaidMin = path.join(root, "node_modules", "mermaid", "dist", "mermaid.min.js");
if (fs.existsSync(mermaidMin))
  pass("Mermaid 本地包可用于预览（离线，不依赖 CDN）");
else
  warn("未找到 mermaid/dist/mermaid.min.js — 请执行 npm install");

// ── Collaboration state directories ──────────────────────────────
const sessionDir = path.join(outDir, ".ai-draw");
if (fs.existsSync(sessionDir)) info(`协作会话目录存在: ${sessionDir}`);
else info("协作会话目录尚未创建（首次启动 MCP 后自动创建）");

// ── MCP config locations hint ────────────────────────────────────
console.log("");
info("MCP 配置文件位置（将 dist/index.js 的绝对路径填入对应文件）：");
const home = os.homedir();
const appData = process.env.APPDATA ?? path.join(home, "AppData", "Roaming");
const configs = [
  ["Cursor",    path.join(home, ".cursor", "mcp.json"),
                "（或项目根 .cursor/mcp.json）"],
  ["VS Code",   "settings.json 中 mcp.servers 字段",
                "（Ctrl+Shift+P → Preferences: Open User Settings (JSON)）"],
  ["Windsurf",  path.join(home, ".codeium", "windsurf", "mcp_config.json"), ""],
  ["Trae",      path.join(home, ".trae", "mcp.json"),                        ""],
  ["Claude Desktop (Win)", path.join(appData, "Claude", "claude_desktop_config.json"), ""],
  ["Claude Desktop (Mac)", path.join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json"), ""],
  ["Zed",       path.join(home, ".config", "zed", "settings.json"),
                "（context_servers 字段）"],
];
for (const [name, p, note] of configs) {
  const exists = typeof p === "string" && fs.existsSync(p);
  console.log(`  ${exists ? "✅" : "  "} ${name}: ${p}${note ? " " + note : ""}`);
}

console.log("");
process.exit(ok ? 0 : 1);
