"use client"

import { Copy, Eye, EyeOff, Lock, Plus, Trash2, Unlock } from "lucide-react"
import { useEditor } from "@/lib/editor/editor-provider"
import { DEFAULT_BLEND_MODES } from "@/lib/editor/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function LayersPanel() {
  const editor = useEditor()
  const layersTopFirst = [...editor.layers].reverse()

  return (
    <div className="flex w-64 shrink-0 flex-col border-l border-neutral-800 bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Layers</h2>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-neutral-400 hover:text-neutral-100"
          onClick={() => editor.addLayer()}
          aria-label="Add layer"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <ul className="flex flex-col gap-1 p-2">
          {layersTopFirst.map((layer) => {
            const active = layer.id === editor.activeLayerId
            return (
              <li
                key={layer.id}
                onClick={() => editor.setActiveLayerId(layer.id)}
                className={cn(
                  "cursor-pointer rounded-md border px-2 py-2 transition-colors",
                  active
                    ? "border-blue-600 bg-blue-950/40"
                    : "border-transparent hover:bg-neutral-800/60",
                )}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      editor.updateLayerMeta(layer.id, { visible: !layer.visible })
                    }}
                    className="text-neutral-400 hover:text-neutral-100"
                    aria-label={layer.visible ? "Hide layer" : "Show layer"}
                  >
                    {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <input
                    value={layer.name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => editor.updateLayerMeta(layer.id, { name: e.target.value })}
                    className="flex-1 truncate bg-transparent text-xs text-neutral-100 outline-none"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      editor.updateLayerMeta(layer.id, { locked: !layer.locked })
                    }}
                    className="text-neutral-500 hover:text-neutral-100"
                    aria-label={layer.locked ? "Unlock layer" : "Lock layer"}
                  >
                    {layer.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3 opacity-40" />}
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <Select
                    value={layer.blendMode}
                    onValueChange={(v) => editor.updateLayerMeta(layer.id, { blendMode: v as (typeof DEFAULT_BLEND_MODES)[number]["value"] })}
                  >
                    <SelectTrigger
                      onClick={(e) => e.stopPropagation()}
                      className="h-6 flex-1 border-neutral-700 bg-neutral-800 text-[11px]"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_BLEND_MODES.map((bm) => (
                        <SelectItem key={bm.value} value={bm.value} className="text-xs">
                          {bm.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className="w-10 text-[10px] text-neutral-500">Opacity</span>
                  <Slider
                    value={[layer.opacity]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={([v]) => editor.updateLayerMeta(layer.id, { opacity: v })}
                    className="flex-1"
                  />
                  <span className="w-8 text-right text-[10px] tabular-nums text-neutral-500">{layer.opacity}%</span>
                </div>

                <div className="mt-2 flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-neutral-400 hover:text-neutral-100"
                    onClick={(e) => {
                      e.stopPropagation()
                      editor.duplicateLayer(layer.id)
                    }}
                    aria-label="Duplicate layer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-neutral-400 hover:text-red-400"
                    disabled={editor.layers.length <= 1}
                    onClick={(e) => {
                      e.stopPropagation()
                      editor.removeLayer(layer.id)
                    }}
                    aria-label="Delete layer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </ScrollArea>
    </div>
  )
}
