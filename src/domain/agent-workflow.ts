import { summarizeAnnotationThreads } from "./annotation-thread.js";
import type { AgentWorkflow, SessionSnapshot, WorkflowStep } from "./types.js";

export function buildAgentWorkflow(snapshot: SessionSnapshot): AgentWorkflow {
  const annotations = snapshot.graph?.annotations ?? [];
  const threads = summarizeAnnotationThreads(snapshot.graph);
  const staleAnnotations = threads.threads.filter((thread) => thread.anchorStatus !== "anchored").length;
  const pendingMessages = snapshot.messages.filter((message) =>
    message.author === "human" && message.status === "pending").length;
  const pendingProposals = snapshot.proposals.filter((proposal) => proposal.status === "pending").length;
  const approvedProposals = snapshot.proposals.filter((proposal) => proposal.status === "approved").length;
  const nextActor = threads.nextActor === "none" && pendingMessages > 0 ? "ai" : threads.nextActor;
  const replyActor = nextActor === "human" ? "human" : "ai";
  const replyUsesTool = replyActor === "ai";
  const blocked: string[] = [];
  if (!snapshot.graph) blocked.push("No VisualGraph is available; ask the AI to call scan_project first.");
  if (staleAnnotations > 0) blocked.push(`${staleAnnotations} stale annotation thread(s) require human review or re-anchoring before they become current intent.`);
  if (nextActor === "human") blocked.push("The conversation is waiting for a human; do not create or apply a proposal from an unanswered handoff.");

  const steps: WorkflowStep[] = [
    {
      version: 1,
      order: 1,
      id: "visual_context",
      actor: "ai",
      tool: "get_visual_context",
      input: ["get_agent_workflow WORKFLOW_JSON", "current SessionSnapshot", "graphDiffs", "sourceEvidence", "annotationThreads", "focus", "activityTimeline"],
      output: ["CONTEXT_JSON", "BRIEF_JSON", "NODE_CONTEXT_JSON", "DECISION_TRAIL_JSON", "intentSummary", "nextActor", "sourceEvidence", "diagnostics"],
      requires: ["A collaboration session exists in OUTPUT_DIR/.ai-draw/session.json", "The AI has read this workflow contract"],
      produces: ["readable human intent"],
      readOnly: true,
      writes: "none",
      grantsWriteAuthority: false,
      description: "Read the graph, pending messages, threads, focus, graph diffs, read-only file:line source evidence, and diagnostics before proposing anything; get_shared_brief can compactly hand off readiness blockers, get_node_context can narrow the focused node, and get_decision_trail can optionally review intent → graph edit → proposal chronology, none of which grants write authority.",
    },
    {
      version: 1,
      order: 2,
      id: "reply_or_wait",
      actor: replyActor,
      tool: replyUsesTool ? "reply_to_visual_context" : undefined,
      panelAction: replyUsesTool ? undefined : "Review the latest thread or send a message",
      input: ["annotationThreads.nextActor", "staleThreads", "pendingMessages"],
      output: replyUsesTool ? ["answered messages", "thread replies", "resolved state"] : ["clean conversation handoff"],
      requires: ["get_visual_context output", "staleThreads are excluded from current intent"],
      produces: ["a clean conversation handoff"],
      readOnly: !replyUsesTool,
      writes: replyUsesTool ? "session" : "none",
      grantsWriteAuthority: false,
      description: replyUsesTool
        ? "Reply only when the thread protocol says it is the AI's turn; conversation replies are session state, not project writes."
        : "Wait for the human; stale threads require human review and never become current intent.",
    },
    {
      version: 1,
      order: 3,
      id: "draft",
      actor: "ai",
      tool: "list_change_templates",
      input: ["graphRevision", "focused or cited node", "complete UTF-8 content for updates"],
      output: ["DRAFT_JSON", "changes", "citedNodeIds", "guidance"],
      requires: ["readable human intent", "current graphRevision"],
      produces: ["read-only candidate changes"],
      readOnly: true,
      writes: "none",
      grantsWriteAuthority: false,
      description: "Expand a common intent into a draft. This step creates no proposal, writes no file, and issues no receipt.",
    },
    {
      version: 1,
      order: 4,
      id: "preflight",
      actor: "ai",
      tool: "preflight_visual_proposal",
      input: ["DRAFT_JSON.changes"],
      output: ["PREFLIGHT_JSON", "safe", "blockers", "warnings", "findings"],
      requires: ["candidate changes"],
      produces: ["a safe preflight verdict"],
      readOnly: true,
      writes: "none",
      grantsWriteAuthority: false,
      description: "Check paths, filesystem state, create/update direction, duplicates, encoding, and size before creating a proposal.",
    },
    {
      version: 1,
      order: 5,
      id: "proposal",
      actor: "ai",
      tool: "create_visual_proposal",
      input: ["preflight-safe changes", "title", "summary", "cited node IDs"],
      output: ["PROPOSAL_JSON", "contentHash", "pending proposal"],
      requires: ["safe === true", "blockers === 0", "staleThreads === 0", "annotationThreads.nextActor is not human"],
      produces: ["human-reviewable proposal and line diff"],
      readOnly: false,
      writes: "session",
      grantsWriteAuthority: false,
      description: "Record a pending proposal in the session. It does not write project files or approve itself.",
    },
    {
      version: 1,
      order: 6,
      id: "human_review",
      actor: "human",
      panelAction: "Inspect the line diff and impact summary, then approve",
      input: ["pending proposal", "line diff", "impact summary"],
      output: ["approved proposal", "one-time approval receipt"],
      requires: ["human inspected the line diff"],
      produces: ["one-time receipt for the AI"],
      readOnly: false,
      writes: "session",
      grantsWriteAuthority: false,
      description: "Approval alone does not write files; the human must pass the one-time receipt to the AI.",
    },
    {
      version: 1,
      order: 7,
      id: "apply",
      actor: "ai",
      tool: "apply_visual_proposal",
      input: ["proposal_id", "approval_id", "approval_grant", "approval_expires_at", "approved_by=human"],
      output: ["applied proposal or failed proposal with rollback"],
      requires: ["valid one-time receipt", "matching contentHash", "approved_by=human"],
      produces: ["UTF-8 project file writes"],
      readOnly: false,
      writes: "project",
      grantsWriteAuthority: false,
      description: "Only this step may write project files; path safety, atomic writes, and rollback remain enforced server-side.",
    },
    {
      version: 1,
      order: 8,
      id: "rescan",
      actor: "ai",
      tool: "scan_project",
      input: ["AI_DRAW_WORKSPACE_ROOT"],
      output: ["PRESERVATION_JSON", "refreshed VisualGraph", "graphRevision"],
      requires: ["applied proposal or changed workspace"],
      produces: ["graph aligned with source tree"],
      readOnly: false,
      writes: "session",
      grantsWriteAuthority: false,
      description: "Rescan reads project files and synchronizes visual state; it preserves human layout, threads, and focus without writing source files.",
    },
  ];
  return {
    version: 1,
    sessionId: snapshot.id,
    graphRevision: snapshot.graphRevision,
    activeDiagramId: snapshot.activeDiagramId,
    focus: snapshot.focus ? {
      nodeId: snapshot.focus.nodeId,
      nodeLabel: snapshot.focus.nodeLabel,
      nodePath: snapshot.focus.nodePath,
    } : undefined,
    graph: snapshot.graph ? {
      nodes: snapshot.graph.nodes.length,
      edges: snapshot.graph.edges.length,
      annotations: annotations.length,
      staleAnnotations,
    } : undefined,
    conversation: { pendingMessages, nextActor },
    proposals: { pending: pendingProposals, approved: approvedProposals },
    blocked,
    steps,
    safety: [
      "Read-only steps never create proposals, write project files, or issue approval receipts.",
      "Conversation state, focus, graph diffs, diagnostics, templates, and preflight results never grant write authority.",
      "Only apply_visual_proposal with a valid one-time human receipt may write project files.",
      "Stale annotation threads must be reviewed or re-anchored by a human before they are treated as current intent.",
      "Rescans preserve human visual state and remain separate from the project-write approval boundary.",
    ],
  };
}
