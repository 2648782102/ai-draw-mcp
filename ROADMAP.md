# AI Draw MCP Roadmap

This roadmap sequences work toward the product contract in [docs/PRODUCT_DIRECTION.md](docs/PRODUCT_DIRECTION.md). The shared visual board is the product; MCP is the AI access channel. The repository remains the source of truth for code.

## Current baseline — 0.3.4

- Local MCP stdio server with 26 tools for project scans, diagrams, graph context, proposals, and approval-gated writes.
- Agent-first MCP discovery: initialization instructions and five read-only `ai-draw://board/*` resources expose session, brief, capabilities, diagnostics, and the optional panel URL inside the agent. Generated tools default to no window side effects; `open_preview` and `AI_DRAW_AUTO_OPEN_PANEL` are opt-in human paths. See [ADR 0024](docs/ADR/0024-agent-first-mcp-surface.md).
- Local browser canvas with project scanning, editable nodes and edges, focus, selection, annotations, AI-readable context, and proposal review.
- Version 1 session, graph, annotation, and proposal contracts with source evidence, graph diffs, and bounded read-only projections.
- Shared board notes persist; people and AI can reply in the same anchored thread. Copyable AI context is a separate read-only utility.
- The default panel is one board header, one shared canvas, and one fixed object inspector. The legacy brand header, Flow rail, duplicate render toolbar, and floating status cards are out of the default view. The diagram library is an on-demand drawer for local previews and downloads; the review surface holds graph editing, derived context, and change diffs. `docs/shared-board-panel.png` is the canonical shared-board capture. Legacy UI screenshots were removed so the repository has one current visual baseline.

## Phase 0 — Product contract

Define the board as the shared communication surface, record the decision in ADR 0022, and align public and contributor-facing descriptions. **Status: complete.**

## Phase 1 — Shared communication loop

- Add a human reply control to existing annotation threads and persist replies through the current endpoint.
- Make the selected object's note and reply thread the primary human communication path; keep notes attached to their graph anchor and revision.
- Keep AI replies visible in the same thread and preserve order, author, pending/resolved state, and stale-anchor behavior.
- Remove or redirect the separate clipboard-only composer; reuse session and annotation contracts instead of adding a second message store or conversation state machine.
- Preserve the distinction between discussion and project-write approval.

**Status:** complete. Implemented with the existing version 1 annotation and reply contracts, an in-thread human reply control, a persistent ordered exchange, and a browser regression. No code changes without a separate approved proposal.

## Phase 2 — Canvas-first experience

- Make the graph the default workspace and keep the selected node, edge, or region's evidence and notes close by.
- Simplify navigation and remove repeated workflow/status summaries from the default view.
- Keep proposal diff review in a focused secondary surface linked to its originating visual intent.
- Rewrite first-run guidance and publish one canonical screenshot of the shared loop.

**Status:** implemented. The canvas is the default view; one board header carries identity, state, and actions; the fixed object inspector shows the selected object, evidence, relations, ordered human/AI notes, and accepts an in-place reply; first-run guidance can scan the project directly; the on-demand library separates historical diagram previews from the active board; review opens as a secondary surface. `docs/shared-board-panel.png` is the canonical screenshot.

**Acceptance:** a new user can see the AI's project understanding, correct it on the canvas, and locate the related AI response and proposal without learning tool names or following a fixed sequence. Keyboard and narrow-screen behavior remain covered by browser regressions.

## Phase 3 — Trustworthy project context

- Improve source and relationship evidence based on concrete scan gaps.
- Show evidence freshness, uncertain inferences, and stale anchors clearly.
- Preserve visual intent and traceability across project rescans.

**Acceptance:** a person can inspect the repository evidence behind a visual claim and recognize when the board needs correction or rescanning.

## Phase 4 — Safe code-change loop

- Tie selected visual intent and notes to the existing proposal preflight and proposal creation flow.
- Show the full line diff and impact summary alongside the graph context that motivated the proposal.
- Preserve the existing human approval, one-time receipt, path-safety, atomic-write, and rollback boundaries.
- Rescan after application and connect the resulting graph revision to the reviewed intent.

**Acceptance:** each applied code change can be traced from human intent on the board through proposal, approval, and the resulting project graph.

## Non-goals

- Hosted multi-user SaaS or mandatory accounts.
- A general-purpose freehand whiteboard or an independent general chat product.
- A cloud diagram library that replaces the developer's repository as source of truth.
- AI project writes that bypass a complete diff, explicit human approval, a one-time receipt, and path-safety checks.
- Binary edits, project-file deletion, or broad filesystem permissions.

## Changing this roadmap

Open an issue with the user problem, the smallest end-to-end demonstration, and safety implications. Protocol or persistence changes require a new ADR, compatibility and migration coverage, and updates to [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [AGENTS.md](AGENTS.md), and [SECURITY.md](SECURITY.md).
