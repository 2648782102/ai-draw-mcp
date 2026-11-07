# Architecture

AI Draw MCP 是一个本机优先的**人类与 AI 项目沟通画板**。共享项目图是人类可见的主要工作区；MCP stdio 是 AI 读取和更新画布状态的接入方式。节点、关系、来源证据、人的选择与批注、AI 的回复和图形修订共同组成双方的项目上下文。产品定义与分阶段计划见 [PRODUCT_DIRECTION.md](PRODUCT_DIRECTION.md)。

当前 `0.3.x` 默认打开共享画布：首用可直接只读扫描项目，节点对象卡显示人与 AI 的有序留言并支持就地续答；项目工作台作为次级入口保留图形编辑、只读投影、变更 diff 与人工批准。可复制只读投影作为辅助工具独立存在。后续阶段继续补强证据可信度与从视觉意图到安全提案的追踪。无论任何交互路径，项目文件写入仍须经过提案、完整 diff、人工批准和一次性确认号。系统由四层组成：

AI 侧的默认入口是 MCP stdio：`src/server.ts` 注册 26 个工具、MCP 初始化指令与 5 个只读 `ai-draw://board/*` 资源。资源由 `src/infra/agent-context.ts` 从现有 `SessionSnapshot` 派生，清理一次性凭据、凭据式 metadata 与临时本机状态，并复用 `createSessionBundle()` / `buildExportManifest()` / `BRIEF_JSON` / `CAPABILITIES_JSON` / 诊断投影。`open_preview` 与 `AI_DRAW_AUTO_OPEN_PANEL=1` 只是人想看画布时的显式兼容入口；生成图或 `scan_project` 默认不会打开浏览器。官方 OpenAI 文档把 MCP 的自定义 UI 资源列为可选能力，并说明 Codex CLI 与 IDE 共用 MCP 配置；因此本项目优先提供工具、资源和指令，而不是把网页变成 agent 的必经入口。详见 [ADR 0024](ADR/0024-agent-first-mcp-surface.md)。

```text
IDE / human browser
  ├── MCP stdio (AI tools) ──────┐
  └── HTTP + WebSocket (panel) ──┤
                                  ▼
                         src/server.ts
             ┌──────────────────┼──────────────────┐
             ▼                  ▼                  ▼
        DiagramStore       SessionStore       PreviewServer
       diagram files     graph/chat/proposals   REST + WS + HTML
             │                  │                  │
             └──────── renderer / project scanner / path safety
```

## Rendering path (legacy, still supported)

1. AI 调用任一 `render_*` MCP 工具。
2. 工具把参数转成 Mermaid DSL 或包装 SVG。
3. `renderer.ts` 调用本地 `mmdc` 或 `sharp` 产出 SVG/PNG。
4. `DiagramStore` 写入 `diagrams.json`，`PreviewServer` 通过 WebSocket 广播 `diagram_added`。
5. `ide-opener.ts` 只在 `open_preview`、`scan_project(open_panel: true)` 或 `AI_DRAW_AUTO_OPEN_PANEL=1` 时尝试在 IDE 内置浏览器打开面板；默认路径没有窗口副作用。

## Collaboration path (0.3)

1. AI 调用 `scan_project`，`project-scanner.ts` 只读扫描工作区（默认 2 层、最多 40 个节点；大项目按顶层分组保留骨架并生成有界「另有 N 个对象」汇总节点），按 POSIX 相对路径派生确定性节点/连线 ID；对 1 MiB 以下的源码/Markdown 文本提取最多 5 条 version 1 `GraphSourceEvidence`（`definition` / `import` / `heading` 的 `file:line` 证据）。`visual-sync-service.ts` 把扫描结果交给 `mergeScannedGraph()` 生成 `VisualGraph`，同时复用同一套渲染、会话保存与 WebSocket 广播。
2. `SessionStore` 把图、修订号、消息、批注、提案写入 `OUTPUT_DIR/.ai-draw/session.json`。
3. 人类可在本机浏览器画布中改节点/连线、选取范围、给当前焦点或画布范围写留言、在既有批注线程里续答，或重新扫描项目；图形写入会提升 `graphRevision` 并通过 WebSocket 同步。主输入复用 `POST /api/collab/annotations`，线程回复复用 `POST /api/collab/annotations/:id/reply`；两条路径都只写共享会话，不写项目文件。AI 可通过 MCP 在同一批注线程回复，面板会保留作者与顺序。`SessionStore.validateGraph()` 校验节点/连线/批注 ID、有限坐标、路径/分组/连线类型、回复结构与引用完整性。
4. AI 调用 `get_visual_context` 读取待处理消息、未解决批注、节点批注线程与 `annotationThreads.nextActor`、当前图、人类当前选中节点的 `focus`、有界多节点的 `selectionScope`、按节点聚合的 `intentSummary`，以及 `activityTimeline` 的只读派生事件；用 `reply_to_visual_context` 回信、内联回复线程、标记已处理。批注保存 `nodeLabel` / `nodePath` / `graphRevision` / `anchorStatus`：节点改名或路径变化后标为 `outdated`，节点删除后标为 `detached`；`staleThreads` 不进入 `intentByNode`，AI 应等待人类确认或重锚，不能把旧讨论当作当前写入意图。
5. AI 可先调用 `get_agent_workflow` 读取从当前 `SessionSnapshot` 派生的 version 1 `WORKFLOW_JSON`：八步顺序、前置/产物、`readOnly`、`writes: "none" | "session" | "project"` 与 `blocked` 就绪提示；工具自身只读且不持久化步骤。交接时可调用 `get_shared_brief` 得到同一快照派生的 `BRIEF_JSON`：焦点、就绪阻塞、有界意图、失锚讨论、最近图形修订、源码证据、计数和下一步；它不持久化、不含批准凭据。需要聚焦某个节点时可调用 `get_node_context`，从同一 `SessionSnapshot` 派生 version 1 `NODE_CONTEXT_JSON`：节点字段、`file:line` 证据、命中节点的批注线程及失锚状态、入/出连线与相邻节点、相关 `graphDiffs`、焦点状态和固定只读安全标记；默认节点是人类焦点，显式 `node_id` 不改变焦点。复盘决策依据时可调用 `get_decision_trail`，从同一快照派生 version 1 `DECISION_TRAIL_JSON`：把意图、失锚讨论、图修订、有界提案变更摘要、批准/应用阶段与活动时间线按证据类型串联；它是只读投影，不签发凭据。随后 AI 可选调用 `list_change_templates`：只读列出更新文档/添加测试/创建模块模板，或把模板展开为引用当前 `graphRevision` 与节点的 `changes` 草稿。它不写会话、不创建提案、不签发凭据。随后 AI 可先调用 `preflight_visual_proposal` 只读检查候选变更的路径、文件存在性、create/update 方向、重复路径、重复内容、编码与体积；这一步同样不写会话、不创建提案、不签发凭据。最后 `create_visual_proposal` 记录带 `contentHash` 的 `ChangeProposal`，也只写会话，不碰项目文件。
6. 面板通过 `/api/collab/proposals/:id/impact` 展示文件/行数/字节数摘要，并通过 `/api/collab/proposals/:id/diff` 展示逐行差异；人类点击「批准」。服务端只把提案标为 `approved`，签发绑定 `contentHash` 的 10 分钟一次性 `approvalId` / `grantHash`，不会写项目文件。
7. 人类把确认号发给 AI；AI 调用 `apply_visual_proposal`，服务端校验凭据与内容哈希后写入项目，失败自动回滚。
8. AI 可再次 `scan_project`，或人在面板触发 `POST /api/collab/rescan`，生成反映新结构的图；两者共用 `VisualSyncService` 并保留人工视觉状态，形成闭环。

`POST /api/collab/rescan` 要求 `confirmedBy: "human"` 与本机面板令牌；`scan_project` 默认不打开面板，可显式传 `open_panel: true` 供人查看，或用 `AI_DRAW_AUTO_OPEN_PANEL=1` 恢复旧宿主行为。两者还可在测试/自动化场景显式传 `render: false`，跳过重复 `mmdc` 渲染但仍完成扫描、合并、会话保存与 `PRESERVATION_JSON`；面板始终传 `render: true`，未传时保持默认渲染，非布尔的 `render` 会被 rescan 端点以 400 拒绝。扫描器只用 `fs.readdir` / `fs.readFile` 读取工作区；图形同步写的是 `OUTPUT_DIR` 下的图资产和会话，不写 `AI_DRAW_WORKSPACE_ROOT`。`mergeScannedGraph()` 按稳定 ID 优先、路径次之匹配旧节点：保留有限 `x` / `y`、自定义标签、`metadata.layoutSource`、`human` 焦点以及可锚定批注；新节点占用空闲自动布局位，删除节点使相关线程 `detached`，标签/路径变化使线程 `outdated`。version 1 `ScanPreservationSummary` 通过 `PRESERVATION_JSON`、HTTP 响应、系统消息与 WebSocket `session_updated` 暴露计数；它只是审计信息，不签发批准凭据，也不授权项目写入。详见 [ADR 0006](ADR/0006-stable-scan-preserves-human-visual-state.md)。

协作会话可导出为 `kind: "ai-draw-session-bundle"` 的 version 1 JSON。导出只包含图、有限人工坐标、消息和去敏后的提案；一次性批准凭据留在内存中且不写入 bundle。导入必须带 `confirmedBy: "human"`，服务端会重新校验图与提案路径、清空批准凭据、拒绝非法文件和非有限坐标；导入绝不写项目文件。

面板选中节点时，`POST /api/collab/focus` 记录 version 1 `SessionFocus`。端点要求 `confirmedBy: "human"` 和本机面板令牌；`SessionStore` 只接受 `source: "human"`，并从当前图派生节点标签/路径/分组。`get_visual_context.focus`、诊断与 bundle 只读暴露该上下文。图修订会刷新仍存在节点的焦点字段；节点删除或 bundle 导入后找不到节点时清除焦点。选中状态不进入活动时间线，不签发凭据、不改变线程状态、不授权项目写入，详见 [ADR 0005](ADR/0005-human-focus-is-read-only-context.md)。

失锚/过期状态是会话图上的版本化审计字段，bundle 会保留它们；`outdated` 线程只能经人类确认的 `/api/collab/annotations/:id/anchor` 重锚，`detached` 线程保留原 `nodeId` 且不自动重锚。重锚是讨论状态的确认，不签发批准凭据，也不授权项目写入。

`GET /api/collab/activity` 与 `get_visual_context.activityTimeline` 从会话快照派生紧凑时间线：消息、`graphDiffs` 的图形修订事件、批注创建/回复/解决、提案创建/批准/应用/拒绝/失败，以及 `nextActor` 与 guidance。时间线是 version 1 只读投影，不增加持久化协议，不签发凭据，也不能授权项目写入；原文与批准凭据仍以 `SessionSnapshot` 和内存中的 `ApprovalGrant` 为准。

`GET /api/collab/diagnostics` 与 `get_visual_context.diagnostics` 从同一快照派生 version 1 健康摘要：图/线程/提案计数、活动总量、信号、下一步动作，以及 `approvalGrantsExported: false`、`staleThreadsExcludedFromIntent: true`、`projectWritesRequireHumanApproval: true` 三个安全不变量。诊断只读、无持久化、无凭据，也不替代完整上下文。

`src/domain/agent-workflow.ts` 复用 `summarizeAnnotationThreads()` 与 `buildReviewReadiness()`，把派生的上下文归属、失锚线程、待处理消息、提案计数和紧凑只读 `reviewReadiness` 投影成 `AgentWorkflow`。`get_agent_workflow` 返回 `WORKFLOW_JSON`，所有步骤的 `grantsWriteAuthority` 都是 `false`；只有 `apply` 步骤的 `writes` 是 `project`。工作流不签发凭据、不自动批准，`ready` 不替代逐行 diff，也不绕开 `SessionStore.applyProposal()`；详见 [ADR 0007](ADR/0007-agent-workflow-is-a-read-only-contract.md) 与 [ADR 0015](ADR/0015-review-readiness-is-a-derived-diagnostic.md)。

`src/domain/node-context.ts` 复用 `summarizeAnnotationThreads()` 和会话的 `graphDiffs`，把当前 `VisualGraph` 中单个节点投影成 `NodeContext`。`get_node_context` 与 `GET /api/collab/node-context` 返回 `NODE_CONTEXT_JSON`，面板也用同一端点显示选中节点；它是不持久化、不修改焦点/线程、不签发凭据的派生视图。详见 [ADR 0010](ADR/0010-node-context-is-a-read-only-projection.md)。

`src/domain/shared-brief.ts` 复用活动时间线、批注线程聚合、会话状态与 `graphDiffs`，把当前 `SessionSnapshot` 投影成 `SharedBrief`。`get_shared_brief` 与 `GET /api/collab/brief` 返回 `BRIEF_JSON`，面板显示并可复制同一份视图；它不持久化、不进入 bundle、不含批准凭据、不写会话或项目文件，失锚线程与当前意图分离。详见 [ADR 0011](ADR/0011-shared-brief-is-a-read-only-projection.md)。

`src/domain/decision-trail.ts` 复用批注线程聚合、`graphDiffs`、提案状态与活动时间线，把当前 `SessionSnapshot` 投影成 `DecisionTrail`。`get_decision_trail` 与 `GET /api/collab/decision-trail` 返回 `DECISION_TRAIL_JSON`，面板显示并可复制同一份视图；事件和提案变更行都有上界，安全字段投影排除一次性确认号与 metadata 凭据，失锚讨论只作历史证据，提案完整逐行 diff 仍以 `/api/collab/proposals/:id/diff` 和面板为准。它不持久化、不进入 bundle、不改焦点/线程/提案、不批准变更、不签发凭据、不写会话或项目文件。详见 [ADR 0013](ADR/0013-decision-trail-is-a-read-only-projection.md)。

`src/domain/review-readiness.ts` 复用 `buildSharedBrief()` 与 `buildDecisionTrail()`，把 `BRIEF_JSON` 就绪阻塞和 `DECISION_TRAIL_JSON` 证据缺口派生为 version 1 `REVIEW_READINESS_JSON`。`GET /api/collab/review-readiness`、`CONTEXT_JSON.diagnostics.reviewReadiness`、诊断信号、下一步动作、面板与 CI 工作流示例显示或读取同一只读投影。它固定 `readOnly: true`、`grantsWriteAuthority: false`、`excludesApprovalGrants: true`，不持久化、不批准/应用提案、不签发凭据、不写会话或项目文件，也不替代完整逐行 diff。详见 [ADR 0015](ADR/0015-review-readiness-is-a-derived-diagnostic.md)。

`src/domain/source-navigation.ts` 从当前 `VisualGraph` 的只读 `GraphSourceEvidence` 派生 version 1 `SOURCE_NAVIGATION_JSON`。`get_source_navigation` 与 `GET /api/collab/source-navigation` 返回同样的有界相对 `file:line`、编辑器 URI 文本、`code --goto` 提示与可复制清单；面板显示并复制同一视图。投影过滤绝对路径、目录穿越、受保护目录与 `.env`-like 名称，固定 `readOnly: true`、`grantsWriteAuthority: false`、`excludesApprovalGrants: true`、`excludesAbsolutePaths: true`、`doesNotOpenFiles: true` 与 `projectWritesRequireHumanApproval: true`，不重复读项目文件、不打开编辑器、不启动进程/执行命令、不写会话或项目文件、不签发凭据，也不扩大提案路径。详见 [ADR 0016](ADR/0016-source-navigation-is-copyable-context.md)。

`src/domain/capabilities.ts` 从类型化工具常量、`SERVER_TOOL_COUNT` 与当前 `SessionSnapshot` 派生 version 1 `CAPABILITIES_JSON`。`get_capabilities` 与 `GET /api/collab/capabilities` 返回 26 个工具的分组/输出标记/`writes` 目标、JSON 契约、八步工作流阻塞与审阅就绪状态、下一步安全动作、唯一 `writes: "project"` 工具和固定安全不变量；面板显示并可复制同一清单。它是应用层只读发现契约，与 MCP 原生 `tools/list` 互补；不调用其他工具、不重复读取项目文件、不改会话/项目文件、不签发凭据、不暴露工作区绝对路径，`ready` 也不替代完整逐行 diff。详见 [ADR 0017](ADR/0017-capability-catalogue-is-read-only-discovery.md)。

`src/domain/selection.ts` 校验 version 1 `SessionSelection` 并从同一 `SessionSnapshot` 派生 `SELECTION_SCOPE_JSON`。本机面板可用 `PANEL_TOKEN`、`confirmedBy: "human"` 与 `POST /api/collab/selection` 发布最多 24 个唯一节点 ID；服务端拒绝未知、重复、超限或非人类来源。`get_selection_scope` 与 `GET /api/collab/selection-scope` 只投影选中节点、两端都在范围内的连线、过滤后的工作区相对 `file:line` 证据、焦点包含状态、视口和固定只读安全标记；`CONTEXT_JSON.selectionScope`、`BRIEF_JSON.selection`、`WORKFLOW_JSON.selection` 与诊断给出紧凑版本。图修订移除失锚节点 ID 但不改写原 `selectionRevision`，导入会话清空选择，bundle 与 `EXPORT_MANIFEST_JSON` 明确排除选择。它不改 `graphRevision`、不产生消息/时间线/`graphDiffs`/批准凭据、不重读项目文件、不写项目文件；详见 [ADR 0018](ADR/0018-human-selection-is-read-only-scope.md)。

`src/domain/selection-workorder.ts` 从 `SELECTION_SCOPE_JSON`、当前消息/批注线程与 `REVIEW_READINESS_JSON` 纯派生 version 1 `SELECTION_WORKORDER_JSON`。`get_selection_workorder` 与 `GET /api/collab/selection-workorder` 返回有界选中节点、内部连线、过滤后的工作区相对候选路径、范围内意图、`file:line` 证据、审阅状态、缺口、下一步与复制文本；纯派生 `freshness` 比较 `selectionRevision` 与 `graphRevision`，stale 只提示让人重新选择，不修改选择或授权写入。面板显示并可复制同一清单。工作单不持久化、不重读项目文件、不含 `ProjectChange` 内容/逐行 diff/提案/批准凭据/工作区绝对路径，候选路径不扩大未来提案允许路径；创建变更仍须显式 `changes` → `preflight_visual_proposal` → `create_visual_proposal` → 人工审阅完整 diff → 一次性确认号 → `apply_visual_proposal`。详见 [ADR 0019](ADR/0019-selection-workorder-is-read-only-preflight.md)。

`src/domain/viewport.ts` 校验 version 1 `SessionViewport`：有限且有界的 `scale` / `x` / `y`、合法时间戳与 `source: "human"`。只有本机面板能用 `PANEL_TOKEN`、`confirmedBy: "human"` 和 `POST /api/collab/viewport` 发布它；面板在缩放/平移后通过带令牌的 `keepalive fetch` 节流同步，不能使用无法设置自定义头的 `sendBeacon`。`get_visual_context.viewport`、`BRIEF_JSON.viewport` 与诊断只读暴露这份注意力状态。它不改 `graphRevision`、不生成消息、`graphDiffs`、时间线事件或批准凭据，也不进入 bundle；导入会话会清除视口。详见 [ADR 0012](ADR/0012-viewport-is-read-only-attention-context.md)。

面板把诊断信号与下一步动作展开为可扫读清单；`action` 信号提示需要人补充或 AI 读取的上下文，`warning` 提示已失败/等待应用的提案，`info` 只描述状态。清单不提供批准按钮，也不改变会话。

「复制给 AI 的上下文」按钮完全在浏览器端从已加载的会话、诊断与差异摘要拼出一段只读文本；它不调用写端点、不新增消息、不修改会话、不签发凭据。剪贴板不可用时，文本只进入独立的只读复制框，等待人工复制；它不会进入画布留言输入框。

「复制共享简报」按钮从 `GET /api/collab/brief` 已返回的 `BRIEF_JSON` 生成紧凑交接文本；它不调用写端点、不新增消息、不修改会话、不签发凭据，也不把确认号写入剪贴板。

「复制决策链」按钮从 `GET /api/collab/decision-trail` 已返回的 `DECISION_TRAIL_JSON` 生成复盘提示；它不调用写端点、不新增消息、不修改会话、不签发凭据，也不把确认号写入剪贴板。

「复制源码跳转」按钮从 `GET /api/collab/source-navigation` 已返回的 `SOURCE_NAVIGATION_JSON` 生成相对 `file:line` 提示；它不调用写端点、不打开文件、不启动 IDE 或执行命令行，也不把确认号或绝对路径写入剪贴板。剪贴板不可用时，文本只进入独立的只读复制框。

「复制能力清单」按钮从 `GET /api/collab/capabilities` 已返回的 `CAPABILITIES_JSON` 生成交接提示；它不调用其他工具、不调用写端点、不新增消息、不修改会话、不签发凭据，也不把确认号或本机绝对路径写入剪贴板。剪贴板不可用时，文本只进入独立的只读复制框。

`GET /api/collab/bundle/manifest` 从 `SessionStore.exportBundle()` 返回的同一份 `SessionBundle` 派生 version 1 `EXPORT_MANIFEST_JSON`。面板导出会话时把它作为顶层 `exportManifest` 附在下载 JSON 里，便于 Issue、示例和回归报告快速核对资产计数、建议文件名、被排除的凭据/图形历史/视口与固定安全标记。`parseSessionBundle()` 仍只投影严格校验的 `session` 字段，带清单的 bundle 与旧 bundle 均可导入；`buildExportManifest()` 会拒绝非 version 1 输入与 credential-like proposal metadata。清单不持久化、不签发凭据、不批准变更、不写会话或项目文件，详见 [ADR 0014](ADR/0014-export-manifest-is-a-derived-inventory.md)。

`SessionStore.setGraph()` 会把前后 `VisualGraph` 交给 `src/domain/graph-diff.ts`，保留最近 20 条 version 1 `graphDiffs`。每条记录包含修订号、来源、节点/连线计数及字段级变化；bundle 也保留这些审计记录，导入时严格校验结构、计数、字段值与时间戳并拒绝未知属性。`get_visual_context.graphDiffs` 和 `GET /api/collab/graph/diffs` 只读暴露它们；面板展开最近修订的字段前后值，时间线合并 `graph_diff` 事件。AI 应据此理解人类改图，而不是从自然语言猜测路径/分组/连线变化。

`src/domain/graph-history.ts` 校验 version 1 `GraphHistoryState`；`SessionStore` 在 `OUTPUT_DIR/.ai-draw/session.json` 中保存最多 12 步视觉图 past/future 快照。`GET /api/collab/graph/history` 只读返回计数；人类确认的 `POST /api/collab/graph/undo` 与 `/redo` 要求本机面板令牌和 `confirmedBy: "human"`，恢复的图通过 `setGraph()` 生成新 `graphRevision`、`graphDiffs`、焦点刷新与派生活动消息。历史不进入 bundle、导入会话会重置历史，且两个端点都不触碰工作区文件、提案状态、批准凭据或已应用的项目写入；详见 [ADR 0008](ADR/0008-visual-undo-is-not-project-undo.md)。

`GraphNode.sourceEvidence` 是扫描器派生、随 `VisualGraph` 持久化的只读引用。`GET /api/collab/source-evidence` 拉平节点证据；`get_visual_context.sourceEvidence`、`intentByNode`、诊断计数与面板列表让 AI/人看到工作区相对 `path`、正整数 `line` 和短摘要。bundle 和 `validateGraph()` 严格校验版本、类型、行号、路径、摘要与未知属性；证据不签发确认号、不改变 `path-safety.ts` 允许范围，也不授权项目写入。详见 [ADR 0009](ADR/0009-source-evidence-is-read-only-context.md)。

## Safety model

- 预览服务默认只监听 `PREVIEW_HOST`（`127.0.0.1`）。
- 协作会话与项目文件分离：会话在 `OUTPUT_DIR/.ai-draw/`，提案目标在 `AI_DRAW_WORKSPACE_ROOT`。
- `path-safety.ts` 拒绝路径逃逸、删除、`.git`、`node_modules`、`dist`、`.env*`、锁文件和工作区根目录覆盖。
- 面板 HTML 注入随机 `PANEL_TOKEN`；`/api/collab/*` 的非 GET 写操作必须带 `X-AI-Draw-Token`。
- 提案内容绑定 SHA-256 `contentHash`；批准凭据也绑定该哈希，提案被改动后凭据失效。
- 批准只签发一次性凭据；`apply_visual_proposal` 必须提供 `approval_id`、`approval_grant`、`approval_expires_at` 和 `approved_by: "human"`。
- HTTP 端点不提供“批准即写文件”；应用只走 MCP 工具，凭据不可重放。
- 写入是 UTF-8 文本、临时文件 + rename；中途失败会回滚已写入文件。
- 所有日志写 `stderr`，`stdout` 专用于 MCP JSON-RPC。

## Persistence

| File | Purpose |
|------|---------|
| `output/diagrams.json` | legacy diagram manifest |
| `output/<id>.svg` / `.png` | rendered diagram assets |
| `output/.ai-draw/session.json` | versioned collaboration session |
| `ai-draw-session-*.json` | portable session bundle for bug reports and examples |

## Verification layers

`test/` 覆盖四层：MCP stdio 工具与响应、HTTP/WebSocket 协作闭环、批注线程/活动时间线/工作流等派生视图，以及 bundle、影响摘要、路径安全、内容哈希和一次性批准凭据等纯函数契约。`npm run test:examples:workflow` 在临时工作区实际跑只读工作流示例；`scripts/repo-check.mjs` 离线检查公开文档、发布文案、面板关键 ID、协作端点与安全实现是否漂移。

所有持久化结构都有 `version: 1`，后续迁移在 `SessionStore.create()` 与类型层处理。

## Protocol

WebSocket events：`diagram_added`、`diagram_update`、`diagram_removed`、`graph_updated`、`chat_message`、`proposal_created`、`proposal_updated`、`session_updated`。

REST endpoints 以 `/api/diagrams`、`/api/diagram/:id` 提供旧图管理；`/api/collab/*` 提供会话、图形、消息、批注、人工确认重新扫描和提案。完整工具清单见 README。

## Extension points

- 在 `src/tools/` 加工具：通过 `_shared.ts` 访问 `ToolContext`，并在 `server.ts` 注册与更新 `TOOL_COUNT`。
- 在 `src/domain/types.ts` 扩展协议：保持 `version` 字段并更新集成测试。
- 在 `project-scanner.ts` 增加语言/框架识别：输出仍是 `ProjectScanResult`，并保持稳定 ID 与 `VisualSyncService` 的保留契约。
- 在 `templates/index.html` 增加画布交互：通过 `/api/collab/graph` 保存，不要直接修改 Mermaid 源码来承载结构化语义。
