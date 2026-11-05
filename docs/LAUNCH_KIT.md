# Launch Kit

Versioned copy for GitHub, releases, and community posts. Keep claims tied to what the current version actually does. Never paste tokens into this file.

## GitHub About

Description:

```text
Human ↔ AI visual collaboration workspace for MCP: scan a project, edit the diagram, discuss intent, and apply approved code changes.
```

Homepage:

```text
https://github.com/2648782102/ai-draw-mcp#readme
```

Topics:

```text
mcp, model-context-protocol, ai, diagram, mermaid, visualization, developer-tools, human-in-the-loop, cursor, vscode, typescript, local-first
```

Apply them with a fine-grained token that has repository administration scope:

```bash
export GH_TOKEN='github_pat_...'
npm run github:sync
```

`scripts/github-maintenance.mjs` also supports `--check` (read-only drift report) and can create a GitHub Release with `--release v0.3.1` if `CHANGELOG.md` has a matching section.

**Maintain GitHub metadata** runs its read-only drift check on every master/main push and on manual dispatch. Set repository secret `GH_TOKEN` to a fine-grained token with `Administration: read and write` and push a metadata-relevant file to apply the versioned copy automatically; a manual `dry_run=false` dispatch also applies it, while `dry_run=true` only reports drift. Without the secret, the check may report drift but does not make CI red. The default `GITHUB_TOKEN` cannot change repository description or topics because those endpoints require repository administration permissions.

## Release notes — 0.3.1

Title: `v0.3.1 — Human ↔ AI visual collaboration`

```markdown
AI Draw MCP is no longer just a diagram renderer. It is a local-first visual workspace where an AI scans a project, a human edits the graph and leaves annotations, and the pair reviews a file-change proposal before anything is written.

Highlights:
- 23 MCP tools, including scan, visual context, a read-only shared handoff brief, a read-only decision trail, a read-only single-node context projection, a read-only copyable source-navigation projection, a read-only agent workflow contract, AI reply, read-only change templates, proposal preflight, proposal creation, and receipt-gated apply.
- `get_agent_workflow` and `WORKFLOW_JSON`: eight ordered steps with prerequisites, readiness blockers, and explicit `none` / `session` / `project` write boundaries, plus a reproducible read-only CI example.
- Bounded, human-confirmed visual undo/redo with field-level graph diffs; visual history never reverses project files, approved proposals, or one-time receipts.
- Bounded `file:line` source evidence on source/Markdown nodes, exposed through MCP context, diagnostics, a read-only endpoint, and the panel; evidence never grants write authority.
- `get_node_context` returns a read-only version 1 `NODE_CONTEXT_JSON` for one focused node: source evidence, linked annotation threads, adjacent edges, related graph diffs, and focus state; it never changes focus or grants write authority.
- `get_shared_brief` returns a read-only version 1 `BRIEF_JSON` for compact handoffs: readiness blockers, current intent, stale threads, the latest graph diff, bounded source evidence, and next actions. The panel displays and can copy the same view; approval grants are absent by construction.
- `get_decision_trail` returns a read-only version 1 `DECISION_TRAIL_JSON` linking human intent, anchored and stale threads, graph diffs, bounded proposal change summaries, proposal stages, activity events, and evidence gaps. The panel displays and can copy the same chronology; it is a derived projection, excludes approval grants, and never replaces the full line diff or human approval; see [ADR 0013](docs/ADR/0013-decision-trail-is-a-read-only-projection.md).
- Portable session bundle downloads include a derived, credential-free version 1 `EXPORT_MANIFEST_JSON` inventory with bounded counts, excluded credential/history/viewport fields, and a suggested filename; strict import validation remains unchanged; see [ADR 0014](docs/ADR/0014-export-manifest-is-a-derived-inventory.md).
- `REVIEW_READINESS_JSON` gives agents and humans one bounded, read-only readiness signal by aggregating `BRIEF_JSON` blockers and `DECISION_TRAIL_JSON` evidence gaps; diagnostics, the panel, and the reproducible workflow example use the same projection without granting writes; see [ADR 0015](docs/ADR/0015-review-readiness-is-a-derived-diagnostic.md).
- `SOURCE_NAVIGATION_JSON` turns existing bounded `file:line` evidence into workspace-relative, copyable VS Code/Cursor URI and `code --goto` text for humans and agents. The panel displays and copies the same view; the server never opens files, launches an IDE, executes commands, exposes absolute paths, or grants writes; see [ADR 0016](docs/ADR/0016-source-navigation-is-copyable-context.md).
- Human viewport attention is a bounded, throttled read-only zoom/pan hint for AI; the panel publishes it with an authenticated `keepalive fetch`, and it never changes graph revisions, timelines, bundles, approval grants, or project files; see [ADR 0012](docs/ADR/0012-viewport-is-read-only-attention-context.md).
- A read-only change-template catalogue for common intents: drafts cite the current graph revision and must still pass preflight and human review.
- A shared human focus: select a node and the AI sees exactly which object the conversation is about, without that selection granting write authority.
- Layout-preserving rescans: deterministic path IDs keep human coordinates, custom labels, annotation threads, and focus while new files are incrementally placed; scans remain read-only.
- A collaboration panel with node edits, annotations, chat, line-by-line diffs, and one-time approval receipts.
- Field-level graph revision diffs in the panel and derived `graph_diff` timeline events, with strict validation for portable session bundles.
- Path safety, content hashes, atomic writes, and rollback for approved proposals.
- Offline Mermaid assets, local preview server, WebSocket updates, and an end-to-end example.
- CI, security policy, issue/PR templates, changelog, roadmap, and contribution docs.

Quickstart: https://github.com/2648782102/ai-draw-mcp#readme
```

## Show HN / Hacker News

Title:

```text
Show HN: AI Draw MCP – edit a project diagram and have an AI apply approved changes
```

Body:

```text
I wanted the diagram between a codebase and an AI coding agent to be a two-way interface, not a screenshot. AI Draw MCP is a local MCP server + browser panel: the agent scans a workspace into a structured graph, a human edits nodes, leaves comments, and asks for a change; the agent returns a proposal with a line diff; only after the human approves and passes back a one-time receipt can the agent apply the files. Rescans use stable path IDs so the human's layout and conversation are not thrown away after each iteration.

It is MIT-licensed, runs locally, and does not require an account. The safety boundary is important to me: no deletes, no binary writes, no path escapes, content-hash-bound approval, and rollback on partial failure.

The current version is still early. I would love feedback on the agent-facing tool shape, the approval UX, and whether graph edits should map to source ranges next.

Repo: https://github.com/2648782102/ai-draw-mcp
```

## X / Mastodon / 中文短帖

```text
把「图」变成人和 AI 的双向接口：AI 扫描项目 → 人改节点/批注 → AI 生成带 diff 的提案 → 人批准后一次性确认号才允许写文件。

AI Draw MCP 0.3 已开源，本地运行、MIT、无需账号。欢迎来拍砖：https://github.com/2648782102/ai-draw-mcp
```

## 中文社区长帖提纲

- 开头：展示「AI 画架构图」之后的真实痛点——图不能把人的意图安全带回代码。
- 演示：用 `examples/collab-demo.mjs` 录一个 60 秒闭环，重点拍节点改名、批注、diff、批准确认号、文件变化。
- 设计：本地优先、MCP 工具面向 LLM、结构化 `VisualGraph` 与 `ChangeProposal`、人工批准不可绕过。
- 差异化：与「AI 生成一张图」和「云端白板账号」相比，这里强调无需账号、本地会话可导出且带只读清单、重复扫描保留人工布局/批注/焦点、有界视觉撤销/重做、只读 `file:line` 源码证据与无副作用可复制源码跳转、单节点只读上下文、共享简报、可审计决策链与有界视口注意力、选中节点可作为 AI 上下文、字段级图修订可展开、只读 agent 工作流/变更模板/预检、逐行 diff 与一次性批准凭据；不与 Miro/Excalidraw 比拼自由画布形状库。详见 [COMPETITIVE_RESEARCH.md 的「2026-11-06 增量调研」](COMPETITIVE_RESEARCH.md#2026-11-06-增量调研)。
- 边界：不是 Miro/Excalidraw 替代品，不做托管服务，不做自动写库，不做删除/二进制写入。
- 邀请：最需要反馈的是扫描器、图形编辑体验、提案模板和 MCP 客户端适配。

## Distribution checklist

- [ ] README value proposition, screenshot, Quickstart, and non-goals reviewed.
- [ ] Chinese README, English quickstart, troubleshooting FAQ, and concept diagrams reviewed together.
- [ ] `npm run docs:assets:check` confirms concept diagrams are reproducible from versioned source.
- [ ] `npm run repo:check` passes locally and in CI across the supported Node matrix.
- [ ] `npm run check`, `npm run test:examples:workflow`, and `node examples/collab-demo.mjs` pass locally.
- [ ] `npm run doctor` passes with the same Chrome setup users will have.
- [ ] GitHub description, homepage, and topics match `scripts/github-maintenance.mjs`.
- [ ] Release notes created from the CHANGELOG section.
- [ ] ADR index, governance checklist, and feedback Issue #8 reviewed for the same release.
- [ ] Discussion/Issue pinned for feedback; response window stated publicly.
- [ ] Links use the repository URL, not a personal cache or temporary screenshot host.
- [ ] Run **Maintain GitHub metadata** with `dry_run=true`; if drift is reported and `GH_TOKEN` is configured, run again with `dry_run=false`.
