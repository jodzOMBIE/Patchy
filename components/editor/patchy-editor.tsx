"use client"

import { EditorProvider } from "@/lib/editor/editor-provider"
import { TopBar } from "./top-bar"
import { ToolBar } from "./tool-bar"
import { OptionsBar } from "./options-bar"
import { CanvasStage } from "./canvas-stage"
import { LayersPanel } from "./layers-panel"

export function PatchyEditor() {
  return (
    <EditorProvider>
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-neutral-950 text-neutral-100">
        <TopBar />
        <OptionsBar />
        <div className="flex flex-1 overflow-hidden">
          <ToolBar />
          <CanvasStage />
          <LayersPanel />
        </div>
      </div>
    </EditorProvider>
  )
}
