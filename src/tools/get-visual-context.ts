import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { jsonLine, type ToolContext } from "./_shared.js";
import { summarizeAnnotationThreads } from "../domain/annotation-thread.js";
import { buildActivityTimeline } from "../domain/activity-timeline.js";
import { buildSessionDiagnostics } from "../domain/session-diagnostics.js";

export function registerGetVisualContext(server: McpServer, ctx: ToolContext) {
  server.tool(
    "get_visual_context",
    "读取双向协作面板当前状态：项目结构图、人类在面板中做的图形修改、批注与对话消息。" +
    " AI 在修改项目代码前应调用本工具理解人类意图；返回 pending 消息与 graphRevision，便于生成可追溯的变更提案。" +
    " 本工具只读，不会修改任何文件或应用提案。",
    {
      include_graph: z.boolean().optional().describe("Include the full visual graph (default true)"),
      message_limit: z.number().int().min(1).max(200).optional().describe("Maximum recent messages (default 50)"),
      proposal_limit: z.number().int().min(1).max(100).optional().describe("Maximum recent proposals (default 20)"),
      activity_limit: z.number().int().min(1).max(200).optional().describe("Maximum derived activity timeline items (default 30)"),
      graph_diff_limit: z.number().int().min(1).max(20).optional().describe("Maximum recent graph revision diffs (default 5)"),
    },
    async ({ include_graph, message_limit, proposal_limit, activity_limit, graph_diff_limit }) => {
      const snapshot = ctx.sessions.getSnapshot();
      const graph = include_graph === false ? undefined : snapshot.graph;
      const messages = ctx.sessions.getMessages(message_limit);
      const proposals = ctx.sessions.getProposals(proposal_limit);
      const pending = messages.filter((message) => message.author === "human" && message.status === "pending");
      const unresolved = graph?.annotations.filter((annotation) => !annotation.resolved) ?? [];
      const annotationThreads = summarizeAnnotationThreads(graph);
      const staleThreads = annotationThreads.threads.filter((thread) => thread.anchorStatus !== "anchored");
      const activityTimeline = buildActivityTimeline(snapshot, activity_limit ?? 30);
      const diagnostics = buildSessionDiagnostics(snapshot);
      const graphDiffs = ctx.sessions.getGraphDiffs(graph_diff_limit ?? 5);
      const nodeLabels = new Map(graph?.nodes.map((node) => [node.id, node.label]) ?? []);
      const annotationsByNode = new Map<string, string[]>();
      const generalAnnotations: string[] = [];
      for (const annotation of unresolved) {
        const thread = annotationThreads.threads.find((item) => item.id === annotation.id);
        if (thread?.anchorStatus !== "anchored") continue;
        const fullBody = [annotation.body, ...(thread?.replies ?? []).map((reply) => `${reply.author}: ${reply.body}`)].join(" / ");
        if (annotation.nodeId) {
          const bucket = annotationsByNode.get(annotation.nodeId) ?? [];
          bucket.push(fullBody);
          annotationsByNode.set(annotation.nodeId, bucket);
        } else {
          generalAnnotations.push(fullBody);
        }
      }
      const intentByNode = graph?.nodes
        .filter((node) => annotationsByNode.has(node.id))
        .map((node) => ({
          nodeId: node.id,
          label: node.label,
          kind: node.kind,
          path: node.path,
          group: node.group,
          annotations: annotationsByNode.get(node.id) ?? [],
        })) ?? [];
      const intentSummary = {
        graphRevision: snapshot.graphRevision,
        nodes: graph?.nodes.length ?? 0,
        edges: graph?.edges.length ?? 0,
        pendingMessages: pending.map((message) => message.body),
        generalAnnotations,
        intentByNode,
        edgeLabels: graph?.edges.map((edge) => ({
          from: nodeLabels.get(edge.from) ?? edge.from,
          to: nodeLabels.get(edge.to) ?? edge.to,
          label: edge.label,
          kind: edge.kind,
          fromPath: graph?.nodes.find((node) => node.id === edge.from)?.path,
          toPath: graph?.nodes.find((node) => node.id === edge.to)?.path,
        })) ?? [],
        annotationThreads,
        staleThreads,
        graphDiffs,
        nextActor: annotationThreads.nextActor,
        nextActions: [
          `Activity timeline: ${activityTimeline.total} derived events, including ${activityTimeline.kinds.graph_diff} graph revisions; next actor ${activityTimeline.nextActor}.`,
          `Stale annotation threads: ${staleThreads.length}; detached ${annotationThreads.detached}, outdated ${annotationThreads.outdated}.`,
          `Graph diffs: ${graphDiffs.length} recent human graph revisions; use graphDiffs.items for exact field changes.`,
          "Use annotationThreads.nextActor to see whose turn it is; use intentByNode and pendingMessages as the human's latest intent.",
          "create_visual_proposal should cite those nodes, then wait for human approval.",
        ],
        guidance: "Use annotationThreads.nextActor to see whose turn it is; use graphDiffs to see exactly what the human changed in the graph; use activityTimeline for compact chronology; use intentByNode and pendingMessages as the human's latest intent; create_visual_proposal should cite those nodes, then wait for human approval.",
      };
      const payload = {
        session: {
          id: snapshot.id,
          title: snapshot.title,
          workspaceRoot: snapshot.workspaceRoot,
          activeDiagramId: snapshot.activeDiagramId,
          graphRevision: snapshot.graphRevision,
          updatedAt: snapshot.updatedAt,
        },
        graph,
        pendingMessages: pending,
        unresolvedAnnotations: unresolved,
        annotationThreads,
        staleThreads,
        graphDiffs,
        activityTimeline,
        diagnostics,
        intentSummary,
        messages,
        proposals,
        nextActions: [
          "Read annotationThreads, pendingMessages and unresolvedAnnotations; annotationThreads.nextActor tells you whether the AI should reply or wait for a human.",
          "Treat detached/outdated threads in staleThreads as historical context only; ask the human to confirm or re-anchor before using them as current intent.",
          "Read graphDiffs for node/edge field changes such as path, group, kind, or label; do not infer visual edits from prose alone.",
          "Use create_visual_proposal to record change proposals; never write project files directly from this tool.",
          "Ask the human to approve a proposal in the panel before anything is applied.",
          "Use activityTimeline for compact chronology of messages, graph revisions, annotation threads, and proposal lifecycle events.",
          "Use diagnostics.signals and diagnostics.nextActions for a concise session health check; diagnostics never grants write authority.",
        ],
      };
      return {
        content: [{
          type: "text" as const,
          text: [
            `📡 协作会话 ${snapshot.id} · graphRevision ${snapshot.graphRevision}`,
            `Workspace: ${snapshot.workspaceRoot}`,
            `Pending human messages: ${pending.length} · unresolved annotations: ${unresolved.length}`,
            `Node-linked intents: ${intentByNode.length} · general annotations: ${generalAnnotations.length}`,
            `Annotation threads: ${annotationThreads.open} open / ${annotationThreads.total} · stale: ${staleThreads.length} · next actor: ${annotationThreads.nextActor}`,
            `Activity timeline: ${activityTimeline.returned}/${activityTimeline.total} events · latest ${activityTimeline.latestAt ?? "none"}`,
            `Graph diffs: ${graphDiffs.length} recent revisions`,
            `Diagnostics: ${diagnostics.signals.length} signals · ${diagnostics.nextActions.length} next actions`,
            ``,
            jsonLine({
              id: snapshot.id,
              workspaceRoot: snapshot.workspaceRoot,
              graphRevision: String(snapshot.graphRevision),
              pendingMessages: String(pending.length),
              unresolvedAnnotations: String(unresolved.length),
            }),
            ``,
            "CONTEXT_JSON:",
            JSON.stringify(payload, null, 2),
          ].join("\n"),
        }],
      };
    },
  );
}
