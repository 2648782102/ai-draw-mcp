# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
