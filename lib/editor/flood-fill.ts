export function hexToRgba(hex: string, alpha = 255): [number, number, number, number] {
  const clean = hex.replace("#", "")
  const r = Number.parseInt(clean.substring(0, 2), 16)
  const g = Number.parseInt(clean.substring(2, 4), 16)
  const b = Number.parseInt(clean.substring(4, 6), 16)
  return [r, g, b, alpha]
}

export function rgbaToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => n.toString(16).padStart(2, "0")
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

interface FillBounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Flood fill starting at (startX, startY) with the given fill color, constrained
 * to an optional rectangular/elliptical bounds mask. Uses a scanline stack-based
 * algorithm to avoid recursion limits on large canvases.
 */
export function floodFill(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  startX: number,
  startY: number,
  fillColor: string,
  tolerance = 32,
  bounds?: FillBounds,
) {
  const sx = Math.floor(startX)
  const sy = Math.floor(startY)
  if (sx < 0 || sy < 0 || sx >= canvasWidth || sy >= canvasHeight) return

  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight)
  const data = imageData.data
  const [fr, fg, fb] = hexToRgba(fillColor)

  const idx = (x: number, y: number) => (y * canvasWidth + x) * 4
  const startIdx = idx(sx, sy)
  const targetR = data[startIdx]
  const targetG = data[startIdx + 1]
  const targetB = data[startIdx + 2]
  const targetA = data[startIdx + 3]

  if (targetR === fr && targetG === fg && targetB === fb && targetA === 255) return

  const matches = (i: number) => {
    const dr = data[i] - targetR
    const dg = data[i + 1] - targetG
    const db = data[i + 2] - targetB
    const da = data[i + 3] - targetA
    return dr * dr + dg * dg + db * db + da * da <= tolerance * tolerance
  }

  const minX = bounds ? Math.max(0, Math.floor(bounds.x)) : 0
  const maxX = bounds ? Math.min(canvasWidth - 1, Math.ceil(bounds.x + bounds.width)) : canvasWidth - 1
  const minY = bounds ? Math.max(0, Math.floor(bounds.y)) : 0
  const maxY = bounds ? Math.min(canvasHeight - 1, Math.ceil(bounds.y + bounds.height)) : canvasHeight - 1

  const visited = new Uint8Array(canvasWidth * canvasHeight)
  const stack: [number, number][] = [[sx, sy]]

  while (stack.length) {
    const [x, y] = stack.pop() as [number, number]
    if (x < minX || x > maxX || y < minY || y > maxY) continue
    const pos = y * canvasWidth + x
    if (visited[pos]) continue
    const i = pos * 4
    if (!matches(i)) continue
    visited[pos] = 1
    data[i] = fr
    data[i + 1] = fg
    data[i + 2] = fb
    data[i + 3] = 255
    stack.push([x + 1, y])
    stack.push([x - 1, y])
    stack.push([x, y + 1])
    stack.push([x, y - 1])
  }

  ctx.putImageData(imageData, 0, 0)
}
