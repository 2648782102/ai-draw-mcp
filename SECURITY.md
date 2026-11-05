# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.3.x   | ✅        |
| < 0.3   | ❌        |

## Reporting a Vulnerability

请通过 GitHub 私有漏洞报告或仓库维护者提供的安全邮箱报告问题，不要在公开 Issue 中披露可利用细节。请包含复现步骤、影响范围、受影响的版本和可能的修复建议。

## Trust model

AI Draw MCP 在本机启动一个预览服务，默认绑定 `127.0.0.1`。面板可以读取协作会话、发送消息、创建和批准变更提案；批准后的提案会修改工作区文件。不要在不信任的网络中暴露此端口，也不要把 `AI_DRAW_WORKSPACE_ROOT` 指向包含敏感凭证的目录。

## Guarded operations

- 提案应用器拒绝删除、路径逃逸、绝对路径越界、`.git`、`node_modules`、`dist`、`.env*`、锁文件。
- `get_agent_workflow` 与 `WORKFLOW_JSON` 只是描述性契约；就绪 `blocked` 列表、只读草稿、预检结果和上下文都不构成批准凭据或写入能力。
- 视觉撤销/重做只恢复 `VisualGraph` 快照并要求人类确认；它不会回退项目文件、恢复一次性确认号或撤销已应用的提案。
- `GraphSourceEvidence` 的 `file:line` 引用只是扫描器派生的只读上下文；bundle 严格校验路径/行号/摘要，证据不扩大提案路径范围，也不签发批准凭据。
- `get_node_context` / `NODE_CONTEXT_JSON` 是单节点只读投影；显式 `node_id` 不会冒充人类焦点，也不会改变焦点、重锚线程、扩大提案路径或签发批准凭据。详见 [ADR 0010](docs/ADR/0010-node-context-is-a-read-only-projection.md)。
- `get_shared_brief` / `BRIEF_JSON` 是紧凑只读交接投影；它排除批准凭据、把失锚线程与当前意图分离，不改变焦点/线程/提案，也不签发凭据或授权写入。详见 [ADR 0011](docs/ADR/0011-shared-brief-is-a-read-only-projection.md)。
- `get_decision_trail` / `DECISION_TRAIL_JSON` 是派生只读决策链；它按证据类型聚合意图、失锚讨论、图修订与提案阶段，但提案变更行只是有界投影，完整逐行 diff 仍须在面板或 `/api/collab/proposals/:id/diff` 审阅。输出排除一次性确认号、批准凭据与 metadata 凭据，不持久化、不改变会话、不批准/应用提案，也不授权写入。详见 [ADR 0013](docs/ADR/0013-decision-trail-is-a-read-only-projection.md)。
- `GET /api/collab/bundle/manifest` / `EXPORT_MANIFEST_JSON` 是 bundle 的派生只读清单；它只列出有界内容计数、建议文件名、刻意排除的凭据/图形历史/视口与固定安全标记，拒绝 credential-like proposal metadata，不持久化、不扩展导入协议、不签发凭据、不批准变更、不写项目文件。详见 [ADR 0014](docs/ADR/0014-export-manifest-is-a-derived-inventory.md)。
- `GET /api/collab/review-readiness` / `REVIEW_READINESS_JSON` 与 `CONTEXT_JSON.diagnostics.reviewReadiness` 是派生只读审阅状态；它汇总 `BRIEF_JSON` 阻塞与 `DECISION_TRAIL_JSON` 缺口，固定 `readOnly: true` / `grantsWriteAuthority: false` / `excludesApprovalGrants: true`，不持久化、不签发凭据、不批准/应用提案、不写项目文件，也不替代完整逐行 diff。详见 [ADR 0015](docs/ADR/0015-review-readiness-is-a-derived-diagnostic.md)。
- `get_source_navigation` / `GET /api/collab/source-navigation` / `SOURCE_NAVIGATION_JSON` 是只读可复制源码跳转投影；只从已有 `GraphSourceEvidence` 派生工作区相对 `file:line`、编辑器 URI 文本和命令行提示，过滤绝对路径、目录穿越、受保护目录与 `.env`-like 名称。服务端不重复读项目文件、不打开文件、不启动 IDE、不执行命令、不暴露绝对路径、不含批准凭据、不写会话/项目文件，也不扩大提案允许路径；详见 [ADR 0016](docs/ADR/0016-source-navigation-is-copyable-context.md)。
- `SessionViewport` 是本机面板发布的有界缩放/平移注意力状态；发布请求必须携带注入的 `PANEL_TOKEN`，服务端严格校验有限数值、范围、时间戳、`source: "human"` 与未知属性，AI 不能设置视口，视口不进入图形修订、时间线、bundle 或批准凭据，也不授权写入。详见 [ADR 0012](docs/ADR/0012-viewport-is-read-only-attention-context.md)。
- 面板写 API 需要注入在 HTML 中的本机随机 `PANEL_TOKEN`。
- 人类批准只签发 10 分钟一次性确认号；AI 必须在 `apply_visual_proposal` 中同时提供 `approval_id`、`approval_grant` 和过期时间。
- 所有提案都需要 `approvedBy: "human"`，且凭据验证通过后才会应用。
- 写入采用临时文件 + rename；失败时回滚已写入的文件。
- Mermaid 渲染调用本地 `mmdc`，请只渲染可信的 DSL 和 SVG；本项目不把外部 SVG 当作可执行代码求值。

## Disclosure

维护者确认问题后会尽快提供修复版本，并在 `CHANGELOG.md` 与发布说明中致谢报告者。
