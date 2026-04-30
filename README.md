# AI Draw MCP

> Give AI the power to draw — MCP server + live editor panel for Cursor, VS Code, Trae, and other MCP hosts.

在 IDE 里为 AI 提供**流程图、时序图、架构图、类图、思维导图、任意 Mermaid、自由 SVG**，并推送到本机**可编辑预览面板**（HTTP + WebSocket）。

## Features

- **11 MCP tools** — 含 `delete_diagram` 与全套 render / list / open / update
- **双模式面板** — Mermaid 源码编辑 / **SVG 整文件编辑**（`render_svg` 生成的图自动走 SVG 模式）
- **离线预览** — 面板从本包 `node_modules/mermaid/dist` 加载 Mermaid，不依赖 jsDelivr CDN
- **实时预览** — 保存时 Mermaid 会重算并写回磁盘 SVG；工具返回中带 `JSON:` 行便于模型解析 ID 与路径
- **编辑器内打开** — 安装 `extensions/ai-draw-panel` 后，MCP 返回中的 **`vscode://2648782102.ai-draw-panel/open?url=...` 可点击**，由扩展在 **Simple Browser** 中打开（聊天里点普通 `http://` 链往往会打开**外置浏览器**）
- **可选 IDE 扩展** — `extensions/ai-draw-panel` 用 Simple Browser 一键打开面板（见 `extensions/README.md`）

## Quick Start

```bash
git clone https://github.com/2648782102/ai-draw-mcp.git
cd ai-draw-mcp
npm install
npm run build
npm run doctor   # 可选：自检 Node、mmdc、预览端口、OUTPUT_DIR 可写、本地 Mermaid 包
```

### MCP 配置（Cursor 示例）

`.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "ai-draw": {
      "command": "node",
      "args": ["D:/path/to/ai-draw-mcp/dist/index.js"],
      "env": {
        "PREVIEW_PORT": "3399",
        "OUTPUT_DIR": "D:/path/to/ai-draw-mcp/output"
      }
    }
  }
}
```

将 `args`、`OUTPUT_DIR` 换成你本机绝对路径。

### 在编辑器里打开面板

1. **命令面板** → `Simple Browser: Show` → 输入 `http://127.0.0.1:3399/`
2. 或安装 **`extensions/ai-draw-panel`** 后使用命令 **「AI Draw: Open Live Panel」**（见 `extensions/README.md`）
3. AI 首次 `render_*` 时也会尝试通过本机 **Cursor/VS Code `--open-url`** 打开（见下方故障排除）

## Tools

| Tool | Description |
|------|-------------|
| `render_diagram` | 任意 Mermaid DSL → 面板 |
| `render_flowchart` | 结构化流程图 |
| `render_sequence` | 时序图 |
| `render_architecture` | 架构 / 组件图 |
| `render_class_diagram` | UML 类图 |
| `render_mindmap` | 思维导图 |
| `render_svg` | 自由 SVG（面板左侧为 SVG 源码）；可选 `output_format: png`（sharp 从 SVG 导出） |
| `update_diagram` | 按 ID 更新已有 Mermaid 图 |
| `delete_diagram` | 按 ID 删除磁盘上的 SVG/PNG 与清单，并通知面板刷新 |
| `list_diagrams` | 列出已生成图表（返回中含 `JSON:` 摘要） |
| `open_preview` | 在 IDE 中打开预览面板（可 deep-link 到指定图） |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PREVIEW_PORT` | `3399` | 预览服务端口 |
| `PREVIEW_HOST` | `127.0.0.1` | 工具返回里「面板」URL 使用的主机名，与扩展 `aiDraw.previewHost` 一致 |
| `AI_DRAW_URI_AUTHORITY` | `2648782102.ai-draw-panel` | 生成 `vscode://<authority>/open?url=...`；设为空字符串则关闭该链，仅 `http` + `open_preview` |
| `OUTPUT_DIR` | `./output` | 输出目录（建议绝对路径） |
| `DEFAULT_THEME` | `default` | Mermaid 主题 |
| `DEFAULT_FORMAT` | `svg` | Mermaid 类工具默认输出；`png` 时 Mermaid 走 mmdc，`render_svg` 走 sharp |
| `LOG_LEVEL` | `info` | `debug` / `info` / `warn` / `error` |

## 故障排除

### 端口被占用

报错或预览打不开：换一个端口，例如 `PREVIEW_PORT=3400`，并同步修改扩展里的 `aiDraw.previewPort`。

### `mmdc` / 渲染失败

- 在项目根目录执行 **`npm run doctor`**，确认 `mmdc` 存在且可运行。
- Windows 下需能拉起 Puppeteer 自带的 Chromium（首次可能较慢）。

### 中文在 PNG 里方块

Mermaid 的 PNG 由 **mmdc（Chromium）** 生成；**`render_svg` 的 PNG** 由 **sharp** 从 SVG 栅格化。非法 `DEFAULT_THEME` / `DEFAULT_FORMAT` 会在启动时回退为 default/svg 并打日志。

### Git SSH：`Host key verification failed`

换用 HTTPS 远程，或在本机执行 `ssh -T git@github.com` 按提示接受 `known_hosts`。

### 聊天里点的链接打开外置浏览器

Cursor/Chat 中 **`http://127.0.0.1:...` 可点击链** 常由系统走 **Chrome/Edge**，不会进 Simple Browser。请任选：**安装本仓库扩展**后点返回中的 **`vscode://2648782102.ai-draw-panel/open?url=...`**；或 **Ctrl+Shift+P** → `Simple Browser: Show` 粘贴同一条 `http://` 地址；或让 AI 调用 **`open_preview`**。

### 自动打开浏览器而非 Simple Browser

本仓库会依次尝试：`Cursor.exe`/`Code.exe` **`--open-url`** → PATH 中的 `cursor`/`code` → 系统默认打开。若仍在外置浏览器，请用扩展命令或手动 **Simple Browser**。

## License

MIT
