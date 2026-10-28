<script setup lang="ts">
/**
 * Картинка на стекле ЭЛТ. Холст один раз, колесо сдвигает окно.
 * Строки развёртки отдельной картой и не едут вместе с текстом.
 */
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  Mesh,
  NoColorSpace,
  PlaneGeometry,
  RepeatWrapping,
  ShaderMaterial,
  Vector2,
} from 'three'
import { stashCopy } from '~/data/stashCopy'
import { stashFocused } from '~/composables/useStashCamera'

const props = defineProps<{
  face: { min: [number, number, number], max: [number, number, number] }
  fit: number
}>()

const FONT_URL = '/fonts/PressStart2P-Regular.ttf'
const FONT = 'PressStart2P'
const PHOTO_URL = '/screen/portfolio_photo.avif'
const TEX_W = 1024

const GREEN = '#6be85a'
const DIM = '#3d9a40'
const RULE = '#1c5a28'
const BG = '#041208'

const screenMesh = shallowRef<Mesh | null>(null)
let scroll = 0
let maxScroll = 0

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxW && line) {
      lines.push(line)
      line = word
    }
    else {
      line = next
    }
  }
  if (line) {
    lines.push(line)
  }
  return lines.length ? lines : ['']
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function scanTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 4
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return null
  }
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 1, 3)
  ctx.fillStyle = '#666666'
  ctx.fillRect(0, 3, 1, 1)
  const tex = new CanvasTexture(canvas)
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.magFilter = LinearFilter
  tex.minFilter = LinearFilter
  tex.generateMipmaps = false
  tex.flipY = false
  tex.needsUpdate = true
  return tex
}

function drawDocument(ctx: CanvasRenderingContext2D, photo: HTMLImageElement | null) {
  const copy = stashCopy.description
  const pad = 32
  const photoW = 272
  const photoH = photo ? Math.round(photoW * photo.height / photo.width) : 0
  const textX = pad + (photo ? photoW + 24 : 0)
  const textW = TEX_W - textX - pad
  const fullW = TEX_W - pad * 2

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, TEX_W, 4096)
  ctx.imageSmoothingEnabled = false

  if (photo && photoH) {
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(photo, pad, pad, photoW, photoH)
    ctx.imageSmoothingEnabled = false
    ctx.strokeStyle = GREEN
    ctx.lineWidth = 3
    ctx.strokeRect(pad + 1.5, pad + 1.5, photoW - 3, photoH - 3)
  }

  let textY = pad + 26
  const write = (text: string, size: number, lh: number, color: string, x: number, width: number) => {
    ctx.font = `${size}px ${FONT}`
    ctx.fillStyle = color
    const lines = wrap(ctx, text, width)
    for (const line of lines) {
      ctx.fillText(line, x, textY)
      textY += lh
    }
    return lines.length
  }

  write(copy.name, 24, 38, GREEN, textX, textW)
  textY += 10
  write(copy.job, 18, 30, GREEN, textX, textW)
  textY += 14
  write(copy.details, 16, 28, DIM, textX, textW)

  let y = Math.max(pad + photoH, textY) + 40

  const heading = (title: string) => {
    ctx.font = `18px ${FONT}`
    ctx.fillStyle = GREEN
    ctx.fillText(title.toUpperCase(), pad, y + 18)
    y += 32
    ctx.fillStyle = RULE
    ctx.fillRect(pad, y, fullW, 3)
    y += 26
  }

  const item = (text: string, color: string, indent: number) => {
    ctx.font = `16px ${FONT}`
    ctx.fillStyle = color
    const lines = wrap(ctx, text, fullW - indent)
    lines.forEach((line, i) => {
      const mark = i === 0 && indent === 0 ? '> ' : ''
      ctx.fillText(mark + line, pad + indent, y + 16)
      y += 28
    })
    y += 10
  }

  heading('About')
  item(copy.about.experience, GREEN, 0)
  item(copy.about.projects, GREEN, 0)
  y += 16

  heading(copy.education.title)
  for (const [key, school] of Object.entries(copy.education)) {
    if (key === 'title' || typeof school === 'string') {
      continue
    }
    item(`${school.institution} / ${school.specialization}`, GREEN, 0)
    item(school.description, DIM, 28)
    y += 6
  }

  return y + pad
}

async function build() {
  if (typeof FontFace === 'undefined') {
    return
  }
  const face = new FontFace(FONT, `url(${FONT_URL})`)
  await face.load()
  document.fonts.add(face)
  await document.fonts.ready
  const photo = await loadImage(PHOTO_URL)

  const measure = document.createElement('canvas').getContext('2d')
  if (!measure) {
    return
  }
  const contentH = drawDocument(measure, photo)
  const texH = Math.max(512, Math.min(4096, contentH))

  const canvas = document.createElement('canvas')
  canvas.width = TEX_W
  canvas.height = texH
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }
  drawDocument(ctx, photo)

  const map = new CanvasTexture(canvas)
  map.colorSpace = NoColorSpace
  map.wrapS = ClampToEdgeWrapping
  map.wrapT = ClampToEdgeWrapping
  map.magFilter = LinearFilter
  map.minFilter = LinearFilter
  map.generateMipmaps = false
  map.needsUpdate = true

  const scan = scanTexture()
  if (scan) {
    scan.colorSpace = NoColorSpace
  }
  const [x0, y0] = props.face.min
  const [x1, y1, z1] = props.face.max
  const spanX = x1 - x0
  const spanY = y1 - y0
  const insetX = spanX * 0.1
  const insetTop = spanY * 0.1
  const insetBottom = spanY * 0.18
  const s = props.fit || 1
  const planeW = (spanX - insetX * 2) * s
  const planeH = (spanY - insetTop - insetBottom) * s
  const windowFrac = Math.min(1, (TEX_W / texH) * (planeH / planeW))

  const material = new ShaderMaterial({
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    uniforms: {
      uMap: { value: map },
      uScan: { value: scan },
      uScroll: { value: 0 },
      uWindow: { value: windowFrac },
      uScanRepeat: { value: new Vector2(1, planeH * 90) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform sampler2D uScan;
      uniform float uScroll;
      uniform float uWindow;
      uniform vec2 uScanRepeat;
      varying vec2 vUv;
      void main() {
        float v = 1.0 - uScroll - (1.0 - vUv.y) * uWindow;
        vec3 col = texture2D(uMap, vec2(vUv.x, clamp(v, 0.0, 1.0))).rgb;
        float scan = texture2D(uScan, vUv * uScanRepeat).r;
        col *= 0.8 + 0.2 * scan;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })

  const mesh = new Mesh(new PlaneGeometry(planeW, planeH), material)
  mesh.position.set(
    ((x0 + x1) / 2) * s,
    (y0 + insetBottom + (spanY - insetTop - insetBottom) / 2) * s,
    z1 * s + 0.012,
  )
  mesh.raycast = () => {}
  mesh.castShadow = false
  mesh.receiveShadow = false
  mesh.renderOrder = 2
  maxScroll = Math.max(0, 1 - windowFrac)
  screenMesh.value = mesh
}

function onWheel(event: WheelEvent) {
  const mesh = screenMesh.value
  if (!mesh || stashFocused.value !== 'desk' || maxScroll <= 0) {
    return
  }
  event.preventDefault()
  const material = mesh.material as ShaderMaterial
  const dy = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
  scroll = Math.min(maxScroll, Math.max(0, scroll + dy * 0.0009))
  material.uniforms.uScroll.value = scroll
}

watch(stashFocused, (id) => {
  if (id === 'desk') {
    return
  }
  const mesh = screenMesh.value
  scroll = 0
  if (mesh) {
    (mesh.material as ShaderMaterial).uniforms.uScroll.value = 0
  }
})

onMounted(() => {
  void build().catch((err) => {
    console.error('[StashCrtScreen]', err)
  })
  window.addEventListener('wheel', onWheel, { passive: false })
})

onBeforeUnmount(() => {
  window.removeEventListener('wheel', onWheel)
  const mesh = screenMesh.value
  if (!mesh) {
    return
  }
  mesh.geometry.dispose()
  const material = mesh.material as ShaderMaterial
  material.uniforms.uMap.value?.dispose()
  material.uniforms.uScan.value?.dispose()
  material.dispose()
})
</script>

<template>
  <primitive v-if="screenMesh" :object="screenMesh" />
</template>
