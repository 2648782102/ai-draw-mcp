# AI Draw MCP

> 给 AI 画图能力 — MCP Server + 实时可编辑预览面板，适配 Cursor、VS Code、Trae 等所有 MCP 宿主。

在 IDE 里让 AI 一句话生成**流程图、时序图、架构图、类图、思维导图、任意 Mermaid DSL、自由 SVG**，并实时推送到本机预览面板。

<p align="center">
  <a href="https://www.npmjs.com/package/ai-draw-mcp">
    <img src="https://img.shields.io/npm/v/ai-draw-mcp?style=flat-square" alt="npm">
  </a>
  <a href="https://www.npmjs.com/package/ai-draw-mcp">
    <img src="https://img.shields.io/npm/dm/ai-draw-mcp?style=flat-square" alt="downloads">
  </a>
  <a href="https://github.com/2648782102/ai-draw-mcp">
    <img src="https://img.shields.io/github/stars/2648782102/ai-draw-mcp?style=social" alt="stars">
  </a>
</p>

---

## 预览

![AI Draw MCP 预览面板](docs/preview-panel.png)

预览面板支持：滚轮缩放、拖拽平移、右下角小地图导航、双击重置、适应窗口（`F` 键）、明暗背景切换、SVG/PNG 导出。

---

## 功能

- **11 个 MCP 工具** — 覆盖绘图全场景：`render_flowchart`、`render_sequence`、`render_architecture`、`render_class_diagram`、`render_mindmap`、`render_diagram`（通用 DSL）、`render_svg`、`update_diagram`、`delete_diagram`、`list_diagrams`、`open_preview`
- **实时双向面板** — AI 绘图后通过 WebSocket 推送到面板；面板里也可手动编辑源码、实时预览、保存回磁盘
- **双模式编辑器** — Mermaid DSL 模式 / SVG 全文本模式（`render_svg` 生成的图自动切换到 SVG 模式）
- **小地图导航** — 右下角缩略图，支持点击/拖拽直接跳转视口
- **流畅缩放平移** — 滚轮缩放（以鼠标为锚点）、左键拖拽平移、不卡顿不模糊（纯矢量渲染）
- **离线 Mermaid** — 面板从本包 `node_modules/mermaid/dist` 加载，不依赖 CDN
- **SVG & PNG 输出** — 渲染结果同时落盘为 `.svg`；配置 `DEFAULT_FORMAT=png` 或工具参数 `output_format: png` 也输出 PNG（Mermaid 走 mmdc，SVG 走 sharp）

---

## 快速开始

### 方式一：通过 npm 安装（推荐）

```bash
npm install -g ai-draw-mcp
```

然后直接在 MCP 配置里使用：

```json
{
  "mcpServers": {
    "ai-draw": {
      "command": "npx",
      "args": ["ai-draw-mcp"],
      "env": {
        "OUTPUT_DIR": "./output"
      }
    }
  }
}
```

### 方式二：从源码安装

```bash
git clone https://github.com/2648782102/ai-draw-mcp.git
cd ai-draw-mcp
npm install
npm run build
```

可选自检（验证 Node 版本、mmdc、端口、输出目录）：

```bash
npm run doctor
```

配置到 Cursor（或其他 IDE）：

```json
{
  "mcpServers": {
    "ai-draw": {
      "command": "node",
      "args": ["D:/path/to/ai-draw-mcp/dist/index.js"],
      "env": {
        "PREVIEW_PORT": "3399",
        "OUTPUT_DIR": "D:/path/to/output"
      }
    }
  }
}
```

> 将 `args[0]` 和 `OUTPUT_DIR` 替换为你本机的**绝对路径**。Windows 路径用正斜杠或双反斜杠均可。

### 配置到其他 MCP 宿主

任何支持 `stdio` 传输的 MCP 宿主都可以接入，使用 `npx ai-draw-mcp` 最简单：

**VS Code（`settings.json`）**：

```json
"mcp.servers": {
  "ai-draw": {
    "type": "stdio",
    "command": "npx",
    "args": ["ai-draw-mcp"],
    "env": { "OUTPUT_DIR": "./output" }
  }
}
```

**Windsurf（`~/.codeium/windsurf/mcp_config.json`）**：

```json
{
  "mcpServers": {
    "ai-draw": {
      "command": "npx",
      "args": ["ai-draw-mcp"],
      "env": { "OUTPUT_DIR": "./output" }
    }
  }
}
```

**Claude Desktop（`~/Library/Application Support/Claude/claude_desktop_config.json` 或 Windows `%APPDATA%/Claude/claude_desktop_config.json`）**：

```json
{
  "mcpServers": {
    "ai-draw": {
      "command": "npx",
      "args": ["ai-draw-mcp"],
      "env": { "OUTPUT_DIR": "./output" }
    }
  }
}
```

> Claude Desktop 没有内置浏览器，面板地址需手动在浏览器中打开。

**Zed（`~/.config/zed/settings.json`）**：

```json
{
  "context_servers": {
    "ai-draw": {
      "command": {
        "path": "npx",
        "args": ["ai-draw-mcp"],
        "env": { "OUTPUT_DIR": "./output" }
      }
    }
  }
}
```

**Trae（`~/.trae/mcp.json`）**：

```json
{
  "mcpServers": {
    "ai-draw": {
      "command": "npx",
      "args": ["ai-draw-mcp"],
      "env": { "OUTPUT_DIR": "./output" }
    }
  }
}
```

> 运行 `npm run doctor` 可以自动检测本机已安装的编辑器及对应配置文件位置。

### 3. 打开预览面板

配置好 MCP 后，有三种方式打开面板：

| 方式 | 操作 |
|---|---|
| **AI 自动打开** | 让 AI 调用任意 `render_*` 工具，首次渲染后会自动尝试打开面板 |
| **命令面板** | `Ctrl+Shift+P` → `Simple Browser: Show` → 输入 `http://127.0.0.1:3399/` |
| **MCP 工具** | 在 AI 对话里说「打开预览面板」，AI 调用 `open_preview` |

### 4. 开始绘图

直接在 Cursor Chat 或任意 AI 对话里输入自然语言：

```
画一个用户注册的流程图
帮我画 Redis 缓存架构图
用时序图描述 OAuth 2.0 登录流程
```

AI 会自动选择合适的工具，生成图表并推送到面板。

---

## 工具列表

| 工具 | 用途 |
|------|------|
| `render_diagram` | 任意 Mermaid DSL 直接渲染 |
| `render_flowchart` | 流程图（自动生成 `flowchart TD` DSL）|
| `render_sequence` | 时序图（自动生成 `sequenceDiagram` DSL）|
| `render_architecture` | 架构 / 组件图（`block-beta` DSL）|
| `render_class_diagram` | UML 类图（`classDiagram` DSL）|
| `render_mindmap` | 思维导图（`mindmap` DSL）|
| `render_svg` | 自由 SVG — 直接传入 SVG 源码，面板进入 SVG 编辑模式 |
| `update_diagram` | 按 ID 更新已有图（重新渲染 + 推送） |
| `delete_diagram` | 按 ID 删除磁盘文件 + 通知面板 |
| `list_diagrams` | 列出全部已生成图表（含 ID、类型、路径） |
| `open_preview` | 在 IDE 中打开预览面板，可 deep-link 到指定图 |

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PREVIEW_PORT` | `3399` | 预览服务端口 |
| `PREVIEW_HOST` | `127.0.0.1` | 面板地址主机名 |
| `OUTPUT_DIR` | `./output` | 图表输出目录（**建议绝对路径**） |
| `DEFAULT_THEME` | `default` | Mermaid 主题：`default` / `dark` / `forest` / `neutral` |
| `DEFAULT_FORMAT` | `svg` | 默认输出格式：`svg` / `png` |
| `LOG_LEVEL` | `info` | 日志级别：`debug` / `info` / `warn` / `error` |

---

## 面板快捷操作

| 操作 | 效果 |
|---|---|
| 滚轮 | 以鼠标为中心缩放 |
| 左键拖拽 | 平移画布 |
| 双击画布 | 重置为 1:1 |
| `F` 键 | 适应窗口 |
| `0` 键 | 重置为 100% |
| `⊡` 按钮 | 适应窗口 |
| 右下角小地图 | 点击/拖拽跳转视口 |
| `Ctrl+Enter` | 手动触发重新渲染 |
| `Ctrl+S` | 保存当前编辑到磁盘 |

---

## 故障排除

**端口被占用**：改 `PREVIEW_PORT`，例如 `3400`。

**`mmdc` 渲染失败**：执行 `npm run doctor` 自检；Windows 下需要 Puppeteer 能拉起 Chromium。

**面板空白 / JS 报错**：重启 MCP（Cursor 设置里把 `ai-draw` 关掉再开启），再刷新面板页。

**PNG 中文方块**：需系统有中文字体；或改用 `DEFAULT_FORMAT=svg` 避免 mmdc 栅格化。

---

## License

MIT
