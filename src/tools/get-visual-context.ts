import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { jsonLine, type ToolContext } from "./_shared.js";

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
    },
    async ({ include_graph, message_limit, proposal_limit }) => {
      const snapshot = ctx.sessions.getSnapshot();
      const graph = include_graph === false ? undefined : snapshot.graph;
      const messages = ctx.sessions.getMessages(message_limit);
      const proposals = ctx.sessions.getProposals(proposal_limit);
      const pending = messages.filter((message) => message.author === "human" && message.status === "pending");
      const unresolved = graph?.annotations.filter((annotation) => !annotation.resolved) ?? [];
      const nodeLabels = new Map(graph?.nodes.map((node) => [node.id, node.label]) ?? []);
      const annotationsByNode = new Map<string, string[]>();
      const generalAnnotations: string[] = [];
      for (const annotation of unresolved) {
        if (annotation.nodeId) {
          const bucket = annotationsByNode.get(annotation.nodeId) ?? [];
          bucket.push(annotation.body);
          annotationsByNode.set(annotation.nodeId, bucket);
        } else {
          generalAnnotations.push(annotation.body);
        }
      }
      const intentByNode = graph?.nodes
        .filter((node) => annotationsByNode.has(node.id))
        .map((node) => ({
          nodeId: node.id,
          label: node.label,
          kind: node.kind,
          path: node.path,
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
        })) ?? [],
        guidance: "Use intentByNode and pendingMessages as the human's latest intent; create_visual_proposal should cite those nodes, then wait for human approval.",
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
        intentSummary,
        messages,
        proposals,
        nextActions: [
          "Read pendingMessages and unresolvedAnnotations to understand the human's intent.",
          "Use create_visual_proposal to record change proposals; never write project files directly from this tool.",
          "Ask the human to approve a proposal in the panel before anything is applied.",
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
