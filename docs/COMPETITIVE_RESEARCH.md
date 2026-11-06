# Competitive Research

Research snapshot: 2026-11-06. This is a positioning brief based on public product pages and ecosystem articles, not a benchmark. Links are grouped at the end so contributors can refresh the evidence.

## The market gap

Most visual tools optimize either **AI generation** or **human editing**. Mermaid-style tools make diagrams easy for LLMs to generate but leave review in text; whiteboards make diagrams pleasant for people but rarely connect visual intent back to a code change. MCP diagram servers mostly stop at rendering. AI Draw MCP targets the narrow, high-value gap: a local, open-source, human-in-the-loop loop from project structure → visual edit → conversation → reviewed proposal → project change.

## Comparison

| Product / category | What it does well | What we can learn | Where AI Draw MCP differs |
|---|---|---|---|
| Mermaid Live / Mermaid Chart | Text-first Mermaid editing, live preview, broad diagram syntax, AI suggestions, MCP support | Keep the DSL legible, give AI a validation loop, make exports portable | AI Draw MCP does not stop at the image: visual edits become a structured session that can produce approved project changes |
| Excalidraw / tldraw | Fast human canvas, approachable interaction, open-source ecosystem, editable artifacts | Humans need direct manipulation and low-friction sketching; generated output must remain editable | AI Draw MCP is repository-aware and MCP-native; its visual graph is an intent channel for coding agents |
| Miro / FigJam / Mural | Real-time team workshops, comments, templates, facilitation | Conversations around objects matter; annotations and roles make collaboration legible | AI Draw MCP stays local-first, lightweight, and focused on the developer's workspace instead of hosted boards |
| GitHub review threads / Figma comments | Resolve/reopen review conversations, keep discussion next to the changed object, and make unresolved work visible | Treat thread state as a queue: authored reply → explicit resolve/reopen → clear next actor | AI Draw MCP exposes thread state to `get_visual_context`, so an MCP agent can see whether it should reply or wait |
| draw.io / Lucidchart | Mature shape libraries, enterprise exports, portable diagram files | Preserve editability after generation; open output in an editor users already trust | AI Draw MCP emits proposals and diffs next to the visual context, not only a diagram file |
| GitDiagram / CodeSee-style code maps | Codebase-to-architecture visualization, repository exploration | A project scanner should surface meaningful boundaries, not just directories | AI Draw MCP lets the human revise the generated structure and sends that revision back to the AI |
| Mermaid Chart MCP / community diagram MCP servers | MCP-native validation/rendering, easy IDE integration, sometimes cloud diagram management | Tool descriptions and return values must be optimized for LLMs; one-call workflows reduce mistakes | AI Draw MCP is local, offline-capable for panel assets, open source without an account wall, and adds a human approval protocol |
| AI agent diagram builders | Generate and iteratively edit diagrams from prompts, sometimes inline in chat | Iteration is the default; the first generated diagram is only a draft | AI Draw MCP extends iteration from the diagram to the underlying project through explicit approval |

## Positioning statement

> AI Draw MCP is a local-first MCP workspace where an AI can turn a codebase into an editable visual map, a human can correct that map in the panel, and the pair can review a concrete change proposal before any file is written.

Short form for GitHub About:

> Human ↔ AI visual collaboration workspace for MCP: scan a project, edit the diagram, discuss intent, and apply approved code changes.

## Product lessons to apply

1. **The first 30 seconds must show the loop.** Competitors win with instant previews and zero-account entry; README and examples should demonstrate scan → edit → approve → apply before listing features.
2. **Editable output beats static output.** Preserve structured graph JSON as the source of truth for collaboration; Mermaid remains a rendering and export format.
3. **Conversation belongs on objects.** Pin annotations to nodes and show proposal status next to the relevant visual context.
4. **Thread state is a protocol, not decoration.** Resolve/reopen and the latest reply determine whose turn it is; expose that state in machine-readable AI context instead of hiding it in the UI.
5. **MCP tools are a UX surface.** Names, descriptions, argument shapes, and machine-readable responses should be tested as an agent-facing API.
6. **Trust is a differentiator.** Local-only defaults, no account, reviewable diffs, one-time approval, rollback, and documented non-goals should be prominent.
7. **Open-source growth needs maintained metadata.** Description, topics, roadmap, release notes, issue templates, and repeatable launch copy are part of the product.
8. **A visual workspace needs an atmospheric off-switch.** Developer tools such as Linear, Raycast, and focused editors commonly pair a strong brand surface with a low-distraction mode: chrome should recede once the real artifact (here, the shared graph) is present. The 2026-11-06 UI iteration adds a calm palette and `Z` immersive workspace. This is a presentation lesson only: hiding chrome must never hide the human approval boundary, alter attention state, or turn a view preference into write authority.

## Annotation-thread protocol notes

The shipped 0.3.x thread already covers one root annotation per node, ordered human/AI replies, resolve/reopen, a latest-reply-based `nextActor`, validation on save/import, portable replies in session bundles, and a compact derived activity timeline for messages, thread events, and proposal lifecycle events. These research notes are **candidates for later versions**, not claims that every detail is already shipped:

- Preserve `detached` / `outdated` state when a node is removed or a graph revision changes its path; keep the old label/path with the thread instead of silently deleting history.
- Add open/resolved/outdated/unread filters, counts, and a "show resolved" toggle; let `get_visual_context` prioritize open threads awaiting AI.
- Let a resolve action point at a decisive `resolutionReplyId`, and label any generated summary as derived context rather than a replacement for the original replies.
- Add versioned thread events (`created`, `replied`, `resolved`, `reopened`, `proposal-linked`) that link the derived timeline to proposal diffs and approval records; keep derived summaries distinct from immutable source events.

Keep these two boundaries explicit: `resolved` is a conversation state, never proposal approval or a project-write grant; conversation actions and one-time human write receipts are separate server-side checks. Some public sources describe client-side comment controls such as `canComment`; this project must not rely on hidden UI controls or client-supplied author fields for authorization.

## 2026-11-06 增量调研

本轮只补充上一节尚未覆盖的产品形态与 2026 年公开信号，不重复 Mermaid Live、通用白板、评论线程和基础 MCP 渲染的比较。结论基于公开页面、仓库元数据与 README 中的产品自述，不是性能基准或安装验证；同名项目若无法稳定定位到唯一官网，以下按产品主张记录，不推断其功能已正式发布。下文「现状」仅描述仓库当前版本，功能建议均为后续候选，不代表已经交付或已写入路线图承诺。

### 增量对比

| 产品 / 类别 | 新一轮观察 | 对 AI Draw MCP 的启示 | 边界与差异 |
|---|---|---|---|
| [Mermaid Chart MCP / AI](https://mermaid.ai/docs/ai/mcp-server) 与需要账号的图表 MCP | 把 Mermaid 生成、校验、渲染包装成 IDE 可调用的工具；部分服务把图表管理放在云端并要求登录 | AI 工具应返回结构化、可校验的中间产物，而不是只给一张图片 | AI Draw MCP 保留 Mermaid 作为渲染/导出格式，但协作状态是本地 `VisualGraph`；核心闭环不依赖账号或云图表库 |
| [Archyne（调研输入亦记作 Arhyne）](https://github.com/archyne/archyne) | README 自述为本地优先 Mermaid 画布与文本双向同步；把人工坐标保存在 Mermaid 注释中，LLM 重写图时尽量保留既有节点布局；本地文件由编辑器拥有，并提供撤销/重做、MCP 校验写入与导出 | 图重新扫描后不应抹掉人工摆放；视觉编辑需要可回滚，并与文件内容变更的回滚区分 | AI Draw MCP 0.3.x 现已用稳定路径 ID、`VisualSyncService` 与 `mergeScannedGraph()` 保留人工坐标/标签/批注/焦点，新增节点才自动排布，重新扫描只读项目文件；图形撤销栈仍是后续候选，人工批准门槛仍只适用于项目文件写入 |
| [OpenFlowKit](https://github.com/openflowkit/openflowkit)（原 `Vrun-design` 路径当前返回永久重定向） | 调研输入称其仓库地图的箭头引用到 `file + line`；本地优先、MCP；文本 DSL、画布、助手、CLI 共用同一套语言与 TypeScript 编译器 | 节点应能回到源码证据；扩展机制应保持低门槛和类型一致 | 0.3 的扫描器以文件树/import 为主；0.5 可补 source ranges，但不得把「能定位代码」变成「可以据此自动写文件」。重定向目标未能在本轮公开 API 工具中稳定复核，因此该条只作候选信号 |
| [tldraw AI](https://tldraw.dev/docs/ai)、[agent starter kit](https://tldraw.dev/starter-kits/agent) 与 [workflow starter kit](https://tldraw.dev/starter-kits/overview) | Agent 直接读取/修改画布，把视觉操作组织成可组合的工作流 | 人需要看见 AI 改了什么、在哪里改、能撤回；工具描述要把 agent 的下一步讲清楚 | AI Draw MCP 的 AI 不直接写项目文件；画布/图的编辑与项目写入由会话、逐行 diff、人工批准和一次性凭据分层 |
| [Nereid](https://github.com/bnomei/nereid)（TUI + MCP 参考形态） | 确定性文本渲染、显式注意力/选中状态、基于文件夹的会话持久化，让终端里的 AI 与人对同一对象工作；其 `LICENSE` 明确为非商业、禁止修改与衍生作品的 source-available 许可 | 把「当前选中了什么」变成机器可读上下文，并保留可恢复的会话；输出要可复现、可 diff | 本项目已有 WebSocket 面板与 bundle，不计划把 TUI 变成核心界面，也不借鉴其源码使用限制 |
| [AgentDraw](https://github.com/agentdraw/agentdraw) / [DrawCMS](https://github.com/drawcms/drawcms) | AgentDraw README 自述用受限 SVG/Mermaid 生成可编辑 JSON，并提供 repair / validate / 本地编辑器；DrawCMS README 自述有视觉语法校验和作为单次可撤销历史记录的 agent 批量编辑 | 视觉语法需要足够小且有约束；每次 agent 编辑都应有可审计的 before/after | 本项目已记录字段级 `graphDiffs`，可继续补图形编辑撤销栈；不能借「撤销」绕过 `ChangeProposal` 的批准模型。DrawCMS 为 AGPL-3.0-only，本轮不引入其代码 |
| [Excalidraw JSON format](https://docs.excalidraw.com/docs/codebase/json-schema) / [Miro Mermaid](https://help.miro.com/hc/en-us/articles/7004628130962-Create-Mermaid-diagrams) | Excalidraw 的开放 `.excalidraw` JSON 格式强调可迁移；Miro 把 Mermaid 当作可回写的 source of truth | 版本化工件、双向转换与可迁移导出能降低锁定感；文本 DSL 与画布状态需要明确谁是真源 | AI Draw MCP 以版本化 `SessionSnapshot` / `VisualGraph` 为协作真源，Mermaid/SVG 是视图；不追求托管协作，也不让云白板拥有项目真源 |

### 5 个高价值可借鉴能力

1. **布局保持与编辑撤销（P0，0.4；布局保持与视觉撤销栈已交付）**：`GraphNode` 的可选坐标与 `metadata.layoutSource` 已通过稳定路径 ID、`ScanPreservationSummary` 和人工确认重新扫描得到保留；默认保留人的布局，仅新节点自动排布。0.3.x 另提供人工确认、有界、只生成新图修订的 undo/redo；仍可补视口状态。布局与视觉历史都是视图状态，不是项目写入授权。
2. **源码证据与「跳到代码」（P0，0.5；基础证据已交付）**：0.3.x 已让 scanner 为 1 MiB 以下的源码/文档节点记录最多 5 条 `file:line` 定义/导入/标题证据，并通过 `get_visual_context`、诊断、面板和 bundle 严格校验共享；后续可补语言感知符号范围与 IDE 跳转。证据只读，不自动扩大提案路径权限；与 [`ROADMAP.md`](../ROADMAP.md) 的 deeper project intelligence 方向一致。
3. **注意力状态（P1，0.4；基础版与单节点投影已交付）**：0.3.x 已把当前选中节点作为 `get_visual_context` 的轻量 `focus` 字段，并进一步提供 `get_node_context` / `NODE_CONTEXT_JSON`，把该节点的证据、批注、连线与相关差异聚合成只读投影；让人指着图说话时，AI 不必从整张图猜测对象。
4. **可复现的 agent 工作流（P1，0.4；基础版已交付）**：0.3.x 已提供 `get_agent_workflow` 的 version 1 `WORKFLOW_JSON`、八步前后条件、`blocked` 就绪提示、`none` / `session` / `project` 写入边界，以及 CI 中实际执行的只读示例；后续可把工作流与提案 diff、诊断信号进一步联动。所有中间产物仍不签发批准凭据。
5. **确定性、可迁移的会话工件（P2，0.4/0.5）**：继续强化 bundle 的版本、校验与不含凭据约束，提供稳定的 JSON 摘要、Mermaid/SVG 导出及「导入后只读审阅」模式；文本渲染与导出应可复现，便于 Issue 附档、回归测试和跨工具迁移。

### 明确非目标

- 不做需要账号才能使用核心闭环的云图表库，不把会话真源托管到第三方白板。
- 不把 AI Draw MCP 做成通用自由画布、多人实时会议白板或 TUI 终端应用；布局与撤销只服务于项目结构协作。
- 不实现 AI 直接修改画布即等于修改源码；不实现删除、二进制写入，不绕过逐行 diff、人类批准、一次性确认号、路径校验和失败回滚。
- 不把 Mermaid 文本或某一家云服务的画布格式当作项目真源；`VisualGraph` / `SessionSnapshot` 仍是版本化协作协议。
- 不把「选中状态 / 注意力 / 源码定位」当成授权：它们只是上下文，不能生成可用批准凭据，也不能让 `apply_visual_proposal` 接受 AI 自批准。
- 不为追求竞品对等引入重型渲染引擎、账号系统、多人 CRDT 同步或托管执行环境；这些应留在可选适配器/集成层。

### 决策链与 agent action history 调研（2026-11-06 05:50 CST）

本轮只读检索官方规范与官方文档，重点核对「可审计轨迹」与「写入授权」的边界；不把厂商内部效果数据当结论。公开资料一致表明：让 agent 的行为可复盘很有价值，但凭据、完整工具载荷和可用批准状态不能因此进入可共享的审计记录。

| 来源 | 已核对的公开主张 | 对 AI Draw MCP 的启示 | 安全边界 |
|---|---|---|---|
| [MCP Security Best Practices](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices)（2025-11-25 规范） | 明确同意后生成的短期、一次性状态；禁止令牌透传 | 一次性凭据不能变成可复制的审计记录 | `approvalGrant`、确认号与 `PANEL_TOKEN` 只留在服务端/面板会话；`DECISION_TRAIL_JSON`、诊断、bundle 只保留状态、计数与内容哈希 |
| [MCP Elicitation](https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation)（2025-11-25 规范） | 用户必须可查看、修改、拒绝；敏感凭据不应通过普通表单收集 | 上下文收集不是授权通道 | 复制上下文/共享简报/决策链只复制只读投影，不拼接确认号、token 或 `.env`，不替代逐行 diff 和人工批准 |
| [GitHub Copilot: Managing agent sessions](https://docs.github.com/copilot/how-tos/use-copilot-agents/manage-agents)（官方产品文档） | 可审计 agent 工作把提交链接回会话日志，展示推理、工具与验证 | 轨迹应把意图、引用证据、提案状态和应用结果串起来，而不只留下最终文件 | 本地决策链可关联 `proposal_id`、批注、图修订和回滚事件，但不写入批准号或可用批准状态 |
| [OpenAI Agents SDK: Tracing](https://openai.github.io/openai-agents-python/tracing/)（官方文档） | 默认 trace 可能记录工具输入输出；提供关闭敏感数据记录的能力 | 可观测性必须与敏感载荷收集拆开 | 决策链默认只存有界元数据，不存完整工具载荷、凭据或一次性 grant；导出/复制沿用脱敏契约 |
| [LangChain: Human-in-the-loop](https://docs.langchain.com/oss/python/concepts/human-in-the-loop)（官方框架文档） | 难撤销动作应在工具执行前逐动作暂停，收集批准、编辑或拒绝 | 批准应绑定具体调用，不能给会话长期写权限 | 每个提案对应逐行 diff 和一次人工批准；凭据绑定提案与内容哈希、应用一次即消耗，轨迹只保留「曾批准/已应用」事实 |

厂商工程博客 [Beyond permission prompts](https://www.anthropic.com/engineering/claude-code-sandboxing) 的「内部使用减少 84% 权限提示」为未独立验证的自报数据，本轮只记录为市场信号，不用它证明本项目可以减少人工批准，也不据此放宽逐行 diff 门槛。

### 源码导航与可视化 MCP 调研（2026-11-06 06:20 CST）

本轮只读检索官方 IDE 文档与公开产品页面，重点核对「从图节点到源码」的可用性收益与服务端副作用边界。 [VS Code CLI 官方文档](https://code.visualstudio.com/docs/configure/command-line) 明确 `code --goto file:line[:character]` 与 `vscode://file/{full path}:line:column` 格式；[VS Code 终端文档](https://code.visualstudio.com/docs/terminal/basics) 也说明终端可识别 `file:1:2` 等常见链接格式。 [MCP Apps 官方扩展公告](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/) 强调交互式 UI 可以让模型实时看到用户选择，但它不要求 MCP server 代替用户启动本机应用；[Visual Nerve](https://www.visualnerve.com/) 把「把源码证据放在关系旁边」作为本地优先可视化工作区卖点，[Microsoft Visio Desktop MCP](https://microsoft.github.io/Visio-Desktop-MCP-Server/) 则展示本地 MCP server 与 IDE/AI 客户端集成。

| 来源 | 已核对的公开主张 | 对 AI Draw MCP 的启示 | 安全边界 |
|---|---|---|---|
| VS Code CLI / 终端官方文档 | `file:line[:column]`、`code --goto` 与 `vscode://file/{full path}:line:column` 是受支持的导航文本 | 把已有 `GraphSourceEvidence` 投影成统一、有界、可复制的跳转清单，减少人和 AI 手工拼字符串 | 输出保持工作区相对路径；服务端不插入绝对路径、不打开 URI、不调用 `code`，Cursor URI 只作为 VS Code-family 复制约定 |
| MCP Apps 官方扩展公告 | 工具可以返回交互式 UI，用户选择可实时进入模型上下文 | 面板可以展示同一份只读清单并复制给人/AI，不需要再持久化一个导航状态 | 导航提示不是权限授予；不写会话、不进 bundle、不含 `PANEL_TOKEN` 或批准凭据 |
| Visual Nerve 产品页 | 本地优先可视化工作区强调让源码证据靠近关系图 | 「图 → 源码位置」是可理解性功能，值得进入 0.3.x 维护迭代 | 只复用扫描器已有证据，不重新遍历项目、不做语言感知索引、不扩大提案路径 |
| Microsoft Visio Desktop MCP 官方文档 | 本地 MCP server 可与 VS Code/GitHub Copilot 等 AI 客户端集成 | IDE 生态里的 MCP 工具应把平台差异留给客户端 | 进程启动、编辑器协议和跨平台 URI 处理不进入核心 server；未来适配层也无权绕过人工批准 |

结论：第一阶段只交付无副作用的 `SOURCE_NAVIGATION_JSON`，已覆盖「人/AI 可快速引用代码位置」的产品价值；语言感知符号范围、点击式 IDE 跳转和 LSP 适配器仍属于 0.4/0.5 的可选集成，不能把编辑器启动或路径执行变成 MCP server 的核心能力。

### Agent 工具发现与能力目录调研（2026-11-06 06:55 CST）

本轮只读检索 MCP 官方文档与 SDK 文档，核对「协议层工具发现」与「应用层能力目录」的区别。 [MCP TypeScript SDK 调用文档](https://ts.sdk.modelcontextprotocol.io/v2/clients/calling) 说明 `listTools` 返回 server 宣告的工具，`callTool` 才按名称执行；[MCP Python SDK 文档](https://py.sdk.modelcontextprotocol.io/client/) 也把 `list_tools()` 描述为读取 name/title/description/input schema 的发现入口。公开 SDK 的类型文档还记录 `ToolListChangedNotification`，用于工具目录变化的通知。MCP 原生发现是工具名与输入 schema 的权威来源，但不描述本项目特定的 `WORKFLOW_JSON`、`BRIEF_JSON`、`DECISION_TRAIL_JSON` 等有界投影，也不说明哪一步才可能写项目文件。

| 来源 | 已核对的公开主张 | 对 AI Draw MCP 的启示 | 安全边界 |
|---|---|---|---|
| MCP TypeScript SDK 调用文档 | `listTools()` 列出 server advertised tools；`callTool()` 按名称调用 | 保留原生工具发现，不另造协议级 capability | `CAPABILITIES_JSON` 只是普通只读工具返回值，不声称替代协议协商 |
| MCP Python SDK 客户端文档 | `list_tools()` 提供工具名、描述和 input schema | 新 agent 对「协议」与「工作流语义」需要两种视角 | 工具清单补充 JSON 标记、下一步动作与唯一写入边界，但不执行工具 |
| MCP SDK 的 `ToolListChangedNotification` 类型 | 工具集合变化可通过通知保持同步 | 能力清单必须随 `SERVER_TOOL_COUNT`、工具注册和离线检查同步 | 不缓存客户端权限、不签发凭据、不把目录当授权列表 |

结论：交付 `CAPABILITIES_JSON` 作为版本化、可复制、无副作用的应用层发现视图；原生 `tools/list` 仍是 schema 权威，`get_agent_workflow` 仍是顺序契约，人工批准与一次性确认号仍是唯一项目写入路径。

### 多选范围与可视化意图调研（2026-11-06 07:10 CST）

本轮核对交互式画布、代码地图与 MCP UI 的公开主张，重点区分「选择作为上下文」与「选择作为授权」。VS Code / Cursor 等 IDE 习惯把选区交给语言工具作为范围提示；[MCP Apps 官方扩展公告](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/) 强调交互式 UI 可把人的实时选择带入模型上下文；[Figma 多选与评论文档](https://help.figma.com/hc/en-us/articles/360041068574-Add-comments-to-files) 与 [tldraw collaboration 文档](https://tldraw.dev/docs/collaboration) 展示了多人画布中对象选择与讨论 anchored 到对象的产品价值；[MCP Security Best Practices](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices) 则明确要求用户同意与短期、一次性状态，并禁止令牌透传。产品结论是：多选适合表达「这几个模块」，但绝不应当成为批量写入授权，也不能把批准凭据、绝对路径或无限对象集合带入上下文。

| 来源 | 已核对的公开主张 | 对 AI Draw MCP 的启示 | 安全边界 |
|---|---|---|---|
| MCP Apps 官方扩展公告 | 交互式 UI 可把用户选择实时带入模型上下文 | 面板复选框比自然语言「这几个」更精确，适合生成机器可读范围 | 选择只作上下文，不调用工具、不写文件、不签发凭据 |
| Figma / tldraw 公开文档 | 对象选择与对象锚定讨论是可视化协作常见交互 | 多选节点、内部连线与批注/焦点应在同一视图里收束 | 只投影当前图仍存在的节点；失锚 ID 必须被清除 |
| MCP Security Best Practices | 敏感操作需明确同意、短期一次性状态，禁止令牌透传 | 批量范围必须严格有界，批准仍绑定具体逐行 diff 与一次性确认号 | 最多 24 个唯一节点；过滤绝对路径/目录穿越/受保护路径；不扩大提案允许路径 |

结论：`SELECTION_SCOPE_JSON` 只做 version 1、应用层、只读选择范围投影；`tools/list` 仍是工具 schema 权威，`apply_visual_proposal` 仍是唯一项目写入路径，`SessionSelection` 像 `SessionViewport` 一样属于本机 ephemeral attention，不进入可移植会话 bundle。

### 选择范围到「审阅清单」的产品调研（2026-11-06 07:38 CST）

本轮只读检索公开的 MCP Apps、IDE/agent 文档与新出现的「可视化执行计划/变更范围」项目。 [MCP Apps 官方扩展公告](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/) 把「需要用户做决定、做选择或探索时给出正确交互」列为核心价值，[MCP Apps 总览](https://apps.extensions.modelcontextprotocol.io/api/documents/overview.html) 同时强调交互式审批工作流与 UI 发起工具调用时的显式用户同意；[MCP Tool Annotations 文章](https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/) 则提醒工具元数据只是风险提示，读私有数据、看到不可信内容与可能外泄三类风险不应被静默组合。 [GitHub Copilot CLI 权限文档](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference) 也写明 MCP 工具调用仍服从会话权限规则。新出现的 [Overture](https://github.com/SixHq/Overture) 把 agent 的执行计划变成写入代码前的交互流程图，[Birdview](https://github.com/Qiuner/birdview) 强调在架构图上显式展示「AI 声明的变更范围」，[Houston](https://github.com/houston-code/houston) 与 [Glimpse](https://github.com/YushengAuggie/glimpse) 分别展示审批门控/清单与本地双向可视化画布。这些来源共同支持：人类选择进入模型上下文是有价值的，但从「看到了范围」到「允许改变项目」之间必须保留可读清单、显式同意和短生命周期凭据。

| 来源 | 已核对的公开主张 | 对 AI Draw MCP 的启示 | 安全边界 |
|---|---|---|---|
| MCP Apps 官方公告/总览 | 交互式 UI 可承载决定、选择、探索和多步审批；UI 发起的工具调用可要求显式同意 | 面板勾选节点后，AI 需要的不只是原始 ID，还应得到可审阅的缺口/路径/下一步清单 | 工作单不调用工具、不写会话、不签发批准凭据；仅作 preflight 前的上下文 |
| MCP Tool Annotations 风险词汇文章 | 工具注解是风险提示，不等于运行时强制策略 | `readOnly` / `writes` / `writes: "none"` 必须与固定安全标记、端到端测试和唯一写入工具共同验证 | `get_selection_workorder` 不能因为只读就省略候选路径、失锚线程、证据缺口和绝对路径过滤 |
| GitHub Copilot CLI 权限文档 | MCP 调用服从 session permission rules，外部只读操作也可能要求批准 | 工作流的下一步必须明确告诉 agent 去读完整会话、与人确认，再显式起草 changes | `ready`、候选路径和 `gaps` 都不是批准或运行时权限 |
| Overture / Birdview / Houston / Glimpse | 执行计划、变更范围、审批清单和本地双向画布正成为 AI coding 可视化产品的核心语言 | 将 `SELECTION_SCOPE_JSON` 收束为 `SELECTION_WORKORDER_JSON`，让「这几个模块」可被人快速核对 | 不复制同类产品的自动执行/浏览器控制能力；服务端仍不启动进程、不打开 IDE、不写项目文件 |

结论：0.3.4 只交付「选择 → 只读预提案工作单」这一段。工作单把候选相对路径、范围内意图、证据、审阅状态、缺口和下一步收束成有界清单，却刻意不含 `ProjectChange` 内容；后续 `preflight_visual_proposal`、完整逐行 diff、人工批准与一次性确认号仍是彼此独立的闸门。交付后的维护增量补了一个纯派生 `freshness`：比较 `selectionRevision` 与 `graphRevision`，在图变化后只提示人重新选择，不自动刷新/清空选择、不持久化状态、不签发凭据；这直接回应交互式审批产品中「旧选择是否仍代表当前意图」的可用性风险，同时不把 UI 选择变成执行权限。未来若做「工作单到模板草稿」，也应保持纯派生、可读、无写入内容或写入权限；MCP Apps 化、LSP 或点击式 IDE 跳转仍属于可选客户端适配层。

### 对 0.4 / 0.5 的建议与优先级

### 增强图形皮肤与图形本体换肤调研（2026-11-06 18:25 CST）

上一轮把默认空间结构改成画布优先，但截图中主画布仍是 Mermaid 默认淡紫节点与细灰连线；用户感知到的「外观没什么变化」主要来自图形本体与外壳脱节。借鉴 Figma / tldraw 的对象优先画布、MCP Apps 的交互式上下文，以及 Archyne / Nereid / GitDiagram 对文本与图形为同一份工件的强调，本轮把视觉系统延伸到图形本体：Aurora 用蓝色描边、柔和投影和高可读连线标签；Studio 用克制蓝色直角节点、白底边标签；Atlas 用绿色等宽字、虚线与蓝图角标。画布外围增加的「共享上下文画框」只标出共同注意力，不把视觉焦点当批准，不改写 Mermaid 源、图数据、会话 focus/viewport 或项目文件。

| 设计取舍 | 用户可见变化 | 安全边界 |
|---|---|---|
| 图形皮肤默认开启 | 节点形状、连线、标签与焦点高亮随三套视觉系统一起改变 | CSS 只作用于本机预览 SVG，不写入导出的 Mermaid/SVG 源或存储记录 |
| `G` / 外观面板 / 命令面板可切回原色 | 需要核对原始 Mermaid 主题时一键恢复，所有交互仍可用 | 本机 `localStorage` 偏好；不改 26 个 MCP 工具、version 1 协议或一次性确认号 |
| 焦点节点高亮与画框状态 | 选中对象后画框显示只读焦点名，选中节点获得紫色轮廓 | 焦点仍只是「人正在指哪个对象」，不签发凭据、不批准提案、不自动写项目文件 |
| 可复现截图与浏览器回归 | `npm run ui:shots` 覆盖皮肤开关；`repo:check` 覆盖快捷入口与离线守卫 | 不新增外部依赖、联网运行时行为、账号体系或服务端画布状态 |

结论：视觉系统必须从「窗口皮肤」升级为「工件皮肤」，同时给原色模式保留低风险逃生口。判断标准不是多一层装饰，而是用户切换 Aurora / Studio / Atlas 时，主画布里真正的节点、连线和标签也一眼不同；所有变化仍要能用截图、离线一致性和浏览器回归复核。

### 对象悬停速览与低摩擦上下文调研（2026-11-06 18:55 CST）

图形本体换肤后，画布里仍有「看见节点，却要移步到右上角对象卡才知道它代表什么」的摩擦。借鉴 Figma / tldraw 的对象悬停信息、MCP Apps 的即时上下文，以及 GitDiagram / Archyne 把节点映射回仓库路径的做法，本轮在真实 Mermaid 节点旁加入只读对象速览：对象名、工作区相对路径、直接关联数、源码证据数与开放讨论都从既有会话派生；悬停节点与沿真实边相连的对象还会短暂描边，让「关联」不是抽象数字。与常见白板不同的是，悬停不改变选中态、不发布服务端焦点、不打开消息草稿，也不会把「看见证据」误写成「授权变更」；单击节点才切换既有只读焦点。

| 设计取舍 | 用户可见变化 | 安全边界 |
|---|---|---|
| 悬停卡片跟随真实节点 | 缩放 / 平移后卡片仍贴着对象，自动在画布边缘寻找空间 | 纯本机 DOM / CSS；不改写 Mermaid/SVG 源、图数据或导出的文件 |
| `P` / 外观面板 / 命令面板开关 | 需要专注图形或核对原始主题时一键隐藏，偏好保存在本机 | 不改 26 个 MCP 工具、version 1 协议、批准凭据或项目写入闸门 |
| 派生对象上下文 | 关联、证据和开放讨论都来自同一份只读会话快照 | 不发送消息、不创建批注、不批准提案、不签发确认号、不发布 focus/viewport |
| 悬停节点与关联对象描边 | 一眼看出「这个对象」和它沿真实边连着谁，移开即恢复 | 只是本机 CSS 类；不改图数据、选择集、Mermaid 源或导出内容 |
| 冲突态自动收起 | 欢迎态、源码抽屉、沉浸态、重叠面板与窄屏不显示速览 | 不遮挡逐行 diff、确认号或人工批准入口；减少动态效果时无入场动画 |

结论：画布交互的下一步不是再加一层永久面板，而是让对象在被指向的那一刻给出足够上下文，同时保持「悬停只是预览、单击才是焦点、批准仍是独立闸门」这条清晰边界。浏览器回归应同时检查卡片内容、位置、缩放跟随，以及悬停前后会话快照完全不变。

### Flow 画布优先布局的产品调研（2026-11-06 18:05 CST）

本轮复用已核验的 Figma / tldraw / MCP Apps / Birdview / Glimpse 来源，不再引入未核验项目。共同的产品语言是：主画布承担共同注意力，选择与讨论锚定到对象，多步审批以可见流程而非隐藏对话框呈现，交互式 UI 只把人的选择与决定带入模型上下文。上一轮的 Aurora / Studio / Atlas 主要改变了色彩、材质与顶栏密度；用户仍会感觉「外观没什么变化」，因为默认空间结构仍是左右半屏编辑器。

| 已核验来源 | 借用的交互语言 | Flow 增量 | 不借用的边界 |
|---|---|---|---|
| Figma / tldraw 画布文档 | 对象、评论和选择围绕主画布组织 | 图形成为全幅主舞台，图表库收成窄图标轨，焦点镜头条置于画布顶部 | 不实现自由形状库、多人实时账号或服务端画布授权 |
| MCP Apps 官方公告 / 总览 | 交互式决定与选择可成为模型上下文 | 四步流程带从 graph / messages / proposals / diffs / review-readiness 派生状态，阶段点击只切本机视图或打开已有工作台 | 不调用工具、不改会话 focus/viewport、不签发凭据 |
| Birdview / Overture / Houston / Glimpse | 执行计划、变更范围、审批清单和双向画布应可见 | 默认显示「AI 生成图 → 人改图 / 批注 → 共享上下文 → 人工批准」，源码变成按需伴随抽屉 | 不把进度条当批准，不自动执行计划，不扩大写入边界 |
| Archyne / Nereid / GitDiagram | 文本 DSL 与图形应构成可复核的同一份工件 | `E` 展开 Mermaid / SVG 伴随抽屉，`B` 保留 Classic 经典分栏 | 不默认用全屏源码占据主注意力，不引入云端账号或不可复现渲染 |

结论：默认布局应从「源码编辑器 + 右侧预览」转为「共同画布 + 按需源码 + 可见流程」，同时保留一键回到 Classic 的低风险逃生口。布局系统、焦点镜头、流程带与源码抽屉都只写浏览器 `localStorage` / 本机 CSS，不改变 26 个 MCP 工具、version 1 协议、一次性批准凭据或项目写入闸门。用户可见变化必须有可复现截图、浏览器回归和离线一致性守卫，而不是只换一组颜色。

### 目标模式与维护证据的产品调研（2026-11-06 08:19 CST）

本轮不引入未核验的新项目，而是把已核验来源里的产品语言映射到「发布后如何继续迭代」：MCP Apps 官方材料强调交互式决定、选择与多步审批，GitHub Copilot CLI 文档强调 MCP 调用服从会话权限，Overture/Birdview/Houston/Glimpse 共同呈现「可见执行计划 → 明确审批」的设计方向。对一个开源项目来说，等价物不是让 agent 在夜间不断自证聪明，而是把每次维护增量变成可复核的短闭环：小补丁 → 测试/CI → 正常推送 → Release/tag 不改写 → Issue/治理文档留痕 → 明确记录外部权限阻塞。本轮对应的仓库增量是 `132f90e`，其 CI `42135660499` / #82 在 Node 20/22/24 全绿。

| 维护动作 | 产品价值 | 证据形式 | 安全边界 |
|---|---|---|---|
| 面向维护者的 `GOAL_MODE.md` | 把「今晚一直迭代」翻译成可复用的目标契约，降低下一次委派成本 | 时间边界、自治范围、红线、验收证据、最终审计与中文模板 | 不因目标模式跳过 ADR、测试、人工批准或凭据限制 |
| 人类多选后重新扫描的 stale 回归 | 验证 UI 旧选择在图形变化后不会被 agent 当作当前意图或写入许可 | 协作集成测试断言、离线守卫、CI #82、Issue #8 | 不自动刷新/清空选择、不签发凭据、不读项目文件来推断授权 |
| 发布后维护宣发 | 把「持续迭代」讲成可审计过程，而不制造每次提交都是新 Release 的噪声 | `[Unreleased]`、治理证据、公开 Issue、CI 链接 | 不 retag、不改写 published notes、不自动发 npm 包 |
| 外部漂移显式记录 | 让维护者醒来后知道还缺什么，而不是误以为公开介绍已同步 | About/topics API 状态、凭据缺失说明、版本化 workflow 收敛路径 | 不通过未验证浏览器会话改写仓库设置，不提交凭据 |

后续三个低风险增量继续沿用这个闭环：`e753aed` 记录 CI 与维护证据，`c02d048` 增加中英文 30 秒 stale 工作单 FAQ，`09fd7b7` 把 stale 新鲜度提示变为高对比面板警示。CI #83 `42136060410`、#84 `42136310033`、#85 `42136720779` 均在 Node 20/22/24 全绿；metadata workflow #12 `42136060175` 只完成漂移检查，apply 因缺少管理型 `GH_TOKEN` 被跳过。这印证了维护证据和产品定位应同步：对人类，可快速识别旧选择风险；对 AI，stale 仍不是批准凭据；对贡献者，每个增量都有测试、CI、治理和公开 Issue 证据，而不是把 workflow 的绿色误读成 GitHub About/topics 已修复。

后续维护链继续把「提示」升级为「可执行恢复」：`259790d` 的中英文 FAQ 明确要求清空选择、重新勾选、读取新工作单，并禁止沿用旧候选路径起草 changes；`0aba259` / `259790d` / `b4ffbf2` 的 CI #86 `42137519829`、#87 `42137916943`、#88 `42138152753` 均在 Node 20/22/24 全绿。这个增量不扩大协议或写入权限，却让人、AI 和贡献者都能从同一份版本化文档知道「下一步怎么做」「哪些证据可复核」「哪些外部漂移仍未解决」；`5d6114c` 再把目标模式契约入口写进 `AGENTS.md`，让后续 agent 从操作手册就能找到时间边界、红线、验收证据与最终审计规则。

收口阶段把「哪些 run 能证明什么」也写进调研结论：CI #89 `42138459195` 与 #90 `42138738900` 在 Node 20/22/24 全绿，#90 的 job 为 `127633381248` / `127633381672` / `127633381836`；metadata #14 `42138152985` 是只读 drift check，apply 因缺少管理型 `GH_TOKEN` 被跳过。由于 metadata workflow 的 path filter 只监听 launch kit、维护脚本与 workflow 文件，`5d6114c` / `734ad6f` 没有触发 #15，这不是 workflow 失败，而是路径过滤的预期行为。开源曝光应同时给出可复核的绿色 CI 与尚未收敛的 About/topics API 状态，避免用一次绿色检查暗示仓库介绍已经修复。

结论：目标模式最值得借鉴的同类产品原则，是让「人做决定」与「机器执行」之间有清晰、可读、短生命周期的边界。夜间自治增量应优先放大这种可审计性，而不是扩大写入权限；`docs/GOAL_MODE.md`、`docs/GOVERNANCE.md` 与 `docs/LAUNCH_KIT.md` 因此成为产品文档生态的一部分，而不只是内部备忘录。

| 阶段 | 优先级 | 建议 | 完成定义 |
|---|---|---|---|
| 0.4 | P0 | 保存人工布局与视口；重新扫描采用「保留已有布局 + 新增节点增量排布」策略；补图形编辑撤销/重做 | 布局保持、视口状态与视觉撤销栈已经交付：图修订不会无故移动既有节点；有界 `SessionViewport` 只读告诉 AI 人正在看哪片图，且不进入图修订/时间线/bundle；undo/redo 恢复视觉图并生成新 `graphRevision` / `graphDiffs`，纯函数/MCP/HTTP 测试覆盖 ID 稳定、坐标/标签/批注/焦点保留、人类确认、bundle 不含历史及项目文件不变；撤销不回退已批准的项目写入 |
| 0.4 | P0 | 把只读变更模板、预检、提案创建做成可复现的 agent 工作流示例，并在诊断里提示缺失步骤 | 基础版已交付：26 个工具中的 `get_capabilities` 提供入口目录，`get_agent_workflow` 与 CI 只读示例覆盖 `CAPABILITIES_JSON` → `SELECTION_SCOPE_JSON` → `SELECTION_WORKORDER_JSON` → `WORKFLOW_JSON` → `BRIEF_JSON` → `DECISION_TRAIL_JSON` → `SOURCE_NAVIGATION_JSON` → `changes` → preflight → 停止；工作单把选中范围收束为不含文件内容的只读清单；提案人批准与 apply 由 `examples/collab-demo.mjs` 覆盖，且中间产物不含确认号；诊断信号联动仍待做 |
| 0.4 | P1 | 把「下一步是否适合进入提案」做成小而确定的派生信号，避免 coding agent 自行拼接多个上下文视图 | 基础版已交付：`REVIEW_READINESS_JSON` 从同一快照组合 `BRIEF_JSON` 阻塞与 `DECISION_TRAIL_JSON` 缺口，返回 `ready` / `review` / `blocked`；诊断、面板和 CI 工作流示例共用同一只读投影，`ready` 也不跳过完整逐行 diff 与人工批准，详见 [ADR 0015](ADR/0015-review-readiness-is-a-derived-diagnostic.md) |
| 0.4 | P1 | 引入机器可读 `focus` / 选中状态，并让批注、诊断、节点上下文和下一棒提示引用同一对象 | 基础版已交付：`focus` 与 `NODE_CONTEXT_JSON` 让 AI 识别「人正在指哪个节点」并读取该节点证据/批注/连线/差异；焦点与单节点上下文不签发凭据、不自动解决线程 |
| 0.4 | P2 | bundle 增加可读摘要与可复现导出清单；发布前用 `repo:check` / `docs:assets:check` 守住文案和资产一致性 | 基础版已交付：bundle 严格校验有限坐标、`graphDiffs`、`focus` 与 `sourceEvidence`，输出可读 JSON；version 1 `EXPORT_MANIFEST_JSON` 派生资产计数、建议文件名、排除字段与安全标记，下载时作为 `exportManifest` 附档；导入仍要求人类确认且清除批准凭据。稳定 SVG 摘要/导入后只读审阅模式仍待做 |
| 0.5 | P0 | 语言感知扫描、source ranges、符号/测试/框架边界，以及节点到编辑器源码位置的只读跳转 | 基础版已交付：节点可引用有界 `file + line` 证据；扫描器不写文件，提案仍只接受安全路径与显式人类批准。语言感知符号范围/IDE 跳转仍待做 |
| 0.5 | P2 | 可选客户端源码导航适配器：把相对 `file:line` 转换为本机 IDE 动作，而不改变 MCP server 的副作用边界 | 基础版已交付：`SOURCE_NAVIGATION_JSON` 提供有界、工作区相对、可复制的 `file:line` / URI / CLI 文本；服务端不打开文件、不启动 IDE、不执行命令、不暴露绝对路径，也不授权项目写入，详见 [ADR 0016](ADR/0016-source-navigation-is-copyable-context.md) |
| 0.5 | P1 | 多视图会话（架构/流程/时序共享同一工作区）与可选插件适配器，保持同一编译器/类型体系 | 视图切换不丢失批注锚点；适配器不是核心依赖，也不改变批准协议 |
| 0.5 | P1 | dry-run、测试命令建议、可选 Git worktree 隔离等审阅检查点 | 检查点只提供信息或隔离环境，不自动批准、不自动写入主工作区 |

增长层面的结论：宣发应把「无需账号、本地优先、开放会话工件、人工批准才写文件」放在首屏，而不是与通用白板比谁的形状库更多；最适合争取的是已经在 IDE 里使用 MCP、又担心 agent 直接改代码的人。对应的宣发要点见 [`docs/LAUNCH_KIT.md`](LAUNCH_KIT.md)，具体交付仍以 [`ROADMAP.md`](../ROADMAP.md) 为准。

## Sources

- [Mermaid](https://mermaid.ai/) and [Mermaid Chart MCP Server](https://mermaid.ai/docs/ai/mcp-server) — diagram-as-code, AI suggestions, MCP create/validate/render tools.
- [Miro Mermaid diagrams](https://help.miro.com/hc/en-us/articles/7004628130962-Create-Mermaid-diagrams) and [Miro MCP clients](https://help.miro.com/hc/en-us/articles/31624733719058-What-are-MCP-Clients) — Mermaid on a collaborative board and code-to-diagram MCP workflows.
- [GitHub review conversations](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/commenting-on-a-pull-request) — resolving review conversations, attached discussion, and an unresolved-conversation queue.
- [GitHub proposed-change reviews](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/reviewing-proposed-changes-in-a-pull-request) and [review concepts](https://docs.github.com/en/pull-requests/concepts/giving-reviews) — review-thread queues, permissions, and review state.
- [GitHub GraphQL pull requests reference](https://docs.github.com/en/graphql/reference/pulls) — `isResolved`, `isOutdated`, `resolvedBy`, and resolve/unresolve mutations.
- [Figma comments](https://help.figma.com/hc/en-us/articles/360041547593-View-and-manage-comments) — canvas-pinned comments, replies, resolution, and a right-sidebar conversation list.
- [Figma prototype comments](https://help.figma.com/hc/en-us/articles/360039824594-Comment-on-prototypes) — pin comments to a location, reply in a thread, resolve, and show resolved comments again.
- [Figma add comments](https://help.figma.com/hc/en-us/articles/360041068574-Add-comments-to-files) and [move/edit comments](https://help.figma.com/hc/en-us/articles/360041547853-Move-or-edit-comments) — pin behavior, object-bound comments, and conversation management.
- [Linear comments](https://linear.app/docs/comment-on-issues), [Linear Agent](https://linear.app/docs/linear-agent), [Agents in Linear](https://linear.app/docs/agents-in-linear), and [resolve-comments changelog](https://linear.app/changelog/2023-11-08-resolve-comments) — thread resolution, decisive replies, and explicit agent handoff.
- [tldraw commenting](https://tldraw.dev/docs/commenting) and [collaboration](https://tldraw.dev/docs/collaboration) — shape-anchored comments, sidebar filters, and server-side session authorization.
- [Excalidraw](https://excalidraw.com/) and [tldraw](https://tldraw.dev/) — open, editable visual canvas ecosystems.
- [draw.io MCP Registry entry](https://github.com/mcp-use/mcp-diagram-builder) and [mcp-diagram-builder](https://github.com/manufacts/mcp-diagram-builder) — interactive diagram generation and iterative editing through MCP.
- [GitDiagram](https://github.com/ahmedkhalf/gitdiagram) — public repository architecture diagrams and Markdown/MCP access.
- [Open Source Guides: Starting a Project](https://opensource.guide/starting-a-project/) and [Open {re}Source: Planning Your Project](https://openresource.dev/guide/creating/planning-your-project/) — roadmap, README, license, and non-goals guidance.
- Third-party 2026 category surveys were used to map the market lanes: [best AI diagram tools](https://nimbalyst.com/blog/best-ai-diagram-tools-2026/), [diagram APIs for AI agents](https://www.anchorterminal.com/best/diagramming/), and [visual collaboration tools](https://storyflow.so/blog/best-visual-collaboration-tools-2026/).

### 2026-11-06 增量来源

- [Archyne repository](https://github.com/archyne/archyne) and its [README](https://github.com/archyne/archyne/blob/main/README.md) — local-first visual Mermaid editing, layout comments preserved through LLM writes, editor-owned files, MCP validation, undo/redo and exports. The research input used the name `Arhyne`; the canonical public repository is `Archyne`.
- [OpenFlowKit](https://github.com/openflowkit/openflowkit) — research input for local-first repository mapping with file/line evidence, MCP support, and one text DSL plus TypeScript compiler shared by canvas, assistant, CLI and tools. The former `Vrun-design` GitHub path currently returns a permanent redirect whose target could not be verified with this round's public API tools; treat the detailed claims as unverified candidates.
- [tldraw AI integrations](https://tldraw.dev/docs/ai), [agent starter kit](https://tldraw.dev/starter-kits/agent), and [workflow starter kits](https://tldraw.dev/starter-kits/overview) — agent-readable canvas, direct editor manipulation, and composable visual workflows.
- [Nereid](https://github.com/bnomei/nereid) and its [LICENSE](https://github.com/bnomei/nereid/blob/main/LICENSE) — terminal-first Mermaid-backed TUI + MCP, deterministic text renders, attention/selection state, and folder-based session persistence; the license explicitly forbids commercial use, modification, and derivative works.
- [AgentDraw](https://github.com/agentdraw/agentdraw) and [DrawCMS](https://github.com/drawcms/drawcms) READMEs — editable local whiteboards, generated-output validation/repair, visual grammar, and undoable agent edit batches. DrawCMS is AGPL-3.0-only.
- [Mermaid Chart MCP Server](https://mermaid.ai/docs/ai/mcp-server) — account-backed Mermaid MCP comparison point; its documentation states that every tool call requires a Mermaid account.
- [Excalidraw JSON schema](https://docs.excalidraw.com/docs/codebase/json-schema) — open, portable plaintext JSON visual artifact.
- [Miro Mermaid diagrams](https://help.miro.com/hc/en-us/articles/7004628130962-Create-Mermaid-diagrams) — Mermaid as a board-editable source of truth.
- [VS Code CLI](https://code.visualstudio.com/docs/configure/command-line) and [terminal basics](https://code.visualstudio.com/docs/terminal/basics) — official `code --goto`, `vscode://file/...:line:column`, and `file:line` link formats.
- [MCP Apps official extension announcement](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/) — interactive UI returned by MCP tools and human decisions observed by models.
- [Visual Nerve](https://www.visualnerve.com/) — local-first visual workspace positioning around source evidence and relationships.
- [Microsoft Visio Desktop MCP Server](https://microsoft.github.io/Visio-Desktop-MCP-Server/) — local MCP server integration with AI clients and IDEs.
- [MCP TypeScript SDK: Call tools, read resources, get prompts](https://ts.sdk.modelcontextprotocol.io/v2/clients/calling) — `listTools` discovery and `callTool` invocation.
- [MCP Python SDK: The Client](https://py.sdk.modelcontextprotocol.io/client/) — `list_tools()` and tool name/description/schema discovery.
- [MCP Apps official overview](https://apps.extensions.modelcontextprotocol.io/api/documents/overview.html) — interactive forms, approval workflows, app-only tools, and UI-initiated tool-call consent.
- [MCP Tool Annotations as Risk Vocabulary](https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/) — tool metadata as hints rather than enforced authority, and tainted-path risk composition.
- [GitHub Copilot CLI command reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference) — MCP tool invocations are subject to session permission rules.
- [Overture](https://github.com/SixHq/Overture) — an interactive visual flowchart of an AI coding agent's execution plan before code writes.
- [Birdview](https://github.com/Qiuner/birdview) — architecture-map visualization of an agent's declared change scope before implementation.
- [Houston](https://github.com/houston-code/houston) — approval-gated coding-agent actions and a live checklist-shaped plan.
- [Glimpse](https://github.com/YushengAuggie/glimpse) — a local, two-way visual canvas for AI coding agents.
