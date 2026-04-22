// ============================================================
//  ai-draw-mcp  —  Shared type definitions
// ============================================================

/** Supported Mermaid diagram types */
export type DiagramType =
  | "flowchart"
  | "sequence"
  | "class"
  | "state"
  | "er"
  | "gantt"
  | "pie"
  | "mindmap"
  | "timeline"
  | "architecture"
  | "custom";

/** Output image format */
export type OutputFormat = "svg" | "png";

/** Mermaid built-in themes */
export type MermaidTheme = "default" | "dark" | "forest" | "neutral";

/** Flowchart direction */
export type FlowDirection = "TB" | "TD" | "BT" | "LR" | "RL";

/** Node shape in a flowchart */
export type NodeShape =
  | "rect"
  | "round"
  | "stadium"
  | "subroutine"
  | "cylinder"
  | "circle"
  | "diamond"
  | "hexagon"
  | "parallelogram"
  | "trapezoid";

/** Edge / arrow line style */
export type EdgeStyle = "solid" | "dashed" | "dotted" | "thick";

// ─── Flowchart ───────────────────────────────────────────────

export interface FlowchartNode {
  id: string;
  label: string;
  shape?: NodeShape;
}

export interface FlowchartEdge {
  from: string;
  to: string;
  label?: string;
  style?: EdgeStyle;
}

export interface FlowchartInput {
  title?: string;
  direction?: FlowDirection;
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
}

// ─── Sequence ────────────────────────────────────────────────

export type MessageArrow = "solid" | "dashed" | "solid_open" | "dashed_open";

export interface SequenceActor {
  id: string;
  label?: string;
  type?: "participant" | "actor";
}

export interface SequenceMessage {
  from: string;
  to: string;
  label: string;
  arrow?: MessageArrow;
}

export interface SequenceInput {
  title?: string;
  actors: SequenceActor[];
  messages: SequenceMessage[];
}

// ─── Architecture / Component ────────────────────────────────

export type ComponentType = "service" | "database" | "cache" | "queue" | "gateway" | "client" | "external";

export interface ArchitectureComponent {
  id: string;
  label: string;
  type?: ComponentType;
  group?: string;
}

export interface ArchitectureConnection {
  from: string;
  to: string;
  label?: string;
  style?: EdgeStyle;
}

export interface ArchitectureInput {
  title?: string;
  components: ArchitectureComponent[];
  connections: ArchitectureConnection[];
}

// ─── Class Diagram ───────────────────────────────────────────

export type ClassRelation =
  | "inheritance"
  | "composition"
  | "aggregation"
  | "association"
  | "dependency"
  | "realization";

export type MemberVisibility = "+" | "-" | "#" | "~";

export interface ClassMember {
  name: string;
  type?: string;
  visibility?: MemberVisibility;
}

export interface ClassDefinition {
  name: string;
  members?: ClassMember[];
  methods?: ClassMember[];
  annotation?: string;
}

export interface ClassRelationDef {
  from: string;
  to: string;
  type: ClassRelation;
  label?: string;
}

export interface ClassDiagramInput {
  title?: string;
  classes: ClassDefinition[];
  relations: ClassRelationDef[];
}

// ─── Mindmap ─────────────────────────────────────────────────

export interface MindmapNode {
  label: string;
  children?: MindmapNode[];
}

export interface MindmapInput {
  title?: string;
  root: MindmapNode;
}

// ─── Generic Mermaid ─────────────────────────────────────────

export interface RenderDiagramInput {
  title?: string;
  mermaid_code: string;
  theme?: MermaidTheme;
  output_format?: OutputFormat;
}

// ─── SVG Free Draw ───────────────────────────────────────────

export interface RenderSvgInput {
  title?: string;
  svg_content: string;
  width?: number;
  height?: number;
}

// ─── Diagram Record (stored metadata) ────────────────────────

export interface DiagramRecord {
  id: string;
  title: string;
  type: DiagramType;
  createdAt: string;
  svgPath: string;
  pngPath?: string;
  mermaidCode?: string;
}

// ─── Tool return helpers ─────────────────────────────────────

export interface RenderResult {
  diagramId: string;
  title: string;
  svgPath: string;
  pngPath?: string;
  previewUrl: string;
  mermaidCode?: string;
}
