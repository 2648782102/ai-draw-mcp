# ADR 0006 — Stable scans preserve human visual state

Status: Accepted

## Decision

The project scanner derives deterministic node and edge IDs from POSIX workspace paths and stable relationship parts. A scan or human-confirmed rescan is a read-only pass over project files; it may refresh the versioned `VisualGraph` and rendered views, but it must not silently discard human visual state.

`mergeScannedGraph()` matches existing nodes by stable ID first and by normalized workspace path as the compatibility migration. It preserves finite `x` / `y` coordinates, custom labels, human layout provenance, annotation threads, and the version 1 human focus. New nodes receive auto-layout in free grid positions; removed nodes leave their annotation threads explicitly `detached`; migrated threads whose recorded label/path no longer matches become `outdated`. Focus is retained only when its matched node still exists. Both AI `scan_project` calls and the panel's human-confirmed rescan use the same `VisualSyncService`.

This merge is a visual-state synchronization, not a project write. It does not create, approve, or apply a `ChangeProposal`; it does not issue an approval receipt; it does not write source files; and it does not turn a scan into consent to modify the repository. The human rescan endpoint is protected by the local panel token and `confirmedBy: "human"`, while AI scans still require the normal proposal workflow for any source changes.

## Consequences

- `VisualGraph` remains version 1. Human coordinates and `metadata.layoutSource` are validated as finite values in `SessionStore` and portable bundles.
- `ScanPreservationSummary` gives both participants a machine-readable account of matched/new/removed nodes, preserved coordinates, carried/detached threads, and focus migration.
- Legacy random node IDs are remapped by path once; annotations and focus follow the remap without becoming an implicit write credential.
- Re-rendering and saving a graph revision can produce a `graphDiff`, but the scanner itself remains read-only with respect to `AI_DRAW_WORKSPACE_ROOT`.
- A bounded visual undo/redo stack remains separate future work; preserving layout does not require introducing a new authorization surface.

## Alternatives considered

- Generate fresh random IDs and rebuild the graph on every scan: rejected because it destroys annotation anchors, human layout, and focus on every iteration.
- Treat the human-edited graph as immutable and never refresh from the filesystem: rejected because applied proposals must eventually appear in the shared visual map.
- Let a rescan directly write project files to make the graph match: rejected because that would bypass proposal review, line diffs, one-time receipts, and rollback.
- Preserve detached focus or auto-rebind deleted threads: rejected because stale context would mislead AI and hide lost visual anchors.
