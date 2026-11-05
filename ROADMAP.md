# AI Draw MCP Roadmap

This roadmap is a product-direction document, not a support contract. It exists so contributors, AI coding agents, and early users can understand what belongs in the core and what should remain an integration.

Product principle: **the visual workspace is the shared language between humans and AI**. Rendering a diagram is useful; closing the loop from a visual edit to a reviewed, reversible project change is the product.

## Now — 0.3.x: trustworthy closed loop

- Keep the 22 MCP tools small, composable, and easy for an LLM to call correctly.
- Make CI reliable on Node 20, 22, and 24, including headless Chrome environments.
- Preserve the human approval gate: no project write without a proposal, a reviewable diff, and a one-time receipt.
- Improve first-run clarity: a 30-second Quickstart, troubleshooting, and a reproducible end-to-end demo.
- Publish consistent GitHub About, topics, release notes, and launch copy from versioned repository files.
- Keep the panel local-first and offline-capable; never require an account to use the core loop.

## Next — 0.4: a better visual conversation

- Diagnose readiness from `BRIEF_JSON` blockers and `DECISION_TRAIL_JSON` gaps with a versioned, read-only review projection in diagnostics and the panel; show the next safe action without replacing human approval.
- Add language-aware symbol ranges and IDE source-range navigation on top of bounded `file:line` evidence.
- Explore multi-diagram sessions over one workspace while keeping thread anchors and write authority explicit.
- Keep thread resolution separate from proposal approval and one-time write receipts; conversation controls must stay distinct from server-side write authorization.

## Shipped in 0.3.x maintenance

- `REVIEW_READINESS_JSON`: a derived, read-only projection that aggregates `BRIEF_JSON` blockers and `DECISION_TRAIL_JSON` evidence gaps into `ready` / `review` / `blocked`, surfaces a diagnostic signal and next action, and appears in the panel and reproducible workflow example without granting writes.
- A version 1 `EXPORT_MANIFEST_JSON` derived inventory for portable session bundles: counts, excluded credential/history/viewport fields, downgraded approval state, fixed read-only safety flags, and a suggested filename; strict import validation is unchanged; see [ADR 0014](docs/ADR/0014-export-manifest-is-a-derived-inventory.md).
- `get_decision_trail`: a versioned, read-only `DECISION_TRAIL_JSON` linking human intent, anchored/stale threads, graph diffs, bounded proposal change summaries, proposal stages, gaps, and activity events; full diff review and human approval remain mandatory; see [ADR 0013](docs/ADR/0013-decision-trail-is-a-read-only-projection.md).
- `get_node_context`: a versioned, read-only single-node projection of source evidence, annotation threads, adjacent edges, related graph diffs, and human focus; see [ADR 0010](docs/ADR/0010-node-context-is-a-read-only-projection.md).
- `get_shared_brief`: a versioned, read-only `BRIEF_JSON` handoff projection for humans and AI, with readiness blockers, bounded intent, latest graph diff, evidence, and next actions; see [ADR 0011](docs/ADR/0011-shared-brief-is-a-read-only-projection.md).
- Human viewport attention: bounded, human-panel zoom/pan state is authenticated with the injected panel token and exposed to AI through `CONTEXT_JSON` / `BRIEF_JSON` / diagnostics without graph revisions, timeline noise, bundles, or write authority; see [ADR 0012](docs/ADR/0012-viewport-is-read-only-attention-context.md).
- Bounded read-only `file:line` source evidence for source/Markdown nodes, exposed to AI, diagnostics, the panel, and strictly validated bundles; see [ADR 0009](docs/ADR/0009-source-evidence-is-read-only-context.md).
- Bounded, human-confirmed visual undo/redo: restores `VisualGraph` snapshots as new revisions with field-level diffs, while never reversing project writes, proposals, or approval grants; see [ADR 0008](docs/ADR/0008-visual-undo-is-not-project-undo.md).
- `get_agent_workflow`: a versioned, read-only eight-step `WORKFLOW_JSON` with prerequisites, readiness blockers, explicit `none` / `session` / `project` write targets, and a reproducible CI example; see [ADR 0007](docs/ADR/0007-agent-workflow-is-a-read-only-contract.md).
- Stable-path project scans: deterministic IDs, human-coordinate/custom-label preservation, annotation/focus migration, incremental auto-layout, a human-confirmed panel rescan, and a read-only preservation summary; see [ADR 0006](docs/ADR/0006-stable-scan-preserves-human-visual-state.md).
- `list_change_templates`: a read-only catalogue and draft expander for update-documentation, add-test, and create-module intents; drafts must still pass preflight and human review.
- Field-level graph revision diffs with a strict portable-bundle contract, expandable panel details, and derived `graph_diff` timeline events.
- Versioned human focus: the selected node is readable by AI, refreshed on graph edits, strictly validated in bundles, and kept separate from write authority.
- A copyable, read-only AI context prompt in the panel that references focus, diagnostics, graph revisions, and the required approval workflow without issuing credentials.
- A copyable, read-only `BRIEF_JSON` shared handoff in the panel and MCP for compact status updates.
- Bounded human viewport attention in `CONTEXT_JSON` / `BRIEF_JSON` / diagnostics, without graph revisions, timeline noise, bundles, or write authority.
- Read-only `preflight_visual_proposal` for path, filesystem-state, duplicate, and no-op change checks before a proposal is created.
- Per-proposal impact summary, portable session bundle import/export, and a `doctor` command with IDE/browser remediation hints.
- Add, remove, rename, and retype nodes from the panel.
- Add, remove, and reconnect edges without editing Mermaid source.
- Select a node and pin an annotation to it; AI messages include the target node label.
- Node-linked annotation threads with one root thread per pin, ordered human/AI replies, resolve/reopen, an AI-readable next-actor queue, and validated portable replies in session bundles.
- A compact derived activity timeline for messages, annotation threads, thread states, and proposal lifecycle events in the panel and `get_visual_context`.
- Versioned annotation-thread anchor states: `anchored` / `outdated` / `detached`, human-confirmed re-anchoring, and AI-readable `staleThreads` that keeps stale discussion out of current intent.
- Validate graph IDs, required fields, and edge/annotation references on the server.

## Later — 0.5: deeper project intelligence

- Language-aware scanners that surface precise symbol ranges, tests, and framework boundaries beyond the current bounded line-evidence heuristics.
- A bidirectional mapping between graph nodes and source ranges so humans can click from a node to code.
- Review checkpoints: dry-run, test-command suggestions, and optional Git worktree isolation for applied proposals.
- Multi-diagram sessions: architecture, flow, and sequence views over the same workspace.
- Plugin adapters for additional MCP clients and diagram editors, without making them core dependencies.

## Horizon — 1.0: an open protocol for visual intent

- Stabilize a versioned `VisualGraph` and `ChangeProposal` protocol with compatibility tests and migration notes.
- Define an extension API for scanners, renderers, proposal generators, and policy checks.
- Optional shareable read-only visual reviews that do not grant project-write capability.
- Governance: published decision records, contributor ladder, release cadence, and measurable adoption goals.

## Non-goals

- A hosted multi-user SaaS or an account wall for local use.
- A general-purpose whiteboard competing with Miro, FigJam, Excalidraw, or tldraw on freehand canvas features.
- A cloud diagram library that owns the source of truth instead of the developer's repository.
- Autonomous project writes that bypass human review, diffs, and one-time approval.
- Binary file edits, deletion operations, or broad filesystem permissions.

## How to propose a roadmap change

Open an issue with the user problem, the smallest end-to-end demo, and the safety implications. Changes to the proposal or approval protocol must include migration tests and an update to `docs/ARCHITECTURE.md`, `AGENTS.md`, and `SECURITY.md`.
