#!/usr/bin/env node
/**
 * Environment check for ai-draw-mcp (Node, mmdc, sharp, preview port).
 */
import { execFile, exec } from "node:child_process";
import { promisify } from "node:util";
const execAsyncShell = promisify(exec);
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

let ok = true;
function pass(msg) {
  console.log(`✅ ${msg}`);
}
function fail(msg) {
  console.error(`❌ ${msg}`);
  ok = false;
}
function warn(msg) {
  console.warn(`⚠️  ${msg}`);
}

const nodeMajor = parseInt(process.version.slice(1).split(".")[0], 10);
if (nodeMajor >= 20) pass(`Node.js ${process.version} (>=20)`);
else fail(`Node.js ${process.version} — 需要 >= 20`);

const mmdcWin = path.join(root, "node_modules", ".bin", "mmdc.cmd");
const mmdcUnix = path.join(root, "node_modules", ".bin", "mmdc");
const mmdc = process.platform === "win32" ? mmdcWin : mmdcUnix;
if (fs.existsSync(mmdc)) pass(`mmdc 存在: ${mmdc}`);
else fail("未找到 mmdc，请在本目录执行 npm install");

try {
  const q = process.platform === "win32" ? `"${mmdc}"` : JSON.stringify(mmdc);
  await execAsyncShell(`${q} --version`, { cwd: root, timeout: 25000 });
  pass("mmdc --version 可执行");
} catch (e) {
  try {
    await execAsyncShell("npx -y @mermaid-js/mermaid-cli --version", { cwd: root, timeout: 30000 });
    pass("mmdc 通过 npx 可执行");
  } catch (e2) {
    fail(`mmdc 执行失败: ${e?.message ?? e}（npx 回退: ${e2?.message ?? e2}）`);
  }
}

const distIndex = path.join(root, "dist", "index.js");
if (fs.existsSync(distIndex)) pass("已构建 dist/index.js");
else warn("未找到 dist/index.js — 请运行 npm run build");

const port = parseInt(process.env.PREVIEW_PORT ?? "3399", 10);
const inUse = await new Promise((resolve) => {
  const s = net.createConnection({ port, host: "127.0.0.1" }, () => {
    s.end();
    resolve(true);
  });
  s.on("error", () => resolve(false));
});
if (inUse) warn(`端口 ${port} 已被占用（可能 MCP 已在运行）`);
else pass(`端口 ${port} 空闲`);

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

const mermaidDist = path.join(root, "node_modules", "mermaid", "dist");
if (fs.existsSync(path.join(mermaidDist, "mermaid.core.mjs")))
  pass("Mermaid 本地包可用于预览（离线，不依赖 CDN）");
else warn("未找到 mermaid/dist/mermaid.core.mjs — npm install 后应存在");

console.log("");
process.exit(ok ? 0 : 1);
