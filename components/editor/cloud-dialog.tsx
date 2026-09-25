"use client"

import { useEffect, useState } from "react"
import { CloudUpload, FolderOpen, Loader2, Trash2 } from "lucide-react"
import { useEditor } from "@/lib/editor/editor-provider"
import type { SavedProjectSummary } from "@/lib/editor/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

export function CloudDialog({
  open,
  onOpenChange,
  mode,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "save" | "load"
}) {
  const editor = useEditor()
  const [name, setName] = useState(editor.docName)
  const [saving, setSaving] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [files, setFiles] = useState<SavedProjectSummary[]>([])
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(editor.docName)
      setError(null)
      if (mode === "load") refreshList()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode])

  async function refreshList() {
    setLoadingList(true)
    try {
      const res = await fetch("/api/projects")
      const data = await res.json()
      setFiles(data.files ?? [])
    } catch {
      setError("Could not load saved projects.")
    } finally {
      setLoadingList(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const snapshot = editor.serializeProject()
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, snapshot }),
      })
      if (!res.ok) throw new Error("Save failed")
      onOpenChange(false)
    } catch {
      setError("Could not save the project. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  async function handleLoad(file: SavedProjectSummary) {
    setLoadingId(file.pathname)
    setError(null)
    try {
      const res = await fetch(`/api/projects/get?pathname=${encodeURIComponent(file.pathname)}`)
      if (!res.ok) throw new Error("Load failed")
      const snapshot = await res.json()
      await editor.loadProject(snapshot, file.name)
      onOpenChange(false)
    } catch {
      setError("Could not load that project.")
    } finally {
      setLoadingId(null)
    }
  }

  async function handleDelete(file: SavedProjectSummary, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      await fetch("/api/projects/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathname: file.pathname }),
      })
      setFiles((prev) => prev.filter((f) => f.pathname !== file.pathname))
    } catch {
      setError("Could not delete that project.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "save" ? "Save to Cloud" : "Open from Cloud"}</DialogTitle>
          <DialogDescription>
            {mode === "save"
              ? "Stores your document (all layers) as a project file in Vercel Blob."
              : "Load a previously saved project. This replaces the current document."}
          </DialogDescription>
        </DialogHeader>

        {mode === "save" ? (
          <div className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
          </div>
        ) : (
          <ScrollArea className="h-72 rounded-md border border-neutral-800">
            {loadingList ? (
              <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : files.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-neutral-500">No saved projects yet.</div>
            ) : (
              <ul className="divide-y divide-neutral-800">
                {files.map((file) => (
                  <li
                    key={file.pathname}
                    onClick={() => handleLoad(file)}
                    className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-sm hover:bg-neutral-800/60"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FolderOpen className="h-4 w-4 shrink-0 text-neutral-500" />
                      <div className="overflow-hidden">
                        <p className="truncate text-neutral-200">{file.name}</p>
                        <p className="text-xs text-neutral-500">{new Date(file.uploadedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    {loadingId === file.pathname ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neutral-400" />
                    ) : (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 text-neutral-500 hover:text-red-400"
                        onClick={(e) => handleDelete(file, e)}
                        aria-label="Delete project"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {mode === "save" && (
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-2 h-4 w-4" />}
              Save
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
