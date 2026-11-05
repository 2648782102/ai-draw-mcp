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
- 面板写 API 需要注入在 HTML 中的本机随机 `PANEL_TOKEN`。
- 人类批准只签发 10 分钟一次性确认号；AI 必须在 `apply_visual_proposal` 中同时提供 `approval_id`、`approval_grant` 和过期时间。
- 所有提案都需要 `approvedBy: "human"`，且凭据验证通过后才会应用。
- 写入采用临时文件 + rename；失败时回滚已写入的文件。
- Mermaid 渲染调用本地 `mmdc`，请只渲染可信的 DSL 和 SVG；本项目不把外部 SVG 当作可执行代码求值。

## Disclosure

维护者确认问题后会尽快提供修复版本，并在 `CHANGELOG.md` 与发布说明中致谢报告者。
