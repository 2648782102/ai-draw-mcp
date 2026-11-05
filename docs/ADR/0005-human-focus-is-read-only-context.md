# ADR 0005 — Human focus is read-only context

Status: Accepted

## Decision

The panel records the node a human currently selected as a versioned `SessionFocus` object: node ID, current label/path/group, graph revision, timestamp, and `source: "human"`. `get_visual_context`, diagnostics, and portable session bundles expose it so an AI can disambiguate phrases such as “this module” or “here” without guessing from the whole graph.

Only a human panel selection can set or clear focus. The endpoint requires `confirmedBy: "human"` and the local panel token; the store rejects any other source. Focus is descriptive context. It cannot approve a proposal, issue a write receipt, resolve an annotation thread, create a proposal, or bypass path safety. When the focused node is removed by a graph edit or bundle import, the stale focus is cleared rather than silently re-bound to another node. When the node remains but its label/path/group changes, the derived fields are refreshed from the current graph.

## Consequences

- `SessionFocus` is version 1 persisted state. Bundles validate its shape, source, revision, timestamp, and allowed properties.
- Panel selection survives a page reload only when the focused node still exists; it is not an authorization credential and is safe to share in a sanitized bundle.
- Diagnostics and AI guidance can name the current object explicitly, while `annotationThreads.nextActor` remains the handoff signal.
- Focus changes do not enter the activity timeline or issue pending messages: selection is attention, not a conversation event.

## Alternatives considered

- Keep selection only in browser memory: rejected because an AI has no way to know which object the human is pointing at.
- Let AI set focus through MCP: rejected because it would let an agent steer human attention and blur the read-only context boundary.
- Treat focus as implicit approval for changes to that node: rejected because approval requires a reviewed proposal, line diff, and a one-time human receipt.
- Preserve a focus whose node was deleted: rejected because a dangling node ID is misleading context and must not become a hidden path hint.
