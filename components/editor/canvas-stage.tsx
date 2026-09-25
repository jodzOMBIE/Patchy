"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useEditor } from "@/lib/editor/editor-provider"
import { floodFill, rgbaToHex } from "@/lib/editor/flood-fill"
import { cn } from "@/lib/utils"

interface Point {
  x: number
  y: number
}

function getSelectionClipPath(ctx: CanvasRenderingContext2D, sel: { x: number; y: number; width: number; height: number; shape: "rect" | "ellipse" }) {
  ctx.beginPath()
  if (sel.shape === "ellipse") {
    ctx.ellipse(sel.x + sel.width / 2, sel.y + sel.height / 2, Math.abs(sel.width) / 2, Math.abs(sel.height) / 2, 0, 0, Math.PI * 2)
  } else {
    ctx.rect(sel.x, sel.y, sel.width, sel.height)
  }
}

export function CanvasStage() {
  const editor = useEditor()
  const containerRef = useRef<HTMLDivElement>(null)
  const compositeCanvasRef = editor.getCompositeCanvasRef()
  const overlayRef = useRef<HTMLCanvasElement>(null)

  const drawingRef = useRef(false)
  const lastPointRef = useRef<Point | null>(null)
  const dragStartRef = useRef<Point | null>(null)
  const moveSnapshotRef = useRef<HTMLCanvasElement | null>(null)

  const [textEditor, setTextEditor] = useState<{ x: number; y: number; docX: number; docY: number } | null>(null)
  const [textValue, setTextValue] = useState("")

  useEffect(() => {
    editor.renderComposite()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.version, editor.width, editor.height])

  useEffect(() => {
    const overlay = overlayRef.current
    if (overlay) {
      overlay.width = editor.width
      overlay.height = editor.height
    }
  }, [editor.width, editor.height])

  // Redraw persistent selection marquee whenever selection changes and we're not mid-drag
  useEffect(() => {
    if (drawingRef.current) return
    const overlay = overlayRef.current
    if (!overlay) return
    const ctx = overlay.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, overlay.width, overlay.height)
    if (editor.selection) {
      drawMarquee(ctx, editor.selection)
    }
  }, [editor.selection, editor.version])

  function drawMarquee(
    ctx: CanvasRenderingContext2D,
    sel: { x: number; y: number; width: number; height: number; shape: "rect" | "ellipse" },
  ) {
    ctx.save()
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 4])
    getSelectionClipPath(ctx, sel)
    ctx.stroke()
    ctx.strokeStyle = "#0a0a0a"
    ctx.lineDashOffset = 6
    ctx.stroke()
    ctx.restore()
  }

  const toDocCoords = useCallback((e: React.PointerEvent): Point => {
    const canvas = compositeCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height
    return { x, y }
  }, [compositeCanvasRef])

  const applySelectionClip = (ctx: CanvasRenderingContext2D) => {
    if (editor.selection) {
      ctx.save()
      getSelectionClipPath(ctx, editor.selection)
      ctx.clip()
      return true
    }
    return false
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (editor.layers.find((l) => l.id === editor.activeLayerId)?.locked) return
    const pt = toDocCoords(e)
    e.currentTarget.setPointerCapture(e.pointerId)

    if (editor.tool === "brush" || editor.tool === "eraser") {
      editor.commitHistory()
      drawingRef.current = true
      lastPointRef.current = pt
      const canvas = editor.getLayerCanvas(editor.activeLayerId)
      const ctx = canvas.getContext("2d")
      if (ctx) {
        const clipped = applySelectionClip(ctx)
        ctx.globalCompositeOperation = editor.tool === "eraser" ? "destination-out" : "source-over"
        ctx.globalAlpha = editor.brushOpacity / 100
        ctx.strokeStyle = editor.foreground
        ctx.fillStyle = editor.foreground
        ctx.lineWidth = editor.brushSize
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.beginPath()
        ctx.moveTo(pt.x, pt.y)
        ctx.lineTo(pt.x + 0.01, pt.y + 0.01)
        ctx.stroke()
        if (clipped) ctx.restore()
      }
      editor.renderComposite()
      return
    }

    if (editor.tool === "bucket") {
      editor.commitHistory()
      const canvas = editor.getLayerCanvas(editor.activeLayerId)
      const ctx = canvas.getContext("2d")
      if (ctx) {
        floodFill(ctx, canvas.width, canvas.height, pt.x, pt.y, editor.foreground, 32, editor.selection ?? undefined)
      }
      editor.renderComposite()
      return
    }

    if (editor.tool === "rect-select" || editor.tool === "ellipse-select" || editor.tool === "rect-shape" || editor.tool === "ellipse-shape") {
      dragStartRef.current = pt
      drawingRef.current = true
      return
    }

    if (editor.tool === "text") {
      const rect = e.currentTarget.getBoundingClientRect()
      setTextEditor({ x: e.clientX, y: e.clientY, docX: pt.x, docY: pt.y })
      setTextValue("")
      return
    }

    if (editor.tool === "eyedropper") {
      const canvas = compositeCanvasRef.current
      const ctx = canvas?.getContext("2d")
      if (ctx) {
        const data = ctx.getImageData(Math.round(pt.x), Math.round(pt.y), 1, 1).data
        editor.setForeground(rgbaToHex(data[0], data[1], data[2]))
      }
      return
    }

    if (editor.tool === "move") {
      editor.commitHistory()
      const canvas = editor.getLayerCanvas(editor.activeLayerId)
      const snapshot = document.createElement("canvas")
      snapshot.width = canvas.width
      snapshot.height = canvas.height
      snapshot.getContext("2d")?.drawImage(canvas, 0, 0)
      moveSnapshotRef.current = snapshot
      dragStartRef.current = pt
      drawingRef.current = true
      return
    }

    if (editor.tool === "hand") {
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      drawingRef.current = true
      return
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const pt = toDocCoords(e)

    if (editor.tool === "brush" || editor.tool === "eraser") {
      const canvas = editor.getLayerCanvas(editor.activeLayerId)
      const ctx = canvas.getContext("2d")
      const last = lastPointRef.current
      if (ctx && last) {
        const clipped = applySelectionClip(ctx)
        ctx.globalCompositeOperation = editor.tool === "eraser" ? "destination-out" : "source-over"
        ctx.globalAlpha = editor.brushOpacity / 100
        ctx.strokeStyle = editor.foreground
        ctx.lineWidth = editor.brushSize
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.beginPath()
        ctx.moveTo(last.x, last.y)
        ctx.lineTo(pt.x, pt.y)
        ctx.stroke()
        if (clipped) ctx.restore()
      }
      lastPointRef.current = pt
      editor.renderComposite()
      return
    }

    if (editor.tool === "rect-select" || editor.tool === "ellipse-select") {
      const start = dragStartRef.current
      if (!start) return
      const overlay = overlayRef.current
      const ctx = overlay?.getContext("2d")
      if (ctx && overlay) {
        ctx.clearRect(0, 0, overlay.width, overlay.height)
        const sel = normalizeRect(start, pt, editor.tool === "ellipse-select" ? "ellipse" : "rect")
        drawMarquee(ctx, sel)
      }
      return
    }

    if (editor.tool === "rect-shape" || editor.tool === "ellipse-shape") {
      const start = dragStartRef.current
      if (!start) return
      const overlay = overlayRef.current
      const ctx = overlay?.getContext("2d")
      if (ctx && overlay) {
        ctx.clearRect(0, 0, overlay.width, overlay.height)
        const sel = normalizeRect(start, pt, editor.tool === "ellipse-shape" ? "ellipse" : "rect")
        ctx.save()
        ctx.globalAlpha = 0.85
        if (editor.shapeFilled) {
          ctx.fillStyle = editor.foreground
          getSelectionClipPath(ctx, sel)
          ctx.fill()
        } else {
          ctx.strokeStyle = editor.foreground
          ctx.lineWidth = Math.max(2, editor.brushSize / 4)
          getSelectionClipPath(ctx, sel)
          ctx.stroke()
        }
        ctx.restore()
      }
      return
    }

    if (editor.tool === "move") {
      const start = dragStartRef.current
      const snapshot = moveSnapshotRef.current
      if (!start || !snapshot) return
      const canvas = editor.getLayerCanvas(editor.activeLayerId)
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(snapshot, pt.x - start.x, pt.y - start.y)
      }
      editor.renderComposite()
      return
    }

    if (editor.tool === "hand") {
      const start = dragStartRef.current
      const container = containerRef.current
      if (!start || !container) return
      container.scrollLeft -= e.clientX - start.x
      container.scrollTop -= e.clientY - start.y
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      return
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) {
      return
    }
    const pt = toDocCoords(e)

    if (editor.tool === "rect-select" || editor.tool === "ellipse-select") {
      const start = dragStartRef.current
      if (start) {
        const sel = normalizeRect(start, pt, editor.tool === "ellipse-select" ? "ellipse" : "rect")
        if (sel.width > 2 && sel.height > 2) {
          editor.setSelection(sel)
        } else {
          editor.setSelection(null)
        }
      }
    }

    if (editor.tool === "rect-shape" || editor.tool === "ellipse-shape") {
      const start = dragStartRef.current
      if (start) {
        const sel = normalizeRect(start, pt, editor.tool === "ellipse-shape" ? "ellipse" : "rect")
        if (sel.width > 1 && sel.height > 1) {
          editor.commitHistory()
          const canvas = editor.getLayerCanvas(editor.activeLayerId)
          const ctx = canvas.getContext("2d")
          if (ctx) {
            const clipped = applySelectionClip(ctx)
            if (editor.shapeFilled) {
              ctx.fillStyle = editor.foreground
              getSelectionClipPath(ctx, sel)
              ctx.fill()
            } else {
              ctx.strokeStyle = editor.foreground
              ctx.lineWidth = Math.max(2, editor.brushSize / 4)
              getSelectionClipPath(ctx, sel)
              ctx.stroke()
            }
            if (clipped) ctx.restore()
          }
          editor.renderComposite()
        }
      }
      const overlay = overlayRef.current
      const octx = overlay?.getContext("2d")
      if (octx && overlay) octx.clearRect(0, 0, overlay.width, overlay.height)
    }

    drawingRef.current = false
    lastPointRef.current = null
    dragStartRef.current = null
    moveSnapshotRef.current = null
  }

  const commitText = () => {
    if (textEditor && textValue.trim()) {
      editor.drawTextOnLayer(editor.activeLayerId, textEditor.docX, textEditor.docY, textValue)
    }
    setTextEditor(null)
    setTextValue("")
  }

  const scale = editor.zoom / 100
  const cursorClass =
    editor.tool === "hand"
      ? "cursor-grab active:cursor-grabbing"
      : editor.tool === "eyedropper"
        ? "cursor-crosshair"
        : editor.tool === "move"
          ? "cursor-move"
          : editor.tool === "text"
            ? "cursor-text"
            : "cursor-crosshair"

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-auto bg-neutral-800"
      style={{
        backgroundImage:
          "linear-gradient(45deg, #33333a 25%, transparent 25%), linear-gradient(-45deg, #33333a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #33333a 75%), linear-gradient(-45deg, transparent 75%, #33333a 75%)",
        backgroundSize: "20px 20px",
        backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
      }}
    >
      <div className="flex min-h-full min-w-full items-center justify-center p-16">
        <div
          className="relative shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_20px_60px_rgba(0,0,0,0.5)]"
          style={{ width: editor.width * scale, height: editor.height * scale }}
        >
          <canvas
            ref={compositeCanvasRef}
            width={editor.width}
            height={editor.height}
            className={cn("absolute inset-0 h-full w-full touch-none bg-white", cursorClass)}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
          {textEditor && (
            <TextOverlay
              x={textEditor.x}
              y={textEditor.y}
              value={textValue}
              fontSize={editor.fontSize}
              fontFamily={editor.fontFamily}
              color={editor.foreground}
              onChange={setTextValue}
              onCommit={commitText}
              onCancel={() => setTextEditor(null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function normalizeRect(start: Point, end: Point, shape: "rect" | "ellipse") {
  const x = Math.min(start.x, end.x)
  const y = Math.min(start.y, end.y)
  const width = Math.abs(end.x - start.x)
  const height = Math.abs(end.y - start.y)
  return { x, y, width, height, shape }
}

function TextOverlay({
  x,
  y,
  value,
  fontSize,
  fontFamily,
  color,
  onChange,
  onCommit,
  onCancel,
}: {
  x: number
  y: number
  value: string
  fontSize: number
  fontFamily: string
  color: string
  onChange: (v: string) => void
  onCommit: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel()
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onCommit()
      }}
      style={{
        position: "fixed",
        left: x,
        top: y,
        fontSize,
        fontFamily,
        color,
        transform: "translate(0, -8px)",
        minWidth: 160,
      }}
      className="z-50 resize rounded border-2 border-dashed border-blue-400 bg-black/20 p-1 leading-tight outline-none backdrop-blur-sm"
      placeholder="Type text, Esc to cancel"
    />
  )
}
