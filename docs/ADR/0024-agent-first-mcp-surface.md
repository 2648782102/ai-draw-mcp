# ADR 0024: Agent-first MCP surface with an optional human panel

## Status

Accepted. Refines ADR 0022 for the AI interaction channel and ADR 0023 for the panel's role.

## Context

The project is a shared visual communication board between a person and an AI. Earlier rendering tools automatically opened an IDE or browser panel after every generated asset, which made the browser feel like the product's entry point. That is the wrong hierarchy for a tool used inside coding agents: the agent should discover tools, inspect structured graph context, and continue its work through MCP without causing window side effects. Official OpenAI documentation describes MCP servers as exposing tools, resources, prompts, and instructions, with custom UI resources optional; Codex shares MCP configuration between the CLI and IDE extension.

At the same time, a person still needs a local surface to see the shared graph, correct visual understanding, review complete diffs, and approve a specific proposal. Removing the HTTP panel entirely would weaken the product's human half.

## Decision

- MCP stdio is the default AI-facing product surface. The server publishes initialization instructions and read-only `ai-draw://board/*` resources for session, brief, capabilities, diagnostics, and the optional panel URL.
- Generated tools and `scan_project` default to no browser or IDE opening. `open_preview`, `scan_project(open_panel: true)`, and `AI_DRAW_AUTO_OPEN_PANEL=1` are explicit opt-in paths for a person who wants the canvas.
- Resource payloads are derived from the existing version 1 session. Approved proposals are downgraded, one-time approval fields and credential-like metadata are excluded, and ephemeral selection/viewport/history state is omitted. Resources never issue approval grants or write project files.
- The local HTTP panel remains a thin human review and correction surface. It is not the default agent workflow, a general chat product, or a required step for consuming MCP output.
- The 26 tool names, schemas, version 1 persisted contracts, full diff review, one-time receipt, path safety, and `SessionStore.applyProposal()` boundary remain unchanged.

## Consequences

- An agent can use AI Draw MCP naturally inside Codex or another MCP host: `get_capabilities` or resources for discovery, `scan_project` for a graph, `get_visual_context` / `reply_to_visual_context` for shared intent, and proposal tools for approved writes.
- Normal tool calls no longer switch focus to a browser or Simple Browser tab. A human can still open the canvas on demand through `open_preview` or the optional localhost URL.
- MCP resources provide a second read-only discovery path that complements `tools/list` and `CAPABILITIES_JSON`; they are projections, not a second source of truth.
- Browser and IDE-opening logic remains available as a compatibility layer, but it is no longer on the default path. `AI_DRAW_AUTO_OPEN_PANEL` is a host-level legacy preference, not project state.

## Safety consequence

Making the agent surface primary does not grant the agent new authority. All project writes still require a proposal, a human-reviewed complete diff, explicit human approval, a one-time receipt, path validation, and `SessionStore.applyProposal()`. The resources deliberately exclude live credentials and never replace the full diff shown before approval.
