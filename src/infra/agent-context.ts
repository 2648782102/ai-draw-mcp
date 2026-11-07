import { buildCapabilities } from "../domain/capabilities.js";
import { buildSessionDiagnostics } from "../domain/session-diagnostics.js";
import { buildSharedBrief } from "../domain/shared-brief.js";
import { buildExportManifest, createSessionBundle } from "../domain/session-bundle.js";
import type { SessionSnapshot } from "../domain/types.js";
import type { SessionStore } from "./session-store.js";

function scrubProposalMetadata(value: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!value) return undefined;
  const safe: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (key === "importedApprovalStateCleared" && typeof nested === "boolean") safe[key] = nested;
  }
  return Object.keys(safe).length > 0 ? safe : undefined;
}

function scrubMessageMetadata(value: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!value) return undefined;
  const safe: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (["event", "source", "proposalId", "diagramId"].includes(key) && typeof nested === "string") safe[key] = nested;
    if (key === "stats" || key === "preservation" || key === "sourceEvidence" || key === "appliedChanges") {
      if (nested && typeof nested === "object") safe[key] = nested;
    }
  }
  return Object.keys(safe).length > 0 ? safe : undefined;
}

function scrubSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
  return {
    ...snapshot,
    proposals: snapshot.proposals.map((proposal) => {
      const { approvalId: _approvalId, approvalGrant: _approvalGrant, approvalExpiresAt: _approvalExpiresAt, ...safe } = proposal as unknown as SessionSnapshot["proposals"][number] & {
        approvalId?: string;
        approvalGrant?: string;
        approvalExpiresAt?: string;
      };
      return { ...safe, metadata: scrubProposalMetadata(proposal.metadata) } as SessionSnapshot["proposals"][number];
    }),
    messages: snapshot.messages.map((message) => ({
      ...message,
      metadata: scrubMessageMetadata(message.metadata),
    })),
  } as SessionSnapshot;
}

export const MCP_INSTRUCTIONS = [
  "AI Draw MCP is an agent-first visual communication board. Prefer MCP tools and resources directly inside the agent; do not open a browser unless the human explicitly asks to see the board.",
  "Start with get_capabilities or ai-draw://board/capabilities, then scan_project for a current project graph. Read ai-draw://board/session or get_visual_context for the shared state, and ai-draw://board/brief for a compact handoff.",
  "Human intent lives on graph nodes, edges, selection, focus, annotations, and graph diffs. Never turn conversation or graph edits into project writes: create a proposal, let the human review the full line diff, obtain approval plus a one-time receipt, and only then call apply_visual_proposal.",
  "The local HTTP panel is a thin human review surface, not a chat application and not the primary agent workflow. open_preview is an explicit human-facing action only.",
].join("\n");

export function buildAgentSessionProjection(sessions: SessionStore) {
  const bundle = createSessionBundle(scrubSnapshot(sessions.getSnapshot()));
  return { ...bundle, exportManifest: buildExportManifest(bundle) };
}

export function buildAgentBrief(sessions: SessionStore) {
  return buildSharedBrief(projectSessionBundle(bundleFrom(sessions)));
}

export function buildAgentCapabilities(sessions: SessionStore, serverVersion: string) {
  return buildCapabilities(projectSessionBundle(bundleFrom(sessions)), serverVersion);
}

export function buildAgentDiagnostics(sessions: SessionStore) {
  return buildSessionDiagnostics(projectSessionBundle(bundleFrom(sessions)));
}

function bundleFrom(sessions: SessionStore) {
  return createSessionBundle(scrubSnapshot(sessions.getSnapshot()));
}

function projectSessionBundle(bundle: ReturnType<typeof createSessionBundle>): SessionSnapshot {
  return {
    ...bundle.session,
    version: 1,
    updatedAt: bundle.exportedAt,
    selection: undefined,
    viewport: undefined,
    graphHistory: undefined,
  } as SessionSnapshot;
}
