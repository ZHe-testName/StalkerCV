import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three'

/** Край плоскости держим около clear `#4a5560`, иначе задник читается прямоугольником. */

let cached: CanvasTexture | null = null

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function paintOvercast(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const rand = mulberry32(29)
  ctx.fillStyle = 'rgb(74, 85, 96)'
  ctx.fillRect(0, 0, w, h)

  const y0 = h * 0.55
  for (let i = 0; i < 48; i++) {
    const x = rand() * w
    const y = y0 + rand() * (h - y0)
    const rx = 12 + rand() * 26
    const ry = rx * (0.55 + rand() * 0.4)
    const light = rand() > 0.45
    const alpha = 0.82
    const col = light ? `rgba(214, 218, 222, ${alpha})` : `rgba(14, 18, 24, ${alpha})`
    const grd = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry))
    grd.addColorStop(0, col)
    grd.addColorStop(1, 'rgba(74, 85, 96, 0)')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, rand() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Одна текстура на оба окна. Рисуется один раз, в кадре ничего не считает. */
export function overcastSkyTexture() {
  if (cached) {
    return cached
  }
  if (!import.meta.client) {
    return null
  }
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return null
  }
  paintOvercast(ctx, canvas.width, canvas.height)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.minFilter = LinearFilter
  tex.magFilter = LinearFilter
  tex.needsUpdate = true
  cached = tex
  return tex
}
