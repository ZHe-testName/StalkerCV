/**
 * Canvas-дисплей прибора: 20 индикаторов по кругу (по 5%) + процент в центре.
 * При смене скила гасим по одному, затем зажигаем до новой доли.
 * Цвета — зелёный экран детектора (emissive Screen_Locator).
 */
import {
  CanvasTexture,
  LinearFilter,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
} from 'three'

const TEX = 512
const LED_COUNT = 20
const PCT_PER_LED = 5
const FONT_URL = publicPath('/fonts/Tektur.ttf')
const FONT_FAMILY = 'Tektur'
/** Секунд на одну лампочку: гашение быстрее зажигания. */
const LED_DOWN_SEC = 0.014
const LED_UP_SEC = 0.028

/** Вкл / выкл / фон — из зелёного emissive модели (0, 0.74, 0.05). */
const COL_BG = '#031006'
const COL_OFF = '#0a3d12'
const COL_ON = '#1db828'
const COL_ON_CORE = '#6fd86a'
const COL_TEXT = '#6be85a'
const COL_TEXT_DIM = '#1c5a28'
/** Внешняя шкала 0/25/50/75/100 — тусклее сегментов. */
const COL_SCALE = '#2a6a34'

export type SkillScreenDisplay = {
  setLevel: (level: number, animate?: boolean) => void
  update: (dt: number) => void
  attach: (root: Mesh) => void
}

export function createSkillScreenDisplay(): SkillScreenDisplay {
  const canvas = document.createElement('canvas')
  canvas.width = TEX
  canvas.height = TEX
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('skill screen canvas')
  }

  const map = new CanvasTexture(canvas)
  map.colorSpace = SRGBColorSpace
  map.minFilter = LinearFilter
  map.magFilter = LinearFilter
  map.needsUpdate = true

  let shown = 0
  let target = 0
  let pct = 0
  let phase: 'idle' | 'down' | 'up' = 'idle'
  let accum = 0
  const mats: MeshStandardMaterial[] = []

  function paint() {
    const cx = TEX / 2
    const cy = TEX / 2
    ctx.clearRect(0, 0, TEX, TEX)
    ctx.fillStyle = COL_BG
    ctx.beginPath()
    ctx.arc(cx, cy, TEX * 0.48, 0, Math.PI * 2)
    ctx.fill()

    // Стык 0↔100 строго вниз (6 часов); сегменты идут от него по кругу.
    const gapAngle = Math.PI / 2
    const rScaleOut = TEX * 0.455
    const rScaleIn = TEX * 0.432
    const rOut = TEX * 0.395
    const rIn = TEX * 0.285
    const markPcts = [0, 25, 50, 75, 100]
    // 0 и 100 по разные стороны нижнего разрыва; 25/50/75 равномерно.
    const markAngles = markPcts.map((p) => {
      if (p === 0) {
        return gapAngle + 0.1
      }
      if (p === 100) {
        return gapAngle - 0.1 + Math.PI * 2
      }
      return gapAngle + (p / 100) * Math.PI * 2
    })
    const notch = 0.05

    // Шкала и сегменты тусклее; процент в центре остаётся ярким.
    ctx.save()
    ctx.globalAlpha = 0.55

    // Внешнее кольцо-шкала с разрывами под отметки (как на родной текстуре).
    ctx.strokeStyle = COL_SCALE
    ctx.lineWidth = Math.max(1.5, TEX * 0.006)
    ctx.lineCap = 'butt'
    for (let i = 0; i < markAngles.length - 1; i++) {
      const a0 = markAngles[i] + notch
      const a1 = markAngles[i + 1] - notch
      if (a1 <= a0) {
        continue
      }
      ctx.beginPath()
      ctx.arc(cx, cy, (rScaleIn + rScaleOut) * 0.5, a0, a1, false)
      ctx.stroke()
    }
    ctx.font = `600 ${Math.round(TEX * 0.028)}px "${FONT_FAMILY}", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < markPcts.length; i++) {
      const a = markAngles[i]
      const cos = Math.cos(a)
      const sin = Math.sin(a)
      ctx.strokeStyle = COL_SCALE
      ctx.lineWidth = Math.max(1.2, TEX * 0.0045)
      ctx.beginPath()
      ctx.moveTo(cx + cos * (rOut + TEX * 0.008), cy + sin * (rOut + TEX * 0.008))
      ctx.lineTo(cx + cos * rScaleOut, cy + sin * rScaleOut)
      ctx.stroke()
      const tr = Math.min(TEX * 0.472, rScaleOut + TEX * 0.018)
      ctx.fillStyle = COL_SCALE
      ctx.fillText(String(markPcts[i]), cx + cos * tr, cy + sin * tr)
    }

    const step = (Math.PI * 2) / LED_COUNT
    const half = step * 0.38
    for (let i = 0; i < LED_COUNT; i++) {
      const mid = gapAngle + step / 2 + i * step
      const on = i < shown
      ctx.beginPath()
      ctx.arc(cx, cy, rOut, mid - half, mid + half, false)
      ctx.arc(cx, cy, rIn, mid + half, mid - half, true)
      ctx.closePath()
      if (on) {
        const g = ctx.createRadialGradient(
          cx + Math.cos(mid) * (rIn + rOut) * 0.5,
          cy + Math.sin(mid) * (rIn + rOut) * 0.5,
          2,
          cx + Math.cos(mid) * (rIn + rOut) * 0.5,
          cy + Math.sin(mid) * (rIn + rOut) * 0.5,
          (rOut - rIn) * 1.2,
        )
        g.addColorStop(0, COL_ON_CORE)
        g.addColorStop(1, COL_ON)
        ctx.fillStyle = g
      }
      else {
        ctx.fillStyle = COL_OFF
      }
      ctx.fill()
    }
    ctx.restore()

    // Внутренний диск под цифры
    ctx.fillStyle = '#020a04'
    ctx.beginPath()
    ctx.arc(cx, cy, rIn * 0.92, 0, Math.PI * 2)
    ctx.fill()

    const label = `${Math.round(pct)}`
    ctx.fillStyle = COL_TEXT_DIM
    ctx.font = `600 ${Math.round(TEX * 0.055)}px "${FONT_FAMILY}", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('%', cx + TEX * 0.145, cy + TEX * 0.015)

    ctx.fillStyle = COL_TEXT
    ctx.font = `700 ${Math.round(TEX * 0.2)}px "${FONT_FAMILY}", sans-serif`
    ctx.fillText(label, cx - TEX * 0.03, cy + TEX * 0.01)
  }

  function bump() {
    paint()
    map.needsUpdate = true
  }

  function setLevel(level: number, animate = true) {
    const clamped = Math.min(100, Math.max(0, level))
    pct = clamped
    const next = Math.min(LED_COUNT, Math.max(0, Math.round(clamped / PCT_PER_LED)))
    if (!animate) {
      shown = next
      target = next
      phase = 'idle'
      accum = 0
      bump()
      return
    }
    target = next
    accum = 0
    phase = shown > 0 ? 'down' : 'up'
    bump()
  }

  function update(dt: number) {
    if (phase === 'idle') {
      return
    }
    accum += dt
    let dirty = false
    while (phase !== 'idle') {
      const step = phase === 'down' ? LED_DOWN_SEC : LED_UP_SEC
      if (accum < step) {
        break
      }
      accum -= step
      if (phase === 'down') {
        if (shown > 0) {
          shown -= 1
          dirty = true
        }
        if (shown <= 0) {
          phase = 'up'
          accum = 0
        }
      }
      else if (phase === 'up') {
        if (shown < target) {
          shown += 1
          dirty = true
        }
        if (shown >= target) {
          phase = 'idle'
          accum = 0
          break
        }
      }
    }
    if (dirty) {
      bump()
    }
  }

  function attach(root: Mesh) {
    const list = Array.isArray(root.material) ? root.material : [root.material]
    for (const mat of list) {
      if (!(mat instanceof MeshStandardMaterial)) {
        continue
      }
      mat.map = map
      mat.emissiveMap = map
      mat.color.set('#ffffff')
      mat.emissive.set('#ffffff')
      mat.transparent = true
      mat.needsUpdate = true
      if (!mats.includes(mat)) {
        mats.push(mat)
      }
    }
    bump()
  }

  paint()
  void new FontFace(FONT_FAMILY, `url(${FONT_URL})`).load().then((face) => {
    document.fonts.add(face)
    bump()
  }).catch(() => {})

  return { setLevel, update, attach }
}
