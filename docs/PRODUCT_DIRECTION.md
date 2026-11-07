# Product Direction

This document is the product contract for contributors, maintainers, and AI coding agents. `ROADMAP.md` turns it into sequenced work; architecture and ADRs describe the implementation and safety contracts.

## Definition

**AI Draw MCP is a local-first visual communication board where a person and an AI share, correct, and advance an understanding of a software project.** The AI connects through MCP and expresses its project model on the canvas. The person steers that model by editing structure, selecting scope, and attaching intent to visual objects. The AI reads those changes and responds through updated graph state, contextual notes, and reviewable proposals.

The board is the shared context. MCP is the AI access channel. The source repository remains the source of truth for code.

## Product promise

When a person changes or comments on something in the board, the AI can identify what the person means and why. When the AI changes its understanding, the person can see what changed, what evidence supports it, and what remains uncertain. Both sides work against the same project graph and revision history.

The main interaction is visual and contextual: nodes, relationships, selected regions, evidence, annotations, and graph revisions. Text belongs beside the object or scope it explains. A standalone general-purpose chat stream is not the product surface.

## Shared loop

```text
AI scans the project through MCP
  → AI publishes a structured project graph with source evidence
  → person edits the graph, selects scope, or adds an anchored note
  → those changes become durable board context
  → AI reads the same revision and responds on the board
  → when code should change, AI creates a proposal tied to the context
  → person reviews the complete diff and approves it
  → AI applies the one-time approval and rescans the project
```

The loop can pause or repeat at any point. Reading, correcting, and discussing the graph do not require a code-change proposal.

## Product model

- **Project graph:** an editable visual model of project structure, relationships, and bounded source evidence. It is a shared working representation, not a replacement for repository files.
- **Human intent:** graph edits, focus, selection, and notes attached to a node, edge, or current scope. The intent records who added it and which graph revision it refers to.
- **AI response:** explanations, contextual replies, and graph revisions that remain visible in the same board session and retain their source and revision context.
- **Change proposal:** an optional transition from board intent to code changes. It includes affected paths, a complete line diff, and an impact summary.
- **Approval:** a separate human decision that authorizes one specific proposal. Board discussion, graph edits, and AI responses never authorize project writes.

## Experience principles

1. **Open on the shared canvas.** A person should understand the project and current discussion without first learning MCP tool names or navigating a workflow dashboard.
2. **Keep intent attached to meaning.** A note about a module belongs to that node; a question about a relationship belongs to that edge; broad intent belongs to the selected scope or board.
3. **Make both authors visible.** Distinguish human input, AI interpretation, source evidence, and generated proposals, with enough revision context to understand what changed.
4. **Show evidence and uncertainty.** Connect claims to repository-relative source locations where available. Mark gaps instead of presenting inferred structure as certain.
5. **Keep the surface small.** The default view prioritizes canvas, current selection, and relevant notes. Diagnostics and derived JSON projections remain available on demand for agents and maintainers.
6. **Keep project writes explicit.** The person reviews the full diff and approves the exact proposal; the AI applies it using the one-time receipt and existing path-safety checks.
7. **Stay local-first.** The board works with the local project and MCP host without requiring an account or hosted collaboration service.

## Boundaries

- This is a project communication board, not a static diagram exporter.
- It is not a general-purpose freehand whiteboard or a hosted multi-user SaaS.
- It does not need a separate chat product, social presence, or mandatory turn-taking workflow. Contextual notes and replies serve the shared visual model.
- It does not let the AI write project files directly from a conversation, graph edit, or annotation. Every project write goes through a proposal, human-reviewed full diff, explicit approval, one-time receipt, path validation, and `SessionStore.applyProposal()`.
- The version 1 MCP and session contracts remain compatibility boundaries. Product realignment should reuse existing graph, message, annotation, focus, selection, and proposal capabilities where possible; any protocol change requires an ADR, migration plan, and compatibility coverage.

## Current implementation gap

The repository already has project scanning, editable graphs, selection and focus, persistent board notes with human replies, AI replies in the same annotation threads, proposals, full diff review, and the approval gate. The primary human input now saves a note to the focused object or current board scope instead of copying a draft, and every thread has an in-place human reply control. Copyable read-only context remains a separate utility. The panel's default information hierarchy and first-run path still carry legacy tool-status and review-flow framing; Phase 2 continues that canvas-first cleanup. This document and ADR 0022 set the product direction; the phases below close the remaining presentation and evidence gaps without claiming they are already fixed.

## Delivery plan

### Phase 0 — Align the product contract

- Make this document authoritative and supersede ADR 0020's MCP-tool-first product hierarchy.
- Align README, English quickstart, architecture overview, `AGENTS.md`, goal-mode guidance, launch copy, package metadata, and the offline repository checks.
- Mark existing screenshots and UI copy as the current implementation baseline where they do not yet express the new direction.

**Status:** product definition, ADR, roadmap, contributor guidance, public copy, and canonical preview references are aligned. Product implementation has started with the Phase 1 shared-loop slice.

### Phase 1 — Restore the shared communication loop

- Audit the existing message and annotation endpoints, persisted session model, and `get_visual_context` / `reply_to_visual_context` tools before adding protocol state.
- Reuse persisted node annotations and the existing `/api/collab/annotations/:id/reply` endpoint; the AI already replies through `reply_to_visual_context` and those replies are rendered in the panel.
- **Implemented:** the primary human input saves a note to the focused node, or to the board scope when no node is focused, through the existing annotation contract. The clipboard-only composer is gone; copy failures use a separate read-only text box.
- **Implemented:** each thread has an in-place human reply control. Replies retain author and ordering through the existing endpoint and the same thread refreshes in place.
- Preserve pending/resolved state, graph revision and anchor status. Keep broad notes associated with the board or selected scope only where existing contracts support it; do not invent a second message store.

**Status: implemented and browser-regressed.** A person can add a node or scope note, see the AI reply in that thread, and reply again from the same board without copy/paste; an MCP client reads the ordered exchange with its visual context. Reloading preserves the thread, and no project-write path is introduced.

### Phase 2 — Make the canvas the primary workspace

- Use one default canvas with a contextual inspector for the current node, edge, or selection; keep notes and AI responses next to their visual anchors.
- Move proposal review into a focused, secondary review surface that returns to the same graph context.
- Remove duplicate progress rails, repeated status summaries, and technical projection cards from the default view; retain useful details behind deliberate expand actions.
- Use consistent plain-language names and a compact set of visual states for human input, AI response, evidence, unresolved intent, and proposed code changes.
- Rework first-run guidance and capture one canonical screenshot that demonstrates the shared board loop.

**Complete when:** a first-time user can identify the shared project model, add a contextual correction, see the AI-side update, and find code review without navigating a multi-step dashboard. Keyboard, narrow-screen, empty, loading, and error states remain usable.

### Phase 3 — Ground the board in project evidence

- Improve scanner evidence and graph relationships based on observed user gaps, prioritizing trustworthy file and symbol links over additional derived status projections.
- Make evidence freshness and uncertainty visible when a scan is incomplete or source anchors have moved.
- Keep graph revisions and contextual notes traceable across rescans without treating stale discussion as current intent.

**Complete when:** a person can inspect why a node or edge exists, and both human and AI can recognize when its evidence needs another scan or correction.

### Phase 4 — Connect visual intent to safe code changes

- Connect a board note or selected graph scope to the existing proposal preflight and proposal creation tools.
- Present the exact affected files and full line diff in context of the graph intent that motivated them.
- Keep approval, one-time receipt, path safety, atomic application, and failure rollback unchanged.
- Refresh the board after application and show which visual intent the resulting graph revision addresses.

**Complete when:** the person can trace a change from board intent to proposal and applied project revision, while every write still passes the existing human approval boundary.

## First implementation slice

Start with Phase 1. Reuse the existing session and collaboration API where it fits; do not add a second message store or new conversation state machine by default. Implement and verify this end-to-end path before redesigning the whole page:

1. Human selects a graph object and adds an anchored note using the existing annotation contract.
2. An MCP client reads the note; the AI replies to that annotation using the existing MCP capability.
3. The panel shows the reply in the same thread and lets the human continue that thread through the existing reply endpoint.
4. Refreshing the panel preserves the ordered human/AI exchange and its anchor state.
5. The generic clipboard-only composer is removed or redirected into this contextual path.
6. No project file changes unless a separate proposal is reviewed and approved.

The first slice is successful when a fresh local session demonstrates a complete human → AI → human exchange attached to a graph object, with no clipboard handoff and no new persistence protocol.
