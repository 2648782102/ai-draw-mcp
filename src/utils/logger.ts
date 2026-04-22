/**
 * Lightweight logger that writes to stderr so it never pollutes
 * the stdio JSON-RPC channel used by MCP.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ?? "info";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
}

function formatMessage(level: LogLevel, msg: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}] ${msg}`;
}

export const logger = {
  debug(msg: string) {
    if (shouldLog("debug")) process.stderr.write(formatMessage("debug", msg) + "\n");
  },
  info(msg: string) {
    if (shouldLog("info")) process.stderr.write(formatMessage("info", msg) + "\n");
  },
  warn(msg: string) {
    if (shouldLog("warn")) process.stderr.write(formatMessage("warn", msg) + "\n");
  },
  error(msg: string) {
    if (shouldLog("error")) process.stderr.write(formatMessage("error", msg) + "\n");
  },
};
