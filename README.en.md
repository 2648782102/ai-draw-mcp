# AI Draw MCP (English Quickstart)

AI Draw MCP is a local-first MCP server and browser panel for **human ↔ AI visual collaboration**. An AI scans a project into an editable graph; a human edits node paths/groups and edge semantics, replies in node-linked annotation threads, and discusses intent; the AI creates a reviewed file-change proposal; only after a human approves and passes back a one-time receipt can the AI apply the files.

![Collaboration loop](https://raw.githubusercontent.com/2648782102/ai-draw-mcp/master/docs/collaboration-loop.svg)

The detailed Chinese README is [`README.md`](README.md). The full documentation map is [`docs/README.md`](docs/README.md).

## 30-second loop

```text
AI: scan_project → editable VisualGraph
Human: edit node path/group and edge semantics / reply in annotation threads / send a message
AI: get_agent_workflow → eight ordered steps, readiness blockers, and explicit write boundaries
AI: get_visual_context → intentByNode + annotationThreads.nextActor + staleThreads + graphDiffs + activityTimeline + diagnostics
AI: get_decision_trail → optional bounded chronology of human intent, graph revisions, proposal stages, and evidence gaps
AI: list_change_templates → optional read-only draft for common intents
AI: preflight_visual_proposal → safe paths + existing/new files + duplicate/no-op content
AI: create_visual_proposal → line-by-line diff + impact summary
Human: review diff → approve → copy the one-time receipt
AI: apply_visual_proposal(receipt) → safe write → automatic rollback on failure
AI or human: rescan → stable path IDs preserve human coordinates, labels, threads, and focus
```

![Collaboration workbench](https://raw.githubusercontent.com/2648782102/ai-draw-mcp/master/docs/collaboration-workbench.svg)

## Install

```bash
npm install -g ai-draw-mcp
```

Configure an MCP stdio host with `npx ai-draw-mcp`, set `OUTPUT_DIR` to an absolute path, and set `AI_DRAW_WORKSPACE_ROOT` to the repository the AI should scan. Then open `http://127.0.0.1:3399/` and click `💬 协作`.

From source:

```bash
npm ci
npm run build
npm run doctor
node examples/collab-demo.mjs
```

Run the read-only agent workflow example, which stops after preflight and verifies that no proposal or project write occurred:

```bash
npm run test:examples:workflow
```

If Chrome is outside Puppeteer's cache, set `PUPPETEER_EXECUTABLE_PATH`. CI and hardened Linux environments may also need `MERMAID_CHROME_NO_SANDBOX=1`.

## Safety model

- No account, no cloud service, and no public network binding by default.
- Proposal approval is a human panel action; it does not write files.
- `get_agent_workflow` returns a version 1 `WORKFLOW_JSON` with ordered steps, prerequisites, `blocked` readiness hints, a compact `reviewReadiness` diagnostic, and `writes: "none" | "session" | "project"` boundaries. It is descriptive only: no proposal, receipt, session write, or project write. `ready` never replaces full line-diff review; only `apply_visual_proposal` is marked as a project write and still requires the human receipt; see [ADR 0007](docs/ADR/0007-agent-workflow-is-a-read-only-contract.md) and [ADR 0015](docs/ADR/0015-review-readiness-is-a-derived-diagnostic.md).
- `get_shared_brief` returns a compact version 1 `BRIEF_JSON` for handoffs: focus, readiness blockers, pending and stale intent, the latest graph diff, bounded source evidence, and suggested next actions. It excludes approval grants and never grants write authority; see [ADR 0011](docs/ADR/0011-shared-brief-is-a-read-only-projection.md).
- `get_decision_trail` returns a version 1 `DECISION_TRAIL_JSON` chronology of pending intent, anchored and stale threads, graph diffs, bounded proposal change summaries, proposal stages, gaps, and activity events. It is a derived read-only projection: proposal lines are not a complete diff, stale threads are historical evidence only, approval grants are excluded, and project writes still require human review plus a one-time receipt; see [ADR 0013](docs/ADR/0013-decision-trail-is-a-read-only-projection.md).
- Session bundle downloads include a derived version 1 `EXPORT_MANIFEST_JSON` inventory: bounded content counts, a suggested filename, intentionally excluded credential/history/viewport fields, downgraded approval state, and fixed read-only safety flags. Strict bundle import still trusts only the versioned `session` object; the manifest never grants writes; see [ADR 0014](docs/ADR/0014-export-manifest-is-a-derived-inventory.md).
- `REVIEW_READINESS_JSON` aggregates `BRIEF_JSON` blockers and `DECISION_TRAIL_JSON` evidence gaps into a bounded `ready` / `review` / `blocked` diagnostic. Diagnostics, the panel, and the reproducible workflow example read the same read-only projection; it never grants write authority or replaces the full line diff; see [ADR 0015](docs/ADR/0015-review-readiness-is-a-derived-diagnostic.md).
- Human zoom/pan state is a bounded, read-only `SessionViewport`: it tells AI which diagram region is being inspected, but never increments the graph revision, emits a timeline event, enters a bundle, or grants write authority; see [ADR 0012](docs/ADR/0012-viewport-is-read-only-attention-context.md).
- `preflight_visual_proposal` is a read-only check before `create_visual_proposal`; it never writes files, creates proposals, or issues grants.
- `list_change_templates` lists or expands common proposal drafts; it is read-only and must be followed by preflight and human review.
- `apply_visual_proposal` requires a one-time receipt bound to a SHA-256 content hash.
- Protected paths, binary writes, deletes, path escapes, and workspace-root writes are rejected.
- Atomic UTF-8 writes roll back on partial failure.
- Session bundles omit approval grants and require explicit human confirmation to import.
- `diagnostics` is a read-only health/next-action summary; it never grants write authority or replaces full visual context.
- `graphDiffs` records exact node/edge field changes between graph revisions; AI should use it instead of guessing visual edits from prose.
- `activityTimeline` derives graph revision events alongside messages, annotation threads, and proposal lifecycle events; this read-only projection never grants write authority.
- `focus` records the human-selected node as versioned attention context; it is cleared when the node disappears and never grants write authority.
- `scan_project` and the human-confirmed panel rescan read project files only. Deterministic path-based IDs preserve human layout, custom labels, annotation anchors, and focus; new nodes are auto-placed and removed nodes detach stale threads. A `PRESERVATION_JSON` summary explains what was retained. Visual synchronization never grants project-write authority; see [ADR 0006](docs/ADR/0006-stable-scan-preserves-human-visual-state.md).
- Bounded visual undo/redo restores `VisualGraph` snapshots as new graph revisions with field-level diffs and human confirmation. It never writes project files, reverses approved proposals, or restores one-time receipts; history is excluded from bundles. See [ADR 0008](docs/ADR/0008-visual-undo-is-not-project-undo.md).
- `scan_project` attaches at most five bounded version 1 `file:line` evidence entries per source/Markdown node. `get_visual_context.sourceEvidence`, diagnostics, `GET /api/collab/source-evidence`, and the panel expose them read-only; bundles strictly validate fields. Evidence never approves a change or expands a proposal's permitted paths. See [ADR 0009](docs/ADR/0009-source-evidence-is-read-only-context.md).
- `get_source_navigation` returns a bounded version 1 `SOURCE_NAVIGATION_JSON` derived from existing evidence: workspace-relative `file:line` references, copyable `vscode://` / `cursor://` URI text, and `code --goto` hints. The panel can copy the same view through `GET /api/collab/source-navigation`; the server never opens files, launches an IDE, executes commands, exposes absolute paths, or grants project-write authority. See [ADR 0016](docs/ADR/0016-source-navigation-is-copyable-context.md).
- `get_node_context` returns a version 1 `NODE_CONTEXT_JSON` projection for one node (defaulting to human focus): source evidence, linked annotation threads, adjacent edges, related graph diffs, and focus state. It is read-only, never changes focus, and never grants write authority; see [ADR 0010](docs/ADR/0010-node-context-is-a-read-only-projection.md).
- Stale annotation threads are explicitly `outdated` or `detached`; AI must ask a human to review or re-anchor them before treating old discussion as current intent.

See [`SECURITY.md`](SECURITY.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), and [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md).

## Open-source project

MIT licensed. Contributions, roadmap feedback, and reproducible bug reports are welcome via [`CONTRIBUTING.md`](CONTRIBUTING.md), [`ROADMAP.md`](ROADMAP.md), and the issue templates. Public launch copy is versioned in [`docs/LAUNCH_KIT.md`](docs/LAUNCH_KIT.md); product research is in [`docs/COMPETITIVE_RESEARCH.md`](docs/COMPETITIVE_RESEARCH.md).

`get_capabilities` returns a version 1 `CAPABILITIES_JSON` catalogue of all 24 tools, their JSON markers, the eight-step workflow readiness, a bounded next action, and the fixed write boundary. It is read-only application-level discovery that complements MCP's native `tools/list`; it never invokes tools, exports approval grants, exposes absolute workspace paths, or authorizes project writes. See [ADR 0017](docs/ADR/0017-capability-catalogue-is-read-only-discovery.md).
