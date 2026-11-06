# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `SELECTION_WORKORDER_JSON` 增加纯派生 `freshness`：比较 `selectionRevision` 与当前 `graphRevision`，给出 `current` / `stale` / `none` 描述、复制文本与缺口提示，帮助人和 AI 在图变化后重新确认范围。该字段只提示，不刷新/清空选择、不改会话、不含凭据，也不授权写入；图保存只移除失锚节点 ID，不静默改写人类原选择修订。面板、MCP 文本、ADR、工作流示例、纯函数/HTTP/MCP 测试与离线检查同步覆盖。

### Maintenance

- 可搜索命令面板（2026-11-06 12:05 CST）：新增 `?` 快捷键、欢迎页入口和「⌘ 命令」按钮，打开可搜索的本机命令列表；支持 `↑ / ↓`、`Enter`、`Esc`、关键词筛选、分组标签和快捷键提示，把分屏/源码/画布、协作三栏、适应窗口、示例图形、主题切换与外观设置收在一个入口。命令只触发已有前端函数，不调用 MCP 工具、不改会话、不批准提案、不签发凭据或写项目文件；浏览器回归、离线守卫、README、CHANGELOG 与截图入口同步覆盖。
- 首用视觉与确认号交接（2026-11-06 11:50 CST）：空白画布欢迎卡重做成分栏式产品首屏，左侧用更明确的协作文案与 `1/2/3`、`4/5/6`、`C/Esc` 快捷键引导，右侧画出「AI → 结构图 → 提案 → 人 → 共同上下文」的可见闭环；浅色/紧凑/窄屏主题同步适配。批准后不再用原生 `alert`，改为面板内一次性确认号卡片：逐项列出四个凭据字段、有效期、复制按钮、关闭与 `Esc` 支持，并明确仍需人把确认号交给 AI 调用 `apply_visual_proposal`。只改前端派生 UI 与本机剪贴板交互，不改批准协议、工具调用、凭据格式或写入闸门；浏览器回归、离线守卫、README 与两张真实截图同步覆盖。
- 协作流程导航（2026-11-06 11:35 CST）：工作台顶部新增「看见结构 → 表达意图 → 审阅变更 → 人工确认」四步流程卡，按只读会话、消息、提案与审阅就绪状态显示图标、动态提示和待审提案数；支持点击切换、方向键聚焦与 `4` / `5` / `6` 快捷键，主标签和历史标签也补上 `ArrowLeft` / `ArrowRight` 键盘导航。图形编辑的未保存行改为以节点/连线稳定 ID 记录，删除中间行不会让其余标记错位。全部变化只在前端派生 UI，不新增工具、不改会话存储、不改批准凭据或项目写入闸门；浏览器回归、离线守卫、README 与快捷键表同步覆盖。
- 图形编辑即时反馈（2026-11-06 11:20 CST）：节点/连线输入、新增与删除现在会即时标记未保存行，提示条和「保存图形」按钮显示待保存计数；成功保存后清除标记。状态只在当前面板中派生，刷新或重新载入以服务端会话为准，不新增持久化字段、不改图修订规则、不签发凭据或扩大写入边界；浏览器回归覆盖新增节点、输入、保存与标记清除，离线守卫同步覆盖反馈标记。
- 响应式与可访问性（2026-11-06 11:15 CST）：协作工作台主标签与历史标签补齐 `aria-selected` / `role="tabpanel"` / `aria-controls`，按钮切换时同步状态；900px 以下收紧间距、隐藏低频工具栏控件并允许历史标签横向滚动，620px 以下使用更紧凑顶栏、浮动图表库、单列提案指标与纵向审批按钮。纯 CSS / 静态属性 / 派生状态变化，不改接口或写入闸门；浏览器回归新增 820px 与 560px 两档布局、ARIA 与横向溢出断言，离线守卫同步覆盖响应式标记。
- 历史视图空状态（2026-11-06 11:10 CST）：活动、批注、差异三个标签的空列表改为一致的产品化引导卡，分别说明时间线、节点绑定与图形差异的来源与边界；活动项增加人 / AI / 系统圆点标记，展开的图形修订差异增加强调边框。只改前端派生渲染和 CSS，保留全部列表 ID、数据源、渲染函数和写入闸门；浏览器回归覆盖空状态文案与活动列表，离线守卫同步覆盖新标记。
- 外观设置面板（2026-11-06 11:00 CST）：顶栏原来分散的主题、密度、预览背景与侧栏控制收进单个 ⚙ popover，采用分段按钮显示当前偏好，并加入可随时查看的快捷键表；支持点击外部或 `Esc` 关闭、`aria-expanded` 状态与 localStorage 持久化。偏好仍只影响本机前端，不改 Mermaid 图主题、协作会话、工具契约或写入闸门；浏览器回归覆盖四组设置、活动态、预览背景、侧栏折叠与 popover 可访问性，离线守卫同步覆盖新标记。
- 对话历史体验（2026-11-06 10:50 CST）：把四个历史标签与消息列表提到中栏顶部，让双向对话成为工作台首屏焦点；消息改为人 / AI / 系统角色气泡，加入头像、中文状态徽章、相对时间、图修订标记、入场动画与空对话引导，四个标签增加实时计数与待处理高亮。源码证据/节点上下文改用独立的紧凑证据卡，避免与对话气泡混淆，并消除重复的 `activitySummary` ID。只改前端派生渲染与 CSS，不改会话数据、消息契约、WebSocket 事件或写入闸门；浏览器回归覆盖角色、状态、计数与证据卡样式，离线守卫同步覆盖新标记。
- 提案卡片精修（2026-11-06 10:40 CST）：把变更提案重排为带状态色的审阅卡，增加中文状态徽章、图修订/范围指标、SHA-256 与相对时间、四格影响摘要、完整路径列表和批准前检查清单；逐行 diff 增加只读/已加载/失败状态与展开反馈，批准设为唯一主操作，决策中显示 busy 反馈。保留全部 `data-approve` / `data-reject` / `data-diff` / `data-impact` 与现有接口，不新增工具、不改批准协议或项目写入闸门；浏览器回归用临时会话内的示例提案覆盖真实卡片、影响摘要、diff 加载与操作层级，README 工作台截图同步展示提案卡片。
- 历史信息分组（2026-11-06 10:30 CST）：把中栏「对话 / 活动 / 批注 / 图形差异」从垂直堆叠改为四个迷你标签页，默认显示对话；每个列表 ID、渲染函数和数据源保持不变，只改变可见性，降低滚动与视觉噪音。UI 回归验证四个标签与切换行为，离线守卫覆盖历史分组标记。
- 图形编辑器可读性（2026-11-06 10:25 CST）：节点行改为表格化卡片，增加稳定行号、悬浮高亮、选中行左侧强调、固定表头与更清晰的输入框边界；空图形状态改为引导卡，提示调用 `scan_project` 或重新扫描项目。保留全部 `data-index`、`data-node-id`、输入 class 与选择/删除事件，不改图数据结构、保存逻辑或写入闸门；UI 回归与离线守卫覆盖空图形引导和固定表头。
- 协作健康度（2026-11-06 10:20 CST）：工作台新增派生状态卡，汇总是否有结构图/选择范围/提案上下文、审阅阻塞、信号数、下一步动作与 stale 选择，并用 0/4–4/4 进度条说明「准备程度」而非写入许可；状态色在 stale 或阻塞时切换为警示色。全部数据来自已加载的只读诊断、审阅就绪与工作单 JSON，不新增接口、不持久化状态、不签发凭据或扩大写入边界；UI 回归与离线守卫覆盖状态卡。
- 图表库交互（2026-11-06 10:15 CST）：侧栏新增搜索框、总数计数、类型图标、相对时间、空列表/无搜索结果提示和 `↑/↓ + Enter` 键盘导航；筛选只在本地对已加载的图表元数据执行，不请求额外接口，也不改变当前图或协作状态。UI 回归覆盖空列表引导与搜索控件，离线守卫覆盖图表库标记。
- 外观偏好（2026-11-06 10:10 CST）：新增浅色 / 深色工作台主题与舒适 / 紧凑密度切换，偏好写入本机 localStorage；浅色主题重定义表面、边框、文本和预览背景，紧凑模式收紧间距与控件高度。切换只影响前端 CSS，不改 Mermaid 图主题、协作会话、工具契约或写入闸门；UI 回归验证主题/密度 class 切换与布局稳定。
- 首次打开体验（2026-11-06 10:03 CST）：空白预览改为产品化欢迎卡，说明「AI 生成图 → 人修改批注 → AI 生成提案 → 人工批准后项目变化」闭环，列出 `1/2/3`、`C/Esc`、`F/0` 快捷键；「载入示例图形」只把 Mermaid 示例填入本机编辑器并渲染预览，不创建图记录、不改协作会话、不写项目文件。欢迎卡在真实图或 SVG 渲染后自动隐藏，源码视图下不显示；UI 回归验证示例渲染与图记录数量不变。
- 视图模式迭代（2026-11-06 09:55 CST）：顶部新增「分屏 / 源码 / 画布」分段切换，支持 `1` / `2` / `3` 快捷键与 localStorage 持久化；源码模式只显示编辑器，画布模式隐藏源码并显示底部画布状态 chip，分屏模式恢复原有可拖拽比例。视图偏好与主题/背景/侧栏/分栏偏好共用同一份本地偏好，不进入协作会话、不改图修订或写入闸门；UI 回归测试与离线守卫覆盖三种视图切换。
- 前端可验证性与操作降噪（2026-11-06 09:48 CST）：新增 `test/panel-ui.test.mjs` 真实浏览器回归，覆盖品牌栏、主操作层级、`C`/`Esc` 快捷键、上下文折叠组、概览统计、固定操作栏、空状态、桌面无溢出与 900px 以下标签页；新增 `npm run ui:shots` 可复现生成 README 的两张 1440×900 截图。固定操作区把低频导入/复制动作收进可展开「更多」，消息输入框增加 2000 字计数与快捷键说明，提案栏补「写入闸门」说明；覆盖复制成功、扫描中、入场动画、焦点可见和 reduced-motion 反馈。测试从 23/79 增至 24/80，打包从 275 增至 276 文件；仍不改 MCP 工具、JSON 契约、人工批准或项目写入边界。
- 前端交互迭代（2026-11-06 09:38 CST）：协作工作台新增概览统计条、可折叠上下文组、独立滚动区与固定操作栏；桌面保留三栏，900px 以下切换为「项目图 / 对话 / 提案」标签页。工具栏与操作按钮建立主次层级，补 `C` 打开协作、`Esc` 关闭、`F` 适应窗口、`0` 重置缩放、`⌘/Ctrl+Enter` 渲染或发送的提示；增加复制成功、扫描中、入场动画、焦点可见、自定义滚动条和 `prefers-reduced-motion` 支持。纯前端 CSS/静态结构与派生 UI 状态，不改 MCP 工具、JSON 契约、人工批准或项目写入边界；离线守卫覆盖交互标记。
- 外观刷新（2026-11-06 09:22 CST）：预览面板改为品牌化顶栏、玻璃感导航、卡片式侧栏/三栏协作工作台、分段图标、紧凑诊断卡和提案空状态；README 用真实运行截图替换早期「11 个工具」旧图，并新增协作工作台截图。纯 CSS/静态结构与文档资源变化，不改 MCP 工具、JSON 契约、人工批准或项目写入边界，由离线守卫覆盖新版界面标记。
- 最终证据回写（2026-11-06 08:54 CST）：`ecc8e47` 把 #87–#90 与 metadata #14 的路径过滤结论写入版本化文档和离线守卫；其自身 CI #91 `42139816006` 在 Node 20/22/24 全绿，job ID 为 `127637049248` / `127637049494` / `127637049357`。由于该提交修改了 `docs/LAUNCH_KIT.md`，metadata workflow #15 `42139816004` / job `127637049289` 被触发，但仍只执行只读漂移检查，`Require an administration-capable token` 与 `Apply repository metadata` 两步均被跳过。公开仓库 API 仍为 `description: null` / `homepage: null` / `topics: []`；不 retag、不改 published Release、不自动发 npm 包、不合并高风险依赖升级。
- 收口证据（2026-11-06 08:49 CST）：`259790d` / `b4ffbf2` / `5d6114c` / `734ad6f` 的 CI #87 `42137916943`、#88 `42138152753`、#89 `42138459195`、#90 `42138738900` 均在 Node 20/22/24 全绿；#90 的 job ID 分别为 `127633381248`、`127633381672`、`127633381836`。metadata workflow `42138152985` / #14 由 `b4ffbf2` 的 `docs/LAUNCH_KIT.md` 路径变更触发，只完成只读漂移检查，apply 因缺少管理型 `GH_TOKEN` 被跳过；`5d6114c` / `734ad6f` 未修改 workflow 的 path filter 所监听文件，因此没有对应的 metadata run。公开仓库 API 仍显示 `description: null` / `homepage: null` / `topics: []`，不把绿色 workflow 误写成 About/topics 已修复；本轮不改 26 个工具、version 1 协议、写入闸门、依赖锁文件、标签或已发布 Release。
- `259790d` 把 stale 工作单 FAQ 补成可执行恢复步骤：在面板清空选择范围、重新勾选目标节点、让 AI 读取新工作单，且不要沿用旧候选路径起草 changes；中英文措辞与离线守卫同步，离线检查脚本去掉一条重复的 `[Unreleased]` 断言。`0aba259` 的 CI `42137519829` / #86 在 Node 20/22/24 全绿，metadata workflow `42137519789` / #13 完成只读漂移检查但不改写 About/topics；这两项都不改协议、工具数量、工作单字段或写入边界。
- 记录 `e753aed` / `c02d048` / `09fd7b7` 的 CI #83 `42136060410`、#84 `42136310033`、#85 `42136720779` 在 Node 20/22/24 全绿，以及 metadata workflow #12 `42136060175` 的只读漂移检查证据；同步补充中英文 30 秒 stale 工作单 FAQ 与面板高对比警示行，但不改协议、写入边界或 `v0.3.4` 已发布 Release 文案。仓库 About/topics 仍为 `description: null` / `homepage: null` / `topics: []`，workflow 的 apply 步骤因缺少管理型 `GH_TOKEN` 被跳过；npm 发布、依赖重大升级和不可逆品牌决定仍等待人工批准。
- 面板把 stale 选择新鲜度提示改为高对比警示行，让人类在重新扫描后一眼看到「旧选择不是当前授权」；只改 CSS/渲染类名，不改协议、写入边界或工作单字段，并由离线守卫覆盖。
- 记录 `132f90e` 的 CI `42135660499` / #82 在 Node 20/22/24 全绿；新增发布后维护期宣发说明与目标模式/维护证据调研，不改变 `v0.3.4` 已发布 Release 文案，也不移动标签或自动发布 npm 包。浏览器 UI 检查连续超时，因此未通过未验证的网页会话改写仓库元数据；漂移继续由版本化 workflow 收敛。
- 记录 `355b8a7` 的 CI `42133986305` / #81 在 Node 20/22/24 全绿及三个 job ID；新增 `docs/GOAL_MODE.md`，回答「如何给目标模式设任务、需要提供什么」并给出可复用中文模板，README、英文 quickstart、文档地图与治理入口同步链接。GitHub About/topics 漂移与本机缺少管理型 API 凭据的事实继续明确记录，不改写 `v0.3.4` 或更早 Release。
- 回写 `v0.3.4` 的公开发布证据：CI `42131331089`、Release `42131352599`、GitHub Release 页面与发布时间；保留 `v0.3.2` / `v0.3.3` / `v0.3.4` 已发布事实，不改写标签或 Release。About/topics 漂移仍明确记录，npm 发布仍等待人工批准。
- 记录 `45e8280` 的 Node 20/22/24 CI 与只读元数据漂移检查证据；`npm audit --omit=dev` 的 29 条告警只作为隔离 Dependabot 验证输入，不在维护提交里自动升级 Mermaid/Puppeteer/MCP SDK/Zod/sharp 等高风险依赖。

## [0.3.4] - 2026-11-06

### Added

- 第 26 个 MCP 工具 `get_selection_workorder` 与 `GET /api/collab/selection-workorder`：version 1 `SELECTION_WORKORDER_JSON` 从 `SELECTION_SCOPE_JSON`、当前会话与派生审阅就绪状态生成有界「预提案工作单」，汇总选中节点、内部连线、安全相对候选路径、范围内人类意图、`file:line` 证据、缺口与下一步。工作单不含候选文件内容、逐行 diff、提案、批准凭据或工作区绝对路径，也不重读项目文件、不改图修订/选择/对话/时间线、不签发凭据、不扩大写入路径。
- [ADR 0019](docs/ADR/0019-selection-workorder-is-read-only-preflight.md)：记录工作单是只读、纯派生、预检前的对话清单；`PREFLIGHT_JSON`、完整逐行 diff、人工批准与一次性确认号仍是写入前的独立闸门。
- 面板显示并可复制同一份只读预提案工作单；纯函数、MCP、HTTP、工作流示例、能力清单与离线一致性测试覆盖 26 个工具、19 份 ADR、安全路径过滤、缺口提示、无变更内容与凭据/绝对路径不外泄。

### Maintenance

- `package.json` 与 `package-lock.json` 升至 `0.3.4`；README、AGENTS、架构、安全、路线图、宣发、示例、故障排除与离线检查同步到 26 个工具和 19 份 ADR。
- 保留 `v0.3.3` 的公开验证证据与已发布 Release 实际标题；不改写任何现有标签或 Release。
- 补强协作生命周期测试：bundle 明确排除 ephemeral 选择与 `exportManifest.contents.selection` 记录排除；导入后 `SELECTION_SCOPE_JSON` 与 `SELECTION_WORKORDER_JSON` 都回到空范围并提示先让人重新选择。

## [0.3.3] - 2026-11-06

### Added

- 第 25 个 MCP 工具 `get_selection_scope` 与 `GET /api/collab/selection-scope`：version 1 `SELECTION_SCOPE_JSON` 把人在面板中最多 24 个节点的有界多选投影为选中节点、两端都在范围内的连线、过滤后的工作区相对 `file:line` 证据、焦点包含状态、视口与固定只读安全标记；面板显示同一清单并提供「复制选择范围」。它不重读项目文件、不打开编辑器、不改选择、不改会话对话状态、不创建提案、不签发凭据、不暴露工作区绝对路径。
- `SessionSelection` 与人类确认的 `POST /api/collab/selection`：本机面板令牌、`confirmedBy: "human"`、最多 24 个唯一节点 ID、有限图修订与严格属性校验；图修订清除失锚选择，导入会话清空选择，bundle 与 `EXPORT_MANIFEST_JSON` 明确排除 ephemeral 选择状态。
- `CONTEXT_JSON.selectionScope`、`BRIEF_JSON.selection`、`WORKFLOW_JSON.selection`、诊断、能力清单与面板复制提示同步暴露紧凑只读选择范围；多选不会改 `graphRevision`、不产生消息/活动时间线/字段级图修订/批准凭据，也不授权项目写入。
- [ADR 0018](docs/ADR/0018-human-selection-is-read-only-scope.md)：记录多选范围是应用层、只读、无副作用的意图上下文，与单节点 `SessionFocus` 及人工批准边界互补。
- 选择范围纯函数、MCP、HTTP、共享简报、工作流、诊断、导出清单、面板与离线一致性测试：覆盖 25 个唯一工具、24 节点上限、去重、失锚清理、安全路径过滤、凭据/绝对路径不外泄，以及 `SERVER_TOOL_COUNT` 与文档同步。

### Maintenance

- 记录 `v0.3.2` 发布后的公开验证证据：CI #65、Release #2 与 GitHub Release 页面均已上线；仓库 About/topics 仍因缺少管理权限令牌而保持版本化漂移记录。
- 将 `SERVER_VERSION` 从 `tools/_shared.ts` 统一导出，保持工具文件只经共享层访问基础设施的约定。

## [0.3.2] - 2026-11-06

### Added

- 第 24 个 MCP 工具 `get_capabilities` 与 `GET /api/collab/capabilities`：version 1 `CAPABILITIES_JSON` 一次列出全部工具、JSON 契约、八步工作流就绪状态、派生审阅状态、下一步安全动作、唯一 `writes: "project"` 工具与固定只读边界；面板显示同一清单并提供「复制能力清单」。它不调用其他工具、不重复读取项目文件、不改会话、不创建提案、不签发凭据、不暴露工作区绝对路径。
- [ADR 0017](docs/ADR/0017-capability-catalogue-is-read-only-discovery.md)：记录能力清单是应用层、只读、无副作用的发现契约，与 MCP 原生 `tools/list` 协议发现互补；官方 SDK 的 `listTools()` 仍是工具名与输入 schema 的权威来源。
- 能力清单纯函数、MCP、HTTP、工作流示例、面板与离线一致性测试：覆盖 24 个唯一工具、唯一项目写入工具、安全标记、下一步动作、凭据/绝对路径不外泄，以及 `SERVER_TOOL_COUNT` 与文档同步。
- `.github/workflows/release.yml` 增加标签验证后的独立 Release 发布作业：使用内置 `GITHUB_TOKEN` 的 `contents: write` 权限，从匹配版本号的 `CHANGELOG.md` 小节生成 Release 正文；先按 tag 查询已有 Release，保证重复运行幂等；并发互斥，npm 发布仍保留人工批准门槛。
- `RELEASING.md`、`docs/GOVERNANCE.md`、`docs/LAUNCH_KIT.md`、`AGENTS.md` 与 `scripts/repo-check.mjs` 同步记录自动发布边界、CI 证据与离线防漂移检查；维护者本地 `--release` 路径保留为后备工具，不改写 `v0.3.1` 标签。
## [0.3.1] - 2026-11-06

### Added

- 第 23 个 MCP 工具 `get_source_navigation` 与 `GET /api/collab/source-navigation`：version 1 `SOURCE_NAVIGATION_JSON` 把当前 `VisualGraph` 已有的 `GraphSourceEvidence` 投影成有界、工作区相对 `file:line`、可复制 `vscode://` / `cursor://` URI 文本与 `code --goto` 提示；面板显示同一清单并提供「复制源码跳转」。它固定 `readOnly: true` 与 `projectWritesRequireHumanApproval: true`，过滤绝对路径、目录穿越、受保护目录与 `.env`-like 名称，不重复读项目文件、不打开 IDE、不执行命令、不写会话/项目文件、不签发凭据。
- [ADR 0016](docs/ADR/0016-source-navigation-is-copyable-context.md)：记录源码跳转是从扫描证据派生的无副作用、可复制上下文；官方 VS Code 导航格式、MCP Apps 交互 UI 与本地优先可视化产品调研结论同步进入竞品研究，编辑器启动和 LSP 适配器仍留在可选集成层。
- 源码导航纯函数、MCP、HTTP、可复现工作流示例与离线一致性测试：覆盖有界返回、节点范围、未知节点拒绝、路径过滤、`readOnly` / 不打开文件 / 不授权写入安全标记、凭据与绝对路径不外泄，以及工作流示例中的相对路径校验。
- `WORKFLOW_JSON.reviewReadiness`：八步工作流第一步列出并校验同一快照派生的紧凑 `ready` / `review` / `blocked` 状态；工作流示例比对工作流字段与诊断字段，确认 `ready` 不授权写入或跳过完整逐行 diff。
- [ADR 0015](docs/ADR/0015-review-readiness-is-a-derived-diagnostic.md)：记录审阅就绪是由共享简报阻塞与决策链缺口组合而成的派生诊断，不持久化重复状态、不签发凭据，且 `ready` 不替代完整逐行 diff。
- `REVIEW_READINESS_JSON` 的独立纯函数契约测试：覆盖 `blocked` / `ready` 聚合、有界来源点、固定安全标记、完整 diff 提示，以及一次性批准凭据不进入序列化输出。
- **Maintain GitHub metadata** 工作流现在在 master/main push 与手动 dispatch 时执行只读漂移检查；配置具备 `Administration: read and write` 的 `GH_TOKEN` secret 后，push 会自动应用版本化 About/topics，未配置 secret 时不会让 CI 因已知漂移变红。
- version 1 `REVIEW_READINESS_JSON` 与 `GET /api/collab/review-readiness`：从 `BRIEF_JSON` 阻塞和 `DECISION_TRAIL_JSON` 证据缺口派生 `ready` / `review` / `blocked` 只读审阅状态；`CONTEXT_JSON.diagnostics.reviewReadiness`、诊断信号、下一步动作、面板与工作流示例显示/读取同一投影，且不创建提案或写文件。
- 审阅就绪纯函数、HTTP、工作流示例、诊断与离线一致性测试：覆盖阻塞/缺口聚合、固定只读安全标记、凭据不外泄、下一步动作和 CI 示例读取。
- version 1 `EXPORT_MANIFEST_JSON` 与 `GET /api/collab/bundle/manifest`：从导出的 `SessionBundle` 派生可读资产清单、建议文件名、有界计数、被排除的凭据/图形历史/视口字段、已降级批准状态与固定只读安全标记；面板下载的 bundle 附带 `exportManifest`，严格导入仍只信任 versioned `session`。
- [ADR 0014](docs/ADR/0014-export-manifest-is-a-derived-inventory.md)：记录导出清单是派生只读清单、不持久化、不改变导入契约、不签发凭据，也不授权写入。
- 导出清单纯函数、HTTP、面板导出与离线一致性测试：覆盖确定性、版本校验、credential-like metadata 拒绝、凭据不外泄、固定安全标记和带清单旧字段的 bundle 导入兼容。
- 第 22 个 MCP 工具 `get_decision_trail` 与 `GET /api/collab/decision-trail`：version 1 `DECISION_TRAIL_JSON` 从当前会话派生意图 → 图形修订 → 有界提案变更摘要 → 批准/应用状态的可读时间线；面板显示同一只读视图并提供「复制决策链」。
- [ADR 0013](docs/ADR/0013-decision-trail-is-a-read-only-projection.md)：记录决策链是派生只读投影，不含批准凭据、不改变会话、不授权写入，且提案完整逐行 diff 仍须人工审阅。
- 决策链纯函数、MCP、HTTP、工作流示例与离线一致性测试：覆盖失锚讨论只作历史证据、有界事件/变更行、固定安全标记、确认号不外泄与 `grantsWriteAuthority: false`。
- version 1 `SessionViewport` 与 `POST /api/collab/viewport`：面板节流同步有界缩放/平移状态，`get_visual_context`、`BRIEF_JSON`、诊断和面板只读显示人正在看哪片图；不改图修订、不进入消息/时间线/差异/bundle、不签发凭据。
- [ADR 0012](docs/ADR/0012-viewport-is-read-only-attention-context.md)：记录视口是有限的人类注意力上下文，AI 不能设置或把它变成项目写入权限。
- 视口纯函数、MCP 上下文、共享简报/诊断与 HTTP 协作测试：覆盖有限值、范围、来源、未知属性、人类确认、非法输入拒绝以及图形/消息/差异不变。
- 第 21 个 MCP 工具 `get_shared_brief` 与 `GET /api/collab/brief`：version 1 `BRIEF_JSON` 把会话/图形版本、人类焦点、就绪阻塞、待处理消息、有效与失锚批注、最近图形修订、有界 `file:line` 证据、提案/活动计数和下一步聚合成紧凑交接视图；面板显示同一只读视图并提供「复制共享简报」。
- [ADR 0011](docs/ADR/0011-shared-brief-is-a-read-only-projection.md)：记录共享简报是派生投影、不持久化、不含批准凭据，也不授予写入权限。
- 共享简报纯函数、MCP、HTTP、工作流示例与离线一致性测试：覆盖有界意图、失锚线程分离、焦点、缺图阻塞、凭据不外泄和 `grantsWriteAuthority: false`。
- 第 20 个 MCP 工具 `get_node_context` 与 `GET /api/collab/node-context`：version 1 `NODE_CONTEXT_JSON` 把指定/焦点节点的字段、只读 `file:line` 证据、节点批注线程、相邻连线、相关 `graphDiffs` 与焦点状态聚合成紧凑投影；面板显示同一只读视图，工作流第一步将其列为可选上下文输出。
- [ADR 0010](docs/ADR/0010-node-context-is-a-read-only-projection.md)：记录单节点上下文是派生视图、不持久化、不修改焦点/线程，也不授予写入权限。
- 节点上下文纯函数测试与 MCP/工作流契约测试：覆盖证据、失锚线程、入/出连线、相关差异、显式节点、缺图/未知节点和 `grantsWriteAuthority: false`。
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

- MCP 工具从 21 增至 22；README（中/英）、AGENTS、架构、路线图、竞品调研、发布文案、故障排除、安全、文档地图、ADR 索引、示例、离线一致性检查、工具数量常量、工作流第一步输出与 MCP/HTTP/工作流示例测试同步更新。
- 竞品调研补充 2025–2026 官方 agent 轨迹/审批资料：MCP 安全与 elicitation 规范、GitHub Copilot agent sessions、OpenAI Agents SDK tracing、LangChain human-in-the-loop；明确可审计轨迹与一次性凭据、完整工具载荷、人工逐行 diff 审批的边界，不采信厂商自报效果数据。
- 治理文档记录 CI 47/48 在 Node 20/22/24 全绿、Issue #8 决策链反馈更新，以及 05:47 CST 仍无 repo-admin token 的 GitHub metadata 漂移证据。
- 路线图删除重复的 0.4 待办、把已交付的提案影响摘要/会话 bundle/doctor 移入已交付清单，并明确下一阶段聚焦决策链、语言感知符号范围与多视图会话；发布文案同步补充共享简报与视口注意力。
- 面板缩放/平移后以 400ms 节流同步 `SessionViewport`；README（中/英）、AGENTS、架构、路线图、竞品调研、发布文案、故障排除、安全、文档地图、离线一致性检查与示例同步说明其只读边界。
- MCP 工具从 20 增至 21；README（中/英）、AGENTS、架构、路线图、竞品调研、发布文案、故障排除、示例、离线一致性检查、工具数量常量、工作流第一步输出与 MCP/HTTP 测试同步更新。
- MCP 工具从 19 增至 20；README（中/英）、AGENTS、架构、路线图、竞品调研、发布文案、离线一致性检查、工具数量常量、工作流契约和 MCP 测试同步更新。
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

- 面板发布 `SessionViewport` 改为始终携带 `X-AI-Draw-Token` 的 `keepalive fetch`，不再优先使用无法设置自定义头的 `sendBeacon`，避免真实浏览器缩放/平移时被协作写路由 401 拒绝；ADR 0012、架构、安全、AGENTS、故障排除、发布文案与离线一致性检查同步说明该鉴权边界。
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
