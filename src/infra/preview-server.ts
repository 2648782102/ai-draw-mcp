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
 *   GET  /api/collab/session     collaboration snapshot
 *   GET  /api/collab/activity    derived compact activity timeline
 *   GET  /api/collab/diagnostics  read-only session health and next-action summary
 *   GET  /api/collab/graph/diffs  recent graph revision diffs
 *   GET  /api/collab/bundle      portable session bundle for bug reports/examples
 *   POST /api/collab/bundle/import  import a reviewed session bundle
 *   GET  /api/collab/graph       current visual graph
 *   PUT  /api/collab/graph       save human graph edits
 *   POST /api/collab/messages    send a human/AI message
 *   POST /api/collab/annotations add a graph annotation
 *   POST /api/collab/annotations/:id/reply   reply to an annotation thread
 *   POST /api/collab/annotations/:id/status  resolve or reopen a thread
 *   POST /api/collab/annotations/:id/anchor   refresh a stale anchor after human review
 *   GET  /api/collab/proposals   list change proposals
 *   GET  /api/collab/proposals/:id/diff  file diffs for a proposal
 *   POST /api/collab/proposals   create a proposal
 *   POST /api/collab/proposals/:id/approve  human approval (issues one-time grant)
 *   POST /api/collab/proposals/:id/reject   human rejection
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
import type { SessionStore } from "./session-store.js";
import type { VisualGraph } from "../domain/types.js";
import { buildActivityTimeline } from "../domain/activity-timeline.js";
import { buildSessionDiagnostics } from "../domain/session-diagnostics.js";
import { makeId, nowIso } from "../domain/ids.js";
import { logger } from "./logger.js";
import { renderMermaidToSvg, saveSvg } from "./renderer.js";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const panelToken = crypto.randomBytes(24).toString("hex");

/** Resolve mermaid's dist folder via Node module resolution (works for local dev and npx install). */
function resolveMermaidDist(): string {
  try {
    // Preferred: use import.meta.resolve to find the actual installed location
    const mermaidPkg = fileURLToPath(new URL(import.meta.resolve("mermaid/package.json")));
    return path.join(path.dirname(mermaidPkg), "dist");
  } catch {
    // Fallback for environments where import.meta.resolve is unavailable
    return path.join(__dirname, "../../node_modules/mermaid/dist");
  }
}

function editorKind(record: DiagramRecord): "mermaid" | "svg" {
  return record.mermaidCode && record.mermaidCode.trim().length > 0 ? "mermaid" : "svg";
}

export class PreviewServer {
  private app = express();
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;

  constructor(
    private store: DiagramStore,
    private config: AppConfig,
    private sessions: SessionStore,
  ) {
    this.app.use(express.json());

    const mermaidDist = resolveMermaidDist();
    if (existsSync(mermaidDist)) {
      this.app.use("/vendor/mermaid-dist", express.static(mermaidDist, { maxAge: "1d" }));
      logger.info("Mermaid assets mounted at /vendor/mermaid-dist (offline)");
    } else {
      logger.warn(`Mermaid dist not found at ${mermaidDist} — run npm install`);
    }

    this.setupRoutes();
    this.setupCollabRoutes();
  }

  private setupCollabRoutes(): void {
    this.app.use("/api/collab", (req, res, next) => {
      if (req.method === "GET") return next();
      if (req.header("X-AI-Draw-Token") !== panelToken)
        return res.status(401).json({ error: "Invalid panel token" });
      next();
    });

    this.app.get("/api/collab/session", (_req, res) => {
      res.json({
        ...this.sessions.getSnapshot(),
        workspaceRoot: this.sessions.getWorkspaceRoot(),
      });
    });

    this.app.get("/api/collab/activity", (req, res) => {
      const rawLimit = Number(req.query.limit ?? 60);
      const timeline = buildActivityTimeline(this.sessions.getSnapshot(), rawLimit);
      res.json({ timeline });
    });

    this.app.get("/api/collab/diagnostics", (_req, res) => {
      res.json({ diagnostics: buildSessionDiagnostics(this.sessions.getSnapshot()) });
    });

    this.app.get("/api/collab/graph/diffs", (req, res) => {
      const rawLimit = Number(req.query.limit ?? 5);
      const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(20, Math.floor(rawLimit))) : 5;
      res.json({ diffs: this.sessions.getGraphDiffs(limit) });
    });

    this.app.get("/api/collab/bundle", (_req, res) => {
      res.json(this.sessions.exportBundle());
    });

    this.app.post("/api/collab/bundle/import", async (req, res) => {
      const body = req.body as { bundle?: unknown; confirmedBy?: string };
      if (body.confirmedBy !== "human")
        return res.status(403).json({ error: "Human confirmation is required" });
      if (!body.bundle) return res.status(400).json({ error: "bundle is required" });
      try {
        const snapshot = await this.sessions.importBundle(body.bundle);
        const message = await this.sessions.addMessage("system", "导入了协作会话快照；导入不会应用任何项目变更。", {
          metadata: { event: "session_imported" },
        });
        this.broadcast({ type: "session_updated", reason: "session_imported", sessionId: snapshot.id, message });
        res.json({ ok: true, sessionId: snapshot.id, graphRevision: snapshot.graphRevision });
      } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
      }
    });

    this.app.get("/api/collab/graph", (_req, res) => {
      const graph = this.sessions.getGraph();
      if (!graph) return res.status(404).json({ error: "No graph yet" });
      res.json(graph);
    });

    this.app.put("/api/collab/graph", async (req, res) => {
      const graph = req.body as VisualGraph;
      try {
        const snapshot = await this.sessions.setGraph(graph);
        const message = await this.sessions.addMessage("human", "更新了可视化图形", {
          diagramId: graph.diagramId,
          status: "pending",
          metadata: { event: "graph_updated", graphRevision: snapshot.graphRevision },
        });
        this.broadcast({
          type: "graph_updated",
          graph,
          revision: snapshot.graphRevision,
          message,
        });
        res.json({ ok: true, graphRevision: snapshot.graphRevision });
      } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
      }
    });

    this.app.post("/api/collab/messages", async (req, res) => {
      const body = req.body as { body?: string; author?: "human" | "ai" | "system"; diagramId?: string };
      if (!body.body?.trim()) return res.status(400).json({ error: "Message body is required" });
      const author = body.author === "ai" ? "ai" : "human";
      const message = await this.sessions.addMessage(author, body.body.trim(), {
        diagramId: body.diagramId,
        status: author === "human" ? "pending" : "answered",
        metadata: { event: "chat_message" },
      });
      this.broadcast({ type: "chat_message", message });
      res.json(message);
    });

    this.app.post("/api/collab/annotations", async (req, res) => {
      const body = req.body as { body?: string; nodeId?: string; x?: number; y?: number };
      if (!body.body?.trim()) return res.status(400).json({ error: "Annotation body is required" });
      const current = this.sessions.getGraph();
      if (!current) return res.status(404).json({ error: "No graph yet" });
      const targetNode = body.nodeId
        ? current.nodes.find((node) => node.id === body.nodeId)
        : undefined;
      if (body.nodeId && !current.nodes.some((node) => node.id === body.nodeId))
        return res.status(400).json({ error: `Unknown annotation node: ${body.nodeId}` });
      const nextRevision = this.sessions.getSnapshot().graphRevision + 1;
      const annotation = {
        id: makeId("ann"),
        nodeId: body.nodeId,
        nodeLabel: targetNode?.label,
        nodePath: targetNode?.path,
        anchorStatus: "anchored" as const,
        graphRevision: nextRevision,
        x: body.x,
        y: body.y,
        body: body.body.trim(),
        author: "human" as const,
        createdAt: nowIso(),
      };
      current.annotations.push(annotation);
      const snapshot = await this.sessions.setGraph(current);
      const targetLabel = targetNode?.label;
      const message = await this.sessions.addMessage("human", `批注${targetLabel ? ` @ ${targetLabel}` : ""}：${annotation.body}`, {
        diagramId: current.diagramId,
        status: "pending",
        metadata: { event: "annotation_added", annotationId: annotation.id, nodeId: body.nodeId },
      });
      this.broadcast({ type: "graph_updated", graph: current, revision: snapshot.graphRevision, message });
      res.json({ ok: true, annotation, graphRevision: snapshot.graphRevision });
    });

    this.app.post("/api/collab/annotations/:id/reply", async (req, res) => {
      const payload = req.body as { body?: string; author?: "human" | "ai" };
      if (!payload.body?.trim()) return res.status(400).json({ error: "Reply body is required" });
      const author = payload.author === "ai" ? "ai" : "human";
      try {
        const annotation = await this.sessions.updateAnnotation(req.params.id, "reply", {
          author,
          body: payload.body,
        });
        const snapshot = this.sessions.getSnapshot();
        const message = await this.sessions.addMessage(author, `${author === "human" ? "回复节点批注" : "AI 回复节点批注"}：${payload.body.trim()}`, {
          diagramId: annotation.nodeId ? snapshot.activeDiagramId : undefined,
          status: author === "human" ? "pending" : "answered",
          metadata: { event: "annotation_replied", annotationId: annotation.id, nodeId: annotation.nodeId },
        });
        this.broadcast({
          type: "graph_updated",
          graph: this.sessions.getGraph(),
          revision: snapshot.graphRevision,
          message,
        });
        res.json({ ok: true, annotation, graphRevision: snapshot.graphRevision });
      } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
      }
    });

    this.app.post("/api/collab/annotations/:id/status", async (req, res) => {
      const payload = req.body as { status?: "resolved" | "open" };
      if (payload.status !== "resolved" && payload.status !== "open")
        return res.status(400).json({ error: "status must be resolved or open" });
      try {
        const annotation = await this.sessions.updateAnnotation(
          req.params.id,
          payload.status === "resolved" ? "resolve" : "reopen",
          { author: "human" },
        );
        const snapshot = this.sessions.getSnapshot();
        const message = await this.sessions.addMessage(
          "system",
          `${payload.status === "resolved" ? "已解决" : "已重开"}节点批注线程「${annotation.body.slice(0, 60)}」`,
          {
            diagramId: snapshot.activeDiagramId,
            metadata: { event: "annotation_status", annotationId: annotation.id, status: payload.status },
          },
        );
        this.broadcast({
          type: "graph_updated",
          graph: this.sessions.getGraph(),
          revision: snapshot.graphRevision,
          message,
        });
        res.json({ ok: true, annotation, graphRevision: snapshot.graphRevision });
      } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
      }
    });

    this.app.post("/api/collab/annotations/:id/anchor", async (req, res) => {
      const payload = req.body as { confirmedBy?: string };
      if (payload.confirmedBy !== "human")
        return res.status(403).json({ error: "Human confirmation is required" });
      try {
        const annotation = await this.sessions.reanchorAnnotation(req.params.id);
        const snapshot = this.sessions.getSnapshot();
        const message = await this.sessions.addMessage(
          "human",
          `已确认并重锚节点批注线程「${annotation.body.slice(0, 60)}」`,
          {
            diagramId: snapshot.activeDiagramId,
            status: "pending",
            metadata: { event: "annotation_anchor", annotationId: annotation.id, anchorStatus: "anchored" },
          },
        );
        this.broadcast({
          type: "graph_updated",
          graph: this.sessions.getGraph(),
          revision: snapshot.graphRevision,
          message,
        });
        res.json({ ok: true, annotation, graphRevision: snapshot.graphRevision });
      } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
      }
    });

    this.app.get("/api/collab/proposals", (_req, res) => {
      res.json({ proposals: this.sessions.getProposals(100) });
    });

    this.app.get("/api/collab/proposals/:id/diff", async (req, res) => {
      try {
        res.json({ diffs: await this.sessions.getProposalDiffs(req.params.id) });
      } catch (error) {
        res.status(404).json({ error: error instanceof Error ? error.message : String(error) });
      }
    });

    this.app.get("/api/collab/proposals/:id/impact", async (req, res) => {
      try {
        res.json({ impact: await this.sessions.getProposalImpact(req.params.id) });
      } catch (error) {
        res.status(404).json({ error: error instanceof Error ? error.message : String(error) });
      }
    });

    this.app.post("/api/collab/proposals", async (req, res) => {
      const body = req.body as {
        title?: string;
        summary?: string;
        changes?: Array<{ id?: string; kind: "create" | "update" | "mkdir"; path: string; content?: string }>;
        diagramId?: string;
      };
      if (!body.title?.trim() || !body.summary?.trim())
        return res.status(400).json({ error: "title and summary are required" });
      try {
        const proposal = await this.sessions.createProposal({
          title: body.title.trim(),
          summary: body.summary.trim(),
          changes: (body.changes ?? []).map((change, index) => ({
            ...change,
            id: change.id ?? `change_${index + 1}`,
          })),
          diagramId: body.diagramId,
          createdBy: "human",
        });
        const message = await this.sessions.addMessage("human", `创建提案：${proposal.title}`, {
          diagramId: body.diagramId,
          status: "pending",
          metadata: { event: "proposal_created", proposalId: proposal.id },
        });
        this.broadcast({ type: "proposal_created", proposal, message });
        res.json(proposal);
      } catch (error) {
        res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
      }
    });

    this.app.post("/api/collab/proposals/:id/approve", async (req, res) => {
      const request = req.body as { approvedBy?: string };
      if (request.approvedBy !== "human")
        return res.status(403).json({ error: "Human approval is required" });
      const proposal = this.sessions.getProposal(req.params.id);
      if (!proposal) return res.status(404).json({ error: "Not found" });
      if (proposal.status !== "pending")
        return res.status(409).json({ error: `Proposal is ${proposal.status}` });
      const approved = await this.sessions.setProposalStatus(proposal.id, "approved", { approvedAt: nowIso() });
      const receipt = await this.sessions.issueApproval(proposal.id);
      const message = await this.sessions.addMessage("human", `批准提案「${approved.title}」；请让 AI 使用一次性确认号应用。`, {
        diagramId: approved.diagramId,
        status: "pending",
        metadata: { event: "proposal_approved", proposalId: approved.id, approvalId: receipt.approvalId },
      });
      this.broadcast({ type: "proposal_updated", proposal: approved, message, receipt });
      res.json({ proposal: approved, receipt, instruction: "在 AI 对话中提供该确认号，让 AI 调用 apply_visual_proposal。" });
    });

    this.app.post("/api/collab/proposals/:id/reject", async (req, res) => {
      const proposal = this.sessions.getProposal(req.params.id);
      if (!proposal) return res.status(404).json({ error: "Not found" });
      if (proposal.status !== "pending" && proposal.status !== "approved")
        return res.status(409).json({ error: `Proposal is ${proposal.status}` });
      const rejected = await this.sessions.setProposalStatus(proposal.id, "rejected", { rejectedAt: nowIso() });
      await this.sessions.markMessageForProposal(proposal.id, "rejected");
      this.broadcast({ type: "proposal_updated", proposal: rejected });
      res.json(rejected);
    });
  }

  private async serveHtml(_req: express.Request, res: express.Response) {
    const compiled = path.join(__dirname, "templates", "index.html");
    const source   = path.resolve(__dirname, "../../src/infra/templates/index.html");
    for (const p of [compiled, source]) {
      try {
        const html = (await fs.readFile(p, "utf-8")).replace("__AI_DRAW_PANEL_TOKEN__", panelToken);
        res.type("html").send(html);
        return;
      } catch {}
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
      this.server!.listen(this.config.previewPort, this.config.previewHost, () => {
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

  broadcast(message: string | Record<string, unknown>): void {
    const data = typeof message === "string" ? message : JSON.stringify(message);
    this.wss?.clients.forEach((client) => {
      if (client.readyState === 1) client.send(data);
    });
  }

  async stop(): Promise<void> {
    this.wss?.close();
    return new Promise((resolve) => { this.server?.close(() => resolve()); });
  }
}
