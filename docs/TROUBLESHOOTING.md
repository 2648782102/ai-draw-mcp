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

[`AGENTS.md`](../AGENTS.md) for repository conventions, then `get_agent_workflow` for the versioned step contract, then `get_visual_context` for the live visual intent. The machine-readable `annotationThreads.nextActor`, `blocked`, and `activityTimeline` are designed for those calls. `npm run test:examples:workflow` demonstrates the read-only prefix of the workflow.
