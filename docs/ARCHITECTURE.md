# Architecture

AI Draw MCP 0.3 是一个本机优先、人机双向协作的可视化工作区。它由四层组成：

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
5. `ide-opener.ts` 尝试在 IDE 内置浏览器打开面板。

## Collaboration path (0.3)

1. AI 调用 `scan_project`，`project-scanner.ts` 只读扫描工作区（默认 4 层、最多 400 个节点），按 POSIX 相对路径派生确定性节点/连线 ID；对 1 MiB 以下的源码/Markdown 文本提取最多 5 条 version 1 `GraphSourceEvidence`（`definition` / `import` / `heading` 的 `file:line` 证据）。`visual-sync-service.ts` 把扫描结果交给 `mergeScannedGraph()` 生成 `VisualGraph`，同时复用同一套渲染、会话保存与 WebSocket 广播。
2. `SessionStore` 把图、修订号、消息、批注、提案写入 `OUTPUT_DIR/.ai-draw/session.json`。
3. 人类在面板「💬 协作」工作台改名称/类型/路径/分组/坐标、增删节点、编辑连线起点/终点/说明/类型、把批注绑定到选中节点、在批注线程里回复/解决/重开、发消息，或点击「重新扫描项目」；每次图形写入都会提升 `graphRevision` 并通过 WebSocket 同步。`SessionStore.validateGraph()` 校验节点/连线/批注 ID、有限坐标、路径/分组/连线类型、回复结构与引用完整性。
4. AI 调用 `get_visual_context` 读取待处理消息、未解决批注、节点批注线程与 `annotationThreads.nextActor`、当前图、人类当前选中节点的 `focus`、按节点聚合的 `intentSummary`，以及 `activityTimeline` 的只读派生事件；用 `reply_to_visual_context` 回信、内联回复线程、标记已处理。批注保存 `nodeLabel` / `nodePath` / `graphRevision` / `anchorStatus`：节点改名或路径变化后标为 `outdated`，节点删除后标为 `detached`；`staleThreads` 不进入 `intentByNode`，AI 应等待人类确认或重锚，不能把旧讨论当作当前写入意图。
5. AI 可先调用 `get_agent_workflow` 读取从当前 `SessionSnapshot` 派生的 version 1 `WORKFLOW_JSON`：八步顺序、前置/产物、`readOnly`、`writes: "none" | "session" | "project"` 与 `blocked` 就绪提示；工具自身只读且不持久化步骤。需要聚焦某个节点时可调用 `get_node_context`，从同一 `SessionSnapshot` 派生 version 1 `NODE_CONTEXT_JSON`：节点字段、`file:line` 证据、命中节点的批注线程及失锚状态、入/出连线与相邻节点、相关 `graphDiffs`、焦点状态和固定只读安全标记；默认节点是人类焦点，显式 `node_id` 不改变焦点。随后 AI 可选调用 `list_change_templates`：只读列出更新文档/添加测试/创建模块模板，或把模板展开为引用当前 `graphRevision` 与节点的 `changes` 草稿。它不写会话、不创建提案、不签发凭据。随后 AI 可先调用 `preflight_visual_proposal` 只读检查候选变更的路径、文件存在性、create/update 方向、重复路径、重复内容、编码与体积；这一步同样不写会话、不创建提案、不签发凭据。最后 `create_visual_proposal` 记录带 `contentHash` 的 `ChangeProposal`，也只写会话，不碰项目文件。
6. 面板通过 `/api/collab/proposals/:id/impact` 展示文件/行数/字节数摘要，并通过 `/api/collab/proposals/:id/diff` 展示逐行差异；人类点击「批准」。服务端只把提案标为 `approved`，签发绑定 `contentHash` 的 10 分钟一次性 `approvalId` / `grantHash`，不会写项目文件。
7. 人类把确认号发给 AI；AI 调用 `apply_visual_proposal`，服务端校验凭据与内容哈希后写入项目，失败自动回滚。
8. AI 可再次 `scan_project`，或人在面板触发 `POST /api/collab/rescan`，生成反映新结构的图；两者共用 `VisualSyncService` 并保留人工视觉状态，形成闭环。

`POST /api/collab/rescan` 要求 `confirmedBy: "human"` 与本机面板令牌；`scan_project` 可设 `open_panel: false` 适配无头工作流。两者还可在测试/自动化场景显式传 `render: false`，跳过重复 `mmdc` 渲染但仍完成扫描、合并、会话保存与 `PRESERVATION_JSON`；面板始终传 `render: true`，未传时保持默认渲染，非布尔的 `render` 会被 rescan 端点以 400 拒绝。扫描器只用 `fs.readdir` / `fs.readFile` 读取工作区；图形同步写的是 `OUTPUT_DIR` 下的图资产和会话，不写 `AI_DRAW_WORKSPACE_ROOT`。`mergeScannedGraph()` 按稳定 ID 优先、路径次之匹配旧节点：保留有限 `x` / `y`、自定义标签、`metadata.layoutSource`、`human` 焦点以及可锚定批注；新节点占用空闲自动布局位，删除节点使相关线程 `detached`，标签/路径变化使线程 `outdated`。version 1 `ScanPreservationSummary` 通过 `PRESERVATION_JSON`、HTTP 响应、系统消息与 WebSocket `session_updated` 暴露计数；它只是审计信息，不签发批准凭据，也不授权项目写入。详见 [ADR 0006](ADR/0006-stable-scan-preserves-human-visual-state.md)。

协作会话可导出为 `kind: "ai-draw-session-bundle"` 的 version 1 JSON。导出只包含图、有限人工坐标、消息和去敏后的提案；一次性批准凭据留在内存中且不写入 bundle。导入必须带 `confirmedBy: "human"`，服务端会重新校验图与提案路径、清空批准凭据、拒绝非法文件和非有限坐标；导入绝不写项目文件。

面板选中节点时，`POST /api/collab/focus` 记录 version 1 `SessionFocus`。端点要求 `confirmedBy: "human"` 和本机面板令牌；`SessionStore` 只接受 `source: "human"`，并从当前图派生节点标签/路径/分组。`get_visual_context.focus`、诊断与 bundle 只读暴露该上下文。图修订会刷新仍存在节点的焦点字段；节点删除或 bundle 导入后找不到节点时清除焦点。选中状态不进入活动时间线，不签发凭据、不改变线程状态、不授权项目写入，详见 [ADR 0005](ADR/0005-human-focus-is-read-only-context.md)。

失锚/过期状态是会话图上的版本化审计字段，bundle 会保留它们；`outdated` 线程只能经人类确认的 `/api/collab/annotations/:id/anchor` 重锚，`detached` 线程保留原 `nodeId` 且不自动重锚。重锚是讨论状态的确认，不签发批准凭据，也不授权项目写入。

`GET /api/collab/activity` 与 `get_visual_context.activityTimeline` 从会话快照派生紧凑时间线：消息、`graphDiffs` 的图形修订事件、批注创建/回复/解决、提案创建/批准/应用/拒绝/失败，以及 `nextActor` 与 guidance。时间线是 version 1 只读投影，不增加持久化协议，不签发凭据，也不能授权项目写入；原文与批准凭据仍以 `SessionSnapshot` 和内存中的 `ApprovalGrant` 为准。

`GET /api/collab/diagnostics` 与 `get_visual_context.diagnostics` 从同一快照派生 version 1 健康摘要：图/线程/提案计数、活动总量、信号、下一步动作，以及 `approvalGrantsExported: false`、`staleThreadsExcludedFromIntent: true`、`projectWritesRequireHumanApproval: true` 三个安全不变量。诊断只读、无持久化、无凭据，也不替代完整上下文。

`src/domain/agent-workflow.ts` 复用 `summarizeAnnotationThreads()`，把对话下一棒、失锚线程、待处理消息与提案计数投影成 `AgentWorkflow`。`get_agent_workflow` 返回 `WORKFLOW_JSON`，所有步骤的 `grantsWriteAuthority` 都是 `false`；只有 `apply` 步骤的 `writes` 是 `project`。工作流不签发凭据、不自动批准、不绕开 `SessionStore.applyProposal()`；详见 [ADR 0007](ADR/0007-agent-workflow-is-a-read-only-contract.md)。

`src/domain/node-context.ts` 复用 `summarizeAnnotationThreads()` 和会话的 `graphDiffs`，把当前 `VisualGraph` 中单个节点投影成 `NodeContext`。`get_node_context` 与 `GET /api/collab/node-context` 返回 `NODE_CONTEXT_JSON`，面板也用同一端点显示选中节点；它是不持久化、不修改焦点/线程、不签发凭据的派生视图。详见 [ADR 0010](ADR/0010-node-context-is-a-read-only-projection.md)。

面板把诊断信号与下一步动作展开为可扫读清单；`action` 信号提示人或 AI 的下一棒，`warning` 提示已失败/等待应用的提案，`info` 只描述状态。清单不提供批准按钮，也不改变会话。

「复制给 AI 的上下文」按钮完全在浏览器端从已加载的会话、诊断与差异摘要拼出一段只读文本；它不调用写端点、不新增消息、不修改会话、不签发凭据。剪贴板不可用时，文本只进入尚未发送的消息输入框，是否发送仍由人决定。

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
