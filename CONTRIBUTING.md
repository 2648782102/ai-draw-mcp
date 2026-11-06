# Contributing to AI Draw MCP

感谢你参与 AI Draw MCP。项目面向人和 AI 的双向协作：AI 生成可视化，人通过面板修改、批注并确认变更提案。

## 开发环境

- Node.js >= 20
- npm >= 10
- 本地可用的 Chromium/Chrome；`mmdc` 依赖 Puppeteer 渲染 Mermaid

```bash
npm install
npm run build
npm test
npm run doctor
```

完整双向协作闭环可用临时工作区演示，不会修改仓库：

```bash
npm run build
node examples/collab-demo.mjs
```

如果本机 Chrome 不在 Puppeteer 缓存中：

```bash
export PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

## 开发约定

- 所有日志必须写 `stderr`，不能写 `stdout`：MCP 的 stdio 是 JSON-RPC 通道。
- 工具名用 `snake_case`，注册函数用 `registerXxx`，文件名用 `kebab-case`。
- 公共类型放在 `src/domain/types.ts`，配置类型放在 `src/infra/config.ts`。
- 工具通过 `src/tools/_shared.ts` 访问基础设施，不直接散落引用。
- 涉及项目文件写入的能力必须先形成提案、再由人类确认；禁止绕过 `src/domain/path-safety.ts`。
- 新增工具必须同步更新 `src/server.ts` 的 `TOOL_COUNT`、README、AGENTS.md 和测试。

## 提交 PR 前

1. `npm run lint`（当前等价于 TypeScript 严格检查）
2. `npm run build`
3. `npm test`（含领域契约测试：bundle、影响摘要、路径安全、内容哈希与一次性批准凭据）
4. `npm run test:examples:workflow`（CI 中的只读工作流示例）
5. `npm run repo:check`（文档、工具数量、端点与宣发文案防漂移）
6. `npm run doctor`
7. 更新文档与 `CHANGELOG.md`；可直接运行 `npm run check` 覆盖以上检查与 `npm pack --dry-run`

提交信息建议使用 Conventional Commits：`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`。

## AI Agent 协作

本仓库的 `AGENTS.md` 是给 AI coding agent 看的操作手册。修改架构或工具集后必须同步更新它，避免文档漂移。

## 安全边界

提案应用器只接受 UTF-8 文本文件的 `create`/`update`/`mkdir`，禁止删除、路径逃逸、`.git`、`node_modules`、`dist`、`.env*` 和锁文件。任何放宽边界的改动都需要在 PR 中说明威胁模型和测试。

只读投影（如 `SELECTION_SCOPE_JSON` 与 `SELECTION_WORKORDER_JSON`）不得携带项目文件内容、逐行 diff、可用批准凭据或工作区绝对路径；候选路径不是写入许可。`freshness` 等派生状态只可用于提示，不得悄悄刷新/清空选择或绕过人工确认。新增工具或 JSON 契约时，需同步更新 `SERVER_TOOL_COUNT`、能力清单、AGENTS、架构、安全、测试、示例和离线检查。
