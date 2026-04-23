# AI Draw MCP

> Give AI the power to draw — MCP server + live editor panel for Cursor, VS Code, Trae, and other MCP hosts.

在 IDE 里为 AI 提供**流程图、时序图、架构图、类图、思维导图、任意 Mermaid、自由 SVG**，并推送到本机**可编辑预览面板**（HTTP + WebSocket）。

## Features

- **10 MCP tools** — `render_diagram`, `render_flowchart`, `render_sequence`, `render_architecture`, `render_class_diagram`, `render_mindmap`, `render_svg`, `update_diagram`, `list_diagrams`, `open_preview`
- **双模式面板** — Mermaid 源码编辑 / **SVG 整文件编辑**（`render_svg` 生成的图自动走 SVG 模式）
- **实时预览** — 保存时 Mermaid 会重算并写回磁盘 SVG
- **可选 IDE 扩展** — `extensions/ai-draw-panel` 用 Simple Browser 一键打开面板（见 `extensions/README.md`）

## Quick Start

```bash
git clone https://github.com/2648782102/ai-draw-mcp.git
cd ai-draw-mcp
npm install
npm run build
npm run doctor   # 可选：自检 Node、mmdc、构建产物
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
| `render_svg` | 自由 SVG（面板左侧为 SVG 源码） |
| `update_diagram` | 按 ID 更新已有 Mermaid 图 |
| `list_diagrams` | 列出已生成图表 |
| `open_preview` | 强制在 IDE 中尝试打开预览 |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PREVIEW_PORT` | `3399` | 预览服务端口 |
| `OUTPUT_DIR` | `./output` | 输出目录（建议绝对路径） |
| `DEFAULT_THEME` | `default` | Mermaid 主题 |
| `DEFAULT_FORMAT` | `svg` | 服务端导出 `png` 时用 mmdc 生成 PNG |
| `LOG_LEVEL` | `info` | `debug` / `info` / `warn` / `error` |

## 故障排除

### 端口被占用

报错或预览打不开：换一个端口，例如 `PREVIEW_PORT=3400`，并同步修改扩展里的 `aiDraw.previewPort`。

### `mmdc` / 渲染失败

- 在项目根目录执行 **`npm run doctor`**，确认 `mmdc` 存在且可运行。
- Windows 下需能拉起 Puppeteer 自带的 Chromium（首次可能较慢）。

### 中文在 PNG 里方块

PNG 由 **mmdc（Chromium）** 生成，一般正常；若用其他工具把 SVG 转 PNG，可能缺字体。优先用工具参数 `output_format: "png"` 走内置路径。

### Git SSH：`Host key verification failed`

换用 HTTPS 远程，或在本机执行 `ssh -T git@github.com` 按提示接受 `known_hosts`。

### 自动打开浏览器而非 Simple Browser

本仓库会依次尝试：`Cursor.exe`/`Code.exe` **`--open-url`** → PATH 中的 `cursor`/`code` → 系统默认打开。若仍在外置浏览器，请用扩展命令或手动 **Simple Browser**。

## License

MIT
