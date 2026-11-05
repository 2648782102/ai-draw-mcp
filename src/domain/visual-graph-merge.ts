import type { AnnotationPin, GraphNode, ScanPreservationSummary, SessionFocus, VisualGraph } from "./types.js";

interface Coordinate {
  x: number;
  y: number;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function usableCoordinate(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function coordinatesOf(node: GraphNode): Coordinate | undefined {
  return usableCoordinate(node.x) && usableCoordinate(node.y)
    ? { x: node.x, y: node.y }
    : undefined;
}

function pathKey(path: string | undefined): string | undefined {
  const normalized = path?.trim().replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
  return normalized ? normalized.toLowerCase() : undefined;
}

function occupiedCoordinates(graph: VisualGraph | undefined): Set<string> {
  const occupied = new Set<string>();
  for (const node of graph?.nodes ?? []) {
    const coordinate = coordinatesOf(node);
    if (coordinate) occupied.add(`${coordinate.x}:${coordinate.y}`);
  }
  return occupied;
}

function nextAutoCoordinate(occupied: Set<string>): Coordinate {
  let index = 0;
  while (true) {
    const coordinate = { x: (index % 8) * 180, y: Math.floor(index / 8) * 100 };
    const key = `${coordinate.x}:${coordinate.y}`;
    if (!occupied.has(key)) {
      occupied.add(key);
      return coordinate;
    }
    index += 1;
  }
}

function sameNodeIdentity(before: GraphNode, after: GraphNode): boolean {
  const beforePath = pathKey(before.path);
  const afterPath = pathKey(after.path);
  return Boolean(beforePath && afterPath && beforePath === afterPath);
}

function migrateAnnotation(annotation: AnnotationPin, remap: Map<string, string>, scannedIds: Set<string>): AnnotationPin {
  const next = clone(annotation);
  if (next.nodeId) {
    const mapped = remap.get(next.nodeId);
    if (mapped) {
      next.nodeId = mapped;
      if (next.anchorStatus === "detached") next.anchorStatus = "outdated";
    } else if (!scannedIds.has(next.nodeId)) {
      next.anchorStatus = "detached";
    }
  }
  return next;
}

export function mergeScannedGraph(
  scanned: VisualGraph,
  current: VisualGraph | undefined,
  focus: SessionFocus | undefined,
): { graph: VisualGraph; focus?: SessionFocus; preservation: ScanPreservationSummary } {
  if (!current) {
    return {
      graph: clone(scanned),
      focus: focus ? clone(focus) : undefined,
      preservation: {
        version: 1,
        strategy: "stable-path-merge",
        matchedNodes: 0,
        newNodes: scanned.nodes.length,
        removedNodes: 0,
        preservedCoordinates: 0,
        humanCoordinates: 0,
        preservedLabels: 0,
        carriedAnnotations: 0,
        detachedAnnotations: 0,
        preservedFocus: Boolean(focus && scanned.nodes.some((node) => node.id === focus.nodeId)),
      },
    };
  }

  const currentById = new Map(current.nodes.map((node) => [node.id, node]));
  const currentByPath = new Map<string, GraphNode>();
  for (const node of current.nodes) {
    const key = pathKey(node.path);
    if (key && !currentByPath.has(key)) currentByPath.set(key, node);
  }
  const occupied = occupiedCoordinates(current);
  const remap = new Map<string, string>();
  const matchedCurrentIds = new Set<string>();
  const usedCurrentIds = new Set<string>();
  let preservedCoordinates = 0;
  let humanCoordinates = 0;
  let preservedLabels = 0;

  const nodes = scanned.nodes.map((scannedNode) => {
    let previous = currentById.get(scannedNode.id);
    if (!previous) {
      const byPath = currentByPath.get(pathKey(scannedNode.path) ?? "");
      if (byPath && !usedCurrentIds.has(byPath.id)) previous = byPath;
    }
    if (previous && sameNodeIdentity(previous, scannedNode) && !usedCurrentIds.has(previous.id)) {
      usedCurrentIds.add(previous.id);
      matchedCurrentIds.add(previous.id);
      remap.set(previous.id, scannedNode.id);
      const coordinate = coordinatesOf(previous);
      const humanLabel = previous.label !== previous.path && previous.label !== scannedNode.label;
      if (humanLabel) preservedLabels += 1;
      const humanLayout = previous.metadata?.layoutSource === "human";
      const merged: GraphNode = {
        ...clone(scannedNode),
        label: humanLabel ? previous.label : scannedNode.label,
        sourceEvidence: scannedNode.sourceEvidence,
        x: coordinate?.x,
        y: coordinate?.y,
        metadata: {
          ...(scannedNode.metadata ?? {}),
          ...(humanLayout ? { layoutSource: "human" } : {}),
        },
      };
      if (coordinate) preservedCoordinates += 1;
      if (coordinate && humanLayout) humanCoordinates += 1;
      return merged;
    }
    const coordinate = nextAutoCoordinate(occupied);
    return { ...clone(scannedNode), ...coordinate };
  });

  const scannedIds = new Set(nodes.map((node) => node.id));
  const annotations = current.annotations.map((annotation) => migrateAnnotation(annotation, remap, scannedIds));
  for (const [index, annotation] of annotations.entries()) {
    const previous = current.annotations[index];
    if (!annotation.nodeId || !remap.has(previous.nodeId ?? "")) continue;
    const node = nodes.find((item) => item.id === annotation.nodeId);
    if (!node) continue;
    const renamed = annotation.nodeLabel && annotation.nodeLabel !== node.label;
    const moved = annotation.nodePath && annotation.nodePath !== node.path;
    if (renamed || moved) annotation.anchorStatus = "outdated";
    else if (annotation.anchorStatus === "outdated") annotation.anchorStatus = "anchored";
  }
  const edges = scanned.edges.map((edge) => clone(edge));
  const mappedFocusNodeId = focus ? (remap.get(focus.nodeId) ?? focus.nodeId) : undefined;
  const nextFocusNode = mappedFocusNodeId
    ? nodes.find((node) => node.id === mappedFocusNodeId)
    : undefined;

  return {
    graph: {
      version: 1,
      diagramId: scanned.diagramId,
      nodes,
      edges,
      annotations,
    },
    focus: focus && nextFocusNode ? {
      ...clone(focus),
      nodeId: nextFocusNode.id,
      nodeLabel: nextFocusNode.label,
      nodePath: nextFocusNode.path,
      group: nextFocusNode.group,
    } : undefined,
    preservation: {
      version: 1,
      strategy: "stable-path-merge",
      matchedNodes: matchedCurrentIds.size,
      newNodes: nodes.length - matchedCurrentIds.size,
      removedNodes: current.nodes.length - matchedCurrentIds.size,
      preservedCoordinates,
      humanCoordinates,
      preservedLabels,
      carriedAnnotations: annotations.filter((annotation) => annotation.anchorStatus !== "detached").length,
      detachedAnnotations: annotations.filter((annotation) => annotation.anchorStatus === "detached").length,
      preservedFocus: Boolean(focus && nextFocusNode),
    },
  };
}
