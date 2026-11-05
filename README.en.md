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
- `get_agent_workflow` returns a version 1 `WORKFLOW_JSON` with ordered steps, prerequisites, `blocked` readiness hints, and `writes: "none" | "session" | "project"` boundaries. It is descriptive only: no proposal, receipt, session write, or project write. Only `apply_visual_proposal` is marked as a project write and still requires the human receipt; see [ADR 0007](docs/ADR/0007-agent-workflow-is-a-read-only-contract.md).
- `get_shared_brief` returns a compact version 1 `BRIEF_JSON` for handoffs: focus, readiness blockers, pending and stale intent, the latest graph diff, bounded source evidence, and suggested next actions. It excludes approval grants and never grants write authority; see [ADR 0011](docs/ADR/0011-shared-brief-is-a-read-only-projection.md).
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
- `get_node_context` returns a version 1 `NODE_CONTEXT_JSON` projection for one node (defaulting to human focus): source evidence, linked annotation threads, adjacent edges, related graph diffs, and focus state. It is read-only, never changes focus, and never grants write authority; see [ADR 0010](docs/ADR/0010-node-context-is-a-read-only-projection.md).
- Stale annotation threads are explicitly `outdated` or `detached`; AI must ask a human to review or re-anchor them before treating old discussion as current intent.

See [`SECURITY.md`](SECURITY.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), and [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md).

## Open-source project

MIT licensed. Contributions, roadmap feedback, and reproducible bug reports are welcome via [`CONTRIBUTING.md`](CONTRIBUTING.md), [`ROADMAP.md`](ROADMAP.md), and the issue templates. Public launch copy is versioned in [`docs/LAUNCH_KIT.md`](docs/LAUNCH_KIT.md); product research is in [`docs/COMPETITIVE_RESEARCH.md`](docs/COMPETITIVE_RESEARCH.md).
