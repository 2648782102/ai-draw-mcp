# ADR 0018: Human multi-node selection is read-only scope

- Status: Accepted
- Date: 2026-11-06

## Decision

The local panel can publish a version 1 `SessionSelection` through `POST /api/collab/selection`. It stores at most 24 unique node IDs, a graph revision, a timestamp, and `source: "human"`. The endpoint requires the injected `PANEL_TOKEN` and `confirmedBy: "human"`; the store rejects unknown nodes, duplicate IDs, oversized selections, unknown properties, non-human sources, and non-finite revisions. Selection is refreshed on graph saves and cleared on bundle import; stale node IDs never become current intent.

`get_selection_scope` and `GET /api/collab/selection-scope` return version 1 `SELECTION_SCOPE_JSON`: a bounded projection of selected nodes, edges whose endpoints are both selected, safe workspace-relative `file:line` evidence, focus membership, viewport, copy text, guidance, and fixed safety flags. `CONTEXT_JSON.selectionScope`, `BRIEF_JSON.selection`, `WORKFLOW_JSON.selection`, diagnostics, and the panel show compact versions of the same derived state. Neither the selection nor its projection resolves annotation threads, writes messages, changes graph revisions, creates proposals, issues approval receipts, or grants project-write authority.

`SessionSelection` is ephemeral local UI attention and is intentionally excluded from portable session bundles; its exclusion is recorded in `EXPORT_MANIFEST_JSON`.

## Rationale

Single-node `SessionFocus` answers "which object is the human pointing at?", but humans naturally say "these modules", "this range", or "the selected part of the graph". Without a machine-readable selection, an AI must infer a multi-node scope from prose, annotations, or freely chosen IDs. A small, explicit selection makes that intent precise while keeping the existing focus, viewport, thread, and approval models intact.

The bound is deliberate. A selection is context, not a batch write command: 24 IDs keeps HTTP payloads, context prompts, and visual highlighting predictable. The projection only includes internal edges and already-collected scanner evidence; it never re-reads project files, opens an editor, or expands proposal path permissions. Path filtering excludes absolute paths, traversal, protected directories, and `.env`-like names before any `path` or `file:line` text reaches an agent.

Deriving all agent-facing views from the same `SessionSnapshot` avoids a second source of truth. `buildSelectionScope()` filters stale IDs against the current graph, so renamed or deleted nodes cannot silently become part of a current request. Bundles remain reproducible by clearing selection on import, while focus and graph diffs retain their existing portable contracts.

## Alternatives

- **Reuse focus as an array of node IDs:** rejected because `SessionFocus` is a versioned single-node contract persisted in bundles; changing it would break compatibility and blur the distinction between one object and a range.
- **Add selection to messages or annotation metadata:** rejected because conversation text is not a reliable authority and would duplicate state across timelines and bundles.
- **Persist selection in portable bundles:** rejected because selection is ephemeral human attention tied to a live panel; importing it could point at another workspace's node IDs.
- **Allow arbitrary selection size:** rejected because unbounded context and DOM highlighting increase prompt size, memory, and accidental scope expansion.
- **Treat selection as approval for a batch change:** rejected because only a full line diff, human approval, and a one-time receipt can lead to a project write.

## Consequences

- The MCP tool surface grows from 24 to 25 tools; `SERVER_TOOL_COUNT`, README, AGENTS, roadmap, launch copy, tests, examples, and offline checks are synchronized.
- `get_visual_context` gains a compact `selectionScope`; `get_agent_workflow`, `get_shared_brief`, diagnostics, and capabilities mention the bounded range without granting writes.
- The panel adds checkboxes, a selection summary, clear/copy controls, and a read-only scope inspector; all non-GET selection writes carry `PANEL_TOKEN` and `confirmedBy: "human"`.
- Pure, MCP, HTTP, workflow, brief, diagnostics, bundle-manifest, and offline consistency tests guard bounds, stale IDs, safe paths, credential exclusion, and version alignment.
- Future protocol additions must update `SessionSelection`, `SELECTION_SCOPE_JSON`, ADR, docs, and tests together; an out-of-date tool catalogue fails the offline repository check.

## Safety invariant

`SessionSelection` and `SELECTION_SCOPE_JSON` are bounded, read-only human attention context. They never re-read project files, write session conversation state, change graph revisions, create proposals, issue receipts, expose absolute workspace paths, or grant write authority. Only `apply_visual_proposal` with a valid one-time human receipt retains project-write capability.
