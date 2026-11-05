# ADR 0004 — Read-only proposal preflight

Status: Accepted

## Decision

`preflight_visual_proposal` performs a read-only inspection of candidate changes before `create_visual_proposal`. It reports path safety, existing/new file state, incorrect `create`/`update` direction, duplicate paths, no-op content, encoding, and size blockers. It does not write files, create proposals, or issue approval receipts.

## Consequences

- AI can correct common filesystem assumptions before a human ever sees a proposal card.
- Preflight warnings remain advisory; final path and hash validation still happens on proposal creation and application.
- The tool is composable with visual context and does not increase write authority.

## Alternatives considered

- Validate only at proposal application: rejected because it wastes human review on predictably invalid proposals.
- Let preflight create a draft proposal: rejected because read-only inspection should not mutate session state.
- Auto-fix paths in the server: rejected because silent path rewriting can target the wrong file.
