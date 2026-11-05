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

1. AI 调用 `scan_project`，`project-scanner.ts` 只读扫描工作区（默认 4 层、最多 400 个节点）并生成 `VisualGraph`。
2. `SessionStore` 把图、修订号、消息、批注、提案写入 `OUTPUT_DIR/.ai-draw/session.json`。
3. 人类在面板「💬 协作」工作台改名称/类型/路径/分组、增删节点、编辑连线起点/终点/说明/类型、把批注绑定到选中节点、在批注线程里回复/解决/重开、发消息；每次写入都会提升 `graphRevision` 并通过 WebSocket 同步。`SessionStore.validateGraph()` 校验节点/连线/批注 ID、路径/分组/连线类型、回复结构与引用完整性。
4. AI 调用 `get_visual_context` 读取待处理消息、未解决批注、节点批注线程与 `annotationThreads.nextActor`、当前图、按节点聚合的 `intentSummary`，以及 `activityTimeline` 的只读派生事件；用 `reply_to_visual_context` 回信、内联回复线程、标记已处理。批注保存 `nodeLabel` / `nodePath` / `graphRevision` / `anchorStatus`：节点改名或路径变化后标为 `outdated`，节点删除后标为 `detached`；`staleThreads` 不进入 `intentByNode`，AI 应等待人类确认或重锚，不能把旧讨论当作当前写入意图。
5. AI 可先调用 `preflight_visual_proposal` 只读检查候选变更的路径、文件存在性、create/update 方向、重复路径、重复内容、编码与体积；这一步不写会话、不创建提案、不签发凭据。随后 `create_visual_proposal` 记录带 `contentHash` 的 `ChangeProposal`，也只写会话，不碰项目文件。
6. 面板通过 `/api/collab/proposals/:id/impact` 展示文件/行数/字节数摘要，并通过 `/api/collab/proposals/:id/diff` 展示逐行差异；人类点击「批准」。服务端只把提案标为 `approved`，签发绑定 `contentHash` 的 10 分钟一次性 `approvalId` / `grantHash`，不会写项目文件。
7. 人类把确认号发给 AI；AI 调用 `apply_visual_proposal`，服务端校验凭据与内容哈希后写入项目，失败自动回滚。
8. AI 可再次 `scan_project` 生成反映新结构的图，形成闭环。

协作会话可导出为 `kind: "ai-draw-session-bundle"` 的 version 1 JSON。导出只包含图、消息和去敏后的提案；一次性批准凭据留在内存中且不写入 bundle。导入必须带 `confirmedBy: "human"`，服务端会重新校验图与提案路径、清空批准凭据、拒绝非法文件；导入绝不写项目文件。

失锚/过期状态是会话图上的版本化审计字段，bundle 会保留它们；`outdated` 线程只能经人类确认的 `/api/collab/annotations/:id/anchor` 重锚，`detached` 线程保留原 `nodeId` 且不自动重锚。重锚是讨论状态的确认，不签发批准凭据，也不授权项目写入。

`GET /api/collab/activity` 与 `get_visual_context.activityTimeline` 从会话快照派生紧凑时间线：消息、批注创建/回复/解决、提案创建/批准/应用/拒绝/失败，以及 `nextActor` 与 guidance。时间线是 version 1 只读投影，不增加持久化协议，不签发凭据，也不能授权项目写入；原文与批准凭据仍以 `SessionSnapshot` 和内存中的 `ApprovalGrant` 为准。

`GET /api/collab/diagnostics` 与 `get_visual_context.diagnostics` 从同一快照派生 version 1 健康摘要：图/线程/提案计数、活动总量、信号、下一步动作，以及 `approvalGrantsExported: false`、`staleThreadsExcludedFromIntent: true`、`projectWritesRequireHumanApproval: true` 三个安全不变量。诊断只读、无持久化、无凭据，也不替代完整上下文。

面板把诊断信号与下一步动作展开为可扫读清单；`action` 信号提示人或 AI 的下一棒，`warning` 提示已失败/等待应用的提案，`info` 只描述状态。清单不提供批准按钮，也不改变会话。

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

`test/` 覆盖四层：MCP stdio 工具与响应、HTTP/WebSocket 协作闭环、批注线程/活动时间线等派生视图，以及 bundle、影响摘要、路径安全、内容哈希和一次性批准凭据等纯函数契约。`scripts/repo-check.mjs` 则离线检查公开文档、发布文案、面板关键 ID、协作端点与安全实现是否漂移。

所有持久化结构都有 `version: 1`，后续迁移在 `SessionStore.create()` 与类型层处理。

## Protocol

WebSocket events：`diagram_added`、`diagram_update`、`diagram_removed`、`graph_updated`、`chat_message`、`proposal_created`、`proposal_updated`、`session_updated`。

REST endpoints 以 `/api/diagrams`、`/api/diagram/:id` 提供旧图管理；`/api/collab/*` 提供会话、图形、消息、批注和提案。完整工具清单见 README。

## Extension points

- 在 `src/tools/` 加工具：通过 `_shared.ts` 访问 `ToolContext`，并在 `server.ts` 注册与更新 `TOOL_COUNT`。
- 在 `src/domain/types.ts` 扩展协议：保持 `version` 字段并更新集成测试。
- 在 `project-scanner.ts` 增加语言/框架识别：输出仍是 `ProjectScanResult`，再转成 `VisualGraph`。
- 在 `templates/index.html` 增加画布交互：通过 `/api/collab/graph` 保存，不要直接修改 Mermaid 源码来承载结构化语义。
