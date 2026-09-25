"use client"

import { useRef, useState } from "react"
import {
  Cloud,
  CloudDownload,
  Download,
  File,
  FilePlus,
  ImagePlus,
  Layers as LayersIcon,
  Minus,
  Plus,
  Redo2,
  Undo2,
} from "lucide-react"
import { useEditor } from "@/lib/editor/editor-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NewDocumentDialog } from "./new-document-dialog"
import { CloudDialog } from "./cloud-dialog"

function download(dataUrl: string, filename: string) {
  const a = document.createElement("a")
  a.href = dataUrl
  a.download = filename
  a.click()
}

export function TopBar() {
  const editor = useEditor()
  const [newDocOpen, setNewDocOpen] = useState(false)
  const [cloudMode, setCloudMode] = useState<"save" | "load" | null>(null)
  const openImageInputRef = useRef<HTMLInputElement>(null)
  const openAsLayerInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex h-11 shrink-0 items-center justify-between border-b border-neutral-800 bg-neutral-900 px-3">
      <div className="flex items-center gap-1">
        <div className="mr-2 flex items-center gap-1.5 text-neutral-100">
          <LayersIcon className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-semibold">Patchy Web</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs text-neutral-300" />}>
            <File className="h-3.5 w-3.5" /> File
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setNewDocOpen(true)}>
              <FilePlus className="mr-2 h-4 w-4" /> New document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openImageInputRef.current?.click()}>
              <ImagePlus className="mr-2 h-4 w-4" /> Open image as document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openAsLayerInputRef.current?.click()}>
              <ImagePlus className="mr-2 h-4 w-4" /> Place image as layer
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCloudMode("save")}>
              <Cloud className="mr-2 h-4 w-4" /> Save to cloud
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCloudMode("load")}>
              <CloudDownload className="mr-2 h-4 w-4" /> Open from cloud
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => download(editor.exportDataURL("image/png"), `${editor.docName}.png`)}>
              <Download className="mr-2 h-4 w-4" /> Export as PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => download(editor.exportDataURL("image/jpeg", 0.92), `${editor.docName}.jpg`)}>
              <Download className="mr-2 h-4 w-4" /> Export as JPEG
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="sm" className="h-7 w-7 px-0 text-neutral-300" onClick={editor.undo} disabled={!editor.canUndo} aria-label="Undo">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 px-0 text-neutral-300" onClick={editor.redo} disabled={!editor.canRedo} aria-label="Redo">
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-3 text-xs text-neutral-400">
        <span className="tabular-nums">
          {editor.width} &times; {editor.height}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-neutral-400"
            onClick={() => editor.setZoom(editor.zoom - 10)}
            aria-label="Zoom out"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-10 text-center tabular-nums">{editor.zoom}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-neutral-400"
            onClick={() => editor.setZoom(editor.zoom + 10)}
            aria-label="Zoom in"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-neutral-400" onClick={() => editor.setZoom(100)}>
            Reset
          </Button>
        </div>
      </div>

      <input
        ref={openImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) editor.loadImageAsDocument(file)
          e.target.value = ""
        }}
      />
      <input
        ref={openAsLayerInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) editor.loadImageAsLayer(file)
          e.target.value = ""
        }}
      />

      <NewDocumentDialog open={newDocOpen} onOpenChange={setNewDocOpen} />
      <CloudDialog open={cloudMode !== null} onOpenChange={(o) => !o && setCloudMode(null)} mode={cloudMode ?? "save"} />
    </div>
  )
}
