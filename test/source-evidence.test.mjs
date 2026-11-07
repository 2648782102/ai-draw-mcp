import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanProject, scanToVisualGraph } from "../dist/infra/project-scanner.js";
import { mergeScannedGraph } from "../dist/domain/visual-graph-merge.js";
import { createSessionBundle, parseSessionBundle } from "../dist/domain/session-bundle.js";

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-draw-evidence-"));
await fs.mkdir(path.join(tempDir, "src"), { recursive: true });
await fs.writeFile(path.join(tempDir, "README.md"), "# Evidence demo\n\nText.\n", "utf8");
await fs.writeFile(path.join(tempDir, "src", "service.ts"), [
  "import { helper } from './helper.js';",
  "export class Service {}",
  "const value = 1;",
].join("\n") + "\n", "utf8");
await fs.writeFile(path.join(tempDir, "src", "helper.ts"), "export function helper() {}\n", "utf8");

describe("read-only source evidence", () => {
  it("extracts bounded file:line evidence from text files and keeps it through scans and bundles", async () => {
    const scan = await scanProject({ workspaceRoot: tempDir });
    const readme = scan.nodes.find((node) => node.path === "README.md");
    const service = scan.nodes.find((node) => node.path === "src/service.ts");
    expect(readme?.sourceEvidence?.[0]).toMatchObject({ version: 1, kind: "heading", path: "README.md", line: 1 });
    expect(service?.sourceEvidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "import", path: "src/service.ts", line: 1 }),
      expect.objectContaining({ kind: "definition", path: "src/service.ts", line: 2 }),
    ]));
    expect(service?.sourceEvidence?.length).toBeLessThanOrEqual(5);
    expect(scan.stats.evidencedNodes).toBeGreaterThanOrEqual(3);
    expect(scan.stats.totalEvidence).toBeGreaterThanOrEqual(4);

    const graph = scanToVisualGraph(scan, "diagram_evidence");
    expect(graph.nodes.find((node) => node.path === "src/service.ts").sourceEvidence?.[0].line).toBe(1);
    const merged = mergeScannedGraph(graph, graph, undefined);
    expect(merged.graph.nodes.find((node) => node.path === "src/service.ts").sourceEvidence?.[0].line).toBe(1);

    const bundle = createSessionBundle({
      version: 1,
      id: "session_evidence",
      title: "Evidence",
      createdAt: "2026-11-06T00:00:00.000Z",
      updatedAt: "2026-11-06T00:00:00.000Z",
      workspaceRoot: tempDir,
      graphRevision: 1,
      graph,
      messages: [],
      proposals: [],
    });
    const parsed = parseSessionBundle(JSON.parse(JSON.stringify(bundle)));
    expect(parsed.session.graph.nodes.find((node) => node.path === "src/service.ts")?.sourceEvidence?.[0])
      .toMatchObject({ version: 1, line: 1, kind: "import" });
    const injected = JSON.parse(JSON.stringify(bundle));
    injected.session.graph.nodes.find((node) => node.path === "src/service.ts").sourceEvidence[0].grant = "write-everything";
    expect(() => parseSessionBundle(injected)).toThrow(/unknown property grant/);
    const badLine = JSON.parse(JSON.stringify(bundle));
    badLine.session.graph.nodes.find((node) => node.path === "src/service.ts").sourceEvidence[0].line = 0;
    expect(() => parseSessionBundle(badLine)).toThrow(/positive integer/);
  });

  it("bounds large workspace scans into grouped board nodes", async () => {
    await Promise.all(
      Array.from({ length: 45 }, (_, index) =>
        fs.writeFile(path.join(tempDir, `src/module-${index}.ts`), `export const value${index} = ${index};\n`, "utf8"))
    );
    const scan = await scanProject({ workspaceRoot: tempDir });
    expect(scan.nodes.length).toBeLessThanOrEqual(41);
    expect(scan.nodes.some((node) => node.metadata?.boardGroup)).toBe(true);
    expect(scan.nodes.some((node) => node.metadata?.summary)).toBe(true);
    const nodeIds = new Set(scan.nodes.map((node) => node.id));
    expect(scan.edges.every((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))).toBe(true);
    const expanded = await scanProject({ workspaceRoot: tempDir, maxFiles: 100, groupSummary: false });
    expect(expanded.nodes.length).toBeGreaterThan(scan.nodes.length);
  });
});
