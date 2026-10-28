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

const PHOSPHOR: ReadonlyArray<readonly [number, number, number]> = [
  [0x04, 0x12, 0x08],
  [0x3d, 0x9a, 0x40],
  [0x6b, 0xe8, 0x5a],
]

function paintPhosphor(ctx: CanvasRenderingContext2D, photo: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const block = 2
  const sw = Math.max(1, Math.round(w / block))
  const sh = Math.max(1, Math.round(h / block))
  const scratch = document.createElement('canvas')
  scratch.width = sw
  scratch.height = sh
  const src = scratch.getContext('2d', { willReadFrequently: true })
  if (!src) {
    return
  }
  src.imageSmoothingEnabled = true
  src.drawImage(photo, 0, 0, sw, sh)
  const img = src.getImageData(0, 0, sw, sh)
  const px = img.data
  const [dark, mid, bright] = PHOSPHOR
  for (let i = 0; i < px.length; i += 4) {
    let lum = (px[i]! * 0.299 + px[i + 1]! * 0.587 + px[i + 2]! * 0.114) / 255
    lum = Math.min(1, Math.max(0, (lum - 0.5) * 1.3 + 0.5))
    const lo = lum < 0.5 ? dark : mid
    const hi = lum < 0.5 ? mid : bright
    const t = lum < 0.5 ? lum / 0.5 : (lum - 0.5) / 0.5
    px[i] = lo[0] + (hi[0] - lo[0]) * t
    px[i + 1] = lo[1] + (hi[1] - lo[1]) * t
    px[i + 2] = lo[2] + (hi[2] - lo[2]) * t
  }
  src.putImageData(img, 0, 0)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(scratch, x, y, w, h)
}

function drawDocument(ctx: CanvasRenderingContext2D, photo: HTMLImageElement | null, sidePad: number) {
  const copy = stashCopy.description
  const pad = 32
  const padX = Math.max(pad, sidePad)
  const photoW = 272
  const photoH = photo ? Math.round(photoW * photo.height / photo.width) : 0
  const textX = padX + (photo ? photoW + 24 : 0)
  const textW = TEX_W - textX - padX
  const fullW = TEX_W - padX * 2

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, TEX_W, 4096)
  ctx.imageSmoothingEnabled = false

  if (photo && photoH) {
    paintPhosphor(ctx, photo, padX, pad, photoW, photoH)
    ctx.strokeStyle = GREEN
    ctx.lineWidth = 3
    ctx.strokeRect(padX + 1.5, pad + 1.5, photoW - 3, photoH - 3)
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
    ctx.fillText(title.toUpperCase(), padX, y + 18)
    y += 32
    ctx.fillStyle = RULE
    ctx.fillRect(padX, y, fullW, 3)
    y += 26
  }

  const item = (text: string, color: string, indent: number) => {
    ctx.font = `16px ${FONT}`
    ctx.fillStyle = color
    const lines = wrap(ctx, text, fullW - indent)
    lines.forEach((line, i) => {
      const mark = i === 0 && indent === 0 ? '> ' : ''
      ctx.fillText(mark + line, padX + indent, y + 16)
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

  const [x0, y0] = props.face.min
  const [x1, y1, z1] = props.face.max
  const spanX = x1 - x0
  const spanY = y1 - y0
  const insetLeft = spanX * 0.078
  const insetRight = spanX * 0.07
  const insetTop = spanY * 0.01
  const insetBottom = spanY * 0.13
  const s = props.fit || 1
  const planeW = (spanX - insetLeft - insetRight) * s
  const planeH = (spanY - insetTop - insetBottom) * s
  const radiusTop = 0.1
  const radiusBot = 0.05
  const bowTop = 0.026
  const bowBot = 0.023
  const sidePad = Math.ceil(radiusTop * (planeH / planeW) * TEX_W) + 8

  const measure = document.createElement('canvas').getContext('2d')
  if (!measure) {
    return
  }
  const contentH = drawDocument(measure, photo, sidePad)
  const texH = Math.max(512, Math.min(4096, contentH))

  const canvas = document.createElement('canvas')
  canvas.width = TEX_W
  canvas.height = texH
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }
  drawDocument(ctx, photo, sidePad)

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
      uAspect: { value: planeW / planeH },
      uRadiusTop: { value: radiusTop },
      uRadiusBot: { value: radiusBot },
      uBowTop: { value: bowTop },
      uBowBot: { value: bowBot },
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
      uniform float uAspect;
      uniform float uRadiusTop;
      uniform float uRadiusBot;
      uniform float uBowTop;
      uniform float uBowBot;
      varying vec2 vUv;

      float roundedBox(vec2 p, vec2 b, vec4 rad) {
        rad.xy = (p.x > 0.0) ? rad.xy : rad.zw;
        rad.x = (p.y > 0.0) ? rad.x : rad.y;
        vec2 q = abs(p) - b + rad.x;
        return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - rad.x;
      }

      void main() {
        vec2 halfExt = vec2(uAspect, 1.0) * 0.5;
        vec2 p = vec2(vUv.x * uAspect, vUv.y) - halfExt;
        float nx = clamp(p.x / max(halfExt.x, 0.001), -1.0, 1.0);
        float arch = 1.0 - nx * nx;
        float cy = (uBowBot - uBowTop) * 0.5;
        vec2 box = vec2(halfExt.x, halfExt.y - (uBowTop + uBowBot) * 0.5);
        p.y -= cy;
        float bow = p.y >= 0.0 ? uBowTop : uBowBot;
        p.y -= sign(p.y) * bow * arch;
        float limit = min(box.x, box.y) - 0.001;
        vec4 rad = vec4(uRadiusTop, uRadiusBot, uRadiusTop, uRadiusBot);
        rad = clamp(rad, 0.0, limit);
        float dist = roundedBox(p, box, rad);
        float aa = fwidth(dist);
        if (dist > aa) discard;
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
    (x0 + insetLeft + (spanX - insetLeft - insetRight) / 2) * s,
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
