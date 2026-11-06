# Goal mode for autonomous maintenance

This document answers a practical maintainer question: **what should I give an AI agent so it can keep improving an open-source project overnight?** It also records the operating contract used for the 2026-11-06 iteration of this repository.

## Short answer

You do not need to provide a long feature list. Give the agent five things:

1. A verifiable objective: repository path, product vision, and what "better" means.
2. A time boundary: start/end time with a timezone, plus what should happen at the boundary.
3. Authority and red lines: which commits, pushes, docs, releases, dependencies, and external accounts are allowed; which operations are forbidden.
4. Evidence and acceptance criteria: tests, CI, public links, changelog, and a final audit.
5. Optional credentials or decisions: only if an action genuinely requires them. Otherwise the agent should continue locally and record the blocked external drift.

For this repository, the product vision is an MCP-native AI context tool: an AI calls tools directly to express a codebase as structured visual context; a thin local panel lets a person make lightweight corrections and review approved changes; only a human-reviewed diff, explicit approval, and a one-time receipt may write project files.

## Goal-mode contract used here

| Dimension | Contract |
|---|---|
| Repository | The checked-out `ai-draw-mcp` repository on `master`; public GitHub repository `2648782102/ai-draw-mcp`. |
| Time boundary | From 2026-11-06 01:29 until 2026-11-06 09:00, `Asia/Shanghai`. Iterate continuously; after 09:00 run a final audit before declaring completion. |
| Autonomy | Choose high-value product, UX, safety, test, example, documentation, release, and open-source governance work; validate, commit, and normally push safe increments. |
| Red lines | No force push, history rewrite, tag movement, deletion of user data, credential commit, bypass of proposal/full-diff/human approval, or unsafe project writes. Logs stay on `stderr`; read-only projections must not expose file content, usable credentials, or absolute workspace paths. |
| Evidence | Local `npm run check`, offline `npm run repo:check`, green GitHub Actions on Node 20/22/24, published Release/tag evidence, Issue #8 maintenance notes, and explicit records of metadata drift that external permissions leave unresolved. |
| External inputs | Fine-grained repository-administration credentials are optional for GitHub About/topics; npm publishing and major dependency upgrades require human approval. Missing credentials do not stop local work. |
| Final audit | Verify time, worktree, commits, tags, Releases, CI, checks, Issue #8, public metadata drift, and credentials hygiene; report both delivered evidence and blocked external items. |

## What the agent may decide

The agent should choose the next increment from current evidence rather than wait for a per-commit instruction. Good increments include a bounded read-only projection, a regression test for a human/AI handoff, an FAQ that removes onboarding friction, a reproducible example, a launch-copy update, a governance evidence note, or a CI guard. Each increment should be small enough to validate and push, and should leave the next state easier to understand than the previous one.

Do not turn goal mode into unreviewed protocol drift. Protocol, security, and write-boundary changes require an ADR, architecture/security docs, `AGENTS.md`, tests, examples, and offline guards. A released `vX.Y.Z` tag and Release are immutable; new work goes into a new version or `[Unreleased]` maintenance notes.

## What the maintainer should provide

Provide only information that changes the shape of the work:

- **Required:** repository/location, product intent, time box, autonomy scope, red lines, and desired final evidence.
- **Useful:** audience, launch channels, tolerance for version bumps/releases, and whether external account actions are in scope.
- **Optional:** repository-administration secret for About/topics, package-registry credentials for publishing, or a human decision for irreversible product/branding choices.
- **Not required:** a minute-by-minute task list, permission prompts for ordinary safe work, or a manually curated feature backlog if the repository already has a roadmap and governance docs.

If the maintainer is asleep or offline, the agent should make reasonable low-risk decisions, keep an evidence trail, and avoid asking questions except for genuinely irreversible or dangerous operations.

## Reusable Chinese goal template

```text
请使用目标模式维护开源项目 <仓库路径 / GitHub 地址>，直到 <日期 时间 时区>。

产品愿景：AI Draw MCP 是给 AI 直接调用的 MCP 上下文工具；图形与只读投影帮助 AI 表达理解，人的薄面板只做轻量纠错、diff 审阅与人工授权，不扩展成聊天或协作产品。
你可以自主选择高价值增量：功能、交互、安全、测试、示例、文档、README/About/topics、Release、Issue、宣发与同类产品调研；每轮先验证，再提交并正常推送到 <分支>，不要 force push、改写历史、移动标签、删除数据或提交凭据。

安全边界：<列出不可绕过的人类批准、项目写入规则、外部账号/发布权限与危险操作>。
验收证据：<列出测试、CI、公开链接、最终审计与需要明确记录的外部阻塞>。
可选提供：<凭据名称或需要人工决定的事项>；缺失时继续做本地可完成的工作，并记录阻塞，不要停下来等待。
到达时间边界后，逐项核对工作树、提交、CI、Release、公开介绍与未解决项，再给我一份简明中文报告。
```

## Review links

- [`README.md`](../README.md): product surface and documentation map.
- [`ROADMAP.md`](../ROADMAP.md): shipped direction and explicit non-goals.
- [`docs/GOVERNANCE.md`](GOVERNANCE.md): public surfaces, maintenance checklist, and observed metadata drift.
- [`docs/LAUNCH_KIT.md`](LAUNCH_KIT.md): versioned public copy and launch templates.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) and [`SECURITY.md`](../SECURITY.md): local verification and safety boundaries.
