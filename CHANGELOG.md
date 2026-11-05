# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- 只读 version 1 `GraphSourceEvidence`：`scan_project` 为不超过 1 MiB 的源码/Markdown 节点提取最多 5 条 `definition` / `import` / `heading` 的 `file:line` 证据；`get_visual_context.sourceEvidence`、意图摘要、诊断计数、`GET /api/collab/source-evidence`、面板证据列表与工作流第一步可引用它，绝不扩大写入权限。
- [ADR 0009](docs/ADR/0009-source-evidence-is-read-only-context.md)：记录源码证据的只读边界、体积限制与 bundle 严格校验。
- 可复现源码证据测试：临时工作区覆盖 README 标题、TS 定义/导入行号、稳定扫描保留、bundle 往返与注入字段拒绝。
- 有界 version 1 `GraphHistoryState` 与面板「撤销 / 重做」：保存图形时保留视觉快照，人类确认的 `GET/POST /api/collab/graph/history|undo|redo` 可查看和切换最多 12 步。恢复会生成新 `graphRevision` 与字段级 `graphDiffs`，但绝不写项目文件、恢复批准凭据或回退已应用的提案。
- 会话诊断新增只读 `graphHistory` 计数；领域契约、MCP 诊断与 HTTP 协作集成测试覆盖撤销/重做、人类确认、bundle 不含历史及项目文件不变。
- [ADR 0008](docs/ADR/0008-visual-undo-is-not-project-undo.md)：记录视觉撤销与项目写入撤销的边界。
- version 1 `AgentWorkflow` 与第 19 个 MCP 工具 `get_agent_workflow`：返回八步 `WORKFLOW_JSON`、每步 `requires` / `produces` / `readOnly` / `writes` / `grantsWriteAuthority`、会话就绪 `blocked` 提示和安全不变量；只读，不创建提案、不写会话或项目文件、不签发凭据。
- `examples/agent-workflow.mjs` 与 `npm run test:examples:workflow`：在临时工作区实际执行工作流契约 → 只读模板草稿 → preflight，断言没有确认号、没有提案、没有项目写入，并由 CI 在三个 Node 版本运行。
- [ADR 0007](docs/ADR/0007-agent-workflow-is-a-read-only-contract.md)：记录工作流是描述性契约，明确 `none` / `session` / `project` 三层写入边界与唯一项目写入步骤。
- 稳定扫描与人工视觉状态保留：`project-scanner.ts` 使用相对路径派生确定性节点/连线 ID；`visual-graph-merge.ts` 与 `visual-sync-service.ts` 让 `scan_project` 和人工确认的 `POST /api/collab/rescan` 共用一套只读扫描、布局保留、渲染与广播流程。
- version 1 `ScanPreservationSummary` 与 `PRESERVATION_JSON`：AI 与面板可读地看到匹配/新增/删除节点、保留坐标、自定义标签、批注与焦点迁移计数；纯函数、MCP 与 HTTP 协作测试覆盖重复扫描、旧随机 ID 迁移、新文件增量排布和删除文件失锚。
- 面板图形编辑器新增有限 `X` / `Y` 坐标输入与 `metadata.layoutSource: "human"` 标记；「重新扫描项目」按钮调用人类确认端点并展示保留摘要，不写项目文件、不签发批准凭据。
- `docs/ADR/0006-stable-scan-preserves-human-visual-state.md`：记录稳定路径身份、视觉状态合并与扫描不授权写入的边界。
- 「复制给 AI 的上下文」增加最近一次 `graphDiffs` 的字段级摘要（最多 8 项），并提醒以 `get_visual_context.graphDiffs.items` 的原文为准；复制仍是只读浏览器行为，不写会话、不签发凭据。
- `.github/workflows/ci.yml` 在 Node 20/22/24 矩阵中增加 `npm run docs:assets:check` 与 `npm run repo:check`，让版本化概念图和离线仓库文案在 CI 中与本地 `npm run check` 对齐。
- `scan_project` 增加 `render: false` 无头状态检查参数：跳过重复 `mmdc` 渲染但保留扫描、合并、会话保存和 `PRESERVATION_JSON`；MCP 稳定扫描测试用它避免大型工作区在 CI 里触发渲染超时。
- 协作集成测试的 Chrome 探测改为跨平台候选路径；Linux CI 不再被 macOS 专属 `/Applications/Google Chrome...` 覆盖 Puppeteer 的 headless-shell 检测。
- version 1 `SessionFocus`、`POST /api/collab/focus` 与面板「当前焦点」：把人当前选中的节点作为只读上下文交给 `get_visual_context`、诊断和会话 bundle；焦点变化不产生消息、不进入时间线、不签发凭据。
- 面板「复制给 AI 的上下文」按钮：生成含会话、修订、焦点、诊断、下一步与安全边界的只读提示；不写会话、不发送消息、不签发凭据。
- `docs/ADR/0005-human-focus-is-read-only-context.md`：记录选中状态只是注意力上下文，不能替代人工批准或写入凭据。
- `src/domain/change-templates.ts` 与 `list_change_templates`：提供更新文档、添加测试、创建模块三个常见意图的只读模板目录与草稿展开；草稿引用当前 `graphRevision` / 节点，不创建提案、不写文件、不签发确认号。
- `src/domain/graph-diff.ts`、会话 `graphDiffs`、`GET /api/collab/graph/diffs` 与 `get_visual_context.graphDiffs`：记录最近 20 次图形修订的节点/连线字段级差异，面板显示最新修订摘要，bundle 保留审计记录。
- 图形编辑器支持节点路径/分组与连线类型编辑；`get_visual_context.intentByNode` 暴露 `group`，`edgeLabels` 暴露连线两端路径，帮助 AI 从图上理解更精确的项目结构。
- `SessionStore.validateGraph()` 校验节点路径/分组与连线类型，拒绝空白字段；面板保存时清空可选字段会删除属性而不是写入空字符串。
- `src/domain/session-diagnostics.ts`、`GET /api/collab/diagnostics` 与 `get_visual_context.diagnostics`：只读汇总图/线程/提案状态、信号、下一步动作和安全不变量；面板显示简洁诊断摘要。
- `docs/ADR/README.md` 与 4 份架构决策记录：人工批准边界、对话状态不授权、失锚批注锚点、只读提案预检。
- `docs/GOVERNANCE.md`：开源治理入口、维护者清单、公开反馈入口与 GitHub metadata 漂移证据。
- `src/domain/proposal-preflight.ts` 与 `preflight_visual_proposal`：AI 创建提案前只读检查路径安全、文件存在性、create/update 方向、重复路径、重复内容、编码与体积。
- 节点批注锚点审计：`nodeLabel` / `nodePath` / `graphRevision` / `anchorStatus`，节点改名/改路径后标记 `outdated`，节点删除后标记 `detached`。
- `get_visual_context.staleThreads` 与活动时间线 `annotation_anchor` 事件：明确告诉 AI 不要使用失锚/过期讨论生成提案。
- `POST /api/collab/annotations/:id/anchor`：仅人类可确认重锚 `outdated` 线程；面板显示失锚提示、过期原因和「确认重锚」按钮。
- `docs/collaboration-loop.svg` 与 `docs/collaboration-workbench.svg`：双向协作闭环与工作台概念图，由 `scripts/generate-doc-assets.mjs` 可复现生成。
- `README.en.md`：面向国际读者的英文快速入门与安全边界摘要。
- `docs/TROUBLESHOOTING.md`：首用自检、常见故障、一次性确认号与批注线程 FAQ。
- `npm run docs:assets` / `npm run docs:assets:check`：生成或校验版本化文档概念图，避免 README 图片漂移。
- `src/domain/annotation-thread.ts`：节点批注线程聚合、回复校验与 AI 可读的 `nextActor` 队列。
- `src/domain/activity-timeline.ts`：把消息、批注线程、线程状态与提案生命周期合并为只读紧凑活动时间线。
- 面板节点批注支持内联回复、解决/重开与状态/下一棒提示；`reply_to_visual_context` 支持 `annotation_replies`。
- 面板新增活动时间线；`GET /api/collab/activity` 与 `get_visual_context.activityTimeline` 提供人/AI 共用的年代顺序视图。
- `POST /api/collab/annotations/:id/reply` 与 `/status`；会话 bundle 可保留批注回复，并拒绝损坏的回复结构。
- `ROADMAP.md`：公开产品路线图、阶段目标与明确的非目标。
- `docs/COMPETITIVE_RESEARCH.md`：Mermaid、白板、代码地图与 MCP 同类产品调研。
- `docs/LAUNCH_KIT.md`：GitHub About、Release notes、Show HN 与中文社区宣发模板。
- `scripts/github-maintenance.mjs`：检查/同步仓库 description、homepage、topics，并可从 CHANGELOG 创建 Release。
- `scripts/repo-check.mjs`：离线检查发布文案、README 链接、维护脚本与 CHANGELOG 是否一致。
- `docs/README.md`：面向贡献者与新用户的文档地图。
- `src/domain/session-bundle.ts`：版本化协作会话快照的创建、解析与安全降级。
- 面板「导出会话 / 导入会话」按钮，方便把可复现会话附到 Issue、示例或回归报告。
- `GET /api/collab/bundle` 与 `POST /api/collab/bundle/import`：导出只读快照；导入需要人类确认，清除一次性批准凭据，不写项目文件。
- `.github/workflows/maintain-github-metadata.yml`：手动触发的 GitHub description/homepage/topics 漂移检查与同步流程。
- `docs/DEPENDENCY_MAINTENANCE.md`：Dependabot 验证顺序、重大版本升级决策记录与 Chrome sandbox 环境说明。
- `src/domain/impact.ts` 与 `GET /api/collab/proposals/:id/impact`：批准前汇总受影响文件数、新增/删除行数、内容字节数和安全说明。
- `npm run github:check` / `npm run github:sync`，把开源元数据维护纳入本地验证与发布流程。
- 协作面板支持新增/删除节点、编辑与删除连线、选中节点后绑定批注，让人可以直接改「项目结构」而不只改文字。
- `VisualGraph` 服务端校验补齐节点/连线/批注 ID、字段完整性与引用完整性，拒绝损坏的图形状态。
- 图形批注消息会显示目标节点名，AI 上下文里的意图更明确。
- `get_visual_context` 返回 `intentSummary`：把待处理消息、节点绑定批注、连线语义按节点聚合，减少 AI 拼装上下文的成本。

### Changed

- `POST /api/collab/rescan` 增加可选布尔 `render` 开关：面板显式 `render: true` 保持完整渲染，无头协作测试用 `render: false` 避免 Node 20 CI 中多次 `mmdc` 渲染叠加超时；非布尔值以 400 拒绝，扫描协议与安全边界不变。
- `ProjectScanResult.stats` 新增 `evidencedNodes` / `totalEvidence`；扫描响应、会话消息元数据、README、英文快速入门、AGENTS、架构、路线图、竞品调研与发布文案同步说明证据只读。
- 面板图形编辑区新增撤销/重做按钮、可用性计数和「不写项目文件」提示；架构、AGENTS、路线图、竞品调研、发布文案、故障排除与安全文档同步说明视觉历史边界。
- MCP 工具从 18 增至 19；README、英文快速入门、AGENTS、架构、路线图、竞品调研、发布文案、离线一致性检查、工具数量常量、MCP 测试与治理记录同步更新。
- CI 增加可复现只读工作流示例执行；`npm run check` 也运行该示例，避免文档声称的「可复现」只停留在语法检查。
- `scan_project` 工具描述、响应和参数扩展 `PRESERVATION_JSON` 与 `open_panel`；重复扫描刷新同一图形而不是清空人工编辑，README、英文快速入门、AGENTS、架构、竞品调研、路线图、发布文案与离线一致性检查同步更新。
- `SessionStore.validateGraph()` 与会话 bundle 严格校验节点/批注的有限坐标，拒绝非数字、`NaN`、`Infinity` 与注入结构。
- `SessionStore.setGraph()` 与 bundle 导入会刷新仍存在节点的焦点字段、清除已删除节点的失锚焦点；bundle 严格校验 `focus` 的结构、来源、时间戳与未知属性。
- 会话 bundle 的 `graphDiffs` 改为严格校验：拒绝损坏的 items/fields、非法计数、无效时间戳、未知属性与非法字段值；领域契约测试覆盖注入结构。
- `activityTimeline` 新增只读 `graph_diff` 派生事件；`get_visual_context` 的下一棒提示指出图形修订数量，面板新增可展开的字段级差异列表。
- `docs/COMPETITIVE_RESEARCH.md` 与 `docs/LAUNCH_KIT.md` 补充 2026-11-06 增量竞品调研、差异化宣发要点和产品边界。
- MCP 工具从 17 增至 18；README、英文快速入门、AGENTS、路线图、发布文案、离线一致性检查、工具数量常量与 MCP 测试同步更新。
- 会话诊断增加 `graph_diffs` 信号与「生成提案前阅读图形差异」下一步提示；bundle 契约测试覆盖 `graphDiffs` 往返与损坏数组拒绝。
- 协作面板把会话诊断从单行摘要扩展为信号/下一步清单：区分待处理、注意与信息级别，明确只读诊断不提供批准或写入按钮。
- MCP 工具从 16 增至 17；`create_visual_proposal` 描述、README、AGENTS、测试与 `TOOL_COUNT` 同步指向 `preflight_visual_proposal`。
- 协作集成测试覆盖节点改名触发 `outdated`、删除节点触发 `detached`、人类确认重锚、AI 自动重锚被拒绝，以及失锚 `nodeId` 审计保留。
- 面板删除节点时不再静默清空批注的 `nodeId`，而是显式标记 `detached`，让 AI 与人类都能看到讨论已失去图形锚点。
- `npm run check` 增加版本化文档概念图可复现性校验，并把英文 quickstart 与 Troubleshooting FAQ 纳入离线一致性检查。
- npm 描述与关键词改为人机双向可视化协作定位，并同步 README 文档入口。
- `npm run check` 增加离线仓库一致性检查；`npm run github:check` 作为显式、只读的 GitHub 元数据漂移检查，不需要凭据。
- README 增加最短体验路径和公开文档入口；ROADMAP 中「结构化图形编辑」从下一阶段前移到当前已交付能力。
- MCP 集成测试覆盖 `get_visual_context` 的机器可读意图摘要与下一步动作提示。
- 协作集成测试覆盖会话 bundle 的版本、批准凭据不外泄、已批准提案降级、人类确认与非法文件拒绝。
- 协作面板在批注列表显示绑定节点名；提案卡片显示图形修订、内容哈希前缀和受影响路径摘要。
- 提案卡片异步加载影响摘要，帮助人类在查看逐行 diff 前快速判断变更规模。
- `get_visual_context` 返回 `annotationThreads` 与 `nextActor`，把对象上的对话历史作为一等上下文交给 AI。
- `docs/COMPETITIVE_RESEARCH.md` 补充公开评论线程协议调研，明确当前交付范围、后续状态/时间线候选与安全边界。
- `get_visual_context` 增加 `activity_limit` 与 `activityTimeline`，把事件顺序、计数和下一棒提示交给 AI。
- ROADMAP 把紧凑活动时间线从后续候选移到当前已交付能力，保留失锚/过期状态等下一阶段候选。
- 新增纯函数契约测试，覆盖会话 bundle 批准状态降级、批注回复往返、提案影响摘要、路径安全、内容哈希与一次性批准凭据。

### Fixed

- `.github/dependabot.yml` 移除仓库尚不存在的 `dependencies` / `ci` 标签引用，避免 Dependabot 每个 PR 重复报标签配置错误。
- `create_visual_proposal` 的 `metadata` schema 使用 `z.record(z.string(), z.unknown())`，兼容 Zod 3 与 Zod 4。
- `mmdc` 渲染与 `doctor` 探针在 CI / 无 sandbox 的 Chrome 环境下自动使用临时 Puppeteer 配置，避免 Chrome 启动失败。
- `/api/collab/annotations` 拒绝不存在的 `nodeId`，避免批注悬挂到无效节点。
- 会话导出会把未消费的 `approved` 提案降级为 `pending` 并清除批准时间，避免导入后重放旧确认号。
- 节点批注回复在保存、导出与导入时经过结构校验，避免把损坏线程写回会话或 bundle。

## [0.3.0] - 2026-11-06

### Added

- `scan_project`：扫描工作区并生成可编辑项目结构图。
- `get_visual_context` / `reply_to_visual_context`：让 AI 读取图形修订、批注与人类消息，并在面板里回信、标记已处理。
- `create_visual_proposal` / `apply_visual_proposal`：人工批准生成一次性凭据，AI 凭凭据应用项目变更，失败自动回滚。
- 双向协作工作台：节点编辑、批注、对话、提案批准、本机面板令牌与 WebSocket 实时同步。
- 提案逐行差异预览、SHA-256 内容哈希，以及绑定哈希的一次性批准凭据。
- 版本化协作会话存储 `output/.ai-draw/session.json`。
- 工作区路径安全校验、协作集成测试与 MCP 工具测试。
- 临时工作区端到端演示脚本与结构化示例。
- CONTRIBUTING、CODE_OF_CONDUCT、SECURITY、Issue/PR 模板和 GitHub Actions CI。

### Changed

- 预览服务默认绑定 `PREVIEW_HOST`，不再监听所有网卡。
- `npm test` 使用 Vitest 真测试，删除旧 CLI 风格手工脚本，避免 `process.exit` 与固定端口互相干扰。
- `npm run lint` 暂以 TypeScript `--noEmit` 作为静态检查。
- 工具数量从 11 增至 16，版本升至 0.3.0。

### Fixed

- 旧 smoke 脚本在 Vitest 下误报失败。
- `doctor` 仅检查 `mmdc --version` 导致无法发现 Chrome 缺失的问题（新版本增加渲染探针）。

## [0.2.0] - 2026-11-05

### Added

- 11 个 MCP 工具、Mermaid/SVG 双模式编辑器、离线 Mermaid、缩放平移、小地图、SVG/PNG 导出。
- 多 IDE 自动打开预览面板与可选 VS Code/Cursor 扩展。

### Changed

- 以 AI 使用体验为优先重构工具层和文档结构。
