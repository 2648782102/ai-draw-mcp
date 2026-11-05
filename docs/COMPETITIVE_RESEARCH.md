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
| [Archyne（调研输入亦记作 Arhyne）](https://github.com/archyne/archyne) | README 自述为本地优先 Mermaid 画布与文本双向同步；把人工坐标保存在 Mermaid 注释中，LLM 重写图时尽量保留既有节点布局；本地文件由编辑器拥有，并提供撤销/重做、MCP 校验写入与导出 | 图重新扫描后不应抹掉人工摆放；视觉编辑需要可回滚，并与文件内容变更的回滚区分 | AI Draw MCP 当前已有结构化编辑、会话 bundle、提案回滚与 `GraphNode` 的可选坐标；但重新扫描会生成带网格坐标的新图，布局保持与图形撤销栈仍待验证；人工批准门槛仍只适用于项目文件写入 |
| [OpenFlowKit](https://github.com/openflowkit/openflowkit)（原 `Vrun-design` 路径当前返回永久重定向） | 调研输入称其仓库地图的箭头引用到 `file + line`；本地优先、MCP；文本 DSL、画布、助手、CLI 共用同一套语言与 TypeScript 编译器 | 节点应能回到源码证据；扩展机制应保持低门槛和类型一致 | 0.3 的扫描器以文件树/import 为主；0.5 可补 source ranges，但不得把「能定位代码」变成「可以据此自动写文件」。重定向目标未能在本轮公开 API 工具中稳定复核，因此该条只作候选信号 |
| [tldraw AI](https://tldraw.dev/docs/ai)、[agent starter kit](https://tldraw.dev/starter-kits/agent) 与 [workflow starter kit](https://tldraw.dev/starter-kits/overview) | Agent 直接读取/修改画布，把视觉操作组织成可组合的工作流 | 人需要看见 AI 改了什么、在哪里改、能撤回；工具描述要把 agent 的下一步讲清楚 | AI Draw MCP 的 AI 不直接写项目文件；画布/图的编辑与项目写入由会话、逐行 diff、人工批准和一次性凭据分层 |
| [Nereid](https://github.com/bnomei/nereid)（TUI + MCP 参考形态） | 确定性文本渲染、显式注意力/选中状态、基于文件夹的会话持久化，让终端里的 AI 与人对同一对象工作；其 `LICENSE` 明确为非商业、禁止修改与衍生作品的 source-available 许可 | 把「当前选中了什么」变成机器可读上下文，并保留可恢复的会话；输出要可复现、可 diff | 本项目已有 WebSocket 面板与 bundle，不计划把 TUI 变成核心界面，也不借鉴其源码使用限制 |
| [AgentDraw](https://github.com/agentdraw/agentdraw) / [DrawCMS](https://github.com/drawcms/drawcms) | AgentDraw README 自述用受限 SVG/Mermaid 生成可编辑 JSON，并提供 repair / validate / 本地编辑器；DrawCMS README 自述有视觉语法校验和作为单次可撤销历史记录的 agent 批量编辑 | 视觉语法需要足够小且有约束；每次 agent 编辑都应有可审计的 before/after | 本项目已记录字段级 `graphDiffs`，可继续补图形编辑撤销栈；不能借「撤销」绕过 `ChangeProposal` 的批准模型。DrawCMS 为 AGPL-3.0-only，本轮不引入其代码 |
| [Excalidraw JSON format](https://docs.excalidraw.com/docs/codebase/json-schema) / [Miro Mermaid](https://help.miro.com/hc/en-us/articles/7004628130962-Create-Mermaid-diagrams) | Excalidraw 的开放 `.excalidraw` JSON 格式强调可迁移；Miro 把 Mermaid 当作可回写的 source of truth | 版本化工件、双向转换与可迁移导出能降低锁定感；文本 DSL 与画布状态需要明确谁是真源 | AI Draw MCP 以版本化 `SessionSnapshot` / `VisualGraph` 为协作真源，Mermaid/SVG 是视图；不追求托管协作，也不让云白板拥有项目真源 |

### 5 个高价值可借鉴能力

1. **布局保持与编辑撤销（P0，0.4）**：复用 `GraphNode` 的可选坐标，补充视口状态、重新扫描的布局保持策略与兼容规则；默认保留人的布局，仅在新节点或人显式要求时自动排布；图形编辑提供有限的撤销/重做栈。布局是视图状态，不是项目写入授权。
2. **源码证据与「跳到代码」（P0，0.5）**：让 scanner 为文件节点记录稳定的 `path` 与可选 `line` / `symbol` / `import` 证据，面板支持从节点打开源码位置，`get_visual_context` 返回可引用证据。证据只读，不自动扩大提案路径权限；与 [`ROADMAP.md`](../ROADMAP.md) 的 source ranges 方向一致。
3. **注意力状态（P1，0.4）**：在会话中记录当前选中节点/连线、展开的批注线程和最近查看的提案，作为 `get_visual_context` 的轻量 `focus` 字段；让人指着图说话时，AI 不必从整张图猜测对象。
4. **可复现的 agent 工作流（P1，0.4）**：把 `list_change_templates` 的只读草稿、`preflight_visual_proposal` 的检查结果、`create_visual_proposal` 的候选变更串成有明确前后条件的示例与诊断提示，减少 LLM 自行发明步骤；所有中间产物仍不签发批准凭据。
5. **确定性、可迁移的会话工件（P2，0.4/0.5）**：继续强化 bundle 的版本、校验与不含凭据约束，提供稳定的 JSON 摘要、Mermaid/SVG 导出及「导入后只读审阅」模式；文本渲染与导出应可复现，便于 Issue 附档、回归测试和跨工具迁移。

### 明确非目标

- 不做需要账号才能使用核心闭环的云图表库，不把会话真源托管到第三方白板。
- 不把 AI Draw MCP 做成通用自由画布、多人实时会议白板或 TUI 终端应用；布局与撤销只服务于项目结构协作。
- 不实现 AI 直接修改画布即等于修改源码；不实现删除、二进制写入，不绕过逐行 diff、人类批准、一次性确认号、路径校验和失败回滚。
- 不把 Mermaid 文本或某一家云服务的画布格式当作项目真源；`VisualGraph` / `SessionSnapshot` 仍是版本化协作协议。
- 不把「选中状态 / 注意力 / 源码定位」当成授权：它们只是上下文，不能生成可用批准凭据，也不能让 `apply_visual_proposal` 接受 AI 自批准。
- 不为追求竞品对等引入重型渲染引擎、账号系统、多人 CRDT 同步或托管执行环境；这些应留在可选适配器/集成层。

### 对 0.4 / 0.5 的建议与优先级

| 阶段 | 优先级 | 建议 | 完成定义 |
|---|---|---|---|
| 0.4 | P0 | 保存人工布局与视口；重新扫描采用「保留已有布局 + 新增节点增量排布」策略；补图形编辑撤销/重做 | 图修订不会无故移动既有节点；撤销只回退视觉状态，不回退已批准的项目写入；有协议兼容与 bundle 兼容性验证 |
| 0.4 | P0 | 把只读变更模板、预检、提案创建做成可复现的 agent 工作流示例，并在诊断里提示缺失步骤 | 示例能展示 `changes` → preflight → proposal → 人批准 → apply；任何只读中间产物都不含确认号 |
| 0.4 | P1 | 引入机器可读 `focus` / 选中状态，并让批注、诊断和下一棒提示引用同一对象 | AI 能从上下文识别「人正在指哪个节点」；焦点变化不签发凭据、不自动解决线程 |
| 0.4 | P2 | bundle 增加可读摘要与可复现导出清单；发布前用 `repo:check` / `docs:assets:check` 守住文案和资产一致性 | 同一会话导出的 JSON/SVG 摘要稳定；导入仍要求人类确认且清除批准凭据（验证可沿用现有 Vitest 协作集成测试） |
| 0.5 | P0 | 语言感知扫描、source ranges、符号/测试/框架边界，以及节点到编辑器源码位置的只读跳转 | 节点可引用 `file + line` 证据；扫描器不写文件，提案仍只接受安全路径与显式人类批准 |
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
