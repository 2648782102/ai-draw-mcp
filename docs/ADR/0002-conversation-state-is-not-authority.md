# ADR 0002 — Conversation state is not authority

Status: Accepted

## Decision

Messages, annotation thread replies, resolve/reopen state, activity timelines, impact summaries, session bundles, and visual context are descriptive or derived views. None of them can approve a proposal, issue a write receipt, or bypass `src/domain/path-safety.ts`.

## Consequences

- A resolved thread still appears in history and does not delete intent.
- Session bundles omit usable approval grants and require explicit human confirmation to import.
- The activity timeline is read-only and is rebuilt from source records.
- Panel write endpoints require the injected local `PANEL_TOKEN`; approval endpoints require `approvedBy: "human"`.

## Alternatives considered

- Treat resolved annotations as approvals: rejected because conversation closure is not code review.
- Export live grants in bundles for convenience: rejected because bundles are shared in bug reports.
- Let AI mark a thread as decisive: rejected because only a human can authorize project writes.
