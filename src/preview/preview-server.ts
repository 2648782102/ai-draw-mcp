import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import http from "node:http";
import type { DiagramStore } from "../storage/diagram-store.js";
import type { AppConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class PreviewServer {
  private app = express();
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;

  constructor(
    private store: DiagramStore,
    private config: AppConfig
  ) {
    this.setupRoutes();
  }

  private setupRoutes() {
    this.app.get("/", async (_req, res) => {
      const htmlPath = path.join(__dirname, "templates", "index.html");
      try {
        const html = await fs.readFile(htmlPath, "utf-8");
        res.type("html").send(html);
      } catch {
        // Fallback: serve from source tree (dev mode)
        const devPath = path.resolve(__dirname, "../../src/preview/templates/index.html");
        const html = await fs.readFile(devPath, "utf-8");
        res.type("html").send(html);
      }
    });

    this.app.get("/api/diagrams", (_req, res) => {
      res.json(this.store.list());
    });

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

    this.app.get("/diagram/:id", async (_req, res) => {
      const htmlPath = path.join(__dirname, "templates", "index.html");
      try {
        const html = await fs.readFile(htmlPath, "utf-8");
        res.type("html").send(html);
      } catch {
        const devPath = path.resolve(__dirname, "../../src/preview/templates/index.html");
        const html = await fs.readFile(devPath, "utf-8");
        res.type("html").send(html);
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

  notifyNewDiagram(diagramId: string): void {
    const message = JSON.stringify({ type: "diagram_added", id: diagramId });
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
