import { del } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function DELETE(request: NextRequest) {
  try {
    const { pathname } = await request.json()
    if (!pathname || typeof pathname !== "string" || !pathname.startsWith("patchy-projects/")) {
      return NextResponse.json({ error: "Invalid pathname" }, { status: 400 })
    }
    await del(pathname)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to delete project:", error)
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
  }
}
