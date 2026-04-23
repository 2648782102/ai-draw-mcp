import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import http from "node:http";
import type { DiagramStore } from "../storage/diagram-store.js";
import type { AppConfig } from "../utils/config.js";
import type { DiagramRecord } from "../utils/types.js";
import { logger } from "../utils/logger.js";
import { renderMermaidToSvg, saveSvg } from "../renderer/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function editorKind(record: DiagramRecord): "mermaid" | "svg" {
  if (record.mermaidCode && record.mermaidCode.trim().length > 0) return "mermaid";
  return "svg";
}

export class PreviewServer {
  private app = express();
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;

  constructor(
    private store: DiagramStore,
    private config: AppConfig
  ) {
    this.app.use(express.json());
    this.setupRoutes();
  }

  private async serveHtml(_req: express.Request, res: express.Response) {
    const compiled = path.join(__dirname, "templates", "index.html");
    const source = path.resolve(__dirname, "../../src/preview/templates/index.html");
    for (const p of [compiled, source]) {
      try {
        const html = await fs.readFile(p, "utf-8");
        res.type("html").send(html);
        return;
      } catch {}
    }
    res.status(404).send("Template not found");
  }

  private setupRoutes() {
    this.app.get("/", (req, res) => this.serveHtml(req, res));
    this.app.get("/diagram/:id", (req, res) => this.serveHtml(req, res));

    // List all diagrams
    this.app.get("/api/diagrams", (_req, res) => {
      res.json(this.store.list());
    });

    // Get diagram metadata (including mermaidCode)
    this.app.get("/api/diagram/:id", (req, res) => {
      const record = this.store.get(req.params.id);
      if (!record) return res.status(404).json({ error: "Not found" });
      res.json({ ...record, editorKind: editorKind(record) });
    });

    // Update diagram from the panel (Mermaid re-renders to SVG on disk, or raw SVG write)
    this.app.put("/api/diagram/:id", async (req, res) => {
      const record = this.store.get(req.params.id);
      if (!record) return res.status(404).json({ error: "Not found" });
      const { mermaidCode, svgContent } = req.body as {
        mermaidCode?: string;
        svgContent?: string;
      };

      const kind = editorKind(record);

      if (kind === "svg" && typeof svgContent === "string") {
        await fs.writeFile(record.svgPath, svgContent, "utf-8");
        record.mermaidCode = undefined;
        await this.store.add(record);
        res.json({ ok: true, editorKind: "svg" as const });
        return;
      }

      if (kind === "mermaid" && typeof mermaidCode === "string") {
        record.mermaidCode = mermaidCode;
        if (mermaidCode.trim()) {
          try {
            const svg = await renderMermaidToSvg(mermaidCode, "default");
            const dir = path.dirname(record.svgPath);
            const file = path.basename(record.svgPath);
            await saveSvg(svg, dir, file);
            record.svgPath = path.join(dir, file);
          } catch (e) {
            logger.warn(`PUT re-render failed, metadata still saved: ${e}`);
          }
        }
        await this.store.add(record);
        res.json({ ok: true, editorKind: "mermaid" as const });
        return;
      }

      res.status(400).json({
        error:
          kind === "svg"
            ? "This diagram is SVG-only: send { svgContent: \"...\" }"
            : "This diagram is Mermaid: send { mermaidCode: \"...\" }",
      });
    });

    // Serve SVG file
    this.app.get("/api/diagram/:id/svg", async (req, res) => {
      const record = this.store.get(req.params.id);
      if (!record) return res.status(404).send("Not found");
      try {
        const svg = await fs.readFile(record.svgPath, "utf-8");
        if (req.query.download) {
          res.setHeader("Content-Disposition", `attachment; filename="${record.id}.svg"`);
        }
        res.type("image/svg+xml").send(svg);
      } catch {
        res.status(404).send("SVG file not found");
      }
    });

    // Serve PNG file
    this.app.get("/api/diagram/:id/png", async (req, res) => {
      const record = this.store.get(req.params.id);
      if (!record?.pngPath) return res.status(404).send("PNG not available");
      try {
        const png = await fs.readFile(record.pngPath);
        if (req.query.download) {
          res.setHeader("Content-Disposition", `attachment; filename="${record.id}.png"`);
        }
        res.type("image/png").send(png);
      } catch {
        res.status(404).send("PNG file not found");
      }
    });
  }

  async start(): Promise<void> {
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server, path: "/ws" });

    this.wss.on("connection", (ws) => {
      logger.debug("Preview WebSocket client connected");
      ws.on("close", () => logger.debug("Preview WebSocket client disconnected"));
    });

    return new Promise((resolve) => {
      this.server!.listen(this.config.previewPort, () => {
        logger.info(`Preview server running at http://localhost:${this.config.previewPort}`);
        resolve();
      });
    });
  }

  /**
   * Push a new diagram to all connected panel clients.
   * The panel will update its editor and render in real-time.
   */
  notifyNewDiagram(diagramId: string, title: string, mermaidCode?: string): void {
    const message = JSON.stringify({
      type: "diagram_added",
      id: diagramId,
      title,
      mermaidCode: mermaidCode ?? "",
    });
    this.broadcast(message);
  }

  /**
   * Push a diagram update (AI modified an existing diagram).
   */
  notifyDiagramUpdate(diagramId: string, title: string, mermaidCode: string): void {
    const message = JSON.stringify({
      type: "diagram_update",
      id: diagramId,
      title,
      mermaidCode,
    });
    this.broadcast(message);
  }

  private broadcast(message: string): void {
    this.wss?.clients.forEach((client) => {
      if (client.readyState === 1) client.send(message);
    });
  }

  async stop(): Promise<void> {
    this.wss?.close();
    return new Promise((resolve) => {
      this.server?.close(() => resolve());
    });
  }
}
