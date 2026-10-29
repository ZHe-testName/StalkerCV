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
let sendBox: { x: number, y: number, w: number, h: number } | null = null
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
  phoneIcon: HTMLImageElement | null,
  sendIcon: HTMLImageElement | null,
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
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

  const phoneRule = drawPhone(ctx, viewW, y, subSize, phoneIcon)
  drawForm(ctx, viewW, viewH, phoneRule, subSize, sendIcon)
  drawLinks(ctx, viewH, subSize, icons)
}

function drawPhone(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  y: number,
  size: number,
  icon: HTMLImageElement | null,
) {
  const phone = stashCopy.form.phone
  const gap = Math.round(size * 0.75)
  y += gap
  rule(ctx, viewW, y)

  y += gap
  ctx.fillStyle = BIOS_TEXT
  ctx.textBaseline = 'top'
  ctx.font = `500 ${size}px ${FONT}`
  ctx.fillText(phone.title, 0, y)
  y += Math.round(size * 1.35) + Math.round(size * 0.35)

  const gapX = Math.round(size * 0.4)
  const iconY = y - size * 0.08
  if (icon) {
    ctx.drawImage(icon, 0, iconY, size, size)
  }
  ctx.textBaseline = 'middle'
  ctx.fillText(phone.number, size + gapX, y + size / 2)
  const ruleY = y + size + gap
  rule(ctx, viewW, ruleY)
  return ruleY
}

function drawForm(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  y: number,
  size: number,
  sendIcon: HTMLImageElement | null,
) {
  const fields = stashCopy.form.email
  const colGap = Math.round(size * 0.7)
  const fontSize = Math.round(size * 0.85)
  const labelH = Math.round(fontSize * 1.2)
  const labelGap = Math.round(size * 0.22)
  const inputH = Math.round(size * 2.15)
  const inputsW = Math.round((viewW - colGap) / 3)
  const textW = viewW - colGap - inputsW
  const formTop = y + Math.round(size * 0.75)
  const textBottom = viewH - size - Math.round(size * 2.4)
  const slot = labelH + labelGap
  const rowGap = Math.round(size * 0.45)
  const radius = Math.round(size * 0.28)
  sendBox = null
  const labels = [fields.name, fields.mail, fields.subject]
  const textX = inputsW + colGap
  ctx.font = `500 ${fontSize}px ${FONT}`
  ctx.fillStyle = BIOS_TEXT
  ctx.strokeStyle = BIOS_TEXT
  ctx.lineWidth = 1
  ctx.textBaseline = 'top'
  let firstInput = formTop
  labels.forEach((title, i) => {
    const blockTop = formTop + i * (slot + inputH + rowGap)
    const inputTop = blockTop + slot
    if (i === 0) {
      firstInput = inputTop
    }
    ctx.fillText(title, 0, blockTop)
    roundBox(ctx, 0, inputTop, inputsW, inputH, radius)
  })
  ctx.fillText(fields.msg, textX, formTop)
  const msgH = textBottom - firstInput
  roundBox(ctx, textX, firstInput, textW, msgH, radius)
  drawSend(ctx, viewW, viewH, size, fontSize, radius, sendIcon)
}

function drawSend(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  size: number,
  fontSize: number,
  radius: number,
  icon: HTMLImageElement | null,
) {
  const label = stashCopy.form.email.send
  const iconSize = fontSize
  const gap = Math.round(size * 0.4)
  const padX = Math.round(size * 0.7)
  const btnH = Math.round(size * 2.15)
  ctx.font = `500 ${fontSize}px ${FONT}`
  const textW = ctx.measureText(label).width
  const btnW = padX * 2 + textW + gap + iconSize
  const x = viewW - btnW
  const y = viewH - btnH
  sendBox = { x, y, w: btnW, h: btnH }
  roundBox(ctx, x, y, btnW, btnH, radius)
  ctx.textBaseline = 'middle'
  const mid = y + btnH / 2
  ctx.fillText(label, x + padX, mid)
  if (icon) {
    ctx.drawImage(icon, x + padX + textW + gap, mid - iconSize / 2, iconSize, iconSize)
  }
}

function roundBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.stroke()
}

function rule(ctx: CanvasRenderingContext2D, viewW: number, y: number) {
  ctx.strokeStyle = BIOS_TEXT
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, y)
  ctx.lineTo(viewW, y)
  ctx.stroke()
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
  let x = 0
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
  const [icons, phoneIcon, sendIcon] = await Promise.all([
    Promise.all(stashCopy.form.links.map(item => loadIcon(item.icon))),
    loadIcon(stashCopy.form.phone.icon),
    loadIcon(stashCopy.form.email.icon),
  ])
  const canvas = document.createElement('canvas')
  canvas.width = texW
  canvas.height = texH
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }
  drawTitle(ctx, texW, texH, icons, phoneIcon, sendIcon)

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

function textAt(e: MouseEvent) {
  const pane = screenPane
  const cam = camera.value
  const el = renderer.domElement
  if (!pane || !cam || !el || !inHand()) {
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
  return {
    x: canvasY - padPx,
    y: (texW - padPx) - canvasX,
  }
}

function boxHit<T extends { x: number, y: number, w: number, h: number }>(
  list: T[],
  x: number,
  y: number,
) {
  return list.find(spot =>
    x >= spot.x && x <= spot.x + spot.w
    && y >= spot.y && y <= spot.y + spot.h,
  ) ?? null
}

function setLinkCursor(on: boolean) {
  const el = renderer.domElement
  const next = on ? 'pointer' : ''
  if (on === linkCursor && el.style.cursor === next) {
    return
  }
  linkCursor = on
  el.style.cursor = next
}

function onMove(e: PointerEvent) {
  const at = textAt(e)
  if (!at) {
    setLinkCursor(false)
    return
  }
  const over = boxHit(linkSpots, at.x, at.y)
    || (sendBox && boxHit([sendBox], at.x, at.y))
  setLinkCursor(over !== null)
}

function onClick(e: MouseEvent) {
  const at = textAt(e)
  if (!at) {
    return
  }
  const spot = boxHit(linkSpots, at.x, at.y)
  if (spot) {
    window.open(spot.url, '_blank', 'noopener,noreferrer')
  }
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
