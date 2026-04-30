/**
 * infra/ide-opener.ts
 *
 * Opens the local preview URL inside the running IDE (Simple Browser / Browser Tab).
 * Strategy: detect IDE from env/process → try binary --open-url → try PATH CLI → system open.
 * Only auto-opens once per process; pass force=true to override.
 *
 * Supported IDEs: Cursor, VS Code, Windsurf, Trae, Zed (+ generic fallback)
 */

import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import path from "node:path";
import { logger } from "./logger.js";
import { loadConfig } from "./config.js";

const execFileAsync = promisify(execFile);

type IDE = "cursor" | "vscode" | "windsurf" | "trae" | "zed" | "unknown";

let detectedIDE: IDE | null = null;
let panelOpened = false;

function findIdeExecutable(ide: IDE): string | null {
  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA;
    if (!local) return null;
    const paths: Partial<Record<IDE, string>> = {
      cursor:   path.join(local, "Programs", "cursor",                  "Cursor.exe"),
      vscode:   path.join(local, "Programs", "Microsoft VS Code",       "Code.exe"),
      windsurf: path.join(local, "Programs", "Windsurf",                "Windsurf.exe"),
      trae:     path.join(local, "Programs", "trae",                    "Trae.exe"),
    };
    const p = ide === "unknown" || ide === "zed" ? null : paths[ide];
    return p && existsSync(p) ? p : null;
  }
  if (process.platform === "darwin") {
    const paths: Partial<Record<IDE, string>> = {
      cursor:   "/Applications/Cursor.app/Contents/MacOS/Cursor",
      vscode:   "/Applications/Visual Studio Code.app/Contents/MacOS/Code",
      windsurf: "/Applications/Windsurf.app/Contents/MacOS/Windsurf",
      trae:     "/Applications/Trae.app/Contents/MacOS/Trae",
      zed:      "/Applications/Zed.app/Contents/MacOS/zed",
    };
    const p = ide === "unknown" ? null : paths[ide];
    return p && existsSync(p) ? p : null;
  }
  return null; // Linux: fall through to CLI name search
}

async function detectIDE(): Promise<IDE> {
  if (detectedIDE) return detectedIDE;

  // Fast env-var checks (most reliable — set by the host process)
  if (process.env.CURSOR_TRACE_ID)          return (detectedIDE = "cursor");
  if (process.env.WINDSURF_RESOURCES_PATH)  return (detectedIDE = "windsurf");
  if (process.env.CODEIUM_WINDSURF)         return (detectedIDE = "windsurf");
  // VS Code sets VSCODE_CWD; also used by forks, check after more-specific ones
  if (process.env.VSCODE_CWD && !process.env.WINDSURF_RESOURCES_PATH)
    return (detectedIDE = "vscode");

  // Fallback: inspect parent process command line
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
      if (lower.includes("windsurf")) return (detectedIDE = "windsurf");
      if (lower.includes("cursor"))   return (detectedIDE = "cursor");
      if (lower.includes("trae"))     return (detectedIDE = "trae");
      if (lower.includes("zed"))      return (detectedIDE = "zed");
      if (lower.includes("code") || lower.includes("vscode"))
        return (detectedIDE = "vscode");
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

/** CLI names per IDE that accept --open-url */
const IDE_CLI_NAMES: Partial<Record<IDE, string[]>> = {
  cursor:   ["cursor"],
  vscode:   ["code"],
  windsurf: ["windsurf"],
  trae:     ["trae"],
  zed:      ["zed"],           // zed supports --open-url on macOS/Linux
  unknown:  ["cursor", "code", "windsurf"],
};

export async function openPanelInIDE(url: string, force = false): Promise<boolean> {
  if (panelOpened && !force) return true;

  const ide = await detectIDE();
  loadConfig(); // ensure config side-effects run

  logger.info(`[ide-opener] IDE≈${ide} → open: ${url}`);

  // Build exe candidate list: primary IDE first, then common fallbacks
  const exeCandidates: string[] = [];
  const primary = findIdeExecutable(ide);
  if (primary) exeCandidates.push(primary);
  // Always add Cursor + VS Code + Windsurf as fallbacks (most common)
  for (const fallback of ["cursor", "vscode", "windsurf"] as IDE[]) {
    if (fallback === ide) continue;
    const exe = findIdeExecutable(fallback);
    if (exe) exeCandidates.push(exe);
  }

  // Try known executable paths first
  for (const exe of exeCandidates) {
    if (await tryExe(exe, url)) { panelOpened = true; return true; }
  }

  // Try CLI names from PATH
  const cliNames = IDE_CLI_NAMES[ide] ?? IDE_CLI_NAMES.unknown!;
  for (const cli of cliNames) {
    if (await tryCliName(cli, url)) { panelOpened = true; return true; }
  }

  // Final fallback: system default browser / open command
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
