/**
 * infra/ide-opener.ts
 *
 * Opens the local preview URL inside the running IDE (Simple Browser tab).
 * Strategy: vscode:// URI (via AI Draw extension) → IDE binary --open-url → system open.
 * Only auto-opens once per process; pass force=true to override.
 */

import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import path from "node:path";
import { logger } from "./logger.js";
import { loadConfig } from "./config.js";

const execFileAsync = promisify(execFile);

type IDE = "cursor" | "vscode" | "trae" | "unknown";

let detectedIDE: IDE | null = null;
let panelOpened = false;

function findIdeExecutable(ide: IDE): string | null {
  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA;
    if (!local) return null;
    const paths: Partial<Record<IDE, string>> = {
      cursor: path.join(local, "Programs", "cursor", "Cursor.exe"),
      vscode: path.join(local, "Programs", "Microsoft VS Code", "Code.exe"),
      trae:   path.join(local, "Programs", "trae", "Trae.exe"),
    };
    const p = ide === "unknown" ? null : paths[ide];
    return p && existsSync(p) ? p : null;
  }
  if (process.platform === "darwin") {
    const paths: Partial<Record<IDE, string>> = {
      cursor: "/Applications/Cursor.app/Contents/MacOS/Cursor",
      vscode: "/Applications/Visual Studio Code.app/Contents/MacOS/Code",
      trae:   "/Applications/Trae.app/Contents/MacOS/Trae",
    };
    const p = ide === "unknown" ? null : paths[ide];
    return p && existsSync(p) ? p : null;
  }
  return null; // Linux: fall through to CLI name search
}

async function detectIDE(): Promise<IDE> {
  if (detectedIDE) return detectedIDE;
  if (process.env.CURSOR_TRACE_ID) return (detectedIDE = "cursor");
  if (process.env.WINDIR && process.env.VSCODE_CWD) return (detectedIDE = "vscode");

  try {
    if (process.ppid) {
      const { exec } = await import("node:child_process");
      const { promisify: pfy } = await import("node:util");
      const execAsync = pfy(exec);
      const cmd = process.platform === "win32"
        ? `wmic process where "ProcessId=${process.ppid}" get CommandLine /format:list`
        : `ps -o comm= -p ${process.ppid} 2>/dev/null || echo ""`;
      const { stdout } = await execAsync(cmd, { timeout: 5000 });
      const lower = stdout.toLowerCase();
      if (lower.includes("cursor")) return (detectedIDE = "cursor");
      if (lower.includes("trae"))   return (detectedIDE = "trae");
      if (lower.includes("code") || lower.includes("vscode")) return (detectedIDE = "vscode");
    }
  } catch { /* fall through */ }

  return (detectedIDE = "cursor"); // default: Cursor
}

async function tryExe(exe: string, url: string): Promise<boolean> {
  try {
    await execFileAsync(exe, ["--open-url", url], { windowsHide: true, timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

async function tryCliName(cli: string, url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const sp = spawn(cli, ["--open-url", url], { shell: true, windowsHide: true });
    const t = setTimeout(() => { sp.kill(); resolve(false); }, 8000);
    sp.on("error", () => { clearTimeout(t); resolve(false); });
    sp.on("close", (code) => { clearTimeout(t); resolve(code === 0); });
  });
}

function buildVscodeLink(httpUrl: string, authority: string): string {
  return `vscode://${authority}/open?url=${encodeURIComponent(httpUrl)}`;
}

export async function openPanelInIDE(url: string, force = false): Promise<boolean> {
  if (panelOpened && !force) return true;

  const ide = await detectIDE();
  const cfg = loadConfig();

  // Use http:// URL directly with --open-url so Cursor/VS Code opens it in Browser Tab.
  // Do NOT use vscode:// URI here — Cursor's Browser Tab navigates to it as a web URL
  // instead of routing to the URI handler, causing "This site can't be reached".
  const attemptUrls: string[] = [url];

  logger.info(`[ide-opener] IDE≈${ide} → open: ${url}`);

  const exes: string[] = [];
  const primary = findIdeExecutable(ide);
  if (primary) exes.push(primary);
  if (ide !== "cursor") { const c = findIdeExecutable("cursor"); if (c) exes.push(c); }
  if (ide !== "vscode") { const v = findIdeExecutable("vscode"); if (v) exes.push(v); }

  for (const openUrl of attemptUrls) {
    for (const exe of exes) {
      if (await tryExe(exe, openUrl)) { panelOpened = true; return true; }
    }
    const clis = ([ide === "trae" ? "trae" : null, "cursor", "code"].filter(Boolean) as string[]);
    for (const c of clis) {
      if (await tryCliName(c, openUrl)) { panelOpened = true; return true; }
    }
  }

  try {
    if (process.platform === "win32")
      await execFileAsync("cmd.exe", ["/c", "start", "", url], { windowsHide: true });
    else if (process.platform === "darwin")
      await execFileAsync("open", [url]);
    else
      await execFileAsync("xdg-open", [url]);
    panelOpened = true;
    return true;
  } catch (e) {
    logger.warn(`[ide-opener] system open failed: ${e}`);
    return false;
  }
}

export function resetPanelState(): void { panelOpened = false; }
