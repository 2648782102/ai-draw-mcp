# Examples

These examples are intentionally small and contain no secrets or absolute paths.

- `mcp-config/cursor.json` — Cursor MCP server configuration for local development.
- `mcp-config/stdio.json` — generic stdio configuration shape.
- `mermaid/login-flow.mmd` — a Mermaid flowchart for `render_diagram`.
- `svg/badge.svg` — an SVG fragment for `render_svg`.
- `node-client.mjs` — a minimal MCP client that lists tools and renders an example diagram.
- `collab-demo.mjs` — an end-to-end collaboration demo in a temporary workspace.
- `agent-workflow.mjs` — a reproducible read-only workflow: ordered steps → template draft → preflight, without creating a proposal or writing files.
- `collaboration-workflow.md` — a human ↔ AI walkthrough for scanning, annotating, approving, and applying a proposal.

Run the client after `npm run build`:

```bash
node examples/node-client.mjs
```

Run the full collaboration loop without touching your own project:

```bash
node examples/collab-demo.mjs
```

Run the read-only agent workflow example, which stops before proposal creation and is also executed by CI:

```bash
npm run test:examples:workflow
```

For the bidirectional workflow, follow [collaboration-workflow.md](collaboration-workflow.md).

Set `PUPPETEER_EXECUTABLE_PATH` if `mmdc` cannot find a local Chrome/Chromium.
