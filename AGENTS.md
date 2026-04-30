# AGENTS.md — AI Agent 操作手册

本文件是给 AI coding agent（Cursor、GitHub Copilot 等）的操作手册。
人类阅读 README.md；AI 阅读本文件。

---

## 项目是什么

`ai-draw-mcp` 是一个 MCP Server，给 IDE 里的 AI 提供绘图能力。
AI 调用工具 → 渲染 Mermaid/SVG → 推送到本机预览面板（HTTP + WebSocket）。

---

## 目录地图

```
src/
├── index.ts              入口：启动预览服务，连接 MCP stdio
├── server.ts             组装根：创建所有实例，注册全部工具
├── tools/
│   ├── _shared.ts        工具共享层（必读）：ToolContext、渲染管道、响应格式化
│   ├── render-diagram.ts    工具：通用 Mermaid DSL
│   ├── render-flowchart.ts  工具：结构化流程图
│   ├── render-sequence.ts   工具：时序图
│   ├── render-architecture.ts 工具：架构/组件图
│   ├── render-class.ts      工具：UML 类图
│   ├── render-mindmap.ts    工具：思维导图
│   ├── render-svg.ts        工具：自由 SVG
│   ├── update-diagram.ts    工具：更新已有图
│   ├── delete-diagram.ts    工具：删除图
│   ├── list-diagrams.ts     工具：列出全部图
│   └── open-preview.ts      工具：在 IDE 中打开预览面板
└── infra/
    ├── config.ts         AppConfig + loadConfig + 全部类型定义（DiagramRecord 等）
    ├── store.ts          DiagramStore：内存 + JSON 文件持久化
    ├── renderer.ts       renderMermaidToSvg/Png, saveSvg, wrapSvg, svgToPng
    ├── preview-server.ts Express HTTP + WebSocket 预览服务
    ├── ide-opener.ts     openPanelInIDE：在 IDE 中打开 Simple Browser
    └── logger.ts         轻量 logger，写 stderr 避免污染 MCP stdio

extensions/ai-draw-panel/   可选 VS Code/Cursor 扩展，处理 vscode:// URI
scripts/doctor.mjs          环境自检脚本
test/smoke.test.mjs         集成冒烟测试
```

---

## 如何添加新工具（3 步）

### 第 1 步：新建 `src/tools/render-xxx.ts`

复制以下模板，按需修改 DSL 构建逻辑：

```typescript
import { z } from "zod";
import { nanoid } from "nanoid";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { renderMermaidAndRespond, errorResult, type ToolContext } from "./_shared.js";

export function registerRenderXxx(server: McpServer, ctx: ToolContext) {
  server.tool(
    "render_xxx",
    "工具描述：一句话说清楚用途和适用场景。",
    {
      title: z.string().optional(),
      // ← 在这里定义工具参数的 zod schema
      theme: z.enum(["default", "dark", "forest", "neutral"]).optional(),
      output_format: z.enum(["svg", "png"]).optional(),
    },
    async ({ title, theme, output_format, ...params }) => {
      const id = nanoid(10);
      try {
        // ← 在这里把 params 拼装成 Mermaid DSL 字符串
        const mermaidCode = buildDsl(params);
        return await renderMermaidAndRespond({
          id,
          title: title ?? `Xxx ${id}`,
          diagramType: "custom", // 或具体类型
          mermaidCode,
          theme: theme ?? ctx.config.defaultTheme,
          format: output_format ?? ctx.config.defaultFormat,
          ctx,
        });
      } catch (err) {
        return errorResult("render_xxx", err);
      }
    }
  );
}

function buildDsl(params: unknown): string {
  // ← 实现 DSL 拼装
  return "";
}
```

如果是纯 SVG 工具（不走 Mermaid），用 `renderSvgAndRespond` 替代 `renderMermaidAndRespond`。

### 第 2 步：在 `src/server.ts` 顶部加一行 import

```typescript
// ← ADD NEW TOOL IMPORT HERE
import { registerRenderXxx } from "./tools/render-xxx.js";
```

### 第 3 步：在 `src/server.ts` 的 `createServer()` 内加一行注册

```typescript
// ← ADD NEW TOOL REGISTRATION HERE
registerRenderXxx(mcp, ctx);
```

完成。工具数量常量 `TOOL_COUNT` 也要同步更新。

---

## infra/ 各文件职责速查

| 文件 | 导出的关键符号 | 何时修改 |
|------|--------------|---------|
| `config.ts` | `AppConfig`, `loadConfig()`, 所有 `interface`/`type` | 加环境变量、加类型定义 |
| `store.ts` | `DiagramStore` | 修改存储逻辑 |
| `renderer.ts` | `renderMermaidToSvg`, `renderMermaidToPng`, `saveSvg`, `wrapSvg`, `svgToPng` | 修改渲染引擎 |
| `preview-server.ts` | `PreviewServer` | 修改 HTTP 路由或 WebSocket 事件 |
| `ide-opener.ts` | `openPanelInIDE`, `resetPanelState` | 修改 IDE 检测或打开逻辑 |
| `logger.ts` | `logger` | 几乎不需要改 |

---

## tools/_shared.ts 导出速查

| 符号 | 类型 | 用途 |
|------|------|------|
| `ToolContext` | interface | 工具函数的第二个参数类型 |
| `renderMermaidAndRespond(opts)` | async fn | Mermaid 工具的完整管道（渲染→存储→通知→打开→响应） |
| `renderSvgAndRespond(opts)` | async fn | SVG 工具的完整管道 |
| `errorResult(toolName, err)` | fn | 统一错误响应格式 |
| `jsonLine(payload)` | fn | 生成供模型解析的 JSON 行 |
| `RenderOpts` | interface | `renderMermaidAndRespond` 的参数类型 |
| `SvgOpts` | interface | `renderSvgAndRespond` 的参数类型 |
| `ToolResult` | type | 工具返回值类型 |

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PREVIEW_PORT` | `3399` | 预览服务端口 |
| `PREVIEW_HOST` | `127.0.0.1` | 面板 URL 主机名 |
| `AI_DRAW_URI_AUTHORITY` | `2648782102.ai-draw-panel` | vscode:// URI authority；设为空字符串则禁用 |
| `OUTPUT_DIR` | `./output` | 图表输出目录（建议绝对路径） |
| `DEFAULT_THEME` | `default` | Mermaid 主题：default/dark/forest/neutral |
| `DEFAULT_FORMAT` | `svg` | 默认输出格式：svg/png |
| `LOG_LEVEL` | `info` | 日志级别：debug/info/warn/error |

---

## 关键约定

- 所有日志写 `stderr`，**禁止**写 `stdout`（会污染 MCP JSON-RPC 通道）
- 工具名用 `snake_case`，注册函数名用 `registerXxx`，文件名用 `kebab-case`
- 工具描述字符串面向 LLM：说清适用场景，提示何时用其他工具作替代
- `infra/` 的文件对工具层来说是黑盒，通过 `_shared.ts` 统一访问
- 新增类型定义放 `infra/config.ts`（不要新建类型文件）
