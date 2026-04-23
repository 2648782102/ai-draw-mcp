# AI Draw — IDE 扩展（可选）

`ai-draw-panel` 在 **VS Code / Cursor** 里注册命令，用内置 **Simple Browser** 打开本机预览地址，便于在中间区域查看面板。

## 安装

1. 先启动 **ai-draw-mcp**（在 Cursor 里配置 MCP 后会随对话启动，或本地 `npm run build && node dist/index.js`）。
2. 在本目录安装并编译扩展：

```bash
cd extensions/ai-draw-panel
npm install
npm run compile
```

3. 在 VS Code / Cursor：**Extensions → … → Install from VSIX…**（需先 `vsce package` 打出 `.vsix`），或 **Run Extension Development Host** 调试。

开发时也可：**File → Open Folder** 打开 `extensions/ai-draw-panel`，按 `F5` 启动扩展开发宿主。

## 命令

- **AI Draw: Open Live Panel** — 打开 `http://127.0.0.1:3399/`
- **AI Draw: Open Diagram by ID** — 打开指定图表页

## 设置

- `aiDraw.previewPort` — 与 MCP 环境变量 `PREVIEW_PORT` 一致（默认 `3399`）
- `aiDraw.previewHost` — 默认 `127.0.0.1`
