/**
 * Lightweight logger — writes to stderr only.
 * NEVER write to stdout: it pollutes the MCP stdio JSON-RPC channel.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? "info";

function fmt(level: LogLevel, msg: string): string {
  return `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}`;
}

export const logger = {
  debug(msg: string) { if (LEVEL_PRIORITY[currentLevel] <= 0) process.stderr.write(fmt("debug", msg) + "\n"); },
  info(msg: string)  { if (LEVEL_PRIORITY[currentLevel] <= 1) process.stderr.write(fmt("info",  msg) + "\n"); },
  warn(msg: string)  { if (LEVEL_PRIORITY[currentLevel] <= 2) process.stderr.write(fmt("warn",  msg) + "\n"); },
  error(msg: string) { if (LEVEL_PRIORITY[currentLevel] <= 3) process.stderr.write(fmt("error", msg) + "\n"); },
};
