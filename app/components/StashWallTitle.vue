<script setup lang="ts">
/**
 * Имя/роль на дальней стене: canvas → CanvasTexture, шрифт из public/fonts.
 * Текст из app/data/stashCopy.ts.
 *
 * Канвас рисуется в яркости (белое по чёрному) и идёт сразу в alphaMap и bumpMap:
 * альфа вырезает штрихи, рельеф ловит керосинку со стола (точечный, ~1 м, снизу).
 * Поэтому bumpScale отрицательный — штрих читается канавкой, а не наклейкой.
 */
import {
  CanvasTexture,
  LinearFilter,
  MeshStandardMaterial,
  NoColorSpace,
  PlaneGeometry,
} from 'three'
import { stashCopy } from '~/data/stashCopy'

const FONT_URL = '/fonts/BadScript-Regular.ttf'
const FONT_FAMILY = 'StashScratch'
const TEX_W = 2048
const TEX_H = 768

const SCRATCH_COLOR = '#e8e0cd'
/** Мел не кроет: стена просвечивает и подкрашивает штрих своим цветом. */
const CHALK_OPACITY = 0.6
const BUMP_SCALE = -0.0028
/** Ambient 0.3 гасит штрих до нечитаемого над тёмным кирпичом — подпираем снизу. */
const EMISSIVE_LIFT = 0.3

/** Поменять, чтобы перебросить рандом огрубления. */
const GRUNGE_SEED = 7
/** [ячеек по X, ячеек по Y, вклад]. Ячейки шире, чем выше — штрих тянется вдоль строки. */
const GRUNGE_OCTAVES: [number, number, number][] = [
  [14, 26, 1],
  [30, 70, 0.55],
  [70, 160, 0.32],
  [170, 400, 0.2],
]
const GRUNGE_CONTRAST = 2.6
const GRUNGE_BIAS = 0.26
/** Пропуски: мел/гвоздь проскочил по бугру штукатурки. С 4 м читались полосами — почти сняты. */
const SKIP_COUNT = 2
const JITTER_DEG = 6.5
const JITTER_PX = 11

const props = defineProps<{
  wallZ: number
  x: number
  y: number
  width: number
  height: number
  /** Крен вокруг Z (рад), влево = плюс. */
  roll?: number
}>()

const ready = ref(false)
const geometry = new PlaneGeometry(1, 1)
const material = new MeshStandardMaterial({
  color: SCRATCH_COLOR,
  emissive: SCRATCH_COLOR,
  emissiveIntensity: EMISSIVE_LIFT,
  roughness: 0.95,
  metalness: 0,
  transparent: true,
  opacity: CHALK_OPACITY,
  depthWrite: false,
  bumpScale: BUMP_SCALE,
})

let texture: CanvasTexture | null = null

function makeRng(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6D2B79F5
    let x = Math.imul(t ^ (t >>> 15), 1 | t)
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

let rnd = makeRng(GRUNGE_SEED)

const chalkPasses: { dx: number, dy: number, a: number }[] = [
  { dx: -2.2, dy: 1.4, a: 0.14 },
  { dx: 1.8, dy: -1.6, a: 0.12 },
  { dx: -1.1, dy: -1.9, a: 0.11 },
  { dx: 2.4, dy: 0.8, a: 0.13 },
  { dx: 0.4, dy: 2.1, a: 0.1 },
  { dx: -0.7, dy: 0.3, a: 0.16 },
  { dx: 0, dy: 0, a: 0.48 },
]

function paintChalkChar(ctx: CanvasRenderingContext2D, ch: string) {
  for (const p of chalkPasses) {
    ctx.fillStyle = `rgba(255, 255, 255, ${p.a})`
    ctx.fillText(ch, p.dx, p.dy)
  }
}

/** Многооктавный шум + пропуски. Умножается на текст, поэтому фон серый, не чёрный. */
function makeGrunge(w: number, h: number) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return null
  }

  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, w, h)

  for (const [cellsX, cellsY, weight] of GRUNGE_OCTAVES) {
    const small = document.createElement('canvas')
    small.width = cellsX
    small.height = cellsY
    const sctx = small.getContext('2d')
    if (!sctx) {
      continue
    }
    const cells = sctx.createImageData(cellsX, cellsY)
    for (let i = 0; i < cellsX * cellsY; i++) {
      const v = Math.round(rnd() * 255)
      cells.data[i * 4] = v
      cells.data[i * 4 + 1] = v
      cells.data[i * 4 + 2] = v
      cells.data[i * 4 + 3] = 255
    }
    sctx.putImageData(cells, 0, 0)
    ctx.globalAlpha = weight
    ctx.drawImage(small, 0, 0, w, h)
  }
  ctx.globalAlpha = 1

  const img = ctx.getImageData(0, 0, w, h)
  const data = img.data
  for (let i = 0; i < data.length; i += 4) {
    const src = (data[i] ?? 0) / 255
    const lifted = (src - 0.5) * GRUNGE_CONTRAST + 0.5 + GRUNGE_BIAS
    const out = Math.max(0, Math.min(1, lifted)) * 255
    data[i] = out
    data[i + 1] = out
    data[i + 2] = out
  }
  ctx.putImageData(img, 0, 0)

  ctx.strokeStyle = '#000'
  ctx.lineCap = 'round'
  for (let i = 0; i < SKIP_COUNT; i++) {
    const y = rnd() * h
    ctx.globalAlpha = 0.35 + rnd() * 0.45
    ctx.lineWidth = 1 + rnd() * 3
    ctx.beginPath()
    ctx.moveTo(rnd() * w * 0.3, y)
    ctx.lineTo(w * (0.5 + rnd() * 0.5), y + (rnd() - 0.5) * 16)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  return canvas
}

/** bend — угол дуги в рад (0 = прямо). Середина выше краёв. */
function drawChalk(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  size: number,
  bend = 0,
) {
  ctx.font = `${size}px "${FONT_FAMILY}"`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = 'rgba(255, 255, 255, 0.2)'
  ctx.shadowBlur = 4

  const chars = [...text]
  const widths = chars.map((ch) => ctx.measureText(ch).width)
  const total = widths.reduce((sum, w) => sum + w, 0)

  /** Рука дрожит: мелкий поворот и сдвиг на каждый знак. */
  const jitter = (ctx2: CanvasRenderingContext2D) => {
    ctx2.rotate((rnd() * 2 - 1) * JITTER_DEG * Math.PI / 180)
    ctx2.translate(0, (rnd() * 2 - 1) * JITTER_PX)
  }

  if (bend <= 0) {
    let x = cx - total / 2
    for (let i = 0; i < chars.length; i++) {
      const w = widths[i] ?? 0
      ctx.save()
      ctx.translate(x + w / 2, cy)
      jitter(ctx)
      paintChalkChar(ctx, chars[i] ?? '')
      ctx.restore()
      x += w
    }
    ctx.shadowBlur = 0
    return
  }

  const radius = total / bend
  let angle = -bend / 2

  for (let i = 0; i < chars.length; i++) {
    const w = widths[i] ?? 0
    const mid = angle + w / (2 * radius)
    ctx.save()
    ctx.translate(cx + Math.sin(mid) * radius, cy + radius * (1 - Math.cos(mid)))
    ctx.rotate(mid)
    jitter(ctx)
    paintChalkChar(ctx, chars[i] ?? '')
    ctx.restore()
    angle += w / radius
  }
  ctx.shadowBlur = 0
}

async function buildTexture() {
  if (typeof FontFace === 'undefined') {
    return
  }
  try {
    const face = new FontFace(FONT_FAMILY, `url(${FONT_URL})`)
    await face.load()
    document.fonts.add(face)
    await document.fonts.ready

    rnd = makeRng(GRUNGE_SEED)

    const canvas = document.createElement('canvas')
    canvas.width = TEX_W
    canvas.height = TEX_H
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, TEX_W, TEX_H)
    drawChalk(ctx, stashCopy.role, TEX_W / 2, TEX_H * 0.34, 168, 0.55)
    drawChalk(ctx, stashCopy.name, TEX_W / 2, TEX_H * 0.68, 132, 0.22)

    const grunge = makeGrunge(TEX_W, TEX_H)
    if (grunge) {
      ctx.globalCompositeOperation = 'multiply'
      ctx.drawImage(grunge, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
    }

    texture?.dispose()
    texture = new CanvasTexture(canvas)
    texture.colorSpace = NoColorSpace
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter
    texture.needsUpdate = true
    material.alphaMap = texture
    material.bumpMap = texture
    material.needsUpdate = true
    ready.value = true
  }
  catch (err) {
    console.error('[StashWallTitle] texture failed', err)
  }
}

onMounted(() => {
  void buildTexture()
})

onBeforeUnmount(() => {
  texture?.dispose()
  material.dispose()
  geometry.dispose()
})
</script>

<template>
  <TresMesh
    v-if="ready"
    :geometry="geometry"
    :material="material"
    :position="[x, y, wallZ + 0.008]"
    :rotation="[0, 0, roll ?? 0]"
    :scale="[width, height, 1]"
  />
</template>
