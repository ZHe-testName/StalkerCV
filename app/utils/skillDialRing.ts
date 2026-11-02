/**
 * Кольцо подписей вокруг ручки прибора: canvas → CanvasTexture на плоском диске.
 * Имена из stashCopy.skills, порядок = деления по кругу.
 * Деление 0 на холсте сверху → после rotX −90° смотрит в −Z. Сдвиг под носик
 * ручки — в paint (phase), не yaw меша: иначе накренится горизонтальный текст.
 */
import {
  CanvasTexture,
  CircleGeometry,
  DoubleSide,
  LinearFilter,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SRGBColorSpace,
  Vector3,
} from 'three'

export type SkillDialItem = {
  title: string
  level: number
}

const TEX = 1024
const FONT_URL = '/fonts/PressStart2P-Regular.ttf'
const FONT_FAMILY = 'PressStart2P'

/** Докрут после угла носика: носик ещё чуть левее 0 → отрицательный. */
export const DIAL_PHASE_TWEAK = -6 * Math.PI / 180

function paintDial(
  skills: readonly SkillDialItem[],
  ctx: CanvasRenderingContext2D,
  phase: number,
) {
  const canvas = ctx.canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const cx = TEX / 2
  const cy = TEX / 2
  const n = skills.length
  if (!n) {
    return
  }

  const step = (Math.PI * 2) / n
  const textR = TEX * 0.4
  const fontPx = Math.max(26, Math.round(TEX * 0.038))

  ctx.fillStyle = 'rgba(22, 18, 12, 0.95)'
  ctx.font = `${fontPx}px "${FONT_FAMILY}", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let i = 0; i < n; i++) {
    // index 0 сверху холста → после rotX −90° смотрит в −Z; phase крутит только позиции.
    const angle = -Math.PI / 2 + phase + i * step
    const tx = cx + Math.cos(angle) * textR
    const ty = cy + Math.sin(angle) * textR
    // Горизонтально относительно прибора: без поворота глифа и без yaw меша.
    ctx.fillText(skills[i].title, tx, ty)
  }
}

/** Синхронно: диск появляется сразу, шрифт подтянется фоном. */
export function createSkillDialRing(
  skills: readonly SkillDialItem[],
  radius: number,
  phase = 0,
) {
  const canvas = document.createElement('canvas')
  canvas.width = TEX
  canvas.height = TEX
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('skill dial canvas')
  }
  paintDial(skills, ctx, phase)

  const map = new CanvasTexture(canvas)
  map.colorSpace = SRGBColorSpace
  map.minFilter = LinearFilter
  map.magFilter = LinearFilter
  map.needsUpdate = true

  const geom = new CircleGeometry(Math.max(radius, 1e-4), 64)
  const mat = new MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
  const mesh = new Mesh(geom, mat)
  mesh.name = 'skill_dial'
  mesh.renderOrder = 3
  mesh.rotation.x = -Math.PI / 2

  void new FontFace(FONT_FAMILY, `url(${FONT_URL})`).load().then((face) => {
    document.fonts.add(face)
    paintDial(skills, ctx, phase)
    map.needsUpdate = true
  }).catch(() => {})

  return { mesh, map, canvas }
}

export function skillStepAngle(count: number) {
  return count > 0 ? (Math.PI * 2) / count : 0
}

/**
 * Угол носика ручки вокруг Y в локали knob: 0 = −Z (куда смотрит деление 0
 * после rotX −90° у диска). Берём вершину дальше всего от оси Y.
 */
export function knobPointerAngleY(knob: Object3D) {
  const v = new Vector3()
  const toKnob = new Matrix4()
  let bestR = 0
  let bestAng = 0
  knob.updateMatrixWorld(true)
  const invKnob = knob.matrixWorld.clone().invert()
  knob.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh || !mesh.geometry?.attributes?.position) {
      return
    }
    toKnob.copy(invKnob).multiply(mesh.matrixWorld)
    const pos = mesh.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(toKnob)
      const r = Math.hypot(v.x, v.z)
      if (r > bestR) {
        bestR = r
        bestAng = Math.atan2(v.x, -v.z)
      }
    }
  })
  return bestAng
}
