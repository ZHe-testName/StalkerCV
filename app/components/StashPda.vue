<script setup lang="ts">
/**
 * Sketchfab stalker_pda (b4_cobra). Лежит экраном вверх.
 * Стекло — плоский холст: синий BIOS, шрифт Tektur, без строк развёртки.
 */
import { useLoader, useTres } from '@tresjs/core'
import {
  Box3,
  CanvasTexture,
  ClampToEdgeWrapping,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Raycaster,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { stashFocused, stashHold } from '~/composables/useStashCamera'
import { stashCopy } from '~/data/stashCopy'

const props = defineProps<{
  glow: number
}>()

const pdaSpan = 0.16 * 1.1 * 1.1 * 1.2
const lieZ = 90 * Math.PI / 180

function sitGltfOnFloorBySpan(scene: Group, maxSpanM: number, extraRot: [number, number, number]) {
  const root = new Group()
  const model = scene.clone(true)
  const pivot = new Group()
  pivot.add(model)
  pivot.rotation.set(extraRot[0], extraRot[1], extraRot[2])
  pivot.updateMatrixWorld(true)
  const box = new Box3().setFromObject(pivot)
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  pivot.position.set(-center.x, -box.min.y, -center.z)
  root.add(pivot)
  const span = Math.max(size.x, size.z, 1e-6)
  root.scale.setScalar(maxSpanM / span)
  return { root, model, size }
}

const FONT_URL = '/fonts/Tektur.ttf'
const FONT = 'Tektur'
const BIOS_BG = '#0000AA'
const BIOS_TEXT = '#FFFFFF'

const { state: gltf } = useLoader(GLTFLoader, '/models/stalker-pda/scene.gltf')
const { camera, renderer } = useTres()
const pdaModel = shallowRef<Group | null>(null)
const screenMat = shallowRef<MeshBasicMaterial | null>(null)
let screenOn = false
let screenPane: Mesh | null = null
let texW = 1
let texH = 1
let padPx = 0
let linkCursor = false

type LinkSpot = { x: number, y: number, w: number, h: number, url: string }
const linkSpots: LinkSpot[] = []
const raycaster = new Raycaster()
const ndc = new Vector2()

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

function drawTitle(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  icons: (HTMLImageElement | null)[],
) {
  ctx.fillStyle = BIOS_BG
  ctx.fillRect(0, 0, w, h)

  // Плоскость снова лежит как раньше. В руках её +X смотрит вверх кадра,
  // верх холста — влево, поэтому строки пишем повёрнутыми на этот вид.
  const pad = Math.round(Math.min(w, h) * 0.04)
  padPx = pad
  const viewW = h - pad * 2
  const viewH = w - pad * 2
  const subSize = Math.round(Math.min(viewW, viewH) * 0.036)
  const titleSize = Math.round(subSize * 1.28)
  ctx.fillStyle = BIOS_TEXT
  ctx.textBaseline = 'top'
  ctx.setTransform(0, 1, -1, 0, w - pad, pad)

  ctx.font = `500 ${titleSize}px ${FONT}`
  const titleLines = wrap(ctx, stashCopy.form.title, viewW)
  const titleLh = Math.round(titleSize * 1.35)
  let y = 0
  for (const line of titleLines) {
    ctx.fillText(line, 0, y)
    y += titleLh
  }

  y += Math.round(subSize * 0.45)
  ctx.font = `500 ${subSize}px ${FONT}`
  const subLh = Math.round(subSize * 1.35)
  for (const line of wrap(ctx, stashCopy.form.subtitle, viewW)) {
    ctx.fillText(line, 0, y)
    y += subLh
  }

  drawLinks(ctx, viewW, viewH, subSize, icons)
}

function iconSrc(path: string) {
  return path.replace(/^\/public(?=\/)/, '')
}

function loadIcon(path: string) {
  const src = iconSrc(path)
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => {
      console.error('[StashPda] icon', src)
      resolve(null)
    }
    img.src = src
  })
}

function drawLinks(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  size: number,
  icons: (HTMLImageElement | null)[],
) {
  linkSpots.length = 0
  const icon = size
  const gap = Math.round(size * 0.4)
  const itemGap = Math.round(size * 1.6)
  const y = viewH - icon
  ctx.font = `500 ${size}px ${FONT}`
  ctx.textBaseline = 'middle'
  ctx.fillStyle = BIOS_TEXT
  const links = stashCopy.form.links
  let row = 0
  for (let i = 0; i < links.length; i++) {
    row += ctx.measureText(links[i].title).width + gap + icon
    if (i < links.length - 1) {
      row += itemGap
    }
  }
  let x = viewW - row
  stashCopy.form.links.forEach((item, i) => {
    const metrics = ctx.measureText(item.title)
    const titleW = metrics.width
    const mid = y + icon / 2
    const glyphMid = mid + ((metrics.actualBoundingBoxDescent || 0) - (metrics.actualBoundingBoxAscent || 0)) / 2
    ctx.fillText(item.title, x, mid)
    const img = icons[i]
    const iconX = x + titleW + gap
    const iconNudge = item.title === 'GitHub' ? icon * 0.07 : icon * 0.13
    const iconY = glyphMid - icon / 2 - iconNudge
    if (img) {
      ctx.drawImage(img, iconX, iconY, icon, icon)
    }
    const top = Math.min(mid - icon / 2, iconY)
    const bottom = Math.max(mid + icon / 2, iconY + icon)
    linkSpots.push({
      x,
      y: top,
      w: titleW + gap + icon,
      h: bottom - top,
      url: item.link,
    })
    x += titleW + gap + icon + itemGap
  })
}

async function paintScreen(mat: MeshBasicMaterial, planeW: number, planeH: number) {
  if (typeof FontFace === 'undefined') {
    return
  }
  const face = new FontFace(FONT, `url(${FONT_URL})`, { weight: '400 900' })
  await face.load()
  document.fonts.add(face)
  await document.fonts.ready

  const aspect = planeW / Math.max(planeH, 1e-6)
  texW = aspect >= 1 ? 1024 : Math.max(2, Math.round(1024 * aspect))
  texH = aspect >= 1 ? Math.max(2, Math.round(1024 / aspect)) : 1024
  const icons = await Promise.all(stashCopy.form.links.map(item => loadIcon(item.icon)))
  const canvas = document.createElement('canvas')
  canvas.width = texW
  canvas.height = texH
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }
  drawTitle(ctx, texW, texH, icons)

  const map = new CanvasTexture(canvas)
  map.colorSpace = SRGBColorSpace
  map.wrapS = ClampToEdgeWrapping
  map.wrapT = ClampToEdgeWrapping
  map.magFilter = LinearFilter
  map.minFilter = LinearFilter
  map.generateMipmaps = false
  map.needsUpdate = true
  mat.map = map
  mat.needsUpdate = true
  screenOn = true
  const g = props.glow
  const k = 1 + g * 0.12
  mat.color.setRGB(k, k, k)
}

watch(gltf, (loaded) => {
  const scene = loaded?.scene
  if (!scene || pdaModel.value) {
    return
  }
  const { root, model, size } = sitGltfOnFloorBySpan(scene, pdaSpan, [0, 0, lieZ])
  model.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return
    }
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const mat of materials) {
      if (!(mat instanceof MeshStandardMaterial)) {
        continue
      }
      mat.metalness = Math.min(mat.metalness, 0.35)
      mat.roughness = Math.max(mat.roughness, 0.72)
    }
  })
  const unit = root.scale.x
  const left = 0.002 / unit
  const right = -0.006 / unit
  const bottom = 0.009 / unit
  const planeW = size.x * 0.58 + bottom
  const planeH = size.z * 0.68 + left - right
  const glass = new MeshBasicMaterial({
    color: BIOS_BG,
    toneMapped: false,
  })
  const pane = new Mesh(new PlaneGeometry(planeW, planeH), glass)
  screenPane = pane
  pane.rotation.x = -Math.PI / 2
  const shiftRight = 0.0015 / unit
  pane.position.set(-bottom / 2, size.y + 0.0008, -(left + right) / 2 + shiftRight)
  pane.castShadow = false
  pane.receiveShadow = false
  root.add(pane)
  screenMat.value = glass
  pdaModel.value = root
  void paintScreen(glass, planeW, planeH).catch((err) => {
    console.error('[StashPda]', err)
  })
}, { immediate: true })

watch(() => props.glow, (g) => {
  const mat = screenMat.value
  if (!mat || !screenOn) {
    return
  }
  const k = 1 + g * 0.12
  mat.color.setRGB(k, k, k)
}, { immediate: true })

function inHand() {
  const h = stashHold.value
  return stashFocused.value === 'armchair' && h.id === 'armchair' && h.lift > 0.95
}

function spotAt(e: MouseEvent) {
  const pane = screenPane
  const cam = camera.value
  const el = renderer.domElement
  if (!pane || !cam || !el || !inHand() || !linkSpots.length) {
    return null
  }
  const rect = el.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) {
    return null
  }
  ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  cam.updateMatrixWorld()
  raycaster.setFromCamera(ndc, cam)
  pane.updateWorldMatrix(true, false)
  const uv = raycaster.intersectObject(pane, false)[0]?.uv
  if (!uv) {
    return null
  }
  // Холст повёрнут тем же transform, что и заголовок: textX вправо кадра, textY вниз.
  const canvasX = uv.x * texW
  const canvasY = (1 - uv.y) * texH
  const textX = canvasY - padPx
  const textY = (texW - padPx) - canvasX
  return linkSpots.find(spot =>
    textX >= spot.x && textX <= spot.x + spot.w
    && textY >= spot.y && textY <= spot.y + spot.h,
  ) ?? null
}

function setLinkCursor(on: boolean) {
  if (on === linkCursor) {
    return
  }
  linkCursor = on
  document.body.style.cursor = on ? 'pointer' : ''
}

function onMove(e: PointerEvent) {
  if (!inHand()) {
    setLinkCursor(false)
    return
  }
  setLinkCursor(spotAt(e) !== null)
}

function onClick(e: MouseEvent) {
  const spot = spotAt(e)
  if (!spot) {
    return
  }
  window.open(spot.url, '_blank', 'noopener,noreferrer')
}

onMounted(() => {
  const el = renderer.domElement
  el.addEventListener('pointermove', onMove)
  el.addEventListener('click', onClick)
})

onUnmounted(() => {
  const el = renderer.domElement
  el.removeEventListener('pointermove', onMove)
  el.removeEventListener('click', onClick)
  setLinkCursor(false)
})
</script>

<template>
  <primitive v-if="pdaModel" :object="pdaModel" />
</template>
