"use client"

import { useState } from "react"
import { useEditor } from "@/lib/editor/editor-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const PRESETS = [
  { label: "1024 x 768", width: 1024, height: 768 },
  { label: "1920 x 1080", width: 1920, height: 1080 },
  { label: "Square 1024", width: 1024, height: 1024 },
  { label: "800 x 600", width: 800, height: 600 },
]

export function NewDocumentDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const editor = useEditor()
  const [width, setWidth] = useState(1024)
  const [height, setHeight] = useState(768)
  const [background, setBackground] = useState<"white" | "transparent">("white")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Document</DialogTitle>
          <DialogDescription>Create a new canvas. This replaces the current document.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setWidth(preset.width)
                setHeight(preset.height)
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="grid gap-1.5">
            <Label htmlFor="doc-width">Width</Label>
            <Input
              id="doc-width"
              type="number"
              min={1}
              max={8000}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value) || 1)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="doc-height">Height</Label>
            <Input
              id="doc-height"
              type="number"
              min={1}
              max={8000}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value) || 1)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant={background === "white" ? "default" : "outline"}
            onClick={() => setBackground("white")}
          >
            White background
          </Button>
          <Button
            type="button"
            size="sm"
            variant={background === "transparent" ? "default" : "outline"}
            onClick={() => setBackground("transparent")}
          >
            Transparent
          </Button>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              editor.newDocument(width, height, background)
              onOpenChange(false)
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
