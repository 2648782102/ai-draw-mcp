# AI Draw MCP

> Give AI the power to draw — a universal MCP Server for diagram generation in IDEs.

让 AI 在 IDE 中拥有绘图能力。支持 Cursor、VS Code、Trae 及所有兼容 MCP 协议的工具。

## Features

- **9 drawing tools** — flowchart, sequence, architecture, class diagram, mindmap, custom Mermaid, SVG, and more
- **Structured input** — AI-friendly JSON parameters, no need to write raw DSL
- **Raw Mermaid** — full Mermaid DSL support for maximum flexibility
- **Live preview** — local HTTP server with WebSocket real-time updates
- **Universal** — works with any IDE that supports MCP (Cursor, VS Code, Trae, Windsurf…)

## Quick Start

### Install

```bash
cd cursor-draw-mcp
npm install
npm run build
```

### Configure in your IDE

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "ai-draw": {
      "command": "node",
      "args": ["d:/projects/cursor-draw-mcp/dist/index.js"]
    }
  }
}
```

**VS Code** (`settings.json`):

```json
{
  "mcp": {
    "servers": {
      "ai-draw": {
        "command": "node",
        "args": ["d:/projects/cursor-draw-mcp/dist/index.js"]
      }
    }
  }
}
```

### Development

```bash
npm run dev    # watch mode with tsx
```

## Tools

| Tool | Description |
|------|-------------|
| `render_diagram` | Render any Mermaid diagram from raw DSL |
| `render_flowchart` | Flowchart from structured nodes + edges |
| `render_sequence` | Sequence diagram from actors + messages |
| `render_architecture` | Architecture diagram from components + connections |
| `render_class_diagram` | UML class diagram from classes + relations |
| `render_mindmap` | Mindmap from a tree structure |
| `render_svg` | Free-form SVG drawing |
| `list_diagrams` | List all generated diagrams |
| `open_preview` | Open preview in browser |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PREVIEW_PORT` | `3399` | Preview server port |
| `OUTPUT_DIR` | `./output` | Diagram output directory |
| `DEFAULT_THEME` | `default` | Mermaid theme |
| `DEFAULT_FORMAT` | `svg` | Output format (svg/png) |
| `LOG_LEVEL` | `info` | Log level |

## License

MIT
