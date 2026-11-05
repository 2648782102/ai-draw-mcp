# AGENTS.md — AI Agent 操作手册

本文件是给 AI coding agent 看的操作手册。人类阅读 `README.md`，架构阅读 `docs/ARCHITECTURE.md`，贡献流程阅读 `CONTRIBUTING.md`。

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
│   ├── impact.ts             提案影响摘要：文件数、行数、字节数与安全说明
│   └── path-safety.ts        工作区路径校验，提案应用的安全边界
├── infra/
│   ├── config.ts             AppConfig + loadConfig + 配置类型
│   ├── workspace.ts          AI_DRAW_WORKSPACE_ROOT / 包根目录解析
│   ├── store.ts              DiagramStore：旧图清单持久化
│   ├── session-store.ts      SessionStore：图、消息、批注、提案、批准凭据、应用与回滚
│   ├── project-scanner.ts    只读扫描项目结构与 import 关系
│   ├── renderer.ts           mmdc / sharp 渲染，SVG 包装
│   ├── preview-server.ts     Express REST + WebSocket + 协作 API
│   ├── ide-opener.ts         在 IDE 中打开 Simple Browser
│   ├── logger.ts             stderr logger
│   └── templates/index.html  预览面板 + 双向协作工作台
└── tools/
    ├── _shared.ts            ToolContext、渲染管道、响应格式
    ├── render-*.ts           7 个绘图工具
    ├── update/delete/list/open-preview.ts 旧图管理
    ├── scan-project.ts       扫描工作区并生成协作图
    ├── get-visual-context.ts 读取人类意图
    ├── create-visual-proposal.ts 创建待确认提案
    └── apply-visual-proposal.ts 凭一次性凭据应用已批准提案

test/                         Vitest：批注线程、MCP 集成测试、协作集成测试
scripts/doctor.mjs            环境自检（含真实 Mermaid 渲染探针）
scripts/github-maintenance.mjs GitHub About/topics 漂移检查、同步与 Release 创建
scripts/repo-check.mjs        离线一致性检查：发布文案、文档链接、脚本与 CHANGELOG
.github/                      Issue/PR 模板与 CI
docs/ARCHITECTURE.md          架构、协议、安全模型
docs/README.md                文档地图
docs/COMPETITIVE_RESEARCH.md  同类产品调研与定位
docs/DEPENDENCY_MAINTENANCE.md 依赖升级、CI 验证与重大版本决策记录
docs/LAUNCH_KIT.md            GitHub/Release/社区宣发模板
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

---

## 16 个 MCP 工具

| 分组 | 工具 |
|------|------|
| Mermaid / SVG 绘图 | `render_diagram`、`render_flowchart`、`render_sequence`、`render_architecture`、`render_class_diagram`、`render_mindmap`、`render_svg` |
| 图管理 | `update_diagram`、`delete_diagram`、`list_diagrams`、`open_preview` |
| 双向协作 | `scan_project`、`get_visual_context`、`reply_to_visual_context`、`create_visual_proposal`、`apply_visual_proposal` |

协作工作流：先 `scan_project`，人改图、在节点批注线程里回复或重开讨论后，AI 用 `get_visual_context` 读取 `annotationThreads.nextActor`、`pendingMessages` 与 `unresolvedAnnotations`，用 `reply_to_visual_context` 回信/内联回复并标记已处理，再 `create_visual_proposal`；人在面板查看逐行差异、批准并复制一次性确认号，AI 最后调用 `apply_visual_proposal(proposal_id, approval_id, approval_grant, approval_expires_at, approved_by="human")`。

`get_visual_context` 的 `intentSummary` 会按节点聚合未解决批注（包含线程回复）、待处理消息与连线标签，并返回 `annotationThreads` / `nextActor`；`activityTimeline` 把消息、线程与提案生命周期合并为只读派生事件。生成提案时优先引用 `intentByNode` 和活动顺序，不要只复述扁平消息列表。`nextActor` 为 `human` 时应等待人继续回复，不要抢先创建提案；活动时间线不授权项目写入。

---

## 如何添加新工具（4 步）

1. 在 `src/tools/` 新建 `render-xxx.ts`，复制现有工具风格；参数用 `zod`，错误处理用 `errorResult`。
2. 在 `src/server.ts` 顶部加 import，在 `createServer()` 内加 `registerXxx(mcp, ctx)`。
3. 同步更新 `TOOL_COUNT`、README 工具表、本文件工具表、CHANGELOG 和 `test/mcp.test.mjs`。
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
| `GET /api/collab/bundle` | 导出可移植会话快照（不含一次性批准凭据） |
| `POST /api/collab/bundle/import` | 人类确认后导入；清空气批准凭据，不写项目文件 |
| `GET/PUT /api/collab/graph` | 读取/保存 VisualGraph |
| `POST /api/collab/messages` | 人类或 AI 发消息 |
| `POST /api/collab/annotations` | 给当前图加批注；`nodeId` 必须引用现有节点 |
| `POST /api/collab/annotations/:id/reply` | 在节点批注线程里回复，作者可为 `human` 或 `ai` |
| `POST /api/collab/annotations/:id/status` | 解决或重开批注线程，状态为 `resolved` 或 `open` |
| `GET/POST /api/collab/proposals` | 列出/创建变更提案 |
| `GET /api/collab/proposals/:id/diff` | 查看逐行变更差异 |
| `GET /api/collab/proposals/:id/impact` | 查看批准前的文件/行数/字节数影响摘要 |
| `POST /api/collab/proposals/:id/approve` | 人类批准，返回一次性确认号；**不写项目文件** |
| `POST /api/collab/proposals/:id/reject` | 人类拒绝提案 |
| `WS /ws` | `graph_updated`、`chat_message`、`proposal_created`、`proposal_updated`、`session_updated` |

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
npm run github:check # 只读检查 GitHub description/homepage/topics 是否漂移
npm run repo:check   # 离线检查仓库内公开文案、链接与维护脚本是否一致
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
- 不要绕过 `scripts/github-maintenance.mjs` 手工维护 About/topics，避免文档与仓库元数据漂移。
