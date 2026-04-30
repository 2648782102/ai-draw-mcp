/**
 * infra/preview-server.ts — Express HTTP + WebSocket live preview server.
 *
 * Routes:
 *   GET  /                     serve index.html (SPA)
 *   GET  /diagram/:id          serve index.html (SPA deep-link)
 *   GET  /api/diagrams          list all diagrams
 *   GET  /api/diagram/:id       get diagram metadata
 *   PUT  /api/diagram/:id       update diagram (re-render Mermaid or write raw SVG)
 *   GET  /api/diagram/:id/svg   serve SVG file
 *   GET  /api/diagram/:id/png   serve PNG file
 *   DEL  /api/diagram/:id       delete diagram
 *   WS   /ws                    WebSocket: diagram_added | diagram_update | diagram_removed
 */

import express from "express";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import http from "node:http";
import type { DiagramStore } from "./store.js";
import type { AppConfig, DiagramRecord } from "./config.js";
import { logger } from "./logger.js";
import { renderMermaidToSvg, saveSvg } from "./renderer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function editorKind(record: DiagramRecord): "mermaid" | "svg" {
  return record.mermaidCode && record.mermaidCode.trim().length > 0 ? "mermaid" : "svg";
}

export class PreviewServer {
  private app = express();
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;

  constructor(private store: DiagramStore, private config: AppConfig) {
    this.app.use(express.json());

    const mermaidDist = path.join(__dirname, "../../node_modules/mermaid/dist");
    if (existsSync(mermaidDist)) {
      this.app.use("/vendor/mermaid-dist", express.static(mermaidDist, { maxAge: "1d" }));
      logger.info("Mermaid assets mounted at /vendor/mermaid-dist (offline)");
    } else {
      logger.warn(`Mermaid dist not found at ${mermaidDist} — run npm install`);
    }

    this.setupRoutes();
  }

  private async serveHtml(_req: express.Request, res: express.Response) {
    const compiled = path.join(__dirname, "templates", "index.html");
    const source   = path.resolve(__dirname, "../../src/infra/templates/index.html");
    for (const p of [compiled, source]) {
      try { res.type("html").send(await fs.readFile(p, "utf-8")); return; } catch {}
    }
    res.status(404).send("Template not found");
  }

  private setupRoutes() {
    this.app.get("/", (req, res) => this.serveHtml(req, res));
    this.app.get("/diagram/:id", (req, res) => this.serveHtml(req, res));

    this.app.get("/api/diagrams", (_req, res) => { res.json(this.store.list()); });

    this.app.get("/api/diagram/:id", (req, res) => {
      const record = this.store.get(req.params.id);
      if (!record) return res.status(404).json({ error: "Not found" });
      res.json({ ...record, editorKind: editorKind(record) });
    });

    this.app.put("/api/diagram/:id", async (req, res) => {
      const record = this.store.get(req.params.id);
      if (!record) return res.status(404).json({ error: "Not found" });
      const { mermaidCode, svgContent } = req.body as { mermaidCode?: string; svgContent?: string };
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
            await saveSvg(svg, path.dirname(record.svgPath), path.basename(record.svgPath));
          } catch (e) {
            logger.warn(`PUT re-render failed, metadata saved anyway: ${e}`);
          }
        }
        await this.store.add(record);
        res.json({ ok: true, editorKind: "mermaid" as const });
        return;
      }

      res.status(400).json({
        error: kind === "svg"
          ? 'SVG diagram: send { svgContent: "..." }'
          : 'Mermaid diagram: send { mermaidCode: "..." }',
      });
    });

    this.app.get("/api/diagram/:id/svg", async (req, res) => {
      const record = this.store.get(req.params.id);
      if (!record) return res.status(404).send("Not found");
      try {
        const svg = await fs.readFile(record.svgPath, "utf-8");
        if (req.query.download)
          res.setHeader("Content-Disposition", `attachment; filename="${record.id}.svg"`);
        res.type("image/svg+xml").send(svg);
      } catch { res.status(404).send("SVG file not found"); }
    });

    this.app.get("/api/diagram/:id/png", async (req, res) => {
      const record = this.store.get(req.params.id);
      if (!record?.pngPath) return res.status(404).send("PNG not available");
      try {
        const png = await fs.readFile(record.pngPath);
        if (req.query.download)
          res.setHeader("Content-Disposition", `attachment; filename="${record.id}.png"`);
        res.type("image/png").send(png);
      } catch { res.status(404).send("PNG file not found"); }
    });

    this.app.delete("/api/diagram/:id", async (req, res) => {
      const removed = await this.store.remove(req.params.id);
      if (!removed) return res.status(404).json({ error: "Not found" });
      this.notifyDiagramRemoved(req.params.id);
      res.json({ ok: true });
    });
  }

  async start(): Promise<void> {
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server, path: "/ws" });
    this.wss.on("connection", (ws) => {
      logger.debug("Preview WS client connected");
      ws.on("close", () => logger.debug("Preview WS client disconnected"));
    });

    return new Promise((resolve, reject) => {
      const onError = (err: NodeJS.ErrnoException) => {
        this.server!.removeListener("error", onError);
        if (err.code === "EADDRINUSE")
          logger.error(`Port ${this.config.previewPort} in use. Set PREVIEW_PORT to another port.`);
        else
          logger.error(`Preview server failed to start: ${err.message}`);
        reject(err);
      };
      this.server!.once("error", onError);
      this.server!.listen(this.config.previewPort, () => {
        this.server!.removeListener("error", onError);
        logger.info(`Preview server at http://${this.config.previewHost}:${this.config.previewPort}`);
        resolve();
      });
    });
  }

  notifyNewDiagram(diagramId: string, title: string, mermaidCode?: string): void {
    this.broadcast(JSON.stringify({ type: "diagram_added", id: diagramId, title, mermaidCode: mermaidCode ?? "" }));
  }

  notifyDiagramUpdate(diagramId: string, title: string, mermaidCode: string): void {
    this.broadcast(JSON.stringify({ type: "diagram_update", id: diagramId, title, mermaidCode }));
  }

  notifyDiagramRemoved(diagramId: string): void {
    this.broadcast(JSON.stringify({ type: "diagram_removed", id: diagramId }));
  }

  private broadcast(message: string): void {
    this.wss?.clients.forEach((client) => { if (client.readyState === 1) client.send(message); });
  }

  async stop(): Promise<void> {
    this.wss?.close();
    return new Promise((resolve) => { this.server?.close(() => resolve()); });
  }
}
