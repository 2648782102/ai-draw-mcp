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

## Panel appearance

The local preview panel now defaults to **Flow**, a canvas-first workspace. The graph becomes the full main stage, the diagram library collapses into a narrow icon rail, and a four-step **AI scan → human edit → shared context → human approval** navigation strip sits above the canvas. Its states and progress are derived from the existing read-only session; clicking a stage only changes local views or opens the existing workbench. The first-run card becomes a readable **shared-context route**, labeling read-only scanning, the structure graph, line diff, and human confirmation around the visual loop; a **live collaboration route** reports current graph-object count, dialogue count, and pending review / closed-gate state, while a **dialogue star track** turns the latest human and AI messages into luminous beads with pending-reply halos and an emphasized newest message. Clicking a bead only opens the established chat view. The canvas itself gains a **shared-context frame** with corner markers, while Mermaid nodes, edges, labels, and focus highlighting now follow the Aurora / Studio / Atlas visual systems. Press `G`, use the appearance popover, or run the command palette action to switch between the enhanced graph skin and the original Mermaid palette; the preference stays local. A compact **focus lens** above the canvas shows the current object, workspace-relative candidate path, relation count, open discussions, and `n / N` index, with `← / →` controls for local object stepping. Hovering a real Mermaid node opens a nearby **object glance** card with the object name, workspace-relative path, direct relations, source-evidence count, and open discussions; the hovered node and objects connected by real edges receive a temporary outline. Press `P`, use the appearance popover, or run the command palette action to hide it. While the glance is visible, `← / →` previews the next object in graph order and `Enter` promotes that preview to the existing read-only focus. The card follows zoom and pan, adapts to all three visual systems, and closes around the first-run state, source drawer, immersive mode, and overlapping overlays; hovering itself never changes focus. Mermaid/SVG source becomes an on-demand companion drawer (`E`), and `B` toggles between Flow and the familiar Classic split layout. The live route and dialogue star track are pure read-only projections of the existing session; none of these actions sends messages, approves proposals, issues receipts, or writes project files.

The panel also ships with three distinct visual systems. **Aurora** is the immersive default: a luminous top border, cyan/violet accents, glass cards, and a live status ribbon make the shared canvas feel alive. **Studio** is a high-readability light system for long review sessions. **Atlas** is an engineering-blueprint system with a subtle grid, green monospace accents, and square cards for structure/path-first work. Cycle with the header segmented control, `V`, the appearance popover, or the command palette; layout and visual preferences stay in local browser storage. The header center shows the current diagram and its read-only-until-approval state, while lower-frequency actions such as Mermaid theme, export, copy ID, commands, and deletion live in a local `⋯` menu. Once a graph exists, the top-left **collaboration pulse** becomes a read-only instrument with a luminous edge, radial pressure ring, centre attention count, state light, three micro bars, and a next-action chip; the ring changes with Ready / Review / Blocked while all values remain derived from the existing session, proposals, annotations, and diagnostics. The top focus lens becomes a layered HUD with a **relation pulse**: real adjacent-edge count, a bounded graph-wide edge ratio bar, inbound count, and discussion state sit beside the focused path. It reads only the current session and existing derived graph state; the object card and gesture hint also gain clearer layered surfaces. Expanding the pulse reveals a compact read-only metric panel with counts, a derived next action, and one button that opens the full shared workspace; `Esc` or an outside click closes it. The ribbon also shows a brief live-sync progress state. `I` opens a read-only live inspector for the focused object, source evidence, open discussions, graph revision, review readiness, and safe next actions. Its actions only open existing views or copy context; they never approve proposals or write project files. Pending proposal cards now show a visible **line diff → impact scope → human approval** review rail, a `write gate closed` notice, status-colored top edges, and a readiness glow; completing the rail only confirms that review material was loaded and never grants write authority. Background sync reuses proposal DOM by signature and defers refreshes during pointer interaction, so an approval button cannot be detached mid-click.

Press `Z` to enter the immersive workspace: the header, diagram library, pane headers, and status bar recede so the project graph, focus card, and floating canvas controls stay visible. `Z`, `Esc`, or the top exit badge restores the full workspace. In Flow layout, action feedback stays above the bottom-centered canvas dock in both regular and immersive modes, covering neither the four-step navigation strip nor the zoom and collaboration controls. The dock becomes a grouped console with a **structure → focus → gate** read-only route: a luminous top edge, progress band, current object name, and `n / N` index sit in its status area, while `VIEW` / `SHARED` groups separate viewport actions from collaboration actions. The route only projects where the existing focus sits in graph-object order; it does not change focus, viewport, approval receipts, or project files. The active read-only focus keeps its direct relationship paths lit in violet along real Mermaid edges, with a matching diamond beside the relation count; the lens relation pulse reports adjacent-edge pressure, the object card gains inbound / outbound relation rails that split real edges by direction, and bounded neighbour chips reuse the existing read-only focus when clicked. The object glance overlays cyan hovered paths and reports how many are lit. All of these are derived local DOM/CSS views over `collabGraph.edges`, never changes to graph data, exported SVG, session state, or the write gate. On narrow and touch screens, a first tap opens a compact bottom-sheet glance and tapping the same object again promotes it to the existing read-only focus, avoiding accidental zoom or pan gestures; the relation rails, lens pulse, and dock labels contract, and the focus lens and gesture hint occupy separate rows on compact screens. The appearance popover stores the layout system, visual system, theme, palette, density, preview background, and immersive preference in local browser storage only. These are presentation preferences: they do not change `focus` / `viewport`, session state, approval receipts, or the project-write gate. Canvas overlays now stay aligned through the full zoom/pan transition window with continuous frame-scheduled positioning that applies hover state first, keeping the focus ring, discussion badges, and glance card on the real nodes even on slower CI runners. All screenshots, including the reproducible Flow, Studio, Atlas, and immersive views, are generated by `npm run ui:shots`. In canvas view, the lower-left **handoff rail** derives a human ⇄ AI next-actor marker, three read-only counters, and a bounded next action from the same session snapshot; its button only opens the existing workspace and never sends a message, approves a proposal, or writes project files. The workbench journey now adds a continuous progress rail beneath its four steps, with ready/busy/blocked colors, a `n / 4 READY · n%` label, and explicit hover/focus navigation cues. The percentage is a derived review cue, never a write grant. Real graph nodes also gain read-only discussion badges for their anchored annotation threads; clicking a badge moves only the local focus and opens the workbench annotations tab, never changing session focus, approving a proposal, or writing files.

![Flow canvas-first workspace](https://raw.githubusercontent.com/2648782102/ai-draw-mcp/master/docs/flow-workspace-panel.png)

![First-run collaboration loop](https://raw.githubusercontent.com/2648782102/ai-draw-mcp/master/docs/welcome-panel.png)

The first-run card now includes a compact **AI scan → human edit → proposal diff → human approval** journey, a bounded **live collaboration route**, and a **dialogue star track**. Its active step is derived from existing read-only session state, so a pending proposal highlights the review stage without creating a proposal or granting write authority; the live route reports existing counts, while the star track displays the latest existing human/AI messages with pending replies haloed and the newest message emphasized. All are local CSS/DOM projections, never a second state model or a write gate.

![Studio visual system](https://raw.githubusercontent.com/2648782102/ai-draw-mcp/master/docs/studio-workspace-panel.png)

![Atlas visual system](https://raw.githubusercontent.com/2648782102/ai-draw-mcp/master/docs/atlas-workspace-panel.png)

The Flow and Atlas screenshots are also generated reproducibly by `npm run ui:shots`. Both layout systems and all three visual systems change only local CSS and layout; they never change MCP tools, collaboration contracts, focus/viewport semantics, approval receipts, or the project-write gate.

![Immersive workspace](https://raw.githubusercontent.com/2648782102/ai-draw-mcp/master/docs/zen-workspace-panel.png)

![Narrow-screen object glance](https://raw.githubusercontent.com/2648782102/ai-draw-mcp/master/docs/compact-glance-panel.png)

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
- `selection` records at most 24 human-selected node IDs as versioned attention context. `get_selection_scope` returns a bounded `SELECTION_SCOPE_JSON` with selected nodes, internal edges, safe relative `file:line` evidence, and focus membership; it is read-only, excluded from bundles, and never grants write authority. See [ADR 0018](docs/ADR/0018-human-selection-is-read-only-scope.md).
- `get_selection_workorder` returns a version 1 `SELECTION_WORKORDER_JSON` pre-proposal checklist: selected scope, safe relative candidate paths, in-scope intent, bounded evidence, derived selection freshness, readiness gaps, and next actions. A stale selection only asks the human to reselect; it is never auto-refreshed or cleared. It contains no file content, line diff, proposal, approval grant, or absolute path; preflight, a human-reviewed full diff, and a one-time receipt remain mandatory. See [ADR 0019](docs/ADR/0019-selection-workorder-is-read-only-preflight.md).
- `scan_project` and the human-confirmed panel rescan read project files only. Deterministic path-based IDs preserve human layout, custom labels, annotation anchors, and focus; new nodes are auto-placed and removed nodes detach stale threads. A `PRESERVATION_JSON` summary explains what was retained. Visual synchronization never grants project-write authority; see [ADR 0006](docs/ADR/0006-stable-scan-preserves-human-visual-state.md).
- Bounded visual undo/redo restores `VisualGraph` snapshots as new graph revisions with field-level diffs and human confirmation. It never writes project files, reverses approved proposals, or restores one-time receipts; history is excluded from bundles. See [ADR 0008](docs/ADR/0008-visual-undo-is-not-project-undo.md).
- `scan_project` attaches at most five bounded version 1 `file:line` evidence entries per source/Markdown node. `get_visual_context.sourceEvidence`, diagnostics, `GET /api/collab/source-evidence`, and the panel expose them read-only; bundles strictly validate fields. Evidence never approves a change or expands a proposal's permitted paths. See [ADR 0009](docs/ADR/0009-source-evidence-is-read-only-context.md).
- `get_source_navigation` returns a bounded version 1 `SOURCE_NAVIGATION_JSON` derived from existing evidence: workspace-relative `file:line` references, copyable `vscode://` / `cursor://` URI text, and `code --goto` hints. The panel can copy the same view through `GET /api/collab/source-navigation`; the server never opens files, launches an IDE, executes commands, exposes absolute paths, or grants project-write authority. See [ADR 0016](docs/ADR/0016-source-navigation-is-copyable-context.md).
- `get_node_context` returns a version 1 `NODE_CONTEXT_JSON` projection for one node (defaulting to human focus): source evidence, linked annotation threads, adjacent edges, related graph diffs, and focus state. It is read-only, never changes focus, and never grants write authority; see [ADR 0010](docs/ADR/0010-node-context-is-a-read-only-projection.md).
- Stale annotation threads are explicitly `outdated` or `detached`; AI must ask a human to review or re-anchor them before treating old discussion as current intent.
- A stale selection workorder (`freshness.status: "stale"`) means the graph changed after the human selected nodes. Ask the human to reselect; the hint never refreshes or clears the selection, issues a grant, creates a proposal, or writes files. See the 30-second [troubleshooting FAQ](docs/TROUBLESHOOTING.md#多选后重新扫描工作单显示-stale-怎么办what-does-a-stale-selection-workorder-mean).

See [`SECURITY.md`](SECURITY.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), and [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md).

For autonomous, time-boxed maintenance, see [`docs/GOAL_MODE.md`](docs/GOAL_MODE.md): it defines the objective, authority, red lines, evidence, optional credentials, final audit, and a reusable goal template.

## Open-source project

MIT licensed. Contributions, roadmap feedback, and reproducible bug reports are welcome via [`CONTRIBUTING.md`](CONTRIBUTING.md), [`ROADMAP.md`](ROADMAP.md), and the issue templates. Public launch copy is versioned in [`docs/LAUNCH_KIT.md`](docs/LAUNCH_KIT.md); product research is in [`docs/COMPETITIVE_RESEARCH.md`](docs/COMPETITIVE_RESEARCH.md).

`get_capabilities` returns a version 1 `CAPABILITIES_JSON` catalogue of all 26 tools, their JSON markers, the eight-step workflow readiness, a bounded next action, and the fixed write boundary. It is read-only application-level discovery that complements MCP's native `tools/list`; it never invokes tools, exports approval grants, exposes absolute workspace paths, or authorizes project writes. See [ADR 0017](docs/ADR/0017-capability-catalogue-is-read-only-discovery.md).
