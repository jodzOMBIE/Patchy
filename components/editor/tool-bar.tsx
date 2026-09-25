"use client"

import {
  Brush,
  Circle,
  Droplet,
  Eraser,
  Hand,
  Move,
  Pipette,
  Square,
  Type,
} from "lucide-react"
import { useEditor } from "@/lib/editor/editor-provider"
import type { ToolId } from "@/lib/editor/types"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const TOOLS: { id: ToolId; label: string; icon: typeof Brush; shortcut: string }[] = [
  { id: "move", label: "Move", icon: Move, shortcut: "V" },
  { id: "rect-select", label: "Rectangle Select", icon: Square, shortcut: "M" },
  { id: "ellipse-select", label: "Ellipse Select", icon: Circle, shortcut: "O" },
  { id: "brush", label: "Brush", icon: Brush, shortcut: "B" },
  { id: "eraser", label: "Eraser", icon: Eraser, shortcut: "E" },
  { id: "bucket", label: "Bucket Fill", icon: Droplet, shortcut: "G" },
  { id: "rect-shape", label: "Rectangle Shape", icon: Square, shortcut: "U" },
  { id: "ellipse-shape", label: "Ellipse Shape", icon: Circle, shortcut: "L" },
  { id: "text", label: "Text", icon: Type, shortcut: "T" },
  { id: "eyedropper", label: "Eyedropper", icon: Pipette, shortcut: "I" },
  { id: "hand", label: "Hand (Pan)", icon: Hand, shortcut: "H" },
]

export function ToolBar() {
  const editor = useEditor()
  return (
    <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-neutral-800 bg-neutral-900 py-2">
      {TOOLS.map((tool) => {
        const Icon = tool.icon
        const active = editor.tool === tool.id
        return (
          <Tooltip key={tool.id}>
            <TooltipTrigger
              render={<button type="button" aria-label={tool.label} aria-pressed={active} />}
              onClick={() => editor.setTool(tool.id)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100",
                active && "bg-blue-600 text-white hover:bg-blue-600",
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.75} />
            </TooltipTrigger>
            <TooltipContent side="right">
              {tool.label} <span className="text-neutral-400">({tool.shortcut})</span>
            </TooltipContent>
          </Tooltip>
        )
      })}
      <div className="mt-2 flex flex-col items-center gap-1">
        <ColorSwatches />
      </div>
    </div>
  )
}

function ColorSwatches() {
  const editor = useEditor()
  return (
    <div className="relative h-11 w-11">
      <Tooltip>
        <TooltipTrigger
          render={<label />}
          className="absolute right-0 top-0 h-7 w-7 cursor-pointer overflow-hidden rounded border-2 border-neutral-950 shadow-sm"
        >
          <span className="sr-only">Foreground color</span>
          <span className="absolute inset-0" style={{ backgroundColor: editor.foreground }} />
          <input
            type="color"
            value={editor.foreground}
            onChange={(e) => editor.setForeground(e.target.value)}
            className="absolute -left-2 -top-2 h-12 w-12 cursor-pointer opacity-0"
          />
        </TooltipTrigger>
        <TooltipContent side="right">Foreground color</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={<label />}
          className="absolute bottom-0 left-0 h-7 w-7 cursor-pointer overflow-hidden rounded border-2 border-neutral-950 shadow-sm"
        >
          <span className="sr-only">Background color</span>
          <span className="absolute inset-0" style={{ backgroundColor: editor.background }} />
          <input
            type="color"
            value={editor.background}
            onChange={(e) => editor.setBackground(e.target.value)}
            className="absolute -left-2 -top-2 h-12 w-12 cursor-pointer opacity-0"
          />
        </TooltipTrigger>
        <TooltipContent side="right">Background color</TooltipContent>
      </Tooltip>
    </div>
  )
}
