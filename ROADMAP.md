# AI Draw MCP Roadmap

This roadmap is a product-direction document, not a support contract. It exists so contributors, AI coding agents, and early users can understand what belongs in the core and what should remain an integration.

Product principle: **the visual workspace is the shared language between humans and AI**. Rendering a diagram is useful; closing the loop from a visual edit to a reviewed, reversible project change is the product.

## Now — 0.3.x: trustworthy closed loop

- Keep the 19 MCP tools small, composable, and easy for an LLM to call correctly.
- Make CI reliable on Node 20, 22, and 24, including headless Chrome environments.
- Preserve the human approval gate: no project write without a proposal, a reviewable diff, and a one-time receipt.
- Improve first-run clarity: a 30-second Quickstart, troubleshooting, and a reproducible end-to-end demo.
- Publish consistent GitHub About, topics, release notes, and launch copy from versioned repository files.
- Keep the panel local-first and offline-capable; never require an account to use the core loop.

## Next — 0.4: a better visual conversation

- Keep expanding structured graph editing: add a bounded visual undo/redo stack beyond the current add/remove/reconnect controls and layout-preserving rescans.
- Filtered stale-thread counts, decisive replies, and timelines linked to proposal diffs.
- Per-proposal impact summary: touched paths, line counts, detected existing files, and safety notices.
- Export and import a collaboration session as a portable JSON artifact for bug reports and examples.
- A richer `doctor` command that reports IDE config locations, browser detection, and remediation commands.
- Filtered stale-thread counts, decisive replies, and timelines linked to proposal diffs.
- Keep thread resolution separate from proposal approval and one-time write receipts; conversation controls must stay distinct from server-side write authorization.

## Shipped in 0.3.x maintenance

- `get_agent_workflow`: a versioned, read-only eight-step `WORKFLOW_JSON` with prerequisites, readiness blockers, explicit `none` / `session` / `project` write targets, and a reproducible CI example; see [ADR 0007](docs/ADR/0007-agent-workflow-is-a-read-only-contract.md).
- Stable-path project scans: deterministic IDs, human-coordinate/custom-label preservation, annotation/focus migration, incremental auto-layout, a human-confirmed panel rescan, and a read-only preservation summary; see [ADR 0006](docs/ADR/0006-stable-scan-preserves-human-visual-state.md).
- `list_change_templates`: a read-only catalogue and draft expander for update-documentation, add-test, and create-module intents; drafts must still pass preflight and human review.
- Field-level graph revision diffs with a strict portable-bundle contract, expandable panel details, and derived `graph_diff` timeline events.
- Versioned human focus: the selected node is readable by AI, refreshed on graph edits, strictly validated in bundles, and kept separate from write authority.
- A copyable, read-only AI context prompt in the panel that references focus, diagnostics, graph revisions, and the required approval workflow without issuing credentials.

- Read-only `preflight_visual_proposal` for path, filesystem-state, duplicate, and no-op change checks before a proposal is created.
- Add, remove, rename, and retype nodes from the panel.
- Add, remove, and reconnect edges without editing Mermaid source.
- Select a node and pin an annotation to it; AI messages include the target node label.
- Node-linked annotation threads with one root thread per pin, ordered human/AI replies, resolve/reopen, an AI-readable next-actor queue, and validated portable replies in session bundles.
- A compact derived activity timeline for messages, annotation threads, thread states, and proposal lifecycle events in the panel and `get_visual_context`.
- Versioned annotation-thread anchor states: `anchored` / `outdated` / `detached`, human-confirmed re-anchoring, and AI-readable `staleThreads` that keeps stale discussion out of current intent.
- Validate graph IDs, required fields, and edge/annotation references on the server.

## Later — 0.5: deeper project intelligence

- Language-aware scanners that surface imports, symbols, tests, and framework boundaries beyond the current file-tree scanner.
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
