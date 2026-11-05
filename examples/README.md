# Examples

These examples are intentionally small and contain no secrets or absolute paths.

- `mcp-config/cursor.json` — Cursor MCP server configuration for local development.
- `mcp-config/stdio.json` — generic stdio configuration shape.
- `mermaid/login-flow.mmd` — a Mermaid flowchart for `render_diagram`.
- `svg/badge.svg` — an SVG fragment for `render_svg`.
- `node-client.mjs` — a minimal MCP client that lists tools and renders an example diagram.
- `collab-demo.mjs` — an end-to-end collaboration demo in a temporary workspace.
- `agent-workflow.mjs` — a reproducible read-only workflow: ordered steps → template draft → preflight, without creating a proposal or writing files.
- `get_node_context` — a read-only MCP tool for one focused node's evidence, threads, edges, graph diffs, and focus state; available after `scan_project`.
- `get_shared_brief` — a read-only `BRIEF_JSON` handoff tool for readiness blockers, bounded intent, stale threads, latest graph diff, evidence, and next actions; `agent-workflow.mjs` verifies it before preflight.
- `get_decision_trail` — a read-only `DECISION_TRAIL_JSON` chronology linking human intent, graph diffs, bounded proposal change summaries, proposal stages, gaps, and activity events; `agent-workflow.mjs` verifies its no-grant boundary before preflight. It does not replace the full line diff.
- `BRIEF_JSON.viewport` — bounded human zoom/pan attention context; it is read-only and never becomes a graph revision, timeline event, bundle field, or approval grant.
- `EXPORT_MANIFEST_JSON` — a derived, credential-free inventory attached to downloaded session bundles; it lists counts, exclusions, and read-only safety flags, and is not required for strict bundle import.
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
