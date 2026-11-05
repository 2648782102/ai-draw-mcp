# ADR 0008: Visual undo is not project undo

- Status: Accepted
- Date: 2026-11-06

## Decision

`SessionStore` keeps a bounded, version 1 visual history of `VisualGraph` snapshots. Saving a graph pushes the previous visual state into a bounded past stack; human-confirmed `POST /api/collab/graph/undo` and `/redo` restore one snapshot as a **new graph revision**. The panel exposes the counts via `GET /api/collab/graph/history`, disabled buttons, and an explicit hint that undo does not write project files.

The history contains only visual graph state. It does not contain messages, proposals, approval grants, focus-derived authority, or filesystem backups. Undo/redo never calls `applyProposal()`, never writes `AI_DRAW_WORKSPACE_ROOT`, never restores an approved proposal or one-time receipt, and never rolls back an already-applied text change. A restore is recorded in `graphDiffs` and creates a system message, so AI and humans can inspect the exact field-level change. Both endpoints require the panel token and `confirmedBy: "human"`.

Bundles continue to omit history and approval grants. Import resets the stack to the imported visual state. New ordinary graph saves clear the redo branch. The history is bounded to 12 entries per direction to keep session files small.

## Alternatives

- Undo all session changes, including messages and proposal status. This would make conversation history ambiguous and could silently revive stale approvals.
- Undo filesystem writes by reversing approved proposals. This would bypass the existing path safety, content-hash, one-time receipt, atomic write, and rollback model and could delete human edits made after the proposal.
- Keep history only in browser memory. This is simple, but state disappears on reload and cannot be shared between the panel and MCP agents.
- Export history in session bundles. This would make bundles much larger and could imply that a restored visual state carries authority across sessions.

## Consequences

- Humans can recover from accidental node/edge edits without waiting for an AI to reconstruct a graph.
- AI sees restore events through `graphDiffs`, diagnostics `graphHistory`, activity messages, and the next graph revision; it never sees a silent state rewrite.
- The word "undo" in the UI must always be qualified as visual-only. Documentation, tests, and repo checks enforce this boundary.
- Adding a new persistence field requires deciding whether it belongs in visual history; approval and project-write state must stay outside.
