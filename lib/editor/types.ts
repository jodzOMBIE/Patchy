export type ToolId =
  | "move"
  | "brush"
  | "eraser"
  | "bucket"
  | "rect-select"
  | "ellipse-select"
  | "rect-shape"
  | "ellipse-shape"
  | "text"
  | "eyedropper"
  | "hand"

export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "difference"
  | "color-dodge"
  | "color-burn"

export interface LayerMeta {
  id: string
  name: string
  visible: boolean
  opacity: number // 0-100
  blendMode: BlendMode
  locked: boolean
}

export interface Selection {
  x: number
  y: number
  width: number
  height: number
  shape: "rect" | "ellipse"
}

export interface DocumentSnapshot {
  width: number
  height: number
  layers: LayerMeta[]
  activeLayerId: string
  layerData: Record<string, string> // layer id -> dataURL
}

export interface SavedProjectSummary {
  pathname: string
  name: string
  uploadedAt: string
  size: number
  thumbnailUrl?: string
}

export const DEFAULT_BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
  { value: "darken", label: "Darken" },
  { value: "lighten", label: "Lighten" },
  { value: "difference", label: "Difference" },
  { value: "color-dodge", label: "Color Dodge" },
  { value: "color-burn", label: "Color Burn" },
]
