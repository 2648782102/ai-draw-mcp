# ADR 0009: Source evidence is read-only context

- Status: Accepted
- Date: 2026-11-06

## Decision

The project scanner may attach up to five version 1 `GraphSourceEvidence` entries to each `GraphNode`. An entry is a bounded `definition`, `import`, or `heading` observation with a workspace-relative `path`, a positive integer `line`, and a 160-character `excerpt`. Only UTF-8 text files up to 1 MiB are inspected; source code and Markdown are in scope, and binary/large files are skipped. Evidence is read from the workspace, never written back to it.

Evidence flows through `scanToVisualGraph()`, stable-path merges, `get_visual_context.sourceEvidence`, `intentSummary.intentByNode`, diagnostics counts, `GET /api/collab/source-evidence`, and the panel. Portable bundles validate every field, reject unknown properties, and preserve no extra authority. `get_agent_workflow` names `sourceEvidence` as a first-step input. AI can cite a `file:line` reference when explaining a node or drafting a proposal; the reference never enlarges a proposal's permitted paths, approves a change, issues a receipt, or invokes a write.

## Alternatives

- Add a full language-aware symbol index in this iteration. This is valuable later, but it requires parser dependencies and a larger protocol; bounded line evidence solves the immediate traceability gap without weakening the existing text-only safety model.
- Store complete file contents or source ranges in `VisualGraph`. This would bloat session files and bundles and could make stale copies look authoritative.
- Expose a panel button that opens an editor at a line. Editor integrations vary across MCP hosts; a stable, copyable read-only endpoint is portable and does not depend on IDE command URIs.
- Let evidence point at absolute paths. Workspace-relative POSIX paths keep bundles portable and prevent a graph edit from expanding the scan/write boundary.

## Consequences

- Humans and AI can answer "which code does this node refer to?" with versioned, inspectable `file:line` context.
- Scans remain bounded: five entries per file, a 1 MiB read cap, and the existing node/edge limits.
- Bundle parsers and `SessionStore.validateGraph()` must reject malformed line numbers, unsupported kinds, unknown fields, and oversized evidence lists.
- Source evidence is a hint derived from text, not a semantic guarantee. Later language-aware scanners may replace its heuristic without changing the approval protocol.
