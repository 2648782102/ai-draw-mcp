# AGENTS.md — AI Agent 操作手册

本文件是给 AI coding agent 看的操作手册。人类阅读 `README.md`，架构阅读 `docs/ARCHITECTURE.md`，贡献流程阅读 `CONTRIBUTING.md`；长时间自治任务的目标、红线、验收证据与最终审计规则阅读 `docs/GOAL_MODE.md`。

---

## 项目是什么

`ai-draw-mcp` 是本机优先的 MCP Server，给 IDE 里的 AI 提供绘图能力，并给人一个可编辑、可批注、可对话、可批准变更提案的可视化面板。

0.3 起，核心不只是「AI 画一张图」，而是闭环：

```text
AI 扫描项目 → 生成结构图 → 人改图/批注/对话 → AI 读取上下文 → AI 生成提案 → 人批准并给确认号 → AI 凭凭据安全写入 → 再扫描
```

安全底线：**AI 不得绕过提案、人工批准与一次性确认号直接修改项目文件**。所有项目写入都经过 `src/domain/path-safety.ts` 和 `SessionStore.applyProposal()`。

---

## 目录地图

```text
src/
├── index.ts                  入口：启动预览服务，连接 MCP stdio
├── server.ts                 组装根：创建实例，注册全部工具与 TOOL_COUNT
├── domain/
│   ├── types.ts              版本化协作协议：VisualGraph / SessionSnapshot / ChangeProposal
│   ├── ids.ts                统一 ID 与时间戳
│   ├── approval.ts           一次性批准凭据
│   ├── session-bundle.ts     可移植会话快照的创建与解析
│   ├── annotation-thread.ts  节点批注线程聚合、回复校验与 nextActor 队列
│   ├── activity-timeline.ts  消息/批注/提案生命周期的只读派生时间线
│   ├── session-diagnostics.ts 会话健康、下一步动作与安全不变量的只读摘要
│   ├── source-navigation.ts   SOURCE_NAVIGATION_JSON 可复制只读源码跳转投影
│   ├── capabilities.ts        CAPABILITIES_JSON 只读工具/契约/安全边界清单与 SERVER_TOOL_COUNT
│   ├── selection.ts           SessionSelection 有界校验与 SELECTION_SCOPE_JSON 只读投影
│   ├── selection-workorder.ts SELECTION_WORKORDER_JSON 只读预提案工作单派生
│   ├── graph-diff.ts          图形修订之间的节点/连线字段差异
│   ├── graph-history.ts       有界视觉撤销/重做历史契约解析
│   ├── graph-source-evidence  GraphNode.sourceEvidence 只读契约（见 types.ts / session-bundle.ts）
│   ├── visual-graph-merge.ts  稳定路径重扫合并器：坐标/标签/批注/焦点保留
│   ├── change-templates.ts    常见意图的只读变更模板目录与草稿展开
│   ├── agent-workflow.ts      当前会话的八步 agent 工作流契约与就绪阻塞
│   ├── shared-brief.ts        SharedBrief / BRIEF_JSON 派生只读交接投影
│   ├── decision-trail.ts      DecisionTrail / DECISION_TRAIL_JSON 派生只读决策链
│   ├── review-readiness.ts    ReviewReadiness / REVIEW_READINESS_JSON 派生只读审阅状态
│   ├── session-bundle.ts      SessionBundle 与 ExportManifest 派生只读导出清单
│   ├── viewport.ts            SessionViewport 有界只读注意力状态校验
│   ├── impact.ts             提案影响摘要：文件数、行数、字节数与安全说明
│   └── path-safety.ts        工作区路径校验，提案应用的安全边界
├── infra/
│   ├── config.ts             AppConfig + loadConfig + 配置类型
│   ├── workspace.ts          AI_DRAW_WORKSPACE_ROOT / 包根目录解析
│   ├── store.ts              DiagramStore：旧图清单持久化
│   ├── session-store.ts      SessionStore：图、消息、批注、提案、批准凭据、应用与回滚
│   ├── project-scanner.ts    只读扫描项目结构与 import 关系
│   ├── visual-sync-service.ts AI 扫描与人类重新扫描共用的同步、渲染和广播服务
│   ├── renderer.ts           mmdc / sharp 渲染，SVG 包装
│   ├── preview-server.ts     Express REST + WebSocket + 协作 API
│   ├── ide-opener.ts         在 IDE 中打开 Simple Browser
│   ├── logger.ts             stderr logger
│   └── templates/index.html  预览面板 + 双向协作工作台
└── tools/
    ├── _shared.ts            ToolContext、渲染管道、响应格式
    ├── render-*.ts           7 个绘图工具
    ├── update/delete/list/open-preview.ts 旧图管理
    ├── scan-project.ts       稳定路径只读扫描、保留人工视觉状态并生成/刷新协作图
    ├── get-visual-context.ts 读取人类意图
    ├── get-agent-workflow.ts 读取八步 WORKFLOW_JSON 与写入边界
    ├── get-shared-brief.ts  读取紧凑 BRIEF_JSON 交接视图与就绪阻塞
    ├── get-decision-trail.ts 读取 DECISION_TRAIL_JSON 意图→图修订→提案只读时间线
    ├── list-change-templates.ts 列出/展开只读变更模板草稿
    ├── create-visual-proposal.ts 创建待确认提案
    └── apply-visual-proposal.ts 凭一次性凭据应用已批准提案

test/                         Vitest：批注线程、活动时间线、领域契约、MCP 集成测试、协作集成测试
scripts/doctor.mjs            环境自检（含真实 Mermaid 渲染探针）
scripts/capture-panel.mjs     用临时示例项目生成全部真实面板截图
scripts/github-maintenance.mjs GitHub About/topics 漂移检查、同步与 Release 创建维护者后备路径
scripts/repo-check.mjs        离线一致性检查：发布文案、文档链接、脚本与 CHANGELOG
scripts/generate-doc-assets.mjs 版本化 README 概念图；`npm run docs:assets` 生成、`--check` 校验
.github/                      Issue/PR 模板与 CI
docs/ARCHITECTURE.md          架构、协议、安全模型
docs/README.md                文档地图
docs/COMPETITIVE_RESEARCH.md  同类产品调研与定位
docs/zen-workspace-panel.png   可复现的沉浸工作区截图；由 `npm run ui:shots` 生成
docs/DEPENDENCY_MAINTENANCE.md 依赖升级、CI 验证与重大版本决策记录
docs/LAUNCH_KIT.md            GitHub/Release/社区宣发模板
docs/GOVERNANCE.md             开源治理、维护清单与元数据漂移证据
docs/ADR/README.md             架构决策记录索引
docs/ADR/0005-human-focus-is-read-only-context.md 当前焦点只读上下文决策
docs/ADR/0006-stable-scan-preserves-human-visual-state.md 稳定扫描保留人工视觉状态决策
docs/ADR/0007-agent-workflow-is-a-read-only-contract.md 只读工作流契约决策
docs/ADR/0008-visual-undo-is-not-project-undo.md 视觉撤销不等于项目写入撤销决策
docs/ADR/0011-shared-brief-is-a-read-only-projection.md 只读共享交接简报决策
docs/ADR/0012-viewport-is-read-only-attention-context.md 视口是只读注意力上下文决策
docs/ADR/0013-decision-trail-is-a-read-only-projection.md 决策链是派生只读投影决策
docs/ADR/0014-export-manifest-is-a-derived-inventory.md 导出清单是派生只读清单决策
docs/ADR/0015-review-readiness-is-a-derived-diagnostic.md 审阅就绪是派生只读诊断决策
docs/ADR/0009-source-evidence-is-read-only-context.md 只读源码证据决策
docs/TROUBLESHOOTING.md        首用自检、常见故障与 FAQ
ROADMAP.md                   产品路线图与非目标
```

---

## 架构约定

- 所有日志写 `stderr`，**禁止**写 `stdout`：会污染 MCP JSON-RPC。
- 工具名用 `snake_case`，注册函数名用 `registerXxx`，文件名用 `kebab-case`。
- 工具描述面向 LLM：说清适用场景，并提示何时用其他工具替代。
- 工具文件只通过 `_shared.ts` 访问基础设施；不要从工具直接改项目文件。
- MCP server 版本从 `package.json` 读取，不要在 `server.ts` 硬编码。
- 新增共享类型放 `src/domain/types.ts`；新增配置类型放 `src/infra/config.ts`。
- `VisualGraph` 与 `SessionSnapshot` 都是 `version: 1`，改协议时必须考虑向后兼容与迁移。
- 预览服务默认绑定 `PREVIEW_HOST = 127.0.0.1`，不要改回监听所有网卡。
- 面板 HTML 注入随机 `PANEL_TOKEN`；`/api/collab/*` 的非 GET 写操作必须带 `X-AI-Draw-Token`。
- 面板外观偏好（Classic / Flow 布局、界面主题、`ambient` 氛围、密度、预览背景、沉浸工作区）只写浏览器 localStorage，只影响本机 CSS/布局；不得把它当作 `focus` / `viewport`、批准凭据或项目写入授权。默认 Flow 工作台的流程带与源码抽屉只展示既有只读状态或切换本机视图；沉浸工作区隐藏界面 chrome 时仍要保留可见退出入口与「批准前只读」边界。

---

## 26 个 MCP 工具

| 分组 | 工具 |
|------|------|
| Mermaid / SVG 绘图 | `render_diagram`、`render_flowchart`、`render_sequence`、`render_architecture`、`render_class_diagram`、`render_mindmap`、`render_svg` |
| 图管理 | `update_diagram`、`delete_diagram`、`list_diagrams`、`open_preview` |
| 双向协作 | `scan_project`、`get_visual_context`、`reply_to_visual_context`、`create_visual_proposal`、`apply_visual_proposal` |
| 提案预检 | `preflight_visual_proposal` |
| 只读变更模板 | `list_change_templates` |
| 只读能力清单 / 工作流契约 / 交接简报 / 节点上下文 / 决策链 / 源码跳转 | `get_capabilities`、`get_agent_workflow`、`get_shared_brief`、`get_node_context`、`get_decision_trail`、`get_source_navigation` |
| 只读多选范围 | `get_selection_scope` |
| 只读预提案工作单 | `get_selection_workorder` |

协作工作流：新 agent 可先调用 `get_capabilities` 一次读取 26 个工具、`CAPABILITIES_JSON` 契约、安全边界与下一步建议；随后 `scan_project`，人改图或勾选多个节点、在节点批注线程里回复或重开讨论后，AI 可先调用 `get_agent_workflow` 读取八步 `WORKFLOW_JSON`、`blocked` 与紧凑只读 `reviewReadiness`，用 `get_shared_brief` 读取紧凑 `BRIEF_JSON` 交接，再调用 `get_visual_context` 读取 `annotationThreads.nextActor`、`pendingMessages`、`unresolvedAnnotations` 与完整 `REVIEW_READINESS_JSON`；针对焦点节点可调用 `get_node_context` 获取紧凑 `NODE_CONTEXT_JSON`，针对「这几个模块」可调用 `get_selection_scope` 获取 `SELECTION_SCOPE_JSON`，用 `get_selection_workorder` 把范围、候选路径、意图、证据与缺口收束成只读 `SELECTION_WORKORDER_JSON`，用 `get_source_navigation` 复制相对 `file:line` 跳转提示，复盘「为什么做这个改动」时可调用 `get_decision_trail` 读取只读 `DECISION_TRAIL_JSON`。`nextActor` 为 AI 时用 `reply_to_visual_context` 回信/内联回复并标记已处理，`nextActor` 为 human 时等待。常见意图可用 `list_change_templates` 展开只读草稿，创建提案前用 `preflight_visual_proposal` 只读检查路径、文件存在性、create/update 与重复内容，再 `create_visual_proposal`；人在面板查看逐行差异、批准并复制一次性确认号，AI 最后调用 `apply_visual_proposal(proposal_id, approval_id, approval_grant, approval_expires_at, approved_by="human")`。

`get_visual_context` 的 `intentSummary` 会按节点聚合未解决批注（包含线程回复）、待处理消息与连线标签，并返回 `annotationThreads` / `nextActor`；`focus` 记录人当前选中的节点；`activityTimeline` 把消息、`graph_diff` 图形修订、线程与提案生命周期合并为只读派生事件。生成提案时优先引用 `focus`、`intentByNode` 和活动顺序，不要只复述扁平消息列表。`nextActor` 为 `human` 时应等待人继续回复，不要抢先创建提案；焦点与活动时间线都不授权项目写入。

`get_node_context` 与 `GET /api/collab/node-context` 是 `src/domain/node-context.ts` 的 version 1 只读投影：默认取 `focus.nodeId`，也可用显式 `node_id`，聚合节点字段、`file:line` 证据、命中该节点的批注线程及失锚状态、入/出连线与相邻节点、相关 `graphDiffs`、焦点状态和固定 `safety`。它不持久化节点上下文、不改焦点、不解决/重锚线程、不创建提案、不写项目文件、不签发凭据；面板用同一端点展示选中节点，详见 [ADR 0010](docs/ADR/0010-node-context-is-a-read-only-projection.md)。

`get_shared_brief` 与 `GET /api/collab/brief` 是 `src/domain/shared-brief.ts` 的 version 1 只读交接投影：聚合会话/图形版本、人类焦点、就绪阻塞、待处理消息、有效与失锚批注、最近图形修订、有界 `file:line` 证据、提案/活动计数和下一步。`BRIEF_JSON` 不持久化、不进入 bundle、不含批准凭据、不改焦点/线程/提案、不写会话或项目文件；面板显示并可复制同一份视图，详见 [ADR 0011](docs/ADR/0011-shared-brief-is-a-read-only-projection.md)。

`get_decision_trail` 与 `GET /api/collab/decision-trail` 是 `src/domain/decision-trail.ts` 的 version 1 只读派生投影：把待处理消息、有效批注线程、失锚讨论、字段级图修订、提案变更摘要、批准/应用阶段与活动时间线按证据类型聚合。`DECISION_TRAIL_JSON` 只投影安全字段，不含 `approvalId` / `approvalGrant` / `approvalExpiresAt` / metadata 凭据；失锚讨论只作历史证据，提案变更行是有界 add-line 投影而非完整逐行 diff。它不持久化、不进入 bundle、不改焦点/线程/提案、不写会话或项目文件、不批准或签发凭据；面板显示并可复制同一份视图，批准前仍须查看 `/api/collab/proposals/:id/diff` 或面板完整 diff，详见 [ADR 0013](docs/ADR/0013-decision-trail-is-a-read-only-projection.md)。

`buildExportManifest()` 与 `GET /api/collab/bundle/manifest` 从同一个导出 `SessionBundle` 派生 version 1 `EXPORT_MANIFEST_JSON`：列出格式/版本、建议文件名、图/批注/证据/消息/提案计数、已降级批准状态，以及刻意排除的一次性批准凭据、图形历史与视口。面板下载时把它作为顶层 `exportManifest` 注释附在 JSON 里；`parseSessionBundle()` 仍只投影严格校验的 `session` 字段，旧 bundle 与带清单 bundle 都可导入。构建器拒绝非 version 1 和 credential-like proposal metadata；清单只读、不持久化、不签发凭据、不批准变更、不写项目文件，详见 [ADR 0014](docs/ADR/0014-export-manifest-is-a-derived-inventory.md)。

`buildReviewReadiness()` 与 `GET /api/collab/review-readiness` 从同一 `SessionSnapshot` 派生 version 1 `REVIEW_READINESS_JSON`：把 `BRIEF_JSON` 就绪阻塞和 `DECISION_TRAIL_JSON` 证据缺口汇总为 `ready` / `review` / `blocked`，并进入 `CONTEXT_JSON.diagnostics.reviewReadiness`、诊断信号、下一步动作、面板和可复现工作流示例。它固定只读与不含批准凭据的安全标记，不持久化、不批准/应用提案、不写会话或项目文件，也不替代完整逐行 diff；详见 [ADR 0015](docs/ADR/0015-review-readiness-is-a-derived-diagnostic.md)。

`get_source_navigation` 与 `GET /api/collab/source-navigation` 是 `src/domain/source-navigation.ts` 的 version 1 只读派生投影：从当前 `VisualGraph` 的 `GraphSourceEvidence` 生成有界的相对 `file:line`、`vscode://` / `cursor://` URI 文本、`code --goto` 提示与可复制清单。`SOURCE_NAVIGATION_JSON` 固定 `readOnly: true` 与 `projectWritesRequireHumanApproval: true`，过滤绝对路径、目录穿越、受保护目录和 `.env`-like 名称；不重复读取项目文件、不打开编辑器、不启动进程/执行命令、不写会话/项目文件、不签发凭据、不进入 bundle，也不扩大提案允许路径；面板显示并可复制同一视图，详见 [ADR 0016](docs/ADR/0016-source-navigation-is-copyable-context.md)。

`get_capabilities` 与 `GET /api/collab/capabilities` 是 `src/domain/capabilities.ts` 的 version 1 只读发现清单：从类型化常量、`SERVER_TOOL_COUNT` 与当前 `SessionSnapshot` 派生 26 个工具、JSON 契约、八步工作流就绪状态、`REVIEW_READINESS_JSON` 状态、下一步安全动作和唯一 `writes: "project"` 工具。`CAPABILITIES_JSON` 是应用层发现契约，与 MCP 原生 `tools/list` 互补；不调用其他工具、不重复读取项目文件、不写会话/项目文件、不创建提案、不签发凭据、不暴露工作区绝对路径；面板显示并可复制同一份清单，详见 [ADR 0017](docs/ADR/0017-capability-catalogue-is-read-only-discovery.md)。

`SessionSelection` 是 `src/domain/selection.ts` 校验的 version 1 有界人类多选状态。只有本机面板可通过 `POST /api/collab/selection` 以 `PANEL_TOKEN` 与 `confirmedBy: "human"` 发布最多 24 个唯一节点 ID；服务端拒绝未知/重复/超限 ID、非人类来源、未知属性和非有限修订。`get_selection_scope`、`GET /api/collab/selection-scope`、`CONTEXT_JSON.selectionScope`、`BRIEF_JSON.selection`、`WORKFLOW_JSON.selection`、诊断和面板只读显示 `SELECTION_SCOPE_JSON`：选中节点、两端都在范围内的连线、工作区相对安全 `file:line` 证据与固定只读标记。它不重读项目文件、不改 `graphRevision`、不产生消息/时间线/`graphDiffs`/批准凭据、不进入 bundle、不写项目文件；图修订会移除失锚节点但不改写原 `selectionRevision`，导入会话会清空选择，详见 [ADR 0018](docs/ADR/0018-human-selection-is-read-only-scope.md)。

`get_selection_workorder` 与 `GET /api/collab/selection-workorder` 是 `src/domain/selection-workorder.ts` 的 version 1 纯派生只读投影：从 `SELECTION_SCOPE_JSON`、当前 `SessionSnapshot` 的消息/批注线程与 `REVIEW_READINESS_JSON` 汇总有界节点、内部连线、安全相对候选路径、范围内意图、`file:line` 证据、审阅状态、缺口、下一步、复制文本与固定安全标记。纯派生 `freshness` 比较 `selectionRevision` 与 `graphRevision`，给出 `current` / `stale` / `none` 提示；图变化后的 stale 选择只提示重新选择，不自动刷新或清空。`SELECTION_WORKORDER_JSON` 不持久化、不重读项目文件、不包含 `ProjectChange` 内容/逐行 diff/提案/批准凭据/工作区绝对路径；不改选择、焦点、图修订、消息、时间线或提案，也不扩大未来提案允许路径。候选路径只标为 `candidate`；仍须显式起草 changes、`preflight_visual_proposal`、人工审阅完整 diff 与一次性确认号，详见 [ADR 0019](docs/ADR/0019-selection-workorder-is-read-only-preflight.md)。

`SessionViewport` 是 `src/domain/viewport.ts` 校验的 version 1 有界缩放/平移注意力状态。只有本机面板可通过 `POST /api/collab/viewport` 以 `PANEL_TOKEN` 与 `confirmedBy: "human"` 发布；面板使用带令牌的 `keepalive fetch`，不能使用无法设置自定义头的 `sendBeacon`。`get_visual_context.viewport`、`BRIEF_JSON.viewport`、诊断和面板只读显示。它不改 `graphRevision`、不产生消息/时间线/`graphDiffs`/批准凭据、不进入 bundle、不写项目文件；导入会话会清除视口，详见 [ADR 0012](docs/ADR/0012-viewport-is-read-only-attention-context.md)。

`POST /api/collab/focus` 只接受 `confirmedBy: "human"` 的本机面板选择，服务端写入 version 1 `SessionFocus`；节点删除后清除焦点，图修订会刷新仍存在节点的标签/路径/分组。`get_visual_context.focus`、诊断和 bundle 只读暴露它，bundle 导入会严格校验结构并丢弃失锚焦点。焦点不产生消息、不进入时间线、不签发凭据，也不解决线程或创建提案。

面板「复制给 AI 的上下文」按钮只从已加载数据生成一段提示文本，不调用写端点、不发送消息、不修改会话；剪贴板失败时文本只进入未发送的输入框。

面板「复制共享简报」按钮只复制 `GET /api/collab/brief` 返回的 `BRIEF_JSON`，不调用写端点、不发送消息、不修改会话、不签发凭据；剪贴板失败时文本只进入未发送的输入框。

节点批注保存 `nodeLabel` / `nodePath` / `graphRevision` / `anchorStatus`。节点标签或路径变化后线程标记为 `outdated`，节点删除后标记为 `detached`；`staleThreads` 与活动时间线 `annotation_anchor` 事件会提示 AI 不要把旧讨论当成当前意图。`outdated` 线程必须由人在面板点击「确认重锚」或调用 `/api/collab/annotations/:id/anchor`（`confirmedBy: "human"`）才能恢复；`detached` 线程保留原 `nodeId` 供审计，不得自动重锚。

`diagnostics` 是同一会话的只读健康摘要，包含失锚线程、待处理消息、提案状态分布、活动时间线计数、下一步动作与三个安全不变量；它不签发批准凭据，也不替代 `get_visual_context` 的原文上下文。

每次 `setGraph()` 保存人类图形编辑时，服务端会在会话中保留 version 1 `graphDiffs`（最多 20 条）：记录节点/连线新增、删除，以及 `label` / `kind` / `path` / `group` / `from` / `to` 的字段级前后值。`get_visual_context.graphDiffs`、可展开的面板差异列表与 `GET /api/collab/graph/diffs` 让 AI 精确读取视觉改动；bundle 导入会严格校验差异契约。差异是只读审计记录，不直接生成文件变更，也不授权项目写入。

`scan_project`、面板「重新扫描项目」与 `POST /api/collab/rescan` 共用 `VisualSyncService`。`project-scanner.ts` 用相对路径的 SHA-256 前缀生成确定性节点/连线 ID；`visual-graph-merge.ts` 按稳定 ID 或路径匹配旧图，保留有限 `x` / `y`、人工标签、`metadata.layoutSource`、仍可锚定的批注与 `SessionFocus`，新节点才自动排布，删除节点让线程 `detached`。版本 1 `ScanPreservationSummary` 通过 `PRESERVATION_JSON`、HTTP 响应、消息元数据和 `session_updated` 广播暴露保留计数。扫描器只读项目文件；图形同步只写 `OUTPUT_DIR` 的图资产与会话，绝不签发批准凭据或写项目文件。人工重新扫描端点要求本机面板令牌与 `confirmedBy: "human"`，详见 [ADR 0006](docs/ADR/0006-stable-scan-preserves-human-visual-state.md)。

`scan_project` 的 `render: false` 与 `VisualSyncService.sync({ render: false })` 是面向无头测试/状态检查的快速路径：它们仍然扫描、合并、保存 `VisualGraph` 与会话并返回 `PRESERVATION_JSON`，但跳过重复 `mmdc` 渲染和面板图更新广播。`POST /api/collab/rescan` 可选显式传 `render: false`；布尔类型外的任何值会被 400 拒绝，面板始终显式传 `render: true`。默认路径仍会渲染完整 SVG/PNG。该开关不改变协议或安全边界，也不写项目文件；协作集成测试用它避免 Node 20 CI 上多次浏览器渲染叠加超过 30 秒。

`GraphNode` / `AnnotationPin` 的 `x` / `y` 必须是有限数值；`SessionStore.validateGraph()` 与 `parseSessionBundle()` 都会拒绝非数字、`NaN` 或 `Infinity`。面板编辑坐标会标记 `metadata.layoutSource: "human"`，重新扫描会把它与自动布局区分开。

`list_change_templates` 是只读工具：不带 `template_id` 时返回模板目录，带 `template_id` 时从当前 `graphRevision` 与可选 `node_id` 展开 `changes` 草稿。它不创建提案、不写项目文件、不签发批准凭据；草稿必须先交给 `preflight_visual_proposal`，再由 `create_visual_proposal` 进入人类审阅流程。

`get_agent_workflow` 是只读描述性契约：version 1 `WORKFLOW_JSON` 含八步顺序、`requires` / `produces`、`readOnly`、`writes: "none" | "session" | "project"`、`grantsWriteAuthority: false`、`blocked` 就绪提示，以及由同一快照派生的紧凑 `reviewReadiness` 字段（`ready` / `review` / `blocked`、阻塞/缺口计数与固定只读标记）。它不写会话、不创建提案、不签发凭据；对话回复与提案创建是 session 写入，唯一 project 写入步骤是 `apply_visual_proposal`，仍须人工批准、一次性确认号、内容哈希、路径校验与失败回滚。陈旧线程或等待 human 时，`blocked` 会提示不得把旧讨论变成当前意图；`ready` 不替代完整逐行 diff。共享类型在 `src/domain/types.ts`，构造逻辑在 `src/domain/agent-workflow.ts`，设计边界见 [ADR 0007](docs/ADR/0007-agent-workflow-is-a-read-only-contract.md) 与 [ADR 0015](docs/ADR/0015-review-readiness-is-a-derived-diagnostic.md)。

`SessionStore` 维护 version 1 `GraphHistoryState`：每次 `setGraph()` 把旧 `VisualGraph` 快照压入最多 12 步的 past 栈，人类确认的 undo/redo 端点恢复一个快照并把它记作新的 `graphRevision` / `graphDiffs`。历史只含视觉图，不含消息、提案、批准凭据或项目文件备份；`createSessionBundle()` 不导出历史，导入会重置历史。撤销/重做是 session 写入，不是 project 写入，也不能回退 `apply_visual_proposal` 已经写入的文件。设计边界见 [ADR 0008](docs/ADR/0008-visual-undo-is-not-project-undo.md)。

`scanProject()` 对小于 1 MiB 的源码/Markdown 文本提取最多 5 条 version 1 `GraphSourceEvidence`：`definition` / `import` / `heading`、工作区相对 `path`、正整数 `line` 与 160 字 `excerpt`。`scanToVisualGraph()`、稳定扫描合并、`get_visual_context.sourceEvidence`、诊断计数、`GET /api/collab/source-evidence` 与面板只读暴露它们；`SessionStore.validateGraph()` 与 bundle 解析器拒绝损坏/注入字段。证据只帮助引用代码，不签发凭据、不扩大提案允许路径、不授权项目写入；详见 [ADR 0009](docs/ADR/0009-source-evidence-is-read-only-context.md)。

---

## 如何添加新工具（4 步）

1. 在 `src/tools/` 新建 `render-xxx.ts`，复制现有工具风格；参数用 `zod`，错误处理用 `errorResult`。
2. 在 `src/server.ts` 顶部加 import，在 `createServer()` 内加 `registerXxx(mcp, ctx)`。
3. 同步更新 `TOOL_COUNT`、README 工具表、本文件工具表、CHANGELOG、`test/mcp.test.mjs` 和 `scripts/repo-check.mjs`。
4. 如果涉及协议/持久化/项目写入，必须更新 `src/domain/types.ts`、ARCHITECTURE、协作集成测试与安全边界说明。

工具模板要点：

```typescript
server.tool(
  "render_xxx",
  "一句话说明用途、适用场景以及何时改用其他工具。",
  { title: z.string().optional(), /* params */ },
  async (params) => {
    const id = nanoid(10);
    try {
      return await renderMermaidAndRespond({ id, /* ... */, ctx });
    } catch (err) {
      return errorResult("render_xxx", err);
    }
  }
);
```

纯 SVG 工具用 `renderSvgAndRespond`；协作工具直接操作 `ctx.sessions`，并通过 `ctx.preview.broadcast()` 通知面板。

---

## 协作 API 速查

| Endpoint | 用途 |
|----------|------|
| `GET /api/collab/session` | 完整会话快照 |
| `GET /api/collab/activity` | 只读紧凑活动时间线；`limit` 默认 60、最大 200 |
| `GET /api/collab/diagnostics` | 只读会话诊断：图/线程/提案计数、信号、下一步与安全不变量 |
| `GET /api/collab/graph/diffs` | 最近图形修订差异；`limit` 默认 5、最大 20 |
| `GET /api/collab/graph/history` | 只读有界视觉撤销/重做计数 |
| `GET /api/collab/source-evidence` | 只读 `file:line` 证据；`limit` 默认 100、最大 200 |
| `GET /api/collab/node-context` | 只读单节点上下文；`nodeId` 默认当前焦点，`diffLimit` 默认 5、最大 20 |
| `GET /api/collab/brief` | 只读共享交接简报；`messageLimit` 默认 5 最大 20，`graphDiffLimit` 默认 3 最大 10，`activityLimit` 默认 5 最大 20 |
| `GET /api/collab/decision-trail` | 只读决策链；`eventLimit` 默认 60 最大 120，`proposalLimit` 默认 6 最大 20，`graphDiffLimit` 默认 4 最大 20，`lineLimit` 默认 12 最大 40 |
| `GET /api/collab/bundle/manifest` | 只读导出清单；从当前会话导出的 bundle 派生，不写会话或项目文件 |
| `GET /api/collab/review-readiness` | 只读审阅就绪；聚合 `BRIEF_JSON` 阻塞与 `DECISION_TRAIL_JSON` 缺口，不签发凭据 |
| `GET /api/collab/source-navigation` | 只读可复制源码跳转；有界相对 `file:line`，不打开 IDE 或执行命令 |
| `POST /api/collab/viewport` | 人类面板发布有界缩放/平移注意力状态；严格校验有限数值、范围、来源和未知属性，不改图修订或签发凭据 |
| `POST /api/collab/selection` | 人类面板发布最多 24 个节点的有界多选范围；严格校验，只读意图上下文，不签发凭据 |
| `GET /api/collab/selection-scope` | 只读 `SELECTION_SCOPE_JSON`；选中节点、内部连线、安全相对证据与固定安全标记 |
| `GET /api/collab/selection-workorder` | 只读 `SELECTION_WORKORDER_JSON`；候选路径、范围内意图、证据、缺口与下一步，不含文件内容或凭据 |
| `POST /api/collab/graph/undo` | 人类确认的视觉撤销；生成新图修订，不写项目文件 |
| `POST /api/collab/graph/redo` | 人类确认的视觉重做；生成新图修订，不写项目文件 |
| `POST /api/collab/rescan` | 人类确认的只读重新扫描；可选 `render: false` 跳过重复渲染，保留人工视觉状态，不写项目文件 |
| `GET /api/collab/bundle` | 导出可移植会话快照（不含一次性批准凭据） |
| `POST /api/collab/bundle/import` | 人类确认后导入；清空气批准凭据，不写项目文件 |
| `GET/PUT /api/collab/graph` | 读取/保存 VisualGraph |
| `POST /api/collab/messages` | 人类或 AI 发消息 |
| `POST /api/collab/annotations` | 给当前图加批注；`nodeId` 必须引用现有节点 |
| `POST /api/collab/annotations/:id/reply` | 在节点批注线程里回复，作者可为 `human` 或 `ai` |
| `POST /api/collab/annotations/:id/status` | 解决或重开批注线程，状态为 `resolved` 或 `open` |
| `POST /api/collab/annotations/:id/anchor` | 人类确认 `outdated` 线程与当前节点标签/路径一致；拒绝 AI 自动确认与失锚线程 |
| `GET/POST /api/collab/proposals` | 列出/创建变更提案 |
| `GET /api/collab/proposals/:id/diff` | 查看逐行变更差异 |
| `GET /api/collab/proposals/:id/impact` | 查看批准前的文件/行数/字节数影响摘要 |
| `POST /api/collab/proposals/:id/approve` | 人类批准，返回一次性确认号；**不写项目文件** |
| `POST /api/collab/proposals/:id/reject` | 人类拒绝提案 |
| `WS /ws` | `diagram_update`、`graph_updated`、`chat_message`、`proposal_created`、`proposal_updated`、`session_updated` |

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PREVIEW_PORT` | `3399` | 预览服务端口 |
| `PREVIEW_HOST` | `127.0.0.1` | 面板 URL 主机名，也是 HTTP 监听地址 |
| `AI_DRAW_WORKSPACE_ROOT` | 包根目录 | 项目扫描与提案写入的目标工作区 |
| `OUTPUT_DIR` | `./output` | 图与会话输出目录；建议绝对路径 |
| `DEFAULT_THEME` | `default` | Mermaid 主题 |
| `DEFAULT_FORMAT` | `svg` | 默认输出格式 |
| `LOG_LEVEL` | `info` | 日志级别 |
| `PUPPETEER_EXECUTABLE_PATH` | 自动检测 | 本机 Chrome/Chromium，供 `mmdc` 使用 |
| `MERMAID_CHROME_NO_SANDBOX` | 未设置 | 设为 `1` 时给 `mmdc` 的 Puppeteer 配置加 `--no-sandbox`；CI 中自动启用 |
| `GH_TOKEN` / `GITHUB_TOKEN` | 未设置 | 仅供 `npm run github:sync` 与 `--release` 使用，绝不提交到仓库 |
| `AI_DRAW_URI_AUTHORITY` | `2648782102.ai-draw-panel` | 保留给可选 IDE URI 扩展 |

---

## 开发验证

```bash
npm run lint       # TypeScript --noEmit
npm run build
npm test           # Vitest：MCP 工具、渲染链路、协作闭环
npm run docs:assets:check # 确认 README 概念图可由版本化脚本复现
npm run repo:check   # 离线检查公开文案、链接、面板 ID 与端点是否漂移
npm run github:check # 只读检查 GitHub description/homepage/topics 是否漂移；master push 的维护 workflow 有 admin secret 时自动收敛
npm run doctor     # 含真实 Mermaid 渲染探针
npm run check      # 全量检查（含 GitHub 元数据漂移检查）
```

若 `mmdc` 找不到 Chrome，先设置 `PUPPETEER_EXECUTABLE_PATH`。测试使用独立端口 `3411–3422`，不要复用正在运行的 3399。

---

## 禁止事项

- 不要删掉人工批准门槛，也不要让 `apply_visual_proposal` 接受 AI 自动批准或缺失的一次性凭据。
- 不要实现 `delete` 变更、放宽路径校验，或把会话文件写进项目源码树。
- 不要在 `stdout` 输出日志、调试文本或 Mermaid 内容。
- 不要提交 `dist/`、`output/*.svg|png`、`output/.ai-draw/session.json`、`.env` 或本机配置。
- 会话 bundle 不得包含一次性批准凭据或已批准提案的可用状态；导入必须要求 `confirmedBy: "human"`。
- 节点批注线程的回复必须经过 `parseAnnotationReplies()` 校验；不要信任来自面板或 bundle 的裸数组。
- 不要把 token、`.env`、本机凭据或 GitHub API 响应中的敏感字段写入仓库。
- 不要绕过 `scripts/github-maintenance.mjs` 手工维护 About/topics，避免文档与仓库元数据漂移；版本化 tag 的 Release 由 `.github/workflows/release.yml` 使用内置 `GITHUB_TOKEN` 幂等创建，npm 发布仍须人工批准。
