import { buildDecisionTrail } from "./decision-trail.js";
import { buildSharedBrief } from "./shared-brief.js";
import type { SessionSnapshot } from "./types.js";

export interface ReviewReadiness {
  version: 1;
  sessionId: string;
  graphRevision: number;
  status: "ready" | "review" | "blocked";
  brief: { blockers: string[]; nextActions: string[] };
  decisionTrail: { gaps: string[]; events: number; proposals: number };
  reviewPoints: Array<{
    id: string;
    source: "brief" | "decision_trail";
    severity: "action" | "warning";
    message: string;
  }>;
  guidance: string[];
  safety: {
    readOnly: true;
    grantsWriteAuthority: false;
    excludesApprovalGrants: true;
    projectWritesRequireHumanApproval: true;
  };
}

function briefPoint(message: string, index: number): ReviewReadiness["reviewPoints"][number] {
  return {
    id: `review:brief:${index + 1}`,
    source: "brief",
    severity: "action",
    message,
  };
}

function trailPoint(message: string, index: number): ReviewReadiness["reviewPoints"][number] {
  return {
    id: `review:decision-trail:${index + 1}`,
    source: "decision_trail",
    severity: "warning",
    message,
  };
}

export function buildReviewReadiness(snapshot: SessionSnapshot): ReviewReadiness {
  const brief = buildSharedBrief(snapshot);
  const decisionTrail = buildDecisionTrail(snapshot, {
    eventLimit: 20,
    proposalLimit: 3,
    graphDiffLimit: 2,
    lineLimit: 4,
  });
  const reviewPoints = [
    ...brief.intent.blockers.map(briefPoint),
    ...decisionTrail.gaps.map(trailPoint),
  ];
  const hasAction = brief.intent.blockers.length > 0;
  const hasWarning = decisionTrail.gaps.length > 0;
  const status = hasAction ? "blocked" : hasWarning ? "review" : "ready";
  return {
    version: 1,
    sessionId: snapshot.id,
    graphRevision: snapshot.graphRevision,
    status,
    brief: {
      blockers: brief.intent.blockers,
      nextActions: brief.intent.nextActions,
    },
    decisionTrail: {
      gaps: decisionTrail.gaps,
      events: decisionTrail.counts.returnedEvents,
      proposals: decisionTrail.counts.proposals,
    },
    reviewPoints,
    guidance: [
      "REVIEW_READINESS_JSON is a derived diagnostic projection; it is not an approval grant or a new state machine.",
      "Resolve BRIEF_JSON blockers and review DECISION_TRAIL_JSON gaps before creating or applying a proposal.",
      "Open the full proposal line diff in the panel before approval; bounded decision-trail lines are not a complete diff.",
      "Only apply_visual_proposal with a valid one-time human receipt may write project files.",
    ],
    safety: {
      readOnly: true,
      grantsWriteAuthority: false,
      excludesApprovalGrants: true,
      projectWritesRequireHumanApproval: true,
    },
  };
}
