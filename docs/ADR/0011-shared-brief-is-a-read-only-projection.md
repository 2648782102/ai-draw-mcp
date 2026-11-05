# ADR 0011: Shared brief is a read-only projection

- Status: Accepted
- Date: 2026-11-06

## Decision

The collaboration session has a version 1 `SharedBrief` derived by `buildSharedBrief()`. `get_shared_brief` exposes it as `BRIEF_JSON` and `GET /api/collab/brief` returns the same shape to the local panel. It is a compact handoff view: session and graph revisions, human focus, readiness blockers, pending messages, active and stale annotation threads, latest graph diff, bounded `file:line` evidence, proposal/activity counts, and suggested next actions.

The brief is not persisted in `SessionSnapshot`, not included in portable bundles, and not a prerequisite for approval. It never changes focus, resolves or re-anchors threads, writes session or project state, creates a proposal, or issues a one-time receipt. Approval grants and credential fields are absent by construction. Stale threads are reported separately from current intent.

## Rationale

`get_visual_context` is intentionally complete, while `get_node_context` is intentionally narrow. Early users and coding agents still need a middle-sized view for handoffs: "what is happening now, what is blocking me, and what should I read next?" A single versioned projection keeps the MCP tool and panel consistent, reduces prompt assembly errors, and gives humans copyable context for issues or conversations without duplicating raw session state.

## Alternatives

- **Persist `SharedBrief` in the session:** rejected because it is a live derived view; persisting it creates stale duplicates and a larger bundle compatibility surface.
- **Assemble the brief only in panel JavaScript:** rejected because AI and human would then see different contracts, and the MCP stdio client would not have a machine-readable version.
- **Replace `get_visual_context`:** rejected because the brief is bounded by design and must not become a second source of truth for raw messages, full graph, proposals, or diagnostics.
- **Include one-time approval grants:** rejected because any derived context containing a credential would risk replay and confuse read-only inspection with write authority.

## Consequences

- `BRIEF_JSON` is safe to copy into a conversation or issue, but consumers must call `get_visual_context` for full context and `get_node_context` for one node's details.
- Bounded item counts keep responses small; callers that need complete histories use the existing full-context tools.
- The workflow's first step can name `BRIEF_JSON` as an optional handoff output without changing which step may write project files: only `apply_visual_proposal` with a valid one-time human receipt retains that capability.
- A new tool increments `TOOL_COUNT`, and all public docs/tests mentioning the MCP tool surface must stay synchronized.

## Safety invariant

`safety.readOnly: true`, `safety.grantsWriteAuthority: false`, `safety.excludesApprovalGrants: true`, and `safety.staleThreadsExcludedFromIntent: true` are fixed for version 1. A future version may add fields, but may not turn a brief into an approval, session write, project write, or credential carrier.
