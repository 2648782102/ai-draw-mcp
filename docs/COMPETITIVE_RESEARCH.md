# Competitive Research

Research snapshot: 2026-11-06. This is a positioning brief based on public product pages and ecosystem articles, not a benchmark. Links are grouped at the end so contributors can refresh the evidence.

## The market gap

Most visual tools optimize either **AI generation** or **human editing**. Mermaid-style tools make diagrams easy for LLMs to generate but leave review in text; whiteboards make diagrams pleasant for people but rarely connect visual intent back to a code change. MCP diagram servers mostly stop at rendering. AI Draw MCP targets the narrow, high-value gap: a local, open-source, human-in-the-loop loop from project structure → visual edit → conversation → reviewed proposal → project change.

## Comparison

| Product / category | What it does well | What we can learn | Where AI Draw MCP differs |
|---|---|---|---|
| Mermaid Live / Mermaid Chart | Text-first Mermaid editing, live preview, broad diagram syntax, AI suggestions, MCP support | Keep the DSL legible, give AI a validation loop, make exports portable | AI Draw MCP does not stop at the image: visual edits become a structured session that can produce approved project changes |
| Excalidraw / tldraw | Fast human canvas, approachable interaction, open-source ecosystem, editable artifacts | Humans need direct manipulation and low-friction sketching; generated output must remain editable | AI Draw MCP is repository-aware and MCP-native; its visual graph is an intent channel for coding agents |
| Miro / FigJam / Mural | Real-time team workshops, comments, templates, facilitation | Conversations around objects matter; annotations and roles make collaboration legible | AI Draw MCP stays local-first, lightweight, and focused on the developer's workspace instead of hosted boards |
| GitHub review threads / Figma comments | Resolve/reopen review conversations, keep discussion next to the changed object, and make unresolved work visible | Treat thread state as a queue: authored reply → explicit resolve/reopen → clear next actor | AI Draw MCP exposes thread state to `get_visual_context`, so an MCP agent can see whether it should reply or wait |
| draw.io / Lucidchart | Mature shape libraries, enterprise exports, portable diagram files | Preserve editability after generation; open output in an editor users already trust | AI Draw MCP emits proposals and diffs next to the visual context, not only a diagram file |
| GitDiagram / CodeSee-style code maps | Codebase-to-architecture visualization, repository exploration | A project scanner should surface meaningful boundaries, not just directories | AI Draw MCP lets the human revise the generated structure and sends that revision back to the AI |
| Mermaid Chart MCP / community diagram MCP servers | MCP-native validation/rendering, easy IDE integration, sometimes cloud diagram management | Tool descriptions and return values must be optimized for LLMs; one-call workflows reduce mistakes | AI Draw MCP is local, offline-capable for panel assets, open source without an account wall, and adds a human approval protocol |
| AI agent diagram builders | Generate and iteratively edit diagrams from prompts, sometimes inline in chat | Iteration is the default; the first generated diagram is only a draft | AI Draw MCP extends iteration from the diagram to the underlying project through explicit approval |

## Positioning statement

> AI Draw MCP is a local-first MCP workspace where an AI can turn a codebase into an editable visual map, a human can correct that map in the panel, and the pair can review a concrete change proposal before any file is written.

Short form for GitHub About:

> Human ↔ AI visual collaboration workspace for MCP: scan a project, edit the diagram, discuss intent, and apply approved code changes.

## Product lessons to apply

1. **The first 30 seconds must show the loop.** Competitors win with instant previews and zero-account entry; README and examples should demonstrate scan → edit → approve → apply before listing features.
2. **Editable output beats static output.** Preserve structured graph JSON as the source of truth for collaboration; Mermaid remains a rendering and export format.
3. **Conversation belongs on objects.** Pin annotations to nodes and show proposal status next to the relevant visual context.
4. **Thread state is a protocol, not decoration.** Resolve/reopen and the latest reply determine whose turn it is; expose that state in machine-readable AI context instead of hiding it in the UI.
5. **MCP tools are a UX surface.** Names, descriptions, argument shapes, and machine-readable responses should be tested as an agent-facing API.
6. **Trust is a differentiator.** Local-only defaults, no account, reviewable diffs, one-time approval, rollback, and documented non-goals should be prominent.
7. **Open-source growth needs maintained metadata.** Description, topics, roadmap, release notes, issue templates, and repeatable launch copy are part of the product.

## Annotation-thread protocol notes

The shipped 0.3.x thread already covers one root annotation per node, ordered human/AI replies, resolve/reopen, a latest-reply-based `nextActor`, validation on save/import, portable replies in session bundles, and a compact derived activity timeline for messages, thread events, and proposal lifecycle events. These research notes are **candidates for later versions**, not claims that every detail is already shipped:

- Preserve `detached` / `outdated` state when a node is removed or a graph revision changes its path; keep the old label/path with the thread instead of silently deleting history.
- Add open/resolved/outdated/unread filters, counts, and a "show resolved" toggle; let `get_visual_context` prioritize open threads awaiting AI.
- Let a resolve action point at a decisive `resolutionReplyId`, and label any generated summary as derived context rather than a replacement for the original replies.
- Add versioned thread events (`created`, `replied`, `resolved`, `reopened`, `proposal-linked`) that link the derived timeline to proposal diffs and approval records; keep derived summaries distinct from immutable source events.

Keep these two boundaries explicit: `resolved` is a conversation state, never proposal approval or a project-write grant; conversation actions and one-time human write receipts are separate server-side checks. Some public sources describe client-side comment controls such as `canComment`; this project must not rely on hidden UI controls or client-supplied author fields for authorization.

## Sources

- [Mermaid](https://mermaid.ai/) and [Mermaid Chart MCP Server](https://mermaid.ai/docs/ai/mcp-server) — diagram-as-code, AI suggestions, MCP create/validate/render tools.
- [Miro Mermaid diagrams](https://help.miro.com/hc/en-us/articles/7004628130962-Create-Mermaid-diagrams) and [Miro MCP clients](https://help.miro.com/hc/en-us/articles/31624733719058-What-are-MCP-Clients) — Mermaid on a collaborative board and code-to-diagram MCP workflows.
- [GitHub review conversations](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/commenting-on-a-pull-request) — resolving review conversations, attached discussion, and an unresolved-conversation queue.
- [GitHub proposed-change reviews](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/reviewing-proposed-changes-in-a-pull-request) and [review concepts](https://docs.github.com/en/pull-requests/concepts/giving-reviews) — review-thread queues, permissions, and review state.
- [GitHub GraphQL pull requests reference](https://docs.github.com/en/graphql/reference/pulls) — `isResolved`, `isOutdated`, `resolvedBy`, and resolve/unresolve mutations.
- [Figma comments](https://help.figma.com/hc/en-us/articles/360041547593-View-and-manage-comments) — canvas-pinned comments, replies, resolution, and a right-sidebar conversation list.
- [Figma prototype comments](https://help.figma.com/hc/en-us/articles/360039824594-Comment-on-prototypes) — pin comments to a location, reply in a thread, resolve, and show resolved comments again.
- [Figma add comments](https://help.figma.com/hc/en-us/articles/360041068574-Add-comments-to-files) and [move/edit comments](https://help.figma.com/hc/en-us/articles/360041547853-Move-or-edit-comments) — pin behavior, object-bound comments, and conversation management.
- [Linear comments](https://linear.app/docs/comment-on-issues), [Linear Agent](https://linear.app/docs/linear-agent), [Agents in Linear](https://linear.app/docs/agents-in-linear), and [resolve-comments changelog](https://linear.app/changelog/2023-11-08-resolve-comments) — thread resolution, decisive replies, and explicit agent handoff.
- [tldraw commenting](https://tldraw.dev/docs/commenting) and [collaboration](https://tldraw.dev/docs/collaboration) — shape-anchored comments, sidebar filters, and server-side session authorization.
- [Excalidraw](https://excalidraw.com/) and [tldraw](https://tldraw.dev/) — open, editable visual canvas ecosystems.
- [draw.io MCP Registry entry](https://github.com/mcp-use/mcp-diagram-builder) and [mcp-diagram-builder](https://github.com/manufacts/mcp-diagram-builder) — interactive diagram generation and iterative editing through MCP.
- [GitDiagram](https://github.com/ahmedkhalf/gitdiagram) — public repository architecture diagrams and Markdown/MCP access.
- [Open Source Guides: Starting a Project](https://opensource.guide/starting-a-project/) and [Open {re}Source: Planning Your Project](https://openresource.dev/guide/creating/planning-your-project/) — roadmap, README, license, and non-goals guidance.
- Third-party 2026 category surveys were used to map the market lanes: [best AI diagram tools](https://nimbalyst.com/blog/best-ai-diagram-tools-2026/), [diagram APIs for AI agents](https://www.anchorterminal.com/best/diagramming/), and [visual collaboration tools](https://storyflow.so/blog/best-visual-collaboration-tools-2026/).
