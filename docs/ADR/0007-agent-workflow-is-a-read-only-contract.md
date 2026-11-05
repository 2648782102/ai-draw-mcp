# ADR 0007: The agent workflow is a read-only contract

- Status: Accepted
- Date: 2026-11-06

## Decision

`get_agent_workflow` exposes a version 1 `WORKFLOW_JSON` derived from the current `SessionSnapshot`. It describes eight ordered steps from reading visual context to a layout-preserving rescan. Every step has explicit `requires`, `produces`, `readOnly`, `writes`, and a `grantsWriteAuthority: false` field. A `blocked` array tells the agent when a graph, stale annotation thread, or unanswered human handoff prevents proposal creation. The tool itself is read-only: it does not persist a step, create a proposal, approve a change, issue a receipt, or write a project file.

The contract distinguishes three levels of side effects:

- `writes: "none"` — derived context, templates, and preflight results.
- `writes: "session"` — conversation replies, pending proposals, approval state, and visual synchronization.
- `writes: "project"` — only `apply_visual_proposal`, guarded by human review, a one-time receipt, a content hash, path safety, atomic UTF-8 writes, and rollback.

Conversation replies are intentionally not labelled `readOnly: true`. They mutate session state, but never the project. This distinction lets an agent reason about state without confusing a chat reply with file-write authority.

## Alternatives

- Put the workflow only in prose documentation. This is cheap, but an LLM cannot verify the current graph revision, stale-thread count, or pending-message state from prose.
- Return a static step list with no session-derived fields. This avoids a new domain module, but cannot tell the agent to wait for a human or review a stale thread.
- Make the workflow tool execute or record steps. This turns descriptive guidance into another mutable state machine and risks creating an implicit authority channel.
- Allow the workflow to issue a receipt when all preconditions pass. This would erase the human-only approval boundary.

## Consequences

- Coding agents have a machine-readable sequence that reuses the existing `annotationThreads.nextActor`, `staleThreads`, `graphDiffs`, and proposal safety rules.
- `WORKFLOW_JSON` remains descriptive evidence, not a capability token. Server-side checks in `SessionStore.applyProposal()` remain the sole project-write gate.
- The workflow contract, tool count, tests, examples, and public docs must stay synchronized; `scripts/repo-check.mjs` and CI enforce this.
- Adding a step or changing a write target requires updating the ADR, the domain contract, tests, AGENTS.md, and public documentation.
