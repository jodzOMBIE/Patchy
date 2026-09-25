import { head } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const pathname = request.nextUrl.searchParams.get("pathname")
    if (!pathname || !pathname.startsWith("patchy-projects/")) {
      return NextResponse.json({ error: "Invalid pathname" }, { status: 400 })
    }

    const meta = await head(pathname)
    const fileRes = await fetch(meta.url)
    if (!fileRes.ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const data = await fileRes.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Failed to fetch project:", error)
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 })
  }
}
