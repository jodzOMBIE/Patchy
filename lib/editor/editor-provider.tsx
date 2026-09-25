"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { BlendMode, DocumentSnapshot, LayerMeta, Selection, ToolId } from "./types"

let idCounter = 0
function nextId(prefix: string) {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`
}

function createBlankCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

interface HistoryEntry {
  width: number
  height: number
  layers: LayerMeta[]
  activeLayerId: string
  layerData: Record<string, string>
}

interface EditorState {
  width: number
  height: number
  layers: LayerMeta[]
  activeLayerId: string
  tool: ToolId
  foreground: string
  background: string
  brushSize: number
  brushOpacity: number
  brushHardness: number
  shapeFilled: boolean
  fontSize: number
  fontFamily: string
  selection: Selection | null
  zoom: number
  canUndo: boolean
  canRedo: boolean
  docName: string
  version: number
}

interface EditorApi extends EditorState {
  getLayerCanvas: (id: string) => HTMLCanvasElement
  getCompositeCanvasRef: () => React.RefObject<HTMLCanvasElement | null>
  renderComposite: () => void
  addLayer: (opts?: { name?: string; fromImage?: HTMLImageElement }) => string
  removeLayer: (id: string) => void
  duplicateLayer: (id: string) => void
  updateLayerMeta: (id: string, partial: Partial<LayerMeta>) => void
  reorderLayer: (id: string, direction: "up" | "down") => void
  setActiveLayerId: (id: string) => void
  mergeDown: (id: string) => void
  setTool: (tool: ToolId) => void
  setForeground: (color: string) => void
  setBackground: (color: string) => void
  setBrushSize: (size: number) => void
  setBrushOpacity: (opacity: number) => void
  setBrushHardness: (hardness: number) => void
  setShapeFilled: (filled: boolean) => void
  setFontSize: (size: number) => void
  setFontFamily: (family: string) => void
  setSelection: (selection: Selection | null) => void
  setZoom: (zoom: number) => void
  newDocument: (width: number, height: number, background: "white" | "transparent", name?: string) => void
  loadImageAsLayer: (file: File) => Promise<void>
  loadImageAsDocument: (file: File) => Promise<void>
  commitHistory: () => void
  undo: () => void
  redo: () => void
  exportDataURL: (type?: string, quality?: number) => string
  serializeProject: () => DocumentSnapshot
  loadProject: (snapshot: DocumentSnapshot, name?: string) => Promise<void>
  drawTextOnLayer: (layerId: string, x: number, y: number, text: string) => void
  clearSelectionArea: () => void
  fillSelectionOrLayer: (color: string) => void
}

const EditorContext = createContext<EditorApi | null>(null)

const INITIAL_WIDTH = 1024
const INITIAL_HEIGHT = 768

export function EditorProvider({ children }: { children: ReactNode }) {
  const layerCanvases = useRef<Map<string, HTMLCanvasElement>>(new Map())
  const compositeRef = useRef<HTMLCanvasElement | null>(null)
  const undoStack = useRef<HistoryEntry[]>([])
  const redoStack = useRef<HistoryEntry[]>([])

  const [state, setState] = useState<EditorState>(() => {
    const bgId = nextId("layer")
    return {
      width: INITIAL_WIDTH,
      height: INITIAL_HEIGHT,
      layers: [
        {
          id: bgId,
          name: "Background",
          visible: true,
          opacity: 100,
          blendMode: "normal",
          locked: false,
        },
      ],
      activeLayerId: bgId,
      tool: "brush",
      foreground: "#e5484d",
      background: "#ffffff",
      brushSize: 24,
      brushOpacity: 100,
      brushHardness: 80,
      shapeFilled: true,
      fontSize: 48,
      fontFamily: "sans-serif",
      selection: null,
      zoom: 100,
      canUndo: false,
      canRedo: false,
      docName: "Untitled",
      version: 0,
    }
  })

  const bump = useCallback(() => {
    setState((s) => ({ ...s, version: s.version + 1 }))
  }, [])

  const getLayerCanvas = useCallback(
    (id: string) => {
      let canvas = layerCanvases.current.get(id)
      if (!canvas) {
        canvas = createBlankCanvas(state.width, state.height)
        layerCanvases.current.set(id, canvas)
      }
      return canvas
    },
    [state.width, state.height],
  )

  const renderComposite = useCallback(() => {
    const composite = compositeRef.current
    if (!composite) return
    const ctx = composite.getContext("2d")
    if (!ctx) return
    if (composite.width !== state.width) composite.width = state.width
    if (composite.height !== state.height) composite.height = state.height
    ctx.clearRect(0, 0, composite.width, composite.height)
    for (const layer of state.layers) {
      if (!layer.visible) continue
      const canvas = layerCanvases.current.get(layer.id)
      if (!canvas) continue
      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity / 100))
      ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation
      ctx.drawImage(canvas, 0, 0)
      ctx.restore()
    }
  }, [state.layers, state.width, state.height])

  const captureHistoryEntry = useCallback((): HistoryEntry => {
    const layerData: Record<string, string> = {}
    for (const layer of state.layers) {
      const canvas = layerCanvases.current.get(layer.id)
      layerData[layer.id] = canvas ? canvas.toDataURL("image/png") : ""
    }
    return {
      width: state.width,
      height: state.height,
      layers: state.layers.map((l) => ({ ...l })),
      activeLayerId: state.activeLayerId,
      layerData,
    }
  }, [state.layers, state.width, state.height, state.activeLayerId])

  const commitHistory = useCallback(() => {
    const entry = captureHistoryEntry()
    undoStack.current.push(entry)
    if (undoStack.current.length > 24) undoStack.current.shift()
    redoStack.current = []
    setState((s) => ({ ...s, canUndo: true, canRedo: false }))
  }, [captureHistoryEntry])

  const restoreEntry = useCallback((entry: HistoryEntry) => {
    layerCanvases.current.clear()
    const loaders = entry.layers.map((layer) => {
      return new Promise<void>((resolve) => {
        const canvas = createBlankCanvas(entry.width, entry.height)
        const dataUrl = entry.layerData[layer.id]
        if (!dataUrl) {
          layerCanvases.current.set(layer.id, canvas)
          resolve()
          return
        }
        const img = new Image()
        img.onload = () => {
          const ctx = canvas.getContext("2d")
          ctx?.drawImage(img, 0, 0)
          layerCanvases.current.set(layer.id, canvas)
          resolve()
        }
        img.onerror = () => resolve()
        img.src = dataUrl
      })
    })
    Promise.all(loaders).then(() => {
      setState((s) => ({
        ...s,
        width: entry.width,
        height: entry.height,
        layers: entry.layers.map((l) => ({ ...l })),
        activeLayerId: entry.activeLayerId,
        version: s.version + 1,
      }))
    })
  }, [])

  const undo = useCallback(() => {
    const prev = undoStack.current.pop()
    if (!prev) return
    redoStack.current.push(captureHistoryEntry())
    restoreEntry(prev)
    setState((s) => ({ ...s, canUndo: undoStack.current.length > 0, canRedo: true }))
  }, [captureHistoryEntry, restoreEntry])

  const redo = useCallback(() => {
    const next = redoStack.current.pop()
    if (!next) return
    undoStack.current.push(captureHistoryEntry())
    restoreEntry(next)
    setState((s) => ({ ...s, canUndo: true, canRedo: redoStack.current.length > 0 }))
  }, [captureHistoryEntry, restoreEntry])

  const addLayer = useCallback(
    (opts?: { name?: string; fromImage?: HTMLImageElement }) => {
      commitHistory()
      const id = nextId("layer")
      const canvas = createBlankCanvas(state.width, state.height)
      if (opts?.fromImage) {
        const ctx = canvas.getContext("2d")
        if (ctx) {
          const img = opts.fromImage
          const scale = Math.min(state.width / img.width, state.height / img.height, 1)
          const w = img.width * scale
          const h = img.height * scale
          ctx.drawImage(img, (state.width - w) / 2, (state.height - h) / 2, w, h)
        }
      }
      layerCanvases.current.set(id, canvas)
      setState((s) => ({
        ...s,
        layers: [
          ...s.layers,
          {
            id,
            name: opts?.name ?? `Layer ${s.layers.length + 1}`,
            visible: true,
            opacity: 100,
            blendMode: "normal",
            locked: false,
          },
        ],
        activeLayerId: id,
        version: s.version + 1,
      }))
      return id
    },
    [commitHistory, state.width, state.height],
  )

  const removeLayer = useCallback(
    (id: string) => {
      if (state.layers.length <= 1) return
      commitHistory()
      layerCanvases.current.delete(id)
      setState((s) => {
        const layers = s.layers.filter((l) => l.id !== id)
        const activeLayerId = s.activeLayerId === id ? layers[layers.length - 1].id : s.activeLayerId
        return { ...s, layers, activeLayerId, version: s.version + 1 }
      })
    },
    [commitHistory, state.layers.length],
  )

  const duplicateLayer = useCallback(
    (id: string) => {
      commitHistory()
      const source = layerCanvases.current.get(id)
      const newId = nextId("layer")
      const canvas = createBlankCanvas(state.width, state.height)
      if (source) canvas.getContext("2d")?.drawImage(source, 0, 0)
      layerCanvases.current.set(newId, canvas)
      setState((s) => {
        const idx = s.layers.findIndex((l) => l.id === id)
        const original = s.layers[idx]
        const copy: LayerMeta = { ...original, id: newId, name: `${original.name} copy` }
        const layers = [...s.layers]
        layers.splice(idx + 1, 0, copy)
        return { ...s, layers, activeLayerId: newId, version: s.version + 1 }
      })
    },
    [commitHistory, state.width, state.height],
  )

  const updateLayerMeta = useCallback((id: string, partial: Partial<LayerMeta>) => {
    setState((s) => ({
      ...s,
      layers: s.layers.map((l) => (l.id === id ? { ...l, ...partial } : l)),
      version: s.version + 1,
    }))
  }, [])

  const reorderLayer = useCallback(
    (id: string, direction: "up" | "down") => {
      setState((s) => {
        const idx = s.layers.findIndex((l) => l.id === id)
        const targetIdx = direction === "up" ? idx + 1 : idx - 1
        if (targetIdx < 0 || targetIdx >= s.layers.length) return s
        const layers = [...s.layers]
        const [item] = layers.splice(idx, 1)
        layers.splice(targetIdx, 0, item)
        return { ...s, layers, version: s.version + 1 }
      })
    },
    [],
  )

  const mergeDown = useCallback(
    (id: string) => {
      setState((s) => {
        const idx = s.layers.findIndex((l) => l.id === id)
        if (idx <= 0) return s
        const below = s.layers[idx - 1]
        const top = s.layers[idx]
        const topCanvas = layerCanvases.current.get(top.id)
        const belowCanvas = layerCanvases.current.get(below.id)
        if (topCanvas && belowCanvas) {
          const ctx = belowCanvas.getContext("2d")
          if (ctx) {
            ctx.save()
            ctx.globalAlpha = Math.max(0, Math.min(1, top.opacity / 100))
            ctx.globalCompositeOperation = top.blendMode as GlobalCompositeOperation
            ctx.drawImage(topCanvas, 0, 0)
            ctx.restore()
          }
        }
        layerCanvases.current.delete(top.id)
        const layers = s.layers.filter((l) => l.id !== top.id)
        return { ...s, layers, activeLayerId: below.id, version: s.version + 1 }
      })
    },
    [],
  )

  const setActiveLayerId = useCallback((id: string) => setState((s) => ({ ...s, activeLayerId: id })), [])
  const setTool = useCallback((tool: ToolId) => setState((s) => ({ ...s, tool })), [])
  const setForeground = useCallback((color: string) => setState((s) => ({ ...s, foreground: color })), [])
  const setBackground = useCallback((color: string) => setState((s) => ({ ...s, background: color })), [])
  const setBrushSize = useCallback((size: number) => setState((s) => ({ ...s, brushSize: size })), [])
  const setBrushOpacity = useCallback((opacity: number) => setState((s) => ({ ...s, brushOpacity: opacity })), [])
  const setBrushHardness = useCallback((hardness: number) => setState((s) => ({ ...s, brushHardness: hardness })), [])
  const setShapeFilled = useCallback((filled: boolean) => setState((s) => ({ ...s, shapeFilled: filled })), [])
  const setFontSize = useCallback((size: number) => setState((s) => ({ ...s, fontSize: size })), [])
  const setFontFamily = useCallback((family: string) => setState((s) => ({ ...s, fontFamily: family })), [])
  const setSelection = useCallback((selection: Selection | null) => setState((s) => ({ ...s, selection })), [])
  const setZoom = useCallback((zoom: number) => setState((s) => ({ ...s, zoom: Math.max(10, Math.min(400, zoom)) })), [])

  const newDocument = useCallback(
    (width: number, height: number, background: "white" | "transparent", name?: string) => {
      layerCanvases.current.clear()
      undoStack.current = []
      redoStack.current = []
      const id = nextId("layer")
      const canvas = createBlankCanvas(width, height)
      if (background === "white") {
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.fillStyle = "#ffffff"
          ctx.fillRect(0, 0, width, height)
        }
      }
      layerCanvases.current.set(id, canvas)
      setState((s) => ({
        ...s,
        width,
        height,
        layers: [
          {
            id,
            name: "Background",
            visible: true,
            opacity: 100,
            blendMode: "normal",
            locked: false,
          },
        ],
        activeLayerId: id,
        selection: null,
        zoom: 100,
        canUndo: false,
        canRedo: false,
        docName: name ?? "Untitled",
        version: s.version + 1,
      }))
    },
    [],
  )

  const readFileAsImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = reader.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const loadImageAsLayer = useCallback(
    async (file: File) => {
      const img = await readFileAsImage(file)
      addLayer({ name: file.name.replace(/\.[^.]+$/, ""), fromImage: img })
    },
    [addLayer],
  )

  const loadImageAsDocument = useCallback(async (file: File) => {
    const img = await readFileAsImage(file)
    layerCanvases.current.clear()
    undoStack.current = []
    redoStack.current = []
    const id = nextId("layer")
    const canvas = createBlankCanvas(img.width, img.height)
    canvas.getContext("2d")?.drawImage(img, 0, 0)
    layerCanvases.current.set(id, canvas)
    setState((s) => ({
      ...s,
      width: img.width,
      height: img.height,
      layers: [
        {
          id,
          name: file.name.replace(/\.[^.]+$/, "") || "Background",
          visible: true,
          opacity: 100,
          blendMode: "normal",
          locked: false,
        },
      ],
      activeLayerId: id,
      selection: null,
      zoom: 100,
      canUndo: false,
      canRedo: false,
      docName: file.name.replace(/\.[^.]+$/, "") || "Untitled",
      version: s.version + 1,
    }))
  }, [])

  const exportDataURL = useCallback(
    (type = "image/png", quality?: number) => {
      renderComposite()
      const composite = compositeRef.current
      if (!composite) return ""
      if (type === "image/jpeg") {
        const flat = createBlankCanvas(composite.width, composite.height)
        const ctx = flat.getContext("2d")
        if (ctx) {
          ctx.fillStyle = "#ffffff"
          ctx.fillRect(0, 0, flat.width, flat.height)
          ctx.drawImage(composite, 0, 0)
        }
        return flat.toDataURL(type, quality)
      }
      return composite.toDataURL(type, quality)
    },
    [renderComposite],
  )

  const serializeProject = useCallback((): DocumentSnapshot => {
    const layerData: Record<string, string> = {}
    for (const layer of state.layers) {
      const canvas = layerCanvases.current.get(layer.id)
      layerData[layer.id] = canvas ? canvas.toDataURL("image/png") : ""
    }
    return {
      width: state.width,
      height: state.height,
      layers: state.layers.map((l) => ({ ...l })),
      activeLayerId: state.activeLayerId,
      layerData,
    }
  }, [state.layers, state.width, state.height, state.activeLayerId])

  const loadProject = useCallback(async (snapshot: DocumentSnapshot, name?: string) => {
    layerCanvases.current.clear()
    undoStack.current = []
    redoStack.current = []
    const loaders = snapshot.layers.map((layer) => {
      return new Promise<void>((resolve) => {
        const canvas = createBlankCanvas(snapshot.width, snapshot.height)
        const dataUrl = snapshot.layerData[layer.id]
        if (!dataUrl) {
          layerCanvases.current.set(layer.id, canvas)
          resolve()
          return
        }
        const img = new Image()
        img.onload = () => {
          canvas.getContext("2d")?.drawImage(img, 0, 0)
          layerCanvases.current.set(layer.id, canvas)
          resolve()
        }
        img.onerror = () => resolve()
        img.src = dataUrl
      })
    })
    await Promise.all(loaders)
    setState((s) => ({
      ...s,
      width: snapshot.width,
      height: snapshot.height,
      layers: snapshot.layers.map((l) => ({ ...l })),
      activeLayerId: snapshot.activeLayerId,
      selection: null,
      zoom: 100,
      canUndo: false,
      canRedo: false,
      docName: name ?? s.docName,
      version: s.version + 1,
    }))
  }, [])

  const drawTextOnLayer = useCallback(
    (layerId: string, x: number, y: number, text: string) => {
      const canvas = layerCanvases.current.get(layerId)
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      commitHistory()
      ctx.fillStyle = state.foreground
      ctx.font = `${state.fontSize}px ${state.fontFamily}`
      ctx.textBaseline = "top"
      const lines = text.split("\n")
      lines.forEach((line, i) => {
        ctx.fillText(line, x, y + i * state.fontSize * 1.2)
      })
      bump()
    },
    [commitHistory, state.foreground, state.fontSize, state.fontFamily, bump],
  )

  const clearSelectionArea = useCallback(() => {
    const canvas = layerCanvases.current.get(state.activeLayerId)
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    commitHistory()
    if (state.selection) {
      ctx.save()
      ctx.beginPath()
      if (state.selection.shape === "ellipse") {
        ctx.ellipse(
          state.selection.x + state.selection.width / 2,
          state.selection.y + state.selection.height / 2,
          state.selection.width / 2,
          state.selection.height / 2,
          0,
          0,
          Math.PI * 2,
        )
      } else {
        ctx.rect(state.selection.x, state.selection.y, state.selection.width, state.selection.height)
      }
      ctx.clip()
      ctx.clearRect(state.selection.x, state.selection.y, state.selection.width, state.selection.height)
      ctx.restore()
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    bump()
  }, [commitHistory, state.activeLayerId, state.selection, bump])

  const fillSelectionOrLayer = useCallback(
    (color: string) => {
      const canvas = layerCanvases.current.get(state.activeLayerId)
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      commitHistory()
      ctx.save()
      ctx.fillStyle = color
      if (state.selection) {
        ctx.beginPath()
        if (state.selection.shape === "ellipse") {
          ctx.ellipse(
            state.selection.x + state.selection.width / 2,
            state.selection.y + state.selection.height / 2,
            state.selection.width / 2,
            state.selection.height / 2,
            0,
            0,
            Math.PI * 2,
          )
        } else {
          ctx.rect(state.selection.x, state.selection.y, state.selection.width, state.selection.height)
        }
        ctx.clip()
        ctx.fillRect(state.selection.x, state.selection.y, state.selection.width, state.selection.height)
      } else {
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      ctx.restore()
      bump()
    },
    [commitHistory, state.activeLayerId, state.selection, bump],
  )

  const getCompositeCanvasRef = useCallback(() => compositeRef, [])

  const api: EditorApi = useMemo(
    () => ({
      ...state,
      getLayerCanvas,
      getCompositeCanvasRef,
      renderComposite,
      addLayer,
      removeLayer,
      duplicateLayer,
      updateLayerMeta,
      reorderLayer,
      setActiveLayerId,
      mergeDown,
      setTool,
      setForeground,
      setBackground,
      setBrushSize,
      setBrushOpacity,
      setBrushHardness,
      setShapeFilled,
      setFontSize,
      setFontFamily,
      setSelection,
      setZoom,
      newDocument,
      loadImageAsLayer,
      loadImageAsDocument,
      commitHistory,
      undo,
      redo,
      exportDataURL,
      serializeProject,
      loadProject,
      drawTextOnLayer,
      clearSelectionArea,
      fillSelectionOrLayer,
    }),
    [
      state,
      getLayerCanvas,
      getCompositeCanvasRef,
      renderComposite,
      addLayer,
      removeLayer,
      duplicateLayer,
      updateLayerMeta,
      reorderLayer,
      setActiveLayerId,
      mergeDown,
      setTool,
      setForeground,
      setBackground,
      setBrushSize,
      setBrushOpacity,
      setBrushHardness,
      setShapeFilled,
      setFontSize,
      setFontFamily,
      setSelection,
      setZoom,
      newDocument,
      loadImageAsLayer,
      loadImageAsDocument,
      commitHistory,
      undo,
      redo,
      exportDataURL,
      serializeProject,
      loadProject,
      drawTextOnLayer,
      clearSelectionArea,
      fillSelectionOrLayer,
    ],
  )

  return <EditorContext.Provider value={api}>{children}</EditorContext.Provider>
}

export function useEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error("useEditor must be used within EditorProvider")
  return ctx
}
