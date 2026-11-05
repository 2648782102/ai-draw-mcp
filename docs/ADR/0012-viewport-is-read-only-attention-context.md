# ADR 0012: Viewport is read-only attention context

- Status: Accepted
- Date: 2026-11-06

## Decision

The collaboration session may hold one version 1 `SessionViewport` with finite, bounded `scale`, `x`, `y`, an `updatedAt` timestamp, and `source: "human"`. Only the local panel can publish it through `POST /api/collab/viewport`, using the panel token and `confirmedBy: "human"`; the server validates every field through `parseViewport()`.

`get_visual_context`, `get_shared_brief`, diagnostics, and the panel can read the viewport as attention context: where the human is currently looking on the diagram. It is not a `VisualGraph` edit, does not increment `graphRevision`, does not create `graphDiffs` or timeline events, and does not add a message. It is excluded from portable bundles, visual undo/redo history, approval grants, and project writes. A viewport can never approve a proposal or grant write authority.

## Rationale

The current focus tells AI which node a human selected, but not whether they are inspecting the whole architecture, zooming into one cluster, or panning to another region. A bounded viewport state makes that shared visual attention explicit without sending screen contents, secrets, or continuous mouse telemetry. Throttled browser beacons let the human panel publish coarse zoom/pan state without turning mouse movement into session noise.

## Alternatives

- **Persist viewport in `VisualGraph`:** rejected because zoom/pan is not project structure; mixing it into graph state would create phantom revisions and diff noise.
- **Put viewport in the activity timeline:** rejected because dragging a diagram is not a conversation event and would drown meaningful human intent.
- **Export viewport in session bundles:** rejected because a screen position is local, ephemeral, and not useful for reproducible bug reports.
- **Allow AI to set the viewport:** rejected because AI must not impersonate human attention or silently move the human's view.
- **Track raw pointer coordinates or mouse trails:** rejected because that increases privacy surface without improving the shared handoff.

## Consequences

- `BRIEF_JSON` and `CONTEXT_JSON` can tell an agent whether the human is zoomed into a small region, but consumers must still use `focus`, `intentByNode`, and `annotationThreads` for intent.
- Text-only MCP clients see `null` until a human panel publishes a viewport; absence is not an error.
- Session snapshots include the latest coarse viewport, while imported bundles reset it to `undefined`.
- Bundled validation rejects non-finite values, out-of-range scale/offsets, unknown properties, invalid timestamps, and non-human sources.

## Safety invariant

`SessionViewport` is descriptive only. It never changes the graph, messages, threads, proposals, approval grants, project files, or write permissions. Only `apply_visual_proposal` with a valid one-time human receipt retains project-write capability.
