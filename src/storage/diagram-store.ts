import fs from "node:fs/promises";
import path from "node:path";
import type { DiagramRecord, DiagramType } from "../utils/types.js";
import { logger } from "../utils/logger.js";

const MANIFEST_FILE = "diagrams.json";

/**
 * In-memory + file-backed store for diagram metadata.
 * Persists a JSON manifest alongside the SVG/PNG output files.
 */
export class DiagramStore {
  private records: Map<string, DiagramRecord> = new Map();
  private manifestPath: string;

  constructor(private outputDir: string) {
    this.manifestPath = path.join(outputDir, MANIFEST_FILE);
  }

  async init(): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });
    try {
      const raw = await fs.readFile(this.manifestPath, "utf-8");
      const list: DiagramRecord[] = JSON.parse(raw);
      for (const r of list) this.records.set(r.id, r);
      logger.info(`Loaded ${this.records.size} diagram records`);
    } catch {
      logger.info("No existing manifest, starting fresh");
    }
  }

  async add(record: DiagramRecord): Promise<void> {
    this.records.set(record.id, record);
    await this.persist();
  }

  get(id: string): DiagramRecord | undefined {
    return this.records.get(id);
  }

  list(): DiagramRecord[] {
    return [...this.records.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  listByType(type: DiagramType): DiagramRecord[] {
    return this.list().filter((r) => r.type === type);
  }

  async remove(id: string): Promise<boolean> {
    const record = this.records.get(id);
    if (!record) return false;
    this.records.delete(id);
    await Promise.allSettled([
      fs.unlink(record.svgPath).catch(() => {}),
      record.pngPath ? fs.unlink(record.pngPath).catch(() => {}) : Promise.resolve(),
    ]);
    await this.persist();
    return true;
  }

  private async persist(): Promise<void> {
    const data = JSON.stringify(this.list(), null, 2);
    await fs.writeFile(this.manifestPath, data, "utf-8");
  }
}
