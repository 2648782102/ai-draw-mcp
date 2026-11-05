# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
