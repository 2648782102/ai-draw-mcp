export interface ProposalDiffLine {
  type: "context" | "add" | "remove";
  text: string;
  oldLine?: number;
  newLine?: number;
}

export interface ProposalFileDiff {
  path: string;
  kind: string;
  before: string;
  after: string;
  lines: ProposalDiffLine[];
  truncated: boolean;
}

const MAX_LINES = 400;

function lcsMatrix(before: string[], after: string[]): number[][] {
  const matrix = Array.from({ length: before.length + 1 }, () => new Array<number>(after.length + 1).fill(0));
  for (let oldIndex = before.length - 1; oldIndex >= 0; oldIndex--) {
    for (let newIndex = after.length - 1; newIndex >= 0; newIndex--) {
      matrix[oldIndex][newIndex] = before[oldIndex] === after[newIndex]
        ? matrix[oldIndex + 1][newIndex + 1] + 1
        : Math.max(matrix[oldIndex + 1][newIndex], matrix[oldIndex][newIndex + 1]);
    }
  }
  return matrix;
}

export function unifiedDiff(before: string, after: string): ProposalDiffLine[] {
  const beforeLines = before.replace(/\r\n/g, "\n").split("\n");
  const afterLines = after.replace(/\r\n/g, "\n").split("\n");
  const matrix = lcsMatrix(beforeLines, afterLines);
  const lines: ProposalDiffLine[] = [];
  let oldIndex = 0;
  let newIndex = 0;
  while (oldIndex < beforeLines.length && newIndex < afterLines.length && lines.length < MAX_LINES) {
    if (beforeLines[oldIndex] === afterLines[newIndex]) {
      lines.push({ type: "context", text: beforeLines[oldIndex], oldLine: oldIndex + 1, newLine: newIndex + 1 });
      oldIndex++;
      newIndex++;
    } else if (matrix[oldIndex + 1][newIndex] >= matrix[oldIndex][newIndex + 1]) {
      lines.push({ type: "remove", text: beforeLines[oldIndex], oldLine: oldIndex + 1 });
      oldIndex++;
    } else {
      lines.push({ type: "add", text: afterLines[newIndex], newLine: newIndex + 1 });
      newIndex++;
    }
  }
  while (oldIndex < beforeLines.length && lines.length < MAX_LINES) {
    lines.push({ type: "remove", text: beforeLines[oldIndex], oldLine: ++oldIndex });
  }
  while (newIndex < afterLines.length && lines.length < MAX_LINES) {
    lines.push({ type: "add", text: afterLines[newIndex], newLine: ++newIndex });
  }
  return lines;
}

export function diffTruncated(before: string, after: string): boolean {
  return before.split("\n").length + after.split("\n").length > MAX_LINES;
}
