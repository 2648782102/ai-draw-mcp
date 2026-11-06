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

The versioned tag workflow now creates the GitHub Release automatically after verification. It uses the built-in `GITHUB_TOKEN` in a dedicated `contents: write` job, derives the body from the matching `CHANGELOG.md` section, checks for an existing Release by tag first, and never publishes to npm. The local `--release` path remains a maintainer fallback; do not use it after a tag workflow has already created the Release.

Verified outcome for `v0.3.2`: Release [v0.3.2 — Human ↔ AI visual collaboration](https://github.com/2648782102/ai-draw-mcp/releases/tag/v0.3.2) is published, Release workflow run [42124996768](https://github.com/2648782102/ai-draw-mcp/actions/runs/42124996768) is green, and CI run [42124987808](https://github.com/2648782102/ai-draw-mcp/actions/runs/42124987808) is green. GitHub About/topics still require the administration-capable secret described above; the read-only metadata drift check is recorded in [`GOVERNANCE.md`](GOVERNANCE.md).

Verified outcome for `v0.3.3`: Release [v0.3.3 — Human ↔ AI visual collaboration](https://github.com/2648782102/ai-draw-mcp/releases/tag/v0.3.3) is published, CI run [42127902178](https://github.com/2648782102/ai-draw-mcp/actions/runs/42127902178) and Release run [42128152064](https://github.com/2648782102/ai-draw-mcp/actions/runs/42128152064) are green. The release was created from the matching `CHANGELOG.md` section; `v0.3.2` remains published and unchanged. The published title uses the workflow's stable generic name, and neither the Release nor its tag is rewritten. About/topics still require the administration-capable secret described above.

Verified outcome for `v0.3.4`: Release [v0.3.4 — Human ↔ AI visual collaboration](https://github.com/2648782102/ai-draw-mcp/releases/tag/v0.3.4) is published at `2026-11-05T23:43:07Z`; CI run [42131331089](https://github.com/2648782102/ai-draw-mcp/actions/runs/42131331089) and Release run [42131352599](https://github.com/2648782102/ai-draw-mcp/actions/runs/42131352599) are green on `3551b2b`. The release was created from the matching `CHANGELOG.md` section; `v0.3.2` and `v0.3.3` remain published and unchanged, and no existing tag is moved or rewritten. Full verification evidence is in [`GOVERNANCE.md`](GOVERNANCE.md); npm publishing still awaits human approval. About/topics still require the administration-capable secret described above.

**Maintain GitHub metadata** runs its read-only drift check on every master/main push and on manual dispatch. Set repository secret `GH_TOKEN` to a fine-grained token with `Administration: read and write` and push a metadata-relevant file to apply the versioned copy automatically; a manual `dry_run=false` dispatch also applies it, while `dry_run=true` only reports drift. Without the secret, the check may report drift but does not make CI red. The default `GITHUB_TOKEN` cannot change repository description or topics because those endpoints require repository administration permissions.

## Published release notes — 0.3.3

Title: `v0.3.3 — Human ↔ AI visual collaboration`

```markdown
AI Draw MCP is no longer just a diagram renderer. It is a local-first visual workspace where an AI scans a project, a human edits the graph and leaves annotations, and the pair reviews a file-change proposal before anything is written.

Highlights:
- 25 MCP tools, including scan, a read-only capability catalogue, visual context, a read-only shared handoff brief, a read-only decision trail, a read-only single-node context projection, a read-only bounded multi-node selection scope, a read-only copyable source-navigation projection, a read-only agent workflow contract, AI reply, read-only change templates, proposal preflight, proposal creation, and receipt-gated apply.
- `SELECTION_SCOPE_JSON`: a version 1 read-only projection of at most 24 human-selected graph nodes, internal edges, safe relative `file:line` evidence, and focus membership. Selection stays ephemeral panel attention, is excluded from session bundles, and never grants write authority; see [ADR 0018](docs/ADR/0018-human-selection-is-read-only-scope.md).
- `CAPABILITIES_JSON`: one bounded, read-only discovery view of the tool/JSON surface, workflow readiness, suggested next action, and the unique receipt-gated project-write boundary; native MCP `tools/list` remains authoritative for tool names and schemas; see [ADR 0017](docs/ADR/0017-capability-catalogue-is-read-only-discovery.md).
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

## Published release notes — 0.3.4

Title: `v0.3.4 — Human ↔ AI visual collaboration`

Status: verified published at `2026-11-05T23:43:07Z` from tag `v0.3.4` / commit `3551b2b`, with green CI run `#79` and Release run `#4`. The tag workflow used the matching `CHANGELOG.md` section; no earlier Release or tag was rewritten.

Highlights in the current release:

- 26 MCP tools and 19 ADRs, with a new `get_selection_workorder` tool and `GET /api/collab/selection-workorder`.
- `SELECTION_WORKORDER_JSON`: a bounded, read-only pre-proposal checklist derived from human multi-node selection, in-scope intent, safe relative candidate paths, `file:line` evidence, review-readiness gaps, descriptive selection freshness, and next actions. It contains no `ProjectChange` content, line diff, proposal, approval grant, absolute workspace path, or new persisted state; `preflight_visual_proposal`, a human-reviewed full line diff, and a one-time receipt remain mandatory. See [ADR 0019](docs/ADR/0019-selection-workorder-is-read-only-preflight.md).
- The panel displays the same derived workorder and can copy it into a prompt that tells an AI to read the full session, resolve gaps with the human, then explicitly draft changes rather than treating selected paths as write permissions.
- Full local verification: 23 test files / 78 tests, a reproducible read-only workflow example, offline repository checks, and an `ai-draw-mcp-0.3.4.tgz` dry-run package of 275 files.

## Release notes — 0.3.2

The 0.3.2 patch introduced the 24th tool `get_capabilities`, `CAPABILITIES_JSON`, ADR 0017, and the idempotent tag-driven GitHub Release publisher. Its [published Release](https://github.com/2648782102/ai-draw-mcp/releases/tag/v0.3.2) and green CI/Release evidence are recorded in [`GOVERNANCE.md`](GOVERNANCE.md); the tag is never moved or rewritten.

## Release notes — 0.3.1

The 0.3.1 patch captured the 23-tool collaboration surface, `SOURCE_NAVIGATION_JSON`, `REVIEW_READINESS_JSON`, 16 ADRs, and the reproducible CI workflow. Its tag verification workflow was green, but the original workflow did not create a GitHub Release. The 0.3.2 tag first exercised the idempotent Release publisher added in `.github/workflows/release.yml`; the existing `v0.3.1` tag is never moved or rewritten.

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

### 前端迭代短帖（可单独发，不改写已发布 Release notes）

```text
AI Draw MCP 的预览面板现在有两套视觉系统：默认 Aurora 是带渐变光带、青紫光晕和实时状态胶囊的共享画布；按 V 切到 Studio，则变成高可读浅色审阅工作台。按 I 展开的上下文速览把当前对象、源码证据、开放讨论和审阅就绪放在同一处，所有按钮仍然只读。

配合「对象焦点 → 绑定批注 → 对话工作台」桥接和按 Z 进入的沉浸工作区，外观变化现在一眼可见，但偏好只存在本机；隐藏界面不会隐藏批准门槛，也不会授权 AI 写文件。

截图、README 与可复现截图脚本都在仓库：https://github.com/2648782102/ai-draw-mcp
```

### 协作可见性短帖（可单独发，不改写已发布 Release notes）

```text
这一轮把「谁该接棒、哪些材料已核对、讨论挂在哪个节点」直接画进 AI Draw MCP 的面板：画布显示人 ⇄ AI 交接航线和节点级讨论徽标；提案卡显示逐行 diff → 影响范围 → 人工确认的审阅轨道；工作台四步流程有连续进度条。

这些变化都只是既有只读会话的可视化：不会替人批准、不会签发额外凭据，也不会让 UI 偏好变成项目写入许可。写入仍要完整 diff、人工批准、一次性确认号与 apply_visual_proposal。

每个增量都有真实浏览器回归、可复现截图和 Node 20/22/24 CI：https://github.com/2648782102/ai-draw-mcp
```

### 三套视觉系统短帖（可单独发，不改写已发布 Release notes）

```text
AI Draw MCP 的预览面板现在有三套一眼可辨的视觉系统：Aurora 是沉浸式渐变光效，Studio 适合长时间高可读审阅，Atlas 把界面变成工程蓝图网格与等宽字，让结构、路径和 diff 更突出。

顶栏同时收拢了低频操作：当前图形与「批准前只读」状态居中显示，Mermaid 主题、导出、复制 ID、命令面板和删除放在「⋯」本机菜单。V 键循环切换视觉，所有偏好都只存 localStorage，不改协议、不批准提案、不签发凭据，也不会写项目文件。

Aurora / Studio / Atlas 都有可复现截图与真实浏览器回归：https://github.com/2648782102/ai-draw-mcp
```

## 中文社区长帖提纲

### 发布后维护更新（不改写 0.3.4 Release notes）

- 主题：开源项目在发布之后如何继续被信任——每个维护增量都留下测试、CI、公开 Issue 与治理证据，而不是悄悄改历史。
- 一句话：`132f90e` 增加了「目标模式」契约，把时间边界、自治范围、安全红线、验收证据与最终审计写进仓库；同时用真实「人类多选 → 重新扫描 → stale 工作单」回归证明旧 UI 选择不会被 AI 偷偷当成当前写入许可。
- 证据：本地 23 个测试文件 / 79 个测试、275 文件 dry-run；CI `42135660499` / #82 在 Node 20/22/24 全绿；Issue #8 与 `GOVERNANCE.md` 同步记录 About/topics 漂移和未提供的管理型 API 凭据。
- 边界：这是 post-release maintenance，不 retag `v0.3.4`、不改写已发布 Release notes、不自动发布 npm 包、不合并高风险依赖升级；`GH_TOKEN`、npm 凭据与人工发布决定仍属于维护者。
- 追加证据（08:29 CST）：CI #83 `42136060410`、#84 `42136310033`、#85 `42136720779` 均在 Node 20/22/24 全绿；metadata workflow #12 `42136060175` 完成只读漂移检查，但 apply 因缺少管理型 `GH_TOKEN` 被跳过，About/topics 仍未修复。中英文 README 与故障排除新增 30 秒 stale 工作单 FAQ，面板用高对比警示行强调「旧选择不是当前授权」；已发布的 `v0.3.2` / `v0.3.3` / `v0.3.4` Release 均未改写。
- 维护闭环（08:35 CST）：`0aba259` 的 CI #86 `42137519829` 在 Node 20/22/24 全绿、metadata #13 `42137519789` 只读检查完成；`259790d` 把 FAQ 补成「清空选择范围 → 重新勾选 → 读取新工作单 → 不沿用旧候选路径」的可执行步骤。两个提交均通过 23 个测试文件 / 79 个测试与 275 文件 dry-run，不改 26 个工具、version 1 协议、写入闸门、已发布标签或 Release。
- 最终验证（08:49 CST）：`259790d` / `b4ffbf2` / `5d6114c` / `734ad6f` 的 CI #87 `42137916943`、#88 `42138152753`、#89 `42138459195`、#90 `42138738900` 均在 Node 20/22/24 全绿；#90 的 job ID 为 `127633381248` / `127633381672` / `127633381836`。metadata #14 `42138152985` 只做只读漂移检查，apply 被跳过；workflow 的 path filter 只监听 `docs/LAUNCH_KIT.md`、`scripts/github-maintenance.mjs` 与 workflow 文件，因此 `5d6114c` / `734ad6f` 没有 #15 run。About/topics 仍为 `description: null` / `homepage: null` / `topics: []`，等待维护者提供管理型 `GH_TOKEN`；不 retag、不改 published Release、不自动发 npm 包。最终公开 HEAD 仍是 23 个测试文件 / 79 个测试与 275 文件 dry-run 全过。
- CTA：想参与的话，优先反馈 stale 选择应该「阻止 AI 继续」还是「允许讨论但显眼提示风险」，以及 `GOAL_MODE.md` 的目标模板是否覆盖你自己的自治任务。
- 前端维护增量（14:20 CST）：对象焦点卡现在显示绑定批注、开放讨论与失锚状态，并能一键定位到对话工作台；按 `Z` 可进入沉浸工作区，让顶栏/图表库/状态栏退场，只留下结构图、对象上下文、浮动操作条与人工确认边界。外观可在「鲜明 / 静谧」间切换，尊重系统「减少动态效果」与「更高对比度」偏好。这些都是本机只读视图偏好，不新增 MCP 工具、不改 version 1 协议、不签发凭据、不授权项目写入；全部截图由 `npm run ui:shots` 用临时会话可复现生成。短帖文案见「前端迭代短帖」，不改写已发布 Release notes。
- 双视觉维护增量（14:45 CST）：新增默认 Aurora 与可切换 Studio，`V` / 顶栏分段控件 / 外观面板 / 命令面板统一切换；`I` 打开只读上下文速览，汇总焦点对象、证据、对话、图修订与审阅就绪。`npm run ui:shots` 现在同时产出 Aurora 与 `docs/studio-workspace-panel.png` 两张可对比截图，浏览器回归覆盖 class、活动态、快捷键和速览动作数量。预览服务优先读取源码模板且禁用 HTML 缓存，避免开发态改动被旧 `dist` 副本遮住；仍不新增工具、不改协议、不签发凭据或写入项目文件。
- 双视觉验证证据（14:52 CST）：`415d817` 的本地 `npm run check` 全过（25 个测试文件 / 81 个测试、276 文件 dry-run）；CI `42176894532` / #125 在 Node 20/22/24 全绿，`Maintain GitHub metadata` `42176894528` / #17 成功。公开 GitHub description/topics 仍为漂移状态，apply 步骤继续等待管理型 `GH_TOKEN`；不 retag、不改写已发布 Release、不自动发布 npm 包。
- 审阅闸门与 CI 恢复证据（16:05 CST）：`ad61a1c` 把待审提案重做成带「逐行 diff → 影响范围 → 人工确认」进度轨道、写入闸门提示、状态渐变顶边与就绪光晕的审阅卡；后台刷新按提案签名复用 DOM，并在交互/弹层期间延后，修复 Node 24 批准按钮 detached-node 竞态。CI `42185011140` / #130 在 Node 20/22/24 全绿（jobs `127783169454` / `127783169129` / `127783169479`），本地 25 个测试文件 / 81 个测试、276 文件 dry-run 与八张可复现截图全部通过。公开 GitHub description/topics 仍为漂移状态，继续等待管理型 `GH_TOKEN`；不 retag、不改写已发布 Release、不自动发布 npm 包。
- 交接航线与刷新一致性证据（16:28 CST）：`f9db238` 新增画布左下角只读「人 ⇄ AI」交接航线；`6125ffe` 统一项目图/消息/批注/提案写操作后的安全刷新入口，并让确认号弹层关闭不再安排延迟补拉。CI `42187638417` / #132 在 Node 20/22/24 全绿（jobs `127791657138` / `127791657643` / `127791657392`），本地 25 个测试文件 / 81 个测试、276 文件 dry-run 与八张可复现截图通过；metadata #19 `42186081327` 仍只做只读漂移检查。公开 GitHub description/topics 仍为漂移状态，继续等待管理型 `GH_TOKEN`；不 retag、不改写已发布 Release、不自动发布 npm 包。
- 阶段轨道与节点讨论证据（16:50 CST）：`534d868` 为工作台四步流程新增连续进度轨道；`f68ab1f` 把绑定讨论以只读徽标投影到真实图形节点上方，并区分开放 / 已解决 / 需重锚。CI `42188634194` / #133 与 `42190267479` / #134 均在 Node 20/22/24 全绿；本地 `npm run check` 保持 25 个测试文件 / 81 个测试、276 文件 dry-run，八张截图可复现。新增「协作可见性短帖」供公开发布；About/topics 漂移仍等待管理型 `GH_TOKEN`，不 retag、不改写已发布 Release、不自动发布 npm 包。

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
- [ ] Verified tag workflow published exactly one GitHub Release; npm publishing still awaits human approval.
- [ ] ADR index, governance checklist, and feedback Issue #8 reviewed for the same release.
- [ ] Discussion/Issue pinned for feedback; response window stated publicly.
- [ ] Links use the repository URL, not a personal cache or temporary screenshot host.
- [ ] Run **Maintain GitHub metadata** with `dry_run=true`; if drift is reported and `GH_TOKEN` is configured, run again with `dry_run=false`.
