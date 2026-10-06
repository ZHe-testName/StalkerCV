<script setup lang="ts">
/**
 * Имя/роль на дальней стене: canvas → CanvasTexture, шрифт из public/fonts.
 * Текст из app/data/stashCopy.ts.
 */
import {
  CanvasTexture,
  LinearFilter,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three'
import { stashCopy } from '~/data/stashCopy'

const FONT_URL = '/fonts/BadScript-Regular.ttf'
const FONT_FAMILY = 'StashScratch'
const TEX_W = 2048
const TEX_H = 768

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
const material = new MeshBasicMaterial({
  transparent: true,
  depthWrite: false,
  toneMapped: false,
})

let texture: CanvasTexture | null = null

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
    ctx.fillStyle = `rgba(158, 148, 128, ${p.a})`
    ctx.fillText(ch, p.dx, p.dy)
  }
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
  ctx.shadowColor = 'rgba(150, 140, 120, 0.2)'
  ctx.shadowBlur = 4

  const chars = [...text]
  const widths = chars.map((ch) => ctx.measureText(ch).width)

  if (bend <= 0) {
    const total = widths.reduce((sum, w) => sum + w, 0)
    let x = cx - total / 2
    for (let i = 0; i < chars.length; i++) {
      const w = widths[i] ?? 0
      ctx.save()
      ctx.translate(x + w / 2, cy)
      paintChalkChar(ctx, chars[i] ?? '')
      ctx.restore()
      x += w
    }
    ctx.shadowBlur = 0
    return
  }

  const total = widths.reduce((sum, w) => sum + w, 0)
  const radius = total / bend
  let angle = -bend / 2

  for (let i = 0; i < chars.length; i++) {
    const w = widths[i] ?? 0
    const mid = angle + w / (2 * radius)
    ctx.save()
    ctx.translate(cx + Math.sin(mid) * radius, cy + radius * (1 - Math.cos(mid)))
    ctx.rotate(mid)
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

    const canvas = document.createElement('canvas')
    canvas.width = TEX_W
    canvas.height = TEX_H
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }
    ctx.clearRect(0, 0, TEX_W, TEX_H)
    drawChalk(ctx, stashCopy.role, TEX_W / 2, TEX_H * 0.34, 168, 0.55)
    drawChalk(ctx, stashCopy.name, TEX_W / 2, TEX_H * 0.68, 132, 0.22)

    texture?.dispose()
    texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter
    texture.needsUpdate = true
    material.map = texture
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
