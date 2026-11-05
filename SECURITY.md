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
- `SessionViewport` 是本机面板发布的有界缩放/平移注意力状态；严格校验有限数值、范围、时间戳、`source: "human"` 与未知属性，AI 不能设置视口，视口不进入图形修订、时间线、bundle 或批准凭据，也不授权写入。详见 [ADR 0012](docs/ADR/0012-viewport-is-read-only-attention-context.md)。
- 面板写 API 需要注入在 HTML 中的本机随机 `PANEL_TOKEN`。
- 人类批准只签发 10 分钟一次性确认号；AI 必须在 `apply_visual_proposal` 中同时提供 `approval_id`、`approval_grant` 和过期时间。
- 所有提案都需要 `approvedBy: "human"`，且凭据验证通过后才会应用。
- 写入采用临时文件 + rename；失败时回滚已写入的文件。
- Mermaid 渲染调用本地 `mmdc`，请只渲染可信的 DSL 和 SVG；本项目不把外部 SVG 当作可执行代码求值。

## Disclosure

维护者确认问题后会尽快提供修复版本，并在 `CHANGELOG.md` 与发布说明中致谢报告者。
