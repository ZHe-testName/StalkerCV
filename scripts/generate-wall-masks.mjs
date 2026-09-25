/**
 * Серые маски облезлости, по одной на стену.
 * Белое → штукатурка, чёрное → кирпич. Порог зададим позже.
 */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const dest = path.resolve('public/textures/wall-masks')
await mkdir(dest, { recursive: true })

function hash(ix, iy, seed) {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1274126177)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

function valueNoise(x, y, seed) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const a = hash(x0, y0, seed)
  const b = hash(x0 + 1, y0, seed)
  const c = hash(x0, y0 + 1, seed)
  const d = hash(x0 + 1, y0 + 1, seed)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}

function fbm(x, y, seed, octaves) {
  let sum = 0
  let amp = 1
  let freq = 1
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, y * freq, seed + i * 17) * amp
    norm += amp
    amp *= 0.5
    freq *= 2.03
  }
  return sum / norm
}

function renderMask(width, height, seed) {
  const pixels = Buffer.alloc(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width
      const v = y / height
      const wx = fbm(u * 2.4 + 8, v * 2.4, seed + 3, 4) - 0.5
      const wy = fbm(u * 2.4, v * 2.4 + 11, seed + 9, 4) - 0.5
      const warped = fbm(u * 3.1 + wx * 1.8, v * 2.6 + wy * 1.8, seed, 5)
      const ridges = Math.abs(fbm(u * 6.2 + wx, v * 5.4 + wy, seed + 21, 3) - 0.5) * 2
      const bottom = v * 0.12
      let n = warped * 0.72 + ridges * 0.16 + bottom
      n = Math.min(1, Math.max(0, n))
      pixels[y * width + x] = Math.round(n * 255)
    }
  }
  return pixels
}

const walls = [
  { name: 'left', w: 1280, h: 1024, seed: 11029 },
  { name: 'back', w: 2048, h: 896, seed: 77411 },
  { name: 'right', w: 1280, h: 1024, seed: 39017 },
]

for (const wall of walls) {
  const pixels = renderMask(wall.w, wall.h, wall.seed)
  const file = path.join(dest, `${wall.name}.png`)
  await sharp(pixels, {
    raw: { width: wall.w, height: wall.h, channels: 1 },
  }).png({ compressionLevel: 9 }).toFile(file)
  console.log(`${wall.name} ${wall.w}x${wall.h} seed ${wall.seed}`)
}
