# ADR 0020: The MCP tool is the primary product

## Status

Accepted

## Context

The project accumulated a rich local panel with messages, annotation threads, activity timelines, workflow hints, review readiness, status rails, and several visual systems. Those surfaces are useful, but describing the product as a "human ↔ AI collaboration workspace" or "dialogue bridge" makes the UI sound like the primary product and encourages a chat or workflow application to grow around it.

The user clarified the intended shape: `ai-draw-mcp` is a tool used directly by an AI. Its job is to help an AI communicate its understanding of a project and to help a person correct that understanding with low-friction visual signals. It must not become a strong-subject conversation product, a hosted whiteboard, or a human/AI chat application.

## Decision

The primary product is the MCP-native, machine-readable tool surface:

- An AI client calls MCP stdio tools directly. `get_capabilities`, `scan_project`, `get_visual_context`, node/selection/workorder projections, source evidence, and the read-only diagnostics are the principal API.
- Visual graphs, source evidence, focus, selection, annotations, messages, graph diffs, decision trails, and proposal diffs are **context signals** for the AI. They are not a separate conversation state machine and do not make the panel the product.
- The local browser panel is a thin assistive surface: it lets a person inspect what the AI expressed, make small visual corrections, attach evidence-like notes, review a full line diff, and issue explicit human authorization. It should stay lightweight, local, and read-only by default.
- Existing messages and annotation replies remain available as bounded context signals that an AI can consume through `get_visual_context`, `BRIEF_JSON`, and related projections. The panel does not expose a chat-send action or a human reply composer; a local correction draft is copied to the clipboard and pasted into the AI client. They must not be framed as a primary chat experience, next-actor queue, or required workflow for humans.
- Human approval is a safety gate, not the product's social loop: only a human-reviewed full diff, explicit approval, and a one-time receipt can lead to `apply_visual_proposal` writing project files.
- Public copy, the first-run experience, roadmap, and capability descriptions should lead with "AI-callable tools and structured context"; the panel is described as a local helper, not as a collaboration workspace.

This ADR does not remove any version 1 protocol field, change any of the 26 MCP tools, or alter `apply_visual_proposal`. It is a product-boundary decision that constrains future UI and documentation work.

## Alternatives considered

- **Build a full human ↔ AI dialogue bridge:** rejected because it makes conversation state and UI workflow the strong subject, shifting focus away from the AI client's tool loop.
- **Make the visual workspace the shared language:** rejected because a canvas is a projection of AI-consumable context, not the product boundary.
- **Remove messages and annotation threads entirely:** rejected because existing sessions and machine-readable projections rely on them; abruptly deleting version 1 fields would be protocol drift. Framing, visible chat affordances, and future expansion are corrected instead.
- **Rename the package solely around diagrams:** rejected because proposals, path safety, evidence, and human approval are part of the tool contract even though rendering is not the product subject.

## Consequences

- README, About/description, architecture, AGENTS, roadmap, goal-mode guidance, competitive positioning, and first-run copy must describe an AI-first MCP tool with a thin assistive panel.
- New UI work should be judged by whether it reduces ambiguity for the AI or lowers friction for human correction/review. A new chat composer, turn-taking dashboard, social presence, or workflow game is out of scope unless a separate ADR reverses this decision.
- Keep existing read-only projections and safety boundaries intact; do not add a new persisted conversation state or a second write path.
- The non-goal list explicitly excludes a general-purpose chat/collaboration application.

## Safety consequence

No safety boundary is relaxed. Panel writes still require `PANEL_TOKEN`; AI replies and annotations remain context signals; project writes still require `preflight_visual_proposal`, `create_visual_proposal`, a full line diff, explicit human approval, a one-time receipt, `path-safety.ts`, and `SessionStore.applyProposal()`.
