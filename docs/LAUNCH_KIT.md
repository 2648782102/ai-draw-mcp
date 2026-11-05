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

`scripts/github-maintenance.mjs` also supports `--check` (read-only drift report) and can create a GitHub Release with `--release v0.3.0` if `CHANGELOG.md` has a matching section.

Maintainers can also run the **Maintain GitHub metadata** workflow from the Actions tab. Set repository secret `GH_TOKEN` to a fine-grained token with `Administration: read and write`; choose `dry_run=true` to only report drift using the workflow token. The default `GITHUB_TOKEN` cannot change repository description or topics because those endpoints require repository administration permissions.

## Release notes — 0.3.0

Title: `v0.3.0 — Human ↔ AI visual collaboration`

```markdown
AI Draw MCP is no longer just a diagram renderer. It is a local-first visual workspace where an AI scans a project, a human edits the graph and leaves annotations, and the pair reviews a file-change proposal before anything is written.

Highlights:
- 16 MCP tools, including scan, visual context, AI reply, proposal creation, and receipt-gated apply.
- A collaboration panel with node edits, annotations, chat, line-by-line diffs, and one-time approval receipts.
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
I wanted the diagram between a codebase and an AI coding agent to be a two-way interface, not a screenshot. AI Draw MCP is a local MCP server + browser panel: the agent scans a workspace into a structured graph, a human edits nodes, leaves comments, and asks for a change; the agent returns a proposal with a line diff; only after the human approves and passes back a one-time receipt can the agent apply the files.

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
- 边界：不是 Miro/Excalidraw 替代品，不做托管服务，不做自动写库，不做删除/二进制写入。
- 邀请：最需要反馈的是扫描器、图形编辑体验、提案模板和 MCP 客户端适配。

## Distribution checklist

- [ ] README value proposition, screenshot, Quickstart, and non-goals reviewed.
- [ ] Chinese README, English quickstart, troubleshooting FAQ, and concept diagrams reviewed together.
- [ ] `npm run docs:assets:check` confirms concept diagrams are reproducible from versioned source.
- [ ] `npm run check` and `node examples/collab-demo.mjs` pass locally.
- [ ] `npm run doctor` passes with the same Chrome setup users will have.
- [ ] GitHub description, homepage, and topics match `scripts/github-maintenance.mjs`.
- [ ] Release notes created from the CHANGELOG section.
- [ ] Discussion/Issue pinned for feedback; response window stated publicly.
- [ ] Links use the repository URL, not a personal cache or temporary screenshot host.
- [ ] Run **Maintain GitHub metadata** with `dry_run=true`; if drift is reported and `GH_TOKEN` is configured, run again with `dry_run=false`.
