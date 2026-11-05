# ADR 0001 — Visual intent and human approval

Status: Accepted

## Decision

The project structure graph is an editable, versioned representation of shared intent. AI tools may scan a workspace into a `VisualGraph`, read human edits and annotations, and create `ChangeProposal` records. Project files are written only by `apply_visual_proposal` after a human reviews a line diff, approves in the local panel, and passes a one-time receipt back to the AI.

## Consequences

- Rendering a diagram is separate from authorizing a repository change.
- Every proposal is bound to a SHA-256 content hash; approvals are one-time and expire.
- Writes are limited to safe UTF-8 text paths, use atomic replacement, and roll back on partial failure.
- AI agents get concise machine-readable context, while humans keep the final write gate.

## Alternatives considered

- Let the AI apply graph edits directly: rejected because visual edits are ambiguous and can be stale.
- Require a hosted review service: rejected because the core loop must work locally without an account.
- Make the panel a general-purpose whiteboard: deferred; the graph is a project-intent protocol, not a freeform canvas.
