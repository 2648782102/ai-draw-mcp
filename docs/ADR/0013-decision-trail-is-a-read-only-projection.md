# ADR 0013: Decision trail is a read-only projection

- Status: Accepted
- Date: 2026-11-06

## Decision

`get_decision_trail` and `GET /api/collab/decision-trail` return a version 1 `DECISION_TRAIL_JSON` derived from the current `SessionSnapshot`. It links pending human messages, unresolved anchored annotation threads, stale discussion, graph revision diffs, bounded proposal change summaries, proposal stages, and the existing activity timeline into one chronological, evidence-labelled view.

The trail is descriptive only. It is not persisted in the session or bundle, does not change focus, threads, proposals, graph revisions, approval grants, or project files, and never grants write authority. `approvalId`, `approvalGrant`, `approvalExpiresAt`, metadata credentials, and any usable confirmation receipt are excluded by projecting explicitly named safe fields. `safety.readOnly` is `true` and `safety.grantsWriteAuthority` is `false`.

Stale unresolved threads are historical evidence, not current intent. A `gaps` list names missing or uncertain evidence, including a missing graph, stale threads, unanswered human handoffs, and change summaries without line evidence. Proposal change lines are a bounded add-line projection of proposed content, not a complete diff; humans and AI must still use `/api/collab/proposals/:id/diff` or the panel's line-by-line view before approval.

## Rationale

The existing activity timeline describes what happened, while `BRIEF_JSON` describes the current handoff. Neither answers "which human intent led to which visual edit, and which proposal is claimed to satisfy it?" in a compact, reviewable form. A derived trail reduces the chance that an AI reconstructs a decision from prose or presents an approved proposal as if it were a write grant. Bounded limits, clipping, safe-field projection, and explicit gaps keep the view useful in an LLM context without turning it into a second source of truth.

## Alternatives

- **Persist an append-only decision log:** rejected because it would duplicate messages, threads, graph diffs, and proposal status events; the current snapshot plus derived timeline is already reviewable and easier to keep consistent.
- **Embed complete proposal diffs:** rejected because review belongs in the full diff endpoint and panel; a compact trail should not encourage approval from a truncated projection.
- **Include the approval receipt status or grant hash:** rejected because derived context must never become a credential or be pasted into an Issue by accident.
- **Treat resolved or stale discussions as current intent:** rejected because resolution is conversation state and stale anchors require human confirmation.
- **Let the trail auto-apply approved proposals:** rejected because only `apply_visual_proposal` with a valid one-time human receipt may write project files.

## Consequences

- `DECISION_TRAIL_JSON` is the 22nd MCP tool's machine-readable output and shares the same builder with the panel's read-only HTTP view.
- `events` deduplicate IDs with `buildActivityTimeline()` and are sorted, bounded, and labelled with evidence categories.
- `citedNodes` can carry both `focus` and `thread_anchor` roles for the same node.
- Consumers must use `get_visual_context` for full source records and the proposal diff endpoint for full line changes.
- Offline repository checks guard the tool count, domain builder, tool registration, HTTP route, panel IDs/copy button, tests, ADR index, and public docs.

## Safety invariant

`DECISION_TRAIL_JSON` never approves, applies, re-anchors, resolves, focuses, persists, or authorizes anything. It excludes one-time approval grants and keeps stale threads out of current intent. Only `apply_visual_proposal` with a valid one-time human receipt retains project-write capability.
