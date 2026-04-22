import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");

export interface AppConfig {
  previewPort: number;
  outputDir: string;
  defaultTheme: "default" | "dark" | "forest" | "neutral";
  defaultFormat: "svg" | "png";
}

export function loadConfig(): AppConfig {
  return {
    previewPort: parseInt(process.env.PREVIEW_PORT ?? "3399", 10),
    outputDir: path.resolve(
      process.env.OUTPUT_DIR ?? path.join(PROJECT_ROOT, "output")
    ),
    defaultTheme:
      (process.env.DEFAULT_THEME as AppConfig["defaultTheme"]) ?? "default",
    defaultFormat:
      (process.env.DEFAULT_FORMAT as AppConfig["defaultFormat"]) ?? "svg",
  };
}
