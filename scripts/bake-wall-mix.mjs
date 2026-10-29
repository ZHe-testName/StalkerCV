/**
 * Запекает микс кирпич+штукатурка в цвет / нормаль / шероховатость.
 * Свет не запекается. Старые плитки и маски не трогает.
 *
 * node scripts/bake-wall-mix.mjs
 */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const LONG = 4096
const BRICK_TILE = 1.8
const PLASTER_TILE = 1.0
const room = { width: 6.2, depth: 3.4, height: 2.7, wall: 0.24 }

const brickDir = 'public/textures/broken-brick'
const plasterDir = 'public/textures/white-plaster'
const maskDir = 'public/textures/wall-masks'
const destDir = path.resolve('public/textures/wall-baked')

const walls = [
  { name: 'left', width: room.depth, height: room.height, mask: 'left.80.png' },
  { name: 'right', width: room.depth, height: room.height, mask: 'right.80.png' },
  { name: 'back', width: room.width - room.wall * 2, height: room.height, mask: 'back.60.png' },
]

function toLinear(c) {
  const u = c / 255
  return u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4
}

function toSrgb(c) {
  const e = c <= 0.0031308 ? c * 12.92 : 1.055 * (c ** (1 / 2.4)) - 0.055
  return Math.round(Math.min(1, Math.max(0, e)) * 255)
}

async function loadRgba(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, w: info.width, h: info.height }
}

function sample(img, u, v, wrap) {
  const { data, w, h } = img
  let x = u * w - 0.5
  let y = (1 - v) * h - 0.5
  if (!wrap) {
    x = Math.min(w - 0.5001, Math.max(0, x))
    y = Math.min(h - 0.5001, Math.max(0, y))
  }
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const tx = x - x0
  const ty = y - y0
  const out = [0, 0, 0, 0]
  const taps = [
    [x0, y0, (1 - tx) * (1 - ty)],
    [x0 + 1, y0, tx * (1 - ty)],
    [x0, y0 + 1, (1 - tx) * ty],
    [x0 + 1, y0 + 1, tx * ty],
  ]
  for (const [ix, iy, wt] of taps) {
    let sx = ix
    let sy = iy
    if (wrap) {
      sx = ((sx % w) + w) % w
      sy = ((sy % h) + h) % h
    }
    else {
      sx = Math.min(w - 1, Math.max(0, sx))
      sy = Math.min(h - 1, Math.max(0, sy))
    }
    const i = (sy * w + sx) * 4
    out[0] += data[i] * wt
    out[1] += data[i + 1] * wt
    out[2] += data[i + 2] * wt
    out[3] += data[i + 3] * wt
  }
  return out
}

function sampleLinear(img, u, v) {
  const { data, w, h } = img
  let x = u * w - 0.5
  let y = (1 - v) * h - 0.5
  x = x - Math.floor(x / w) * w
  y = y - Math.floor(y / h) * h
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const tx = x - x0
  const ty = y - y0
  const out = [0, 0, 0]
  const taps = [
    [x0, y0, (1 - tx) * (1 - ty)],
    [x0 + 1, y0, tx * (1 - ty)],
    [x0, y0 + 1, (1 - tx) * ty],
    [x0 + 1, y0 + 1, tx * ty],
  ]
  for (const [ix, iy, wt] of taps) {
    const sx = ((ix % w) + w) % w
    const sy = ((iy % h) + h) % h
    const i = (sy * w + sx) * 4
    out[0] += toLinear(data[i]) * wt
    out[1] += toLinear(data[i + 1]) * wt
    out[2] += toLinear(data[i + 2]) * wt
  }
  return out
}

await mkdir(destDir, { recursive: true })

const brickDiff = await loadRgba(path.join(brickDir, 'broken_brick_wall_diff.1k.avif'))
const brickNor = await loadRgba(path.join(brickDir, 'broken_brick_wall_nor_gl.1k.avif'))
const brickArm = await loadRgba(path.join(brickDir, 'broken_brick_wall_arm.1k.avif'))
const plasterDiff = await loadRgba(path.join(plasterDir, 'white_rough_plaster_diff.1k.avif'))
const plasterNor = await loadRgba(path.join(plasterDir, 'white_rough_plaster_nor_gl.1k.avif'))
const plasterRough = await loadRgba(path.join(plasterDir, 'white_rough_plaster_rough.1k.avif'))

for (const wall of walls) {
  const mask = await loadRgba(path.join(maskDir, wall.mask))
  const long = Math.max(wall.width, wall.height)
  const pxW = Math.round(wall.width / long * LONG)
  const pxH = Math.round(wall.height / long * LONG)
  const brickRepU = wall.width / BRICK_TILE
  const brickRepV = wall.height / BRICK_TILE
  const plasterRepU = wall.width / PLASTER_TILE
  const plasterRepV = wall.height / PLASTER_TILE
  const diff = Buffer.alloc(pxW * pxH * 3)
  const nor = Buffer.alloc(pxW * pxH * 3)
  const rough = Buffer.alloc(pxW * pxH * 3)
  const t0 = Date.now()
  for (let y = 0; y < pxH; y++) {
    const v = 1 - (y + 0.5) / pxH
    for (let x = 0; x < pxW; x++) {
      const u = (x + 0.5) / pxW
      const m = sample(mask, u, v, false)[0] / 255
      const o = (y * pxW + x) * 3
      const useBrick = m < 0.999
      const usePlaster = m > 0.001
      const bd = useBrick ? sampleLinear(brickDiff, u * brickRepU, v * brickRepV) : null
      const pd = usePlaster ? sampleLinear(plasterDiff, u * plasterRepU, v * plasterRepV) : null
      const d0 = (bd ? bd[0] * (1 - m) : 0) + (pd ? pd[0] * m : 0)
      const d1 = (bd ? bd[1] * (1 - m) : 0) + (pd ? pd[1] * m : 0)
      const d2 = (bd ? bd[2] * (1 - m) : 0) + (pd ? pd[2] * m : 0)
      diff[o] = toSrgb(d0)
      diff[o + 1] = toSrgb(d1)
      diff[o + 2] = toSrgb(d2)

      const bn = useBrick ? sample(brickNor, u * brickRepU, v * brickRepV, true) : null
      const pn = usePlaster ? sample(plasterNor, u * plasterRepU, v * plasterRepV, true) : null
      let nx = (bn ? (bn[0] / 255 * 2 - 1) * (1 - m) : 0) + (pn ? (pn[0] / 255 * 2 - 1) * m : 0)
      let ny = (bn ? (bn[1] / 255 * 2 - 1) * (1 - m) : 0) + (pn ? (pn[1] / 255 * 2 - 1) * m : 0)
      let nz = (bn ? (bn[2] / 255 * 2 - 1) * (1 - m) : 0) + (pn ? (pn[2] / 255 * 2 - 1) * m : 0)
      const len = Math.hypot(nx, ny, nz) || 1
      nx /= len
      ny /= len
      nz /= len
      nor[o] = Math.round((nx * 0.5 + 0.5) * 255)
      nor[o + 1] = Math.round((ny * 0.5 + 0.5) * 255)
      nor[o + 2] = Math.round((nz * 0.5 + 0.5) * 255)

      const br = useBrick ? sample(brickArm, u * brickRepU, v * brickRepV, true)[1] : 0
      const pr = usePlaster ? sample(plasterRough, u * plasterRepU, v * plasterRepV, true)[1] : 0
      const r = Math.round(br * (1 - m) + pr * m)
      rough[o] = r
      rough[o + 1] = r
      rough[o + 2] = r
    }
    if (y % 400 === 0) {
      console.log(`${wall.name} ${y}/${pxH}`)
    }
  }
  const maps = [
    ['diff', diff, 58],
    ['nor', nor, 68],
    ['rough', rough, 68],
  ]
  for (const [kind, buf, quality] of maps) {
    const file = path.join(destDir, `${wall.name}-${kind}.avif`)
    await sharp(buf, { raw: { width: pxW, height: pxH, channels: 3 } })
      .avif({ quality, effort: 4, chromaSubsampling: '4:4:4' })
      .toFile(file)
  }
  console.log(`${wall.name} ${pxW}x${pxH} ${((Date.now() - t0) / 1000).toFixed(1)}s`)
}
