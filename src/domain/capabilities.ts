import { buildReviewReadiness } from "./review-readiness.js";
import { buildAgentWorkflow } from "./agent-workflow.js";
import type { Capabilities, SessionSnapshot } from "./types.js";

export const SERVER_TOOL_COUNT = 24;

const CAPABILITIES: Array<Capabilities["tools"][number]> = [
  { name: "render_diagram", group: "diagram", purpose: "Render arbitrary Mermaid DSL", output: "DIAGRAM_JSON", readOnly: false, writes: "output" },
  { name: "render_flowchart", group: "diagram", purpose: "Build and render a structured flowchart", output: "DIAGRAM_JSON", readOnly: false, writes: "output" },
  { name: "render_sequence", group: "diagram", purpose: "Build and render a sequence diagram", output: "DIAGRAM_JSON", readOnly: false, writes: "output" },
  { name: "render_architecture", group: "diagram", purpose: "Build and render an architecture/component graph", output: "DIAGRAM_JSON", readOnly: false, writes: "output" },
  { name: "render_class_diagram", group: "diagram", purpose: "Build and render a UML class diagram", output: "DIAGRAM_JSON", readOnly: false, writes: "output" },
  { name: "render_mindmap", group: "diagram", purpose: "Build and render a mind map", output: "DIAGRAM_JSON", readOnly: false, writes: "output" },
  { name: "render_svg", group: "diagram", purpose: "Render user-provided SVG source", output: "DIAGRAM_JSON", readOnly: false, writes: "output" },
  { name: "update_diagram", group: "diagram", purpose: "Update an existing diagram by ID", output: "DIAGRAM_JSON", readOnly: false, writes: "output" },
  { name: "delete_diagram", group: "diagram", purpose: "Delete an existing diagram and its output assets", output: "DIAGRAM_JSON", readOnly: false, writes: "output" },
  { name: "list_diagrams", group: "diagram", purpose: "List stored diagrams", output: "DIAGRAM_JSON", readOnly: true, writes: "none" },
  { name: "open_preview", group: "diagram", purpose: "Open the local preview panel in an IDE", output: "PREVIEW_JSON", readOnly: true, writes: "none" },
  { name: "scan_project", group: "collaboration", purpose: "Read the workspace and refresh the visual graph while preserving human state", output: "PRESERVATION_JSON", readOnly: false, writes: "session" },
  { name: "get_visual_context", group: "context", purpose: "Read full graph, intent, diagnostics, focus, viewport, and proposal context", output: "CONTEXT_JSON", readOnly: true, writes: "none" },
  { name: "get_capabilities", group: "context", purpose: "List the versioned tool/JSON surface, safe next action, and write boundary", output: "CAPABILITIES_JSON", readOnly: true, writes: "none" },
  { name: "get_agent_workflow", group: "context", purpose: "Read the ordered eight-step collaboration workflow contract", output: "WORKFLOW_JSON", readOnly: true, writes: "none" },
  { name: "get_shared_brief", group: "context", purpose: "Read a compact handoff brief with readiness blockers", output: "BRIEF_JSON", readOnly: true, writes: "none" },
  { name: "get_decision_trail", group: "context", purpose: "Read the intent-to-proposal chronology without approval grants", output: "DECISION_TRAIL_JSON", readOnly: true, writes: "none" },
  { name: "get_node_context", group: "context", purpose: "Read one focused node's evidence, threads, edges, and graph diffs", output: "NODE_CONTEXT_JSON", readOnly: true, writes: "none" },
  { name: "get_source_navigation", group: "context", purpose: "Derive copyable workspace-relative file:line hints from scanner evidence", output: "SOURCE_NAVIGATION_JSON", readOnly: true, writes: "none" },
  { name: "reply_to_visual_context", group: "collaboration", purpose: "Reply to human messages and node annotation threads", output: "REPLY_JSON", readOnly: false, writes: "session" },
  { name: "preflight_visual_proposal", group: "proposal", purpose: "Read-only check of candidate changes before a proposal exists", output: "PREFLIGHT_JSON", readOnly: true, writes: "none" },
  { name: "list_change_templates", group: "proposal", purpose: "List common change templates or expand a read-only draft", output: "DRAFT_JSON", readOnly: true, writes: "none" },
  { name: "create_visual_proposal", group: "proposal", purpose: "Record a pending proposal and its full line diff for human review", output: "PROPOSAL_JSON", readOnly: false, writes: "session" },
  { name: "apply_visual_proposal", group: "proposal", purpose: "Apply an approved proposal with a one-time human receipt", output: "APPLY_JSON", readOnly: false, writes: "project" },
];

const CONTRACTS: Capabilities["contracts"] = [
  { marker: "CAPABILITIES_JSON", purpose: "Bounded, read-only tool and safety catalogue", sideEffect: "none" },
  { marker: "WORKFLOW_JSON", purpose: "Ordered collaboration steps with write targets and blockers", sideEffect: "none" },
  { marker: "CONTEXT_JSON", purpose: "Full visual and conversational context for the AI", sideEffect: "none" },
  { marker: "BRIEF_JSON", purpose: "Compact handoff with readiness blockers", sideEffect: "none" },
  { marker: "DECISION_TRAIL_JSON", purpose: "Derived intent-to-proposal chronology; not a complete diff", sideEffect: "none" },
  { marker: "NODE_CONTEXT_JSON", purpose: "Single-node context projection", sideEffect: "none" },
  { marker: "SOURCE_NAVIGATION_JSON", purpose: "Copyable relative file:line hints; no IDE side effects", sideEffect: "none" },
  { marker: "REVIEW_READINESS_JSON", purpose: "Derived ready/review/blocked diagnostic", sideEffect: "none" },
  { marker: "PREFLIGHT_JSON", purpose: "Read-only candidate-change safety check", sideEffect: "none" },
  { marker: "PROPOSAL_JSON", purpose: "Pending proposal and full line diff for human review", sideEffect: "session" },
  { marker: "APPLY_JSON", purpose: "Receipt-gated UTF-8 project writes with rollback", sideEffect: "project" },
];

export function buildCapabilities(snapshot: SessionSnapshot, serverVersion: string): Capabilities {
  const workflow = buildAgentWorkflow(snapshot);
  const readiness = buildReviewReadiness(snapshot);
  const nextAction = workflow.blocked.length
    ? `Resolve WORKFLOW_JSON blockers first: ${workflow.blocked[0]}`
    : readiness.status === "blocked"
      ? "Resolve BRIEF_JSON blockers and DECISION_TRAIL_JSON gaps before drafting a proposal"
      : readiness.status === "review"
        ? "Review DECISION_TRAIL_JSON evidence gaps, then read get_visual_context before drafting a proposal"
        : "Read get_visual_context, then draft and preflight changes before create_visual_proposal";
  const copyText = [
    `AI Draw MCP ${serverVersion} · ${CAPABILITIES.length} tools · read-only capability catalogue`,
    `Session ${snapshot.id} · graphRevision ${snapshot.graphRevision} · workflow ${workflow.blocked.length ? "blocked" : "unblocked"} · review ${readiness.status}`,
    `Next safe action: ${nextAction}`,
    "Project writes require a full line diff, human approval, and a one-time receipt. Only apply_visual_proposal writes project files.",
    ...CAPABILITIES.map((tool) => `- ${tool.name} · ${tool.group} · ${tool.output} · readOnly=${tool.readOnly} · writes=${tool.writes}`),
  ].join("\n");
  return {
    version: 1,
    readOnly: true,
    serverVersion,
    sessionId: snapshot.id,
    graphRevision: snapshot.graphRevision,
    toolCount: CAPABILITIES.length,
    tools: CAPABILITIES,
    contracts: CONTRACTS,
    workflow: {
      version: 1,
      steps: workflow.steps.length,
      blocked: workflow.blocked,
      reviewReadiness: {
        status: readiness.status,
        blockers: readiness.brief.blockers.length,
        gaps: readiness.decisionTrail.gaps.length,
      },
      projectWriteTool: "apply_visual_proposal",
    },
    nextAction,
    copyText,
    guidance: [
      "CAPABILITIES_JSON is a descriptive, read-only catalogue; it never invokes tools or grants write authority.",
      "Use get_agent_workflow for ordered prerequisites and get_visual_context for the full current session state.",
      "Bounded projections such as BRIEF_JSON and DECISION_TRAIL_JSON do not replace the full proposal line diff.",
      "Approval in the panel does not write files; apply_visual_proposal still needs a valid one-time human receipt.",
    ],
    safety: {
      readOnly: true,
      grantsWriteAuthority: false,
      excludesApprovalGrants: true,
      projectWritesRequireHumanApproval: true,
      excludesWorkspaceAbsolutePaths: true,
    },
  };
}
