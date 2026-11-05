import fs from "node:fs/promises";
import path from "node:path";
import { makeId, nowIso } from "../domain/ids.js";
import {
  assertSafeWorkspacePath,
  toWorkspaceRelative,
} from "../domain/path-safety.js";
import type { ApprovalGrant, ApprovalReceipt } from "../domain/approval.js";
import { assertProposalHash, proposalContentHash } from "../domain/proposal-hash.js";
import type {
  ChangeProposal,
  ConversationMessage,
  Participant,
  ProjectChange,
  ProposalStatus,
  SessionSnapshot,
  VisualGraph,
} from "../domain/types.js";
import { logger } from "./logger.js";
import { resolveWorkspaceRoot } from "./workspace.js";
import { diffTruncated, unifiedDiff, type ProposalFileDiff } from "../domain/diff.js";

const SESSION_FILE = "session.json";
const MAX_MESSAGES = 500;
const MAX_PROPOSALS = 100;
const MAX_CHANGE_BYTES = 1024 * 1024;

interface SessionStoreOptions {
  outputDir: string;
  workspaceRoot?: string;
}

function trimList<T>(items: T[], max: number): T[] {
  return items.length > max ? items.slice(items.length - max) : items;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createSession(workspaceRoot: string): SessionSnapshot {
  const timestamp = nowIso();
  return {
    version: 1,
    id: makeId("session"),
    title: "Visual collaboration session",
    createdAt: timestamp,
    updatedAt: timestamp,
    workspaceRoot,
    graphRevision: 0,
    messages: [],
    proposals: [],
  };
}

function validateGraph(graph: VisualGraph): void {
  if (graph.version !== 1) throw new Error(`Unsupported graph version: ${graph.version}`);
  if (!graph.diagramId) throw new Error("Graph diagramId is required");
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  if (nodeIds.size !== graph.nodes.length) throw new Error("Graph contains duplicate node ids");
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to))
      throw new Error(`Graph edge references missing node: ${edge.id}`);
  }
}

function validateChange(workspaceRoot: string, change: ProjectChange): void {
  if (!["create", "update", "mkdir"].includes(change.kind))
    throw new Error(`Unsupported change kind: ${change.kind}`);
  const absolute = assertSafeWorkspacePath(workspaceRoot, change.path);
  if (change.kind !== "mkdir") {
    if (typeof change.content !== "string")
      throw new Error(`Change content is required: ${change.path}`);
    if (Buffer.byteLength(change.content, "utf8") > MAX_CHANGE_BYTES)
      throw new Error(`Change content exceeds ${MAX_CHANGE_BYTES} bytes: ${change.path}`);
    if (change.encoding && change.encoding !== "utf8")
      throw new Error(`Only utf8 changes are supported: ${change.path}`);
  }
  change.path = toWorkspaceRelative(workspaceRoot, absolute);
}

export class SessionStore {
  private stateDir: string;
  private sessionPath: string;
  private workspaceRoot: string;
  private snapshot: SessionSnapshot;
  private writeQueue: Promise<void> = Promise.resolve();
  private approvalGrants = new Map<string, ApprovalGrant>();

  private constructor(options: SessionStoreOptions, snapshot: SessionSnapshot) {
    this.stateDir = path.join(options.outputDir, ".ai-draw");
    this.sessionPath = path.join(this.stateDir, SESSION_FILE);
    this.workspaceRoot = options.workspaceRoot ?? resolveWorkspaceRoot();
    this.snapshot = snapshot;
  }

  static async create(options: SessionStoreOptions): Promise<SessionStore> {
    const workspaceRoot = options.workspaceRoot ?? resolveWorkspaceRoot();
    const stateDir = path.join(options.outputDir, ".ai-draw");
    const sessionPath = path.join(stateDir, SESSION_FILE);
    await fs.mkdir(stateDir, { recursive: true });
    let snapshot: SessionSnapshot | null = null;
    try {
      const parsed = JSON.parse(await fs.readFile(sessionPath, "utf8")) as SessionSnapshot;
      if (parsed.version === 1) snapshot = { ...parsed, workspaceRoot };
    } catch {
      logger.info("No collaboration session found, creating one");
    }
    if (!snapshot) snapshot = createSession(workspaceRoot);
    const store = new SessionStore(options, snapshot);
    await store.persist();
    return store;
  }

  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  getSnapshot(): SessionSnapshot {
    return clone(this.snapshot);
  }

  getGraph(): VisualGraph | undefined {
    return this.snapshot.graph ? clone(this.snapshot.graph) : undefined;
  }

  getMessages(limit = 50): ConversationMessage[] {
    return clone(this.snapshot.messages.slice(-limit));
  }

  getProposals(limit = 20): ChangeProposal[] {
    return clone(this.snapshot.proposals.slice(-limit));
  }

  getProposal(id: string): ChangeProposal | undefined {
    const proposal = this.snapshot.proposals.find((item) => item.id === id);
    return proposal ? clone(proposal) : undefined;
  }

  async getProposalDiffs(id: string): Promise<ProposalFileDiff[]> {
    const proposal = this.getProposal(id);
    if (!proposal) throw new Error(`Proposal not found: ${id}`);
    assertProposalHash(proposal);
    const diffs: ProposalFileDiff[] = [];
    for (const change of proposal.changes) {
      assertSafeWorkspacePath(this.workspaceRoot, change.path);
      const absolute = path.resolve(this.workspaceRoot, change.path);
      const before = change.kind === "mkdir"
        ? ""
        : await fs.readFile(absolute, "utf8").catch(() => "");
      const after = change.kind === "mkdir" ? "" : (change.content ?? "");
      diffs.push({
        path: change.path,
        kind: change.kind,
        before,
        after,
        lines: unifiedDiff(before, after),
        truncated: diffTruncated(before, after),
      });
    }
    return diffs;
  }

  async setGraph(graph: VisualGraph, activeDiagramId = graph.diagramId): Promise<SessionSnapshot> {
    validateGraph(graph);
    return this.mutate((draft) => {
      draft.graph = graph;
      draft.activeDiagramId = activeDiagramId;
      draft.graphRevision += 1;
    });
  }

  async addMessage(
    author: Participant,
    body: string,
    options: { diagramId?: string; status?: ConversationMessage["status"]; metadata?: Record<string, unknown> } = {},
  ): Promise<ConversationMessage> {
    const message: ConversationMessage = {
      id: makeId("msg"),
      sessionId: this.snapshot.id,
      author,
      body,
      createdAt: nowIso(),
      diagramId: options.diagramId ?? this.snapshot.activeDiagramId,
      graphRevision: this.snapshot.graphRevision,
      status: options.status ?? (author === "human" ? "pending" : "answered"),
      metadata: options.metadata,
    };
    await this.mutate((draft) => {
      draft.messages = trimList([...draft.messages, message], MAX_MESSAGES);
    });
    return message;
  }

  async markMessage(id: string, status: ConversationMessage["status"]): Promise<void> {
    await this.mutate((draft) => {
      const message = draft.messages.find((item) => item.id === id);
      if (message) message.status = status;
    });
  }

  async markMessageForProposal(proposalId: string, status: ConversationMessage["status"]): Promise<void> {
    await this.mutate((draft) => {
      for (const message of draft.messages) {
        if (message.metadata?.proposalId === proposalId && message.author === "human")
          message.status = status;
      }
    });
  }

  async resolveAnnotations(ids: string[]): Promise<void> {
    const targets = new Set(ids);
    await this.mutate((draft) => {
      if (!draft.graph) return;
      for (const annotation of draft.graph.annotations) {
        if (targets.has(annotation.id)) annotation.resolved = true;
      }
      draft.graphRevision += 1;
    });
  }

  async createProposal(input: {
    title: string;
    summary: string;
    changes: ProjectChange[];
    diagramId?: string;
    createdBy?: Participant;
    metadata?: Record<string, unknown>;
  }): Promise<ChangeProposal> {
    const changes = clone(input.changes);
    for (const change of changes) validateChange(this.workspaceRoot, change);
    const contentHash = proposalContentHash({ title: input.title, summary: input.summary, changes });
    const proposal: ChangeProposal = {
      id: makeId("proposal"),
      sessionId: this.snapshot.id,
      diagramId: input.diagramId ?? this.snapshot.activeDiagramId,
      title: input.title,
      summary: input.summary,
      graphRevision: this.snapshot.graphRevision,
      status: "pending",
      createdAt: nowIso(),
      changes,
      contentHash,
      createdBy: input.createdBy ?? "ai",
      metadata: input.metadata,
    };
    await this.mutate((draft) => {
      draft.proposals = trimList([...draft.proposals, proposal], MAX_PROPOSALS);
    });
    return clone(proposal);
  }

  async setProposalStatus(
    id: string,
    status: ProposalStatus,
    patch: Partial<Pick<ChangeProposal, "error" | "approvedAt" | "appliedAt" | "rejectedAt">> = {},
  ): Promise<ChangeProposal> {
    let updated: ChangeProposal | undefined;
    await this.mutate((draft) => {
      const proposal = draft.proposals.find((item) => item.id === id);
      if (!proposal) throw new Error(`Proposal not found: ${id}`);
      assertProposalHash(proposal);
      proposal.status = status;
      if (patch.error !== undefined) proposal.error = patch.error;
      if (patch.approvedAt !== undefined) proposal.approvedAt = patch.approvedAt;
      if (patch.appliedAt !== undefined) proposal.appliedAt = patch.appliedAt;
      if (patch.rejectedAt !== undefined) proposal.rejectedAt = patch.rejectedAt;
      updated = clone(proposal);
    });
    return updated!;
  }

  async applyProposal(id: string, approvedBy: "human" = "human"): Promise<ChangeProposal> {
    if (approvedBy !== "human") throw new Error("Only a human can approve a proposal");
    const proposal = this.getProposal(id);
    if (!proposal) throw new Error(`Proposal not found: ${id}`);
    if (proposal.status !== "approved")
      throw new Error(`Proposal is not approvable: ${proposal.status}`);
    if (proposal.changes.length === 0) throw new Error("Proposal has no changes");
    assertProposalHash(proposal);

    const resolved = proposal.changes.map((change) => ({
      ...change,
      absolute: assertSafeWorkspacePath(this.workspaceRoot, change.path),
    }));
    const backups: Array<{ absolute: string; existed: boolean; content?: string }> = [];
    let applied = 0;

    await this.mutateStatus(id, "draft");
    try {
      for (const change of resolved) {
        const existing = await fs.stat(change.absolute).then(() => true).catch(() => false);
        if (change.kind === "create" && existing)
          throw new Error(`Refusing to overwrite existing file: ${change.path}`);
        if (change.kind === "update" && !existing)
          throw new Error(`File to update does not exist: ${change.path}`);
        backups.push({
          absolute: change.absolute,
          existed: existing,
          content: existing && change.kind === "update" ? await fs.readFile(change.absolute, "utf8") : undefined,
        });

        if (change.kind === "mkdir") {
          await fs.mkdir(change.absolute, { recursive: true });
        } else {
          await fs.mkdir(path.dirname(change.absolute), { recursive: true });
          const tempPath = `${change.absolute}.ai-draw-tmp-${process.pid}`;
          await fs.writeFile(tempPath, change.content ?? "", "utf8");
          await fs.rename(tempPath, change.absolute);
        }
        applied += 1;
      }
      const result = await this.mutateStatus(id, "applied", { appliedAt: nowIso() });
      await this.addMessage("system", `Applied proposal「${proposal.title}」`, {
        diagramId: proposal.diagramId,
        metadata: { proposalId: proposal.id, appliedChanges: applied },
      });
      return result;
    } catch (error) {
      await this.rollback(backups.slice(0, applied));
      const result = await this.mutateStatus(id, "failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      logger.error(`Proposal ${id} failed and was rolled back`);
      return result;
    }
  }

  async consumeApproval(receipt: ApprovalReceipt): Promise<ApprovalGrant> {
    const grant = this.approvalGrants.get(receipt.approvalId);
    if (!grant) throw new Error("Unknown or expired approval receipt");
    const { isGrantValid } = await import("../domain/approval.js");
    if (!isGrantValid(grant, receipt)) throw new Error("Invalid approval receipt");
    const proposal = this.getProposal(receipt.proposalId);
    if (!proposal) throw new Error("Approved proposal no longer exists");
    assertProposalHash(proposal);
    if (grant.proposalHash && grant.proposalHash !== proposal.contentHash)
      throw new Error("Proposal changed after approval");
    grant.usedAt = nowIso();
    return { ...grant };
  }

  async issueApproval(proposalId: string): Promise<ApprovalReceipt> {
    const proposal = this.getProposal(proposalId);
    if (!proposal) throw new Error(`Proposal not found: ${proposalId}`);
    assertProposalHash(proposal);
    const { grantFromReceipt, issueApproval } = await import("../domain/approval.js");
    const receipt = issueApproval(proposalId);
    this.approvalGrants.set(receipt.approvalId, {
      ...grantFromReceipt(receipt),
      proposalHash: proposal.contentHash!,
    });
    return receipt;
  }

  private async rollback(backups: Array<{ absolute: string; existed: boolean; content?: string }>): Promise<void> {
    for (const backup of backups.reverse()) {
      try {
        if (backup.existed && backup.content !== undefined)
          await fs.writeFile(backup.absolute, backup.content, "utf8");
        else
          await fs.rm(backup.absolute, { recursive: true, force: true });
      } catch (error) {
        logger.warn(`Rollback failed for ${backup.absolute}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  private async mutateStatus(
    id: string,
    status: ProposalStatus,
    patch: Partial<Pick<ChangeProposal, "error" | "approvedAt" | "appliedAt" | "rejectedAt">> = {},
  ): Promise<ChangeProposal> {
    return this.setProposalStatus(id, status, patch);
  }

  private async mutate(updater: (draft: SessionSnapshot) => void): Promise<SessionSnapshot> {
    const operation = this.writeQueue.then(async () => {
      const draft = clone(this.snapshot);
      updater(draft);
      draft.updatedAt = nowIso();
      await this.writeSnapshot(draft);
      this.snapshot = draft;
      return clone(draft);
    });
    this.writeQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  private async writeSnapshot(snapshot: SessionSnapshot): Promise<void> {
    await fs.mkdir(this.stateDir, { recursive: true });
    const tempPath = `${this.sessionPath}.tmp-${process.pid}`;
    await fs.writeFile(tempPath, JSON.stringify(snapshot, null, 2), "utf8");
    await fs.rename(tempPath, this.sessionPath);
  }

  private async persist(): Promise<void> {
    await this.writeSnapshot(this.snapshot);
  }
}
