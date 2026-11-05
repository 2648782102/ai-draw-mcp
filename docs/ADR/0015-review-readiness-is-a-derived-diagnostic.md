# ADR 0015: Review readiness is a derived diagnostic

- Status: Accepted
- Date: 2026-11-06

## Decision

`GET /api/collab/review-readiness` returns a version 1 `REVIEW_READINESS_JSON` derived from the current `SessionSnapshot`. The builder composes the already accepted `buildSharedBrief()` and `buildDecisionTrail()` projections, then summarizes their readiness blockers and evidence gaps as a bounded `ready`, `review`, or `blocked` status.

The same projection appears in `CONTEXT_JSON.diagnostics.reviewReadiness`, a diagnostic signal, a next-action hint, the local panel, and the reproducible agent workflow example. It is a diagnostic, not a second persisted workflow state. Every result carries `readOnly: true`, `grantsWriteAuthority: false`, `excludesApprovalGrants: true`, and `projectWritesRequireHumanApproval: true`.

`BRIEF_JSON` blockers become `action` review points and produce `blocked`; `DECISION_TRAIL_JSON` gaps become `warning` review points and produce `review` when no blocker exists; a session with neither becomes `ready`. The status never approves, rejects, creates, or applies a proposal. It never replaces the full proposal line diff, which remains the review source before human approval.

## Rationale

The shared brief and the decision trail each answer useful but separate questions: "what is the next safe action?" and "how did the current proposal state arise?" Coding agents were still required to join those two views mentally before proposing a change. A small derived status reduces that assembly cost without adding a new authority, persisted state machine, or tool that can accidentally skip full diff review.

Reusing two accepted read-only builders keeps the signal consistent with the same session snapshot. A status of `blocked` or `review` is deliberately conservative: it asks the human/AI pair to resolve evidence questions, not to treat the summary as a permission to write. The fixed safety fields make the boundary machine-readable in MCP responses, HTTP results, and exported prompts.

## Alternatives

- **Add a 23rd MCP tool:** rejected because the signal is a compact aggregation of existing context; putting it in diagnostics and a panel endpoint avoids tool-surface growth.
- **Persist a readiness state in `SessionSnapshot`:** rejected because readiness is derived point-in-time evidence and a stored copy would drift from messages, threads, graph diffs, and proposals.
- **Let `ready` suppress full diff review:** rejected because readiness is only a conversation/evidence diagnostic; only a human-reviewed full line diff, approval, and a one-time receipt may lead to a project write.
- **Include approval grants or a receipt status:** rejected because derived shared context must never become a reusable credential.
- **Return scores or unbounded event bodies:** rejected because agents need a small deterministic status with explicit sources, not a second full chronology.

## Consequences

- `buildSessionDiagnostics()` now includes a compact `reviewReadiness` field and a bounded `review_readiness` signal when blockers or gaps exist.
- The local panel fetches and renders the same `REVIEW_READINESS_JSON`; the workflow example verifies that diagnostics carry the projection before preflight.
- Offline repository checks guard the pure builder, HTTP endpoint, diagnostics, panel, docs, examples, ADR index, and tests.
- A `ready` status still requires `get_visual_context`, full diff review, human approval, a one-time receipt, path safety, and rollback before any project write.

## Safety invariant

`REVIEW_READINESS_JSON` is read-only evidence aggregation. It never writes session or project files, persists a duplicate decision log, exports approval grants, changes proposal state, or grants write authority. Only `apply_visual_proposal` with a valid one-time human receipt retains project-write capability.
