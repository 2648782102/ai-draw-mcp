# AI Draw MCP — 技术方案与开发计划

> 让 AI 在 IDE 中拥有绘图能力的 MCP Server 插件

## 1. 项目定位

一个通用的 **MCP (Model Context Protocol) Server**，为 AI 提供图表绘制能力。兼容所有支持 MCP 协议的 IDE：

- **Cursor**
- **VS Code** (通过 Copilot MCP 支持)
- **Trae**
- **Windsurf**
- 以及其他支持 MCP 的工具

AI 可以在对话过程中调用绘图工具，将架构设计、流程逻辑、类关系等以图形方式实时呈现，而不仅仅是文字描述。

## 2. 整体架构

```
┌─────────────────────────────────────────────────┐
│               IDE (Cursor / VS Code / Trae)     │
│  ┌───────────┐     stdio      ┌───────────────┐ │
│  │  AI Agent  │◄─────────────►│  MCP Server    │ │
│  │ (Claude等) │  JSON-RPC     │  ai-draw-mcp   │ │
│  └───────────┘               └───────┬───────┘  │
│                                       │          │
└───────────────────────────────────────┼──────────┘
                                        │
                          ┌─────────────▼──────────────┐
                          │      Rendering Engine       │
                          │  ┌─────────┐ ┌───────────┐ │
                          │  │ Mermaid │ │ SVG Direct│ │
                          │  └────┬────┘ └─────┬─────┘ │
                          │       └──────┬─────┘       │
                          │              ▼             │
                          │    ┌──────────────────┐    │
                          │    │  Output (SVG/PNG) │    │
                          │    └────────┬─────────┘    │
                          └─────────────┼──────────────┘
                                        │
                          ┌─────────────▼──────────────┐
                          │     Preview Server          │
                          │  HTTP + WebSocket (实时刷新) │
                          │  http://localhost:3399      │
                          └────────────────────────────┘
```

## 3. 技术栈

| 层级 | 技术 | 版本 | 理由 |
|------|------|------|------|
| MCP 协议 | `@modelcontextprotocol/sdk` | ^1.12 | 官方 SDK，稳定版，所有 IDE 均支持 |
| 图表引擎 | `@mermaid-js/mermaid-cli` | ^11.4 | Mermaid 官方 CLI，支持 10+ 种图表类型 |
| SVG 处理 | 原生 SVG 生成 | - | 自由绘制任意图形 |
| 图片导出 | `sharp` | ^0.33 | SVG → PNG 转换，轻量高性能 |
| 预览服务 | `express` + `ws` | ^5 / ^8 | HTTP 预览 + WebSocket 实时推送 |
| 数据校验 | `zod` | ^3.24 | 工具参数 schema 定义 |
| 语言 | TypeScript | ^5.8 | 类型安全 |
| 运行时 | Node.js | >=20 | LTS，稳定 |

## 4. 项目结构

```
cursor-draw-mcp/
├── package.json                  # 项目配置 & 依赖
├── tsconfig.json                 # TypeScript 配置
├── README.md                     # 使用说明
├── PLAN.md                       # 本文件 — 技术方案
│
├── src/
│   ├── index.ts                  # 入口：启动 MCP Server + Preview Server
│   ├── server.ts                 # MCP Server 初始化 & 工具注册
│   │
│   ├── tools/                    # MCP 工具定义（AI 调用的接口）
│   │   ├── index.ts              # 统一导出
│   │   ├── render-diagram.ts     # 通用 Mermaid 渲染（原始 DSL）
│   │   ├── render-flowchart.ts   # 流程图（结构化 JSON 输入）
│   │   ├── render-sequence.ts    # 时序图（结构化 JSON 输入）
│   │   ├── render-architecture.ts # 架构图（结构化 JSON 输入）
│   │   ├── render-class.ts       # UML 类图（结构化 JSON 输入）
│   │   ├── render-mindmap.ts     # 思维导图（树形结构输入）
│   │   ├── render-svg.ts         # 自由 SVG 绘制
│   │   ├── list-diagrams.ts      # 列出已生成的图表
│   │   └── open-preview.ts       # 打开浏览器预览
│   │
│   ├── renderer/                 # 渲染引擎
│   │   ├── index.ts              # 统一导出
│   │   ├── mermaid-renderer.ts   # Mermaid DSL → SVG
│   │   ├── svg-builder.ts        # SVG 包装工具
│   │   └── exporter.ts           # SVG → PNG 导出
│   │
│   ├── preview/                  # 预览服务
│   │   ├── preview-server.ts     # Express HTTP + WebSocket
│   │   └── templates/
│   │       └── index.html        # 预览页面（深色主题、实时刷新）
│   │
│   ├── storage/                  # 图表存储
│   │   └── diagram-store.ts      # 图表元数据 + 文件管理
│   │
│   └── utils/                    # 公共工具
│       ├── types.ts              # 类型定义
│       ├── config.ts             # 配置管理（环境变量）
│       └── logger.ts             # 日志（写 stderr，不污染 stdio）
│
├── output/                       # 生成的图表输出目录
│   └── .gitkeep
│
└── test/                         # 测试
    └── (待添加)
```

## 5. MCP 工具一览

共 **9 个工具**，分三类：

### 5.1 通用渲染（最灵活）

| 工具 | 描述 | 输入 |
|------|------|------|
| `render_diagram` | 渲染任意 Mermaid 图表 | 原始 Mermaid DSL 代码 |
| `render_svg` | 自由 SVG 绘制 | 原始 SVG 元素标记 |

### 5.2 结构化渲染（对 AI 更友好）

| 工具 | 描述 | 输入 |
|------|------|------|
| `render_flowchart` | 流程图 | nodes[] + edges[] |
| `render_sequence` | 时序图 | actors[] + messages[] |
| `render_architecture` | 架构图 | components[] + connections[] |
| `render_class_diagram` | UML 类图 | classes[] + relations[] |
| `render_mindmap` | 思维导图 | root node（树形嵌套） |

### 5.3 管理工具

| 工具 | 描述 |
|------|------|
| `list_diagrams` | 查看所有已生成的图表 |
| `open_preview` | 在浏览器中打开预览 |

## 6. 各 IDE 接入配置

### Cursor

`.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "ai-draw": {
      "command": "node",
      "args": ["/path/to/cursor-draw-mcp/dist/index.js"],
      "env": {
        "PREVIEW_PORT": "3399"
      }
    }
  }
}
```

### VS Code

`settings.json`:
```json
{
  "mcp": {
    "servers": {
      "ai-draw": {
        "command": "node",
        "args": ["/path/to/cursor-draw-mcp/dist/index.js"],
        "env": {
          "PREVIEW_PORT": "3399"
        }
      }
    }
  }
}
```

### Trae

Trae MCP 配置文件（路径视操作系统而定）:
```json
{
  "mcpServers": {
    "ai-draw": {
      "command": "node",
      "args": ["/path/to/cursor-draw-mcp/dist/index.js"],
      "env": {
        "PREVIEW_PORT": "3399"
      }
    }
  }
}
```

### npx 方式（发布到 npm 后）

```json
{
  "mcpServers": {
    "ai-draw": {
      "command": "npx",
      "args": ["ai-draw-mcp"]
    }
  }
}
```

## 7. 环境变量配置

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `PREVIEW_PORT` | `3399` | 预览服务端口 |
| `OUTPUT_DIR` | `./output` | 图表输出目录 |
| `DEFAULT_THEME` | `default` | Mermaid 主题 (default/dark/forest/neutral) |
| `DEFAULT_FORMAT` | `svg` | 默认输出格式 (svg/png) |
| `LOG_LEVEL` | `info` | 日志级别 (debug/info/warn/error) |

## 8. 开发阶段计划

### P0 — 核心链路（1-2 天）✅ 骨架已搭建

- [x] 项目骨架、配置文件
- [x] MCP Server 初始化 & stdio 传输
- [x] `render_diagram` 通用 Mermaid 渲染
- [x] 基础预览服务
- [ ] 安装依赖、编译验证
- [ ] 端到端测试（IDE 中实际调用）

### P1 — 结构化工具（2-3 天）✅ 骨架已搭建

- [x] `render_flowchart` 流程图
- [x] `render_sequence` 时序图
- [x] `render_architecture` 架构图
- [x] `render_class_diagram` 类图
- [x] `render_mindmap` 思维导图
- [ ] 各工具单元测试

### P2 — 预览增强（1-2 天）

- [x] WebSocket 实时刷新
- [x] 图表画廊页面
- [ ] 缩放、拖拽、全屏
- [ ] SVG / PNG 下载

### P3 — 扩展图表类型（2 天）

- [ ] 状态机图 `render_state_diagram`
- [ ] ER 图 `render_er_diagram`
- [ ] 甘特图 `render_gantt`
- [ ] 饼图 `render_pie`
- [ ] 时间线 `render_timeline`

### P4 — 完善与发布（1-2 天）

- [ ] 主题系统完善
- [ ] PNG 导出优化
- [ ] 错误处理增强
- [ ] 完整的 README 文档
- [ ] npm 发布

### P5 — 未来方向

- [ ] VS Code 扩展 — 在编辑器内嵌入预览面板
- [ ] 图表编辑能力 — AI 修改已有图表
- [ ] 图表模板系统 — 常用图表模板
- [ ] 协作标注 — 在图上添加注释
- [ ] Streamable HTTP 传输 — 支持远程部署

## 9. 工作流示例

### 场景 1：分析项目架构

> **用户**："帮我分析一下这个项目的架构"
>
> **AI**：分析代码后，调用 `render_architecture` → 生成架构图 → 图片直接显示在对话中

### 场景 2：解释函数流程

> **用户**："这个函数的执行流程是什么？"
>
> **AI**：调用 `render_flowchart` → 画出执行流程图

### 场景 3：设计类结构

> **用户**："帮我设计一个用户认证模块的类结构"
>
> **AI**：调用 `render_class_diagram` → 生成 UML 类图

### 场景 4：梳理接口调用

> **用户**："前端调用后端的登录流程是怎样的？"
>
> **AI**：调用 `render_sequence` → 生成时序图

## 10. 设计原则

1. **通用性** — 基于标准 MCP 协议 + stdio 传输，不依赖任何特定 IDE
2. **双模式** — 同时提供「原始 DSL」和「结构化 JSON」输入方式，兼顾灵活性和易用性
3. **实时性** — WebSocket 推送，生成即可见
4. **渐进式** — 从核心功能出发，逐步扩展图表类型和交互能力
5. **零配置** — 开箱即用，所有参数都有合理默认值
