# Troubleshooting & FAQ

This guide covers first-run problems that are easiest to diagnose from the local machine. For security issues, use [`SECURITY.md`](../SECURITY.md) instead of a public issue.

## First-run checklist

1. `node --version` is 20, 22, or 24.
2. `npm ci && npm run build` succeeds from a clean checkout.
3. `npm run doctor` passes; if Chrome is outside Puppeteer's cache, set `PUPPETEER_EXECUTABLE_PATH`.
4. The MCP host uses stdio and starts `npx ai-draw-mcp` or `node dist/index.js` with an absolute `OUTPUT_DIR`.
5. `PREVIEW_HOST` stays at `127.0.0.1`; open `http://127.0.0.1:3399/` in the IDE Simple Browser or a local browser.
6. Run `node examples/collab-demo.mjs` once to see the full scan → edit → propose → approve → apply loop in a temporary workspace.

## Common problems

| Symptom | Likely cause | Fix |
|---|---|---|
| `PREVIEW_PORT` already in use | Another MCP server or panel is running | Set `PREVIEW_PORT=3400` in the MCP host config, or stop the existing process. |
| `mmdc` fails to launch Chrome | Puppeteer cannot find a usable browser | Set `PUPPETEER_EXECUTABLE_PATH` to local Chrome/Chromium; on hardened Linux CI use `MERMAID_CHROME_NO_SANDBOX=1`. |
| Panel is blank or JavaScript throws | Stale MCP process or stale panel token | Restart the MCP server in the host, then reload the panel URL. |
| `scan_project` shows the wrong repository | `AI_DRAW_WORKSPACE_ROOT` points at the package or another workspace | Set it to the project root that the AI should scan and write to. |
| Collaboration workbench has no graph | No scan yet, or a fresh `OUTPUT_DIR` | Ask the AI to call `scan_project`, then click `💬 协作` and refresh. |
| AI does not see a visual edit | The graph was changed locally but not saved | Click `保存图形`; the server validates the graph and increments `graphRevision`. |
| AI needs a common change draft | Repeating the same proposal shape by hand | Call `list_change_templates`, then pass the returned `changes` through `preflight_visual_proposal` before creating a proposal. |
| Accidental node or edge edit | A human changed the visual graph before saving | Click `↶ 撤销`; it restores a bounded visual snapshot as a new graph revision. It does not undo applied files or approval receipts. |
| AI invents a collaboration sequence | The agent has not read the current workflow contract | Call `get_agent_workflow`, review `WORKFLOW_JSON.blocked`, and follow the ordered `requires` / `produces` fields. The contract itself never grants write authority. |
| A new client cannot tell which JSON marker or tool writes project files | MCP `tools/list` shows tool schemas but not this project's application-level workflow invariants | Call `get_capabilities`, open `GET /api/collab/capabilities`, or use the panel's `复制能力清单` button. `CAPABILITIES_JSON` lists all 26 tools, JSON markers, readiness, a safe next action, and the unique `apply_visual_proposal` project-write boundary. It never invokes tools, grants writes, or exports absolute paths. See [ADR 0017](ADR/0017-capability-catalogue-is-read-only-discovery.md). |
| The human asks to change "these selected modules" | A bounded selection is available, but the AI keeps guessing target files or change content | Call `get_selection_workorder`, open `GET /api/collab/selection-workorder`, or use the panel's `复制预提案工作单` button. `SELECTION_WORKORDER_JSON` lists safe relative candidate paths, in-scope intent, evidence, readiness gaps, and next actions without file content, a line diff, a proposal, or approval grants. Resolve gaps with the human, then explicitly draft changes and call `preflight_visual_proposal`. See [ADR 0019](ADR/0019-selection-workorder-is-read-only-preflight.md). |
| A saved graph revision changed after multi-select | The workorder says `freshness.status: "stale"` and adds a reselect gap | Ask the human to review and reselect the intended nodes in `POST /api/collab/selection`; the stale hint is descriptive and never auto-refreshes or clears the selection. It grants no write authority and remains absent from bundles. See [ADR 0019](ADR/0019-selection-workorder-is-read-only-preflight.md). |
| AI or a human needs a compact handoff | Full `CONTEXT_JSON` is too large for a status note | Call `get_shared_brief` or use the panel's `复制共享简报` button. `BRIEF_JSON` is bounded, read-only, excludes approval grants, and points to `get_visual_context` for full context. |
| AI cannot explain why a change was proposed | The intent, visual edit, and proposal stages are scattered across several views | Call `get_decision_trail` or use the panel's `复制决策链` button. `DECISION_TRAIL_JSON` is a bounded, evidence-labelled chronology; stale threads are historical evidence and proposal lines are only a projection, so open the full line diff before approving. |
| A session bundle is hard to review in a bug report | The full JSON is large and exclusion rules are implicit | Open `GET /api/collab/bundle/manifest` or the downloaded `exportManifest`. `EXPORT_MANIFEST_JSON` is a bounded, read-only inventory of contents, intentional exclusions, and downgraded approval state; it is not required for import and never contains credentials. |
| The next proposal step is unclear | Blockers and evidence gaps are spread across the brief, decision trail, and diagnostics | Open `GET /api/collab/review-readiness` or the panel's `审阅就绪` view. `REVIEW_READINESS_JSON` aggregates `BRIEF_JSON` blockers and `DECISION_TRAIL_JSON` gaps as `ready` / `review` / `blocked`; it never grants writes or replaces the full line diff. See [ADR 0015](ADR/0015-review-readiness-is-a-derived-diagnostic.md). |
| AI keeps guessing the wrong diagram region | The selected node is clear, but the visible region is not | Read `CONTEXT_JSON.viewport` / `BRIEF_JSON.viewport`. It is a throttled, bounded human zoom/pan hint and never grants writes; zoom or pan in the panel to refresh it. If it stays empty, reload the panel from the current MCP server so the injected `PANEL_TOKEN` is fresh; viewport sync uses an authenticated `keepalive fetch`, not `sendBeacon`. |
| A graph node has no source evidence | The file is binary, over 1 MiB, hidden/ignored, or has no definition/import/heading line | Check `scan_project` stats and the panel evidence list; `sourceEvidence` is a bounded read-only hint, not a full symbol index. |
| An AI or human wants to jump from a node to code | `file:line` evidence exists but IDE actions are platform-specific | Call `get_source_navigation`, open `GET /api/collab/source-navigation`, or use the panel's `复制源码跳转` button. `SOURCE_NAVIGATION_JSON` gives bounded, workspace-relative `file:line` and copyable `vscode://` / `cursor://` / `code --goto` text; the server does not open files, launch an IDE, execute commands, expose absolute paths, or grant write authority. See [ADR 0016](ADR/0016-source-navigation-is-copyable-context.md). |
| `get_node_context` reports an unknown node | The graph was rescanned, the ID was mistyped, or no human focus exists | Read `get_visual_context.graph.nodes` for a current ID, pass `node_id`, or select a node in the panel. The call never changes focus or grants writes. |
| AI replies too early on an annotation thread | `annotationThreads.nextActor` is `human` | Wait for the human's next reply; AI can read the thread without creating or applying a proposal. |
| A resolved thread still appears in history | Resolve is a conversation state, not deletion | Use `重开` to continue, or leave it resolved; it never approves or applies a proposal. |
| A thread is marked `outdated` | The node label or path changed after the discussion | Review the note, then click `确认重锚` if the discussion still applies to the current node. |
| A thread is marked `detached` | Its node was removed from the graph | Resolve/reopen the conversation, or add a fresh annotation. The old `nodeId` is kept for audit and cannot be auto-re-anchored. |
| Proposal cannot be applied | No human approval, receipt expired, hash changed, or protected path | Re-open the line diff, click `批准` again, give the fresh one-time receipt to the AI, and keep paths inside the workspace. |
| Approval receipt is rejected | The proposal changed after approval, or the receipt was already used | Create a new proposal; approvals are one-time and bound to the SHA-256 content hash. |
| PNG text renders as boxes | The rendering environment lacks Chinese fonts | Prefer `DEFAULT_FORMAT=svg`, or install a CJK font for Chrome. |

## FAQ

### Does the AI write files automatically?

No. `create_visual_proposal` records intent, the human reviews the line diff and impact summary, and `apply_visual_proposal` requires a one-time receipt issued by the panel. The server also validates paths, hashes, atomic writes, and rollback.

### Do change templates approve or write a proposal?

No. `list_change_templates` is a read-only helper that returns reusable draft shapes. It never creates a `ChangeProposal`, writes project files, or issues a receipt; preflight and human approval remain mandatory.

### Is resolving an annotation the same as approving a change?

No. Resolve/reopen and the activity timeline are conversation/derived views. They never grant project-write capability.

### Does the decision trail approve or apply a proposal?

No. `DECISION_TRAIL_JSON` is a read-only chronology derived from the current session. It records whether a human approval timestamp exists, but it never exports a one-time receipt, creates a proposal, applies a change, or grants write authority. Its proposal change lines are bounded projections; inspect `/api/collab/proposals/:id/diff` or the panel's line-by-line diff before approving.

### Is an export manifest required to import a session bundle?

No. `exportManifest` is an optional derived annotation for humans and reviewers. `parseSessionBundle()` still validates only the version 1 `session` object, clears live approval grants, requires `confirmedBy: "human"`, and never writes project files. Older bundles remain valid.

### Does visual undo reverse a project change?

No. Undo/redo only restores `VisualGraph` snapshots with human confirmation and creates a new graph revision with field-level diffs. It never writes `AI_DRAW_WORKSPACE_ROOT`, restores one-time grants, or reverses `apply_visual_proposal`. See [ADR 0008](ADR/0008-visual-undo-is-not-project-undo.md).

### What does a stale annotation thread mean?

`staleThreads` contains `outdated` or `detached` threads. `outdated` means a node label/path changed; `detached` means the original node no longer exists. Both require human review: AI should not turn their old text into a proposal, and re-anchoring is a human panel action that never writes project files.

### Does the panel require an account or cloud service?

No. Preview assets are local, the server binds to `127.0.0.1` by default, and the collaboration session lives under `OUTPUT_DIR/.ai-draw/`.

### What should I attach to a bug report?

Node version, MCP host, `npm run doctor` output, reproduction steps, and optionally an exported `ai-draw-session-*.json` bundle. Bundles intentionally exclude one-time approval grants; never paste a live confirmation receipt into an issue.

### Why are major Dependabot upgrades not merged immediately?

They are isolated changes with a full verification order in [`DEPENDENCY_MAINTENANCE.md`](DEPENDENCY_MAINTENANCE.md). A green feature branch does not prove Mermaid 12, Zod 4, or Actions v7 are safe to merge together.

### Can I use only the diagram tools?

Yes. The 11 legacy Mermaid/SVG tools work without the collaboration loop. Use `scan_project` and `get_visual_context` only when you want the human ↔ AI visual workspace.

### Where is the collaboration state stored?

`OUTPUT_DIR/.ai-draw/session.json` holds the versioned graph, messages, annotations, thread replies, and proposals. One-time approval grants stay in process memory and are never exported.

### What should an AI agent read first?

[`AGENTS.md`](../AGENTS.md) for repository conventions, `get_capabilities`/`CAPABILITIES_JSON` for a bounded tool and safety catalogue, then `get_agent_workflow` for the versioned step contract, `get_shared_brief`/`BRIEF_JSON` for a compact handoff, `get_visual_context` for full visual intent, `get_node_context`/`NODE_CONTEXT_JSON` for one focused node, `get_selection_scope`/`SELECTION_SCOPE_JSON` when the human refers to a bounded multi-node range, and `get_selection_workorder`/`SELECTION_WORKORDER_JSON` to turn that range into a read-only pre-proposal checklist. The machine-readable `annotationThreads.nextActor`, `blocked`, and `activityTimeline` are designed for those calls. `npm run test:examples:workflow` demonstrates the read-only prefix of the workflow.
