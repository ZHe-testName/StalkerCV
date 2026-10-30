<script setup lang="ts">
/**
 * Лёгкий дождь в слоте StashOutside. Одна плоскость со штрихами,
 * текстура едет вниз. Unlit, без теней: улица и так не в свете комнаты.
 */
import { useLoop } from '@tresjs/core'
import {
  CanvasTexture,
  FrontSide,
  LinearFilter,
  MeshBasicMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'

const props = withDefaults(defineProps<{
  x: number
  z: number
  width?: number
  height?: number
  /** Центр по высоте. y = 0 — земля слота. */
  y?: number
  /** Доля тайла в секунду. Больше — чаще штрихи. */
  speed?: number
  opacity?: number
  /** Крен вокруг Z, лёгкий ветер. */
  tilt?: number
}>(), {
  width: 3.2,
  height: 5.4,
  y: 2.8,
  speed: 0.7,
  opacity: 0.52,
  tilt: -0.07,
})

let sheet: CanvasTexture | null = null

function rainSheet() {
  if (sheet) {
    return sheet
  }
  if (import.meta.server) {
    return null
  }
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return null
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  for (let i = 0; i < 48; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const len = 18 + Math.random() * 46
    const alpha = 0.3 + Math.random() * 0.45
    ctx.strokeStyle = `rgba(214, 224, 232, ${alpha})`
    ctx.lineWidth = Math.random() < 0.85 ? 1 : 1.6
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y + len)
    ctx.stroke()
  }
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.magFilter = LinearFilter
  tex.minFilter = LinearFilter
  tex.generateMipmaps = false
  sheet = tex
  return tex
}

const geo = new PlaneGeometry(props.width, props.height)
const map = rainSheet()?.clone() ?? null
if (map) {
  map.wrapS = RepeatWrapping
  map.wrapT = RepeatWrapping
  map.repeat.set(props.width / 2.2, props.height / 2.8)
}

const mat = new MeshBasicMaterial({
  map,
  color: '#ffffff',
  transparent: true,
  opacity: props.opacity,
  depthWrite: false,
  side: FrontSide,
  toneMapped: false,
})

const { onBeforeRender } = useLoop()
const { off } = onBeforeRender(({ delta }) => {
  if (!map) {
    return
  }
  map.offset.y += delta * props.speed
  if (map.offset.y > 1) {
    map.offset.y -= 1
  }
})

onBeforeUnmount(() => {
  off()
  geo.dispose()
  mat.dispose()
  map?.dispose()
})
</script>

<template>
  <TresMesh
    :geometry="geo"
    :material="mat"
    :position="[x, y, z]"
    :rotation="[0, 0, tilt]"
    :cast-shadow="false"
    :receive-shadow="false"
  />
</template>
