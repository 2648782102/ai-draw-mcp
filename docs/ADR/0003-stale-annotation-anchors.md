# ADR 0003 — Stale annotation anchors

Status: Accepted

## Decision

Node-linked annotations record `nodeLabel`, `nodePath`, `graphRevision`, and `anchorStatus`. A label/path change marks a thread `outdated`; a deleted node marks it `detached`. `get_visual_context.staleThreads` and the `annotation_anchor` activity event expose stale threads to AI, and stale text is excluded from `intentByNode`.

## Consequences

- AI must not turn stale discussion into a new proposal without human confirmation.
- `outdated` threads can be re-anchored only by an explicit human action.
- `detached` threads keep the original `nodeId` for audit but cannot be automatically re-anchored.
- Bundle import preserves anchor states so bug reports remain honest about graph drift.

## Alternatives considered

- Silently drop annotations when nodes disappear: rejected because it loses discussion history.
- Silently rebind annotations to renamed nodes: rejected because it can misrepresent intent.
- Keep only a boolean resolved flag: insufficient to distinguish current, renamed, and deleted anchors.
