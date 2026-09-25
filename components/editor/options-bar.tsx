"use client"

import { useEditor } from "@/lib/editor/editor-provider"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function OptionsBar() {
  const editor = useEditor()

  return (
    <div className="flex h-11 shrink-0 items-center gap-5 border-b border-neutral-800 bg-neutral-900 px-4 text-xs text-neutral-300">
      {(editor.tool === "brush" || editor.tool === "eraser") && (
        <>
          <SliderField label="Size" value={editor.brushSize} min={1} max={200} onChange={editor.setBrushSize} suffix="px" />
          <SliderField label="Opacity" value={editor.brushOpacity} min={1} max={100} onChange={editor.setBrushOpacity} suffix="%" />
        </>
      )}

      {editor.tool === "bucket" && (
        <span className="text-neutral-500">Click to fill with the foreground color{editor.selection ? " inside the selection" : ""}.</span>
      )}

      {(editor.tool === "rect-shape" || editor.tool === "ellipse-shape") && (
        <>
          <div className="flex items-center gap-2">
            <Label className="text-neutral-400">Style</Label>
            <div className="flex overflow-hidden rounded-md border border-neutral-700">
              <Button
                type="button"
                size="sm"
                variant={editor.shapeFilled ? "default" : "ghost"}
                className="h-7 rounded-none px-3 text-xs"
                onClick={() => editor.setShapeFilled(true)}
              >
                Fill
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!editor.shapeFilled ? "default" : "ghost"}
                className="h-7 rounded-none px-3 text-xs"
                onClick={() => editor.setShapeFilled(false)}
              >
                Stroke
              </Button>
            </div>
          </div>
          {!editor.shapeFilled && <SliderField label="Stroke" value={editor.brushSize} min={1} max={100} onChange={editor.setBrushSize} suffix="px" />}
        </>
      )}

      {editor.tool === "text" && (
        <>
          <SliderField label="Size" value={editor.fontSize} min={8} max={200} onChange={editor.setFontSize} suffix="px" />
          <div className="flex items-center gap-2">
            <Label className="text-neutral-400">Font</Label>
            <Select value={editor.fontFamily} onValueChange={(value) => value && editor.setFontFamily(value)}>
              <SelectTrigger className="h-7 w-40 border-neutral-700 bg-neutral-800 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sans-serif">Sans Serif</SelectItem>
                <SelectItem value="serif">Serif</SelectItem>
                <SelectItem value="monospace">Monospace</SelectItem>
                <SelectItem value="cursive">Cursive</SelectItem>
                <SelectItem value="'Georgia', serif">Georgia</SelectItem>
                <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {(editor.tool === "rect-select" || editor.tool === "ellipse-select") && (
        <span className="text-neutral-500">Drag to select an area. Deselect to clear.</span>
      )}

      {editor.selection && editor.tool !== "rect-select" && editor.tool !== "ellipse-select" && (
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => editor.setSelection(null)}>
          Deselect
        </Button>
      )}

      {editor.selection && (
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => editor.setSelection(null)}>
          Deselect
        </Button>
      )}
    </div>
  )
}

function SliderField({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  suffix?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-neutral-400">{label}</Label>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        className="w-28"
      />
      <span className="w-10 text-right text-neutral-400 tabular-nums">
        {value}
        {suffix}
      </span>
    </div>
  )
}
