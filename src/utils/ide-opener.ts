import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import path from "node:path";
import { logger } from "./logger.js";

const execFileAsync = promisify(execFile);

type IDE = "cursor" | "vscode" | "trae" | "unknown";

let detectedIDE: IDE | null = null;
let panelOpened = false;

function findIdeExecutable(ide: IDE): string | null {
  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA;
    if (!local) return null;
    const winPaths: Partial<Record<IDE, string>> = {
      cursor: path.join(local, "Programs", "cursor", "Cursor.exe"),
      vscode: path.join(local, "Programs", "Microsoft VS Code", "Code.exe"),
      trae: path.join(local, "Programs", "trae", "Trae.exe"),
    };
    const p = ide === "unknown" ? null : winPaths[ide];
    return p && existsSync(p) ? p : null;
  }
  if (process.platform === "darwin") {
    const macPaths: Partial<Record<IDE, string>> = {
      cursor: "/Applications/Cursor.app/Contents/MacOS/Cursor",
      vscode: "/Applications/Visual Studio Code.app/Contents/MacOS/Code",
      trae: "/Applications/Trae.app/Contents/MacOS/Trae",
    };
    const p = ide === "unknown" ? null : macPaths[ide];
    return p && existsSync(p) ? p : null;
  }
  // Linux: rely on `which cursor` etc. below
  return null;
}

/**
 * Best-effort: detect which IDE is hosting the extension host.
 */
async function detectIDE(): Promise<IDE> {
  if (detectedIDE) return detectedIDE;

  // Quick heuristic: env from Cursor/VS Code
  if (process.env.CURSOR_TRACE_ID) {
    detectedIDE = "cursor";
    return "cursor";
  }
  if (process.env.WINDIR && process.env.VSCODE_CWD) {
    detectedIDE = "vscode";
    return "vscode";
  }

  try {
    if (process.platform === "win32" && process.ppid) {
      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);
      const pid = process.ppid;
      const { stdout } = await execAsync(
        `wmic process where "ProcessId=${pid}" get CommandLine,ParentProcessId /format:list`,
        { timeout: 5000 }
      );
      const lower = stdout.toLowerCase();
      if (lower.includes("cursor")) {
        detectedIDE = "cursor";
        return "cursor";
      }
      if (lower.includes("trae")) {
        detectedIDE = "trae";
        return "trae";
      }
      if (lower.includes("code") || lower.includes("vscode")) {
        detectedIDE = "vscode";
        return "vscode";
      }
    } else if (process.platform !== "win32" && process.ppid) {
      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);
      const { stdout } = await execAsync(
        `ps -o comm= -p ${process.ppid} 2>/dev/null || echo ""`,
        { timeout: 5000 }
      );
      const lower = stdout.toLowerCase();
      if (lower.includes("cursor")) {
        detectedIDE = "cursor";
        return "cursor";
      }
      if (lower.includes("trae")) {
        detectedIDE = "trae";
        return "trae";
      }
      if (lower.includes("code")) {
        detectedIDE = "vscode";
        return "vscode";
      }
    }
  } catch {
    // fall through
  }

  // Default: Cursor (most of our users)
  detectedIDE = "cursor";
  return "cursor";
}

async function openUrlWithIdeBinary(exe: string, url: string): Promise<void> {
  // VS Code / Cursor: --open-url opens a URL in the *running* workbench
  // (and typically routes http(s) to Simple Browser when that feature is on).
  await execFileAsync(exe, ["--open-url", url], { windowsHide: true, timeout: 8000 });
}

async function tryCliName(cli: string, url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const sp = spawn(cli, ["--open-url", url], {
      shell: true,
      windowsHide: true,
    });
    const t = setTimeout(() => {
      sp.kill();
      resolve(false);
    }, 8000);
    sp.on("error", () => {
      clearTimeout(t);
      resolve(false);
    });
    sp.on("close", (code) => {
      clearTimeout(t);
      resolve(code === 0);
    });
  });
}

/**
 * Open the local preview URL in the running IDE (Simple Browser tab) when possible.
 * Only attempts auto-open once per process unless `force` is true.
 */
export async function openPanelInIDE(url: string, force = false): Promise<boolean> {
  if (panelOpened && !force) return true;

  const ide = await detectIDE();
  logger.info(`[ide-opener] IDE≈${ide} → open panel: ${url}`);

  const exes: string[] = [];
  const a = findIdeExecutable(ide);
  if (a) exes.push(a);
  if (ide !== "cursor" && !exes.some((e) => e.toLowerCase().includes("cursor"))) {
    const c = findIdeExecutable("cursor");
    if (c) exes.push(c);
  }
  if (ide !== "vscode" && !exes.some((e) => e.toLowerCase().includes("code"))) {
    const v = findIdeExecutable("vscode");
    if (v) exes.push(v);
  }
  for (const exe of exes) {
    try {
      await openUrlWithIdeBinary(exe, url);
      panelOpened = true;
      return true;
    } catch (e) {
      logger.debug(`[ide-opener] ${exe} failed: ${e}`);
    }
  }

  const clis = [ide === "trae" ? "trae" : null, "cursor", "code"].filter(Boolean) as string[];
  for (const c of clis) {
    const ok = await tryCliName(c, url);
    if (ok) {
      panelOpened = true;
      return true;
    }
  }

  try {
    if (process.platform === "win32") {
      await execFileAsync("cmd.exe", ["/c", "start", "", url], { windowsHide: true });
    } else if (process.platform === "darwin") {
      await execFileAsync("open", [url], { windowsHide: true });
    } else {
      await execFileAsync("xdg-open", [url], { windowsHide: true });
    }
    panelOpened = true;
    return true;
  } catch (e) {
    logger.warn(`[ide-opener] system open failed: ${e}`);
    return false;
  }
}

export function resetPanelState(): void {
  panelOpened = false;
}
