import { list, put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    const { blobs } = await list({ prefix: "patchy-projects/" })
    const files = blobs
      .filter((b) => b.pathname.endsWith(".json"))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .map((b) => ({
        pathname: b.pathname,
        name: b.pathname.replace("patchy-projects/", "").replace(/\.json$/, ""),
        uploadedAt: b.uploadedAt,
        size: b.size,
      }))
    return NextResponse.json({ files })
  } catch (error) {
    console.error("[v0] Failed to list projects:", error)
    return NextResponse.json({ error: "Failed to list projects" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, snapshot } = body as { name: string; snapshot: unknown }

    if (!name || !snapshot) {
      return NextResponse.json({ error: "Missing name or snapshot" }, { status: 400 })
    }

    const safeName = name.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "Untitled"
    const pathname = `patchy-projects/${safeName}-${Date.now()}.json`

    const blob = await put(pathname, JSON.stringify(snapshot), {
      access: "public",
      contentType: "application/json",
    })

    return NextResponse.json({ pathname: blob.pathname, url: blob.url })
  } catch (error) {
    console.error("[v0] Failed to save project:", error)
    return NextResponse.json({ error: "Failed to save project" }, { status: 500 })
  }
}
