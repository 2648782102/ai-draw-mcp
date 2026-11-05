# ADR 0010: Node context is a read-only projection

## Status

Accepted

## Context

`get_visual_context` returns the full graph, messages, proposals, activity timeline, diagnostics, and all flattened source evidence. That is the right contract for a complete handoff, but an AI answering a thread or explaining one selected node often needs a smaller, deterministic projection. Reassembling focus, `file:line` evidence, node-linked threads, adjacent edges, and relevant field-level graph diffs from multiple arrays invites omissions and encourages agents to treat derived data as a permission signal.

## Decision

Add the 20th MCP tool `get_node_context` and `GET /api/collab/node-context`. Both are read-only projections of the current `SessionSnapshot`. The version 1 `NODE_CONTEXT_JSON` contains:

- the addressed node's fields, finite coordinates, metadata, and bounded `GraphSourceEvidence`;
- whether the human focus is active, the human focus record, and its provenance;
- annotation threads anchored to that node, with explicit `anchored` / `outdated` / `detached` status and `nextActor`;
- incoming/outgoing edges with the adjacent node's ID, label, and path;
- recent graph-diff items touching the node or its edges;
- related node labels and a fixed `safety` object with `readOnly: true`, `grantsWriteAuthority: false`, and `staleThreadsExcludedFromIntent: true`.

The node ID defaults to the current human focus, but an explicit `node_id` is allowed. The projection creates no message, proposal, receipt, session write, or project write. It does not enlarge a proposal's permitted paths, resolve a thread, re-anchor stale discussion, or change focus. The panel displays the same projection for the selected node; it is an inspection view, not a new write endpoint. The workflow's first step names `NODE_CONTEXT_JSON` as an optional output so agents can narrow context after reading the full workflow contract.

## Alternatives

- **Only keep `get_visual_context`:** rejected because it makes the common single-node case pay for a full session payload and leaves agents to re-derive relationships.
- **Add a persisted `NodeContext` to `SessionSnapshot`:** rejected because this is a live derived view; persisting it creates stale duplicates and a larger bundle compatibility surface.
- **Let the endpoint mutate focus when `node_id` is supplied:** rejected because an AI-supplied node ID must not impersonate a human panel selection.

## Consequences

- AI can answer "what is this node, what code does it point to, what was said about it, and what changed?" from one versioned payload.
- Human and AI see the same bounded projection; stale threads remain explicitly excluded from current intent.
- Tool count, workflow output, README, AGENTS, architecture, security, roadmap, launch copy, research, tests, and offline consistency checks must stay synchronized.
- The only project-write path remains `apply_visual_proposal` with human approval, a valid one-time receipt, content hash, path validation, and rollback.
