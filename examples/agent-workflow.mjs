/**
 * Reproducible, read-only agent workflow example.
 *
 * It starts a local MCP stdio client, asks for the ordered workflow contract,
 * expands a read-only template draft, and preflights the candidate changes.
 * It verifies that no proposal or project write occurs, never approves
 * anything, and never asks for a one-time approval receipt. The workflow tool
 * itself performs no session write; the server may initialize its own session
 * file in the temporary OUTPUT_DIR.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-draw-agent-workflow-"));
const workspaceRoot = path.join(tempDir, "workspace");
const outputDir = path.join(tempDir, "output");
await fs.mkdir(workspaceRoot, { recursive: true });
await fs.writeFile(path.join(workspaceRoot, "README.md"), "# Workflow demo\n", "utf8");

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  cwd: packageRoot,
  env: {
    ...process.env,
    AI_DRAW_WORKSPACE_ROOT: workspaceRoot,
    OUTPUT_DIR: outputDir,
    PREVIEW_PORT: "3435",
    LOG_LEVEL: "error",
  },
});
const client = new Client({ name: "ai-draw-workflow-example", version: "1.0.0" });

function textOf(result) {
  return result.content.map((item) => item.text ?? "").join("\n");
}

function jsonAfter(text, marker) {
  const start = text.indexOf(marker) + marker.length;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === "\"") inString = false;
      continue;
    }
    if (character === "\"") inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return JSON.parse(text.slice(start, index + 1));
    }
  }
  throw new Error(`No complete JSON object after ${marker}`);
}

try {
  await client.connect(transport);
  console.log("0/5 Scanning the temporary workspace through MCP …");
  const scanText = textOf(await client.callTool({
    name: "scan_project",
    arguments: { render: false, open_panel: false },
  }));
  if (!scanText.includes("PRESERVATION_JSON:")) throw new Error("scan_project unexpectedly omitted the preservation contract");

  const workflowText = textOf(await client.callTool({ name: "get_agent_workflow", arguments: {} }));
  const workflow = jsonAfter(workflowText, "WORKFLOW_JSON:");
  console.log(`1/5 Workflow: ${workflow.steps.length} ordered steps at revision ${workflow.graphRevision}`);
  if (workflow.steps.some((step) => step.grantsWriteAuthority !== false)) {
    throw new Error("A workflow step unexpectedly claimed write authority");
  }
  if (workflowText.includes("grantHash") || workflowText.includes("approvalId")) {
    throw new Error("The workflow unexpectedly exposed an approval credential");
  }
  if (workflow.steps.filter((step) => step.writes === "project").map((step) => step.id).join(",") !== "apply") {
    throw new Error("Only apply_visual_proposal should be marked as a project write");
  }
  if (workflow.blocked.length) throw new Error(`Workflow unexpectedly blocked: ${workflow.blocked.join("; ")}`);
  console.log(`    Readiness blockers: ${workflow.blocked.length}${workflow.blocked.length ? ` — ${workflow.blocked.join("; ")}` : ""}`);

  const draftText = textOf(await client.callTool({
    name: "list_change_templates",
    arguments: {
      template_id: "update_documentation",
      path: "README.md",
      content: "# Workflow demo\n\nThis text is only a read-only draft.\n",
    },
  }));
  const draft = jsonAfter(draftText, "DRAFT_JSON:");
  console.log(`2/5 Draft: ${draft.changes.length} candidate change(s), no proposal created`);
  if (draftText.includes("PROPOSAL_JSON:")) throw new Error("Template unexpectedly created a proposal");

  const preflightText = textOf(await client.callTool({
    name: "preflight_visual_proposal",
    arguments: { changes: draft.changes },
  }));
  const preflight = jsonAfter(preflightText, "PREFLIGHT_JSON:");
  console.log(`3/5 Preflight: safe=${preflight.safe}, blockers=${preflight.blockers}`);
  if (!preflight.safe) throw new Error("Preflight unexpectedly rejected the demo draft");
  if (preflightText.includes("PROPOSAL_JSON:")) throw new Error("Preflight unexpectedly created a proposal");

  console.log("4/5 Stopped before create_visual_proposal. Human review and a one-time receipt are still required.");
  console.log(`    README remains unchanged: ${JSON.stringify(await fs.readFile(path.join(workspaceRoot, "README.md"), "utf8"))}`);
  console.log("5/5 Verified: no proposal or project write occurred; read-only example is complete.");
} finally {
  await client.close().catch(() => {});
  await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
}
