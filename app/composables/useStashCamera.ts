/**
 * Камера схрона: кадр 0 + подход шагами + посадка за стол.
 * К монитору: идём на 1.7 м, садимся в плоскость экрана, затем вплотную читать.
 */
import { onUnmounted, ref } from 'vue'
import { useLoop, useTres } from '@tresjs/core'

type Vec3 = [number, number, number]
export type AnchorId = 'desk' | 'sideboard' | 'armchair'
type Mode =
  | 'home'
  | 'to-anchor'
  | 'to-sit'
  | 'to-read'
  | 'at-anchor'
  | 'to-stand'
  | 'to-home'

const STEPS = 2
const WALK_TIME = 1.18
const SIT_TIME = 1.05
const READ_TIME = 0.48
const STAND_TIME = 0.82
const ARC_SIDE = 0.078
const ARC_UP = 0.095
const EYE = 1.7
const SIT_DIST = 0.7
const READ_DIST = 0.36

const deskShot = {
  position: [-1.42, EYE, 0.28] as Vec3,
  lookAt: [-2.08, 1.08, -1.02] as Vec3,
}

const sitShot = shotAlongScreen(SIT_DIST)
const readShot = shotAlongScreen(READ_DIST)

export const stashAway = ref(false)
export const stashFocused = ref<AnchorId | null>(null)

export const stashFocus = {
  goHome: () => {},
  goTo: (_id: AnchorId) => {},
}

const lerp3 = (a: Vec3, b: Vec3, u: number): Vec3 => [
  a[0] + (b[0] - a[0]) * u,
  a[1] + (b[1] - a[1]) * u,
  a[2] + (b[2] - a[2]) * u,
]

const ease = (u: number) => u * u * (3 - 2 * u)
const smoother = (u: number) => u * u * u * (u * (u * 6 - 15) + 10)

function shotAlongScreen(dist: number) {
  const wall = 0.24
  const originX = -(6.2 / 2) + wall + 0.28 + 1.85 / 2
  const originZ = -(3.4 / 2) + wall + 1.12 / 2
  const monitorX = -1.85 / 2 + 0.1 + 0.52 / 2
  const monitorY = 0.84 + 0.42 / 2
  const monitorZ = -1.12 / 2 + 0.1 + 0.4 / 2
  const angle = 14 * Math.PI / 180
  const localZ = 0.4 / 2 + 0.014 / 2
  const s = Math.sin(angle)
  const c = Math.cos(angle)
  const screen: Vec3 = [
    originX + monitorX + localZ * s,
    monitorY,
    originZ + monitorZ + localZ * c,
  ]
  return {
    position: [
      screen[0] + s * dist,
      screen[1],
      screen[2] + c * dist,
    ] as Vec3,
    lookAt: screen,
  }
}

function gait(u: number) {
  if (u <= 0 || u >= 1) {
    return { y: 0, side: 0 }
  }
  const steps = u * STEPS
  const i = Math.min(STEPS - 1, Math.floor(steps))
  const local = steps - i
  const sign = i % 2 === 0 ? -1 : 1
  const fade = u < 0.06 ? u / 0.06 : u > 0.94 ? (1 - u) / 0.06 : 1
  const { side, y } = stepArc(local, sign)
  return { y: y * fade, side: side * fade }
}

function stepArc(local: number, sign: number) {
  let along = 0
  let up = 0
  if (local <= 0.5) {
    const a = local * Math.PI
    along = ARC_UP * Math.sin(a)
    up = ARC_SIDE * (1 - Math.cos(a))
  }
  else {
    const a = (local - 0.5) * Math.PI
    along = ARC_UP * (1 - Math.sin(a))
    up = ARC_SIDE * Math.cos(a)
  }
  return {
    side: sign * up,
    y: along,
  }
}

function isWalk(mode: Mode) {
  return mode === 'to-anchor' || mode === 'to-home'
}

function isMoving(mode: Mode) {
  return (
    mode === 'to-anchor'
    || mode === 'to-sit'
    || mode === 'to-read'
    || mode === 'to-stand'
    || mode === 'to-home'
  )
}

export function useStashCamera(homePosition: Vec3, homeLookAt: Vec3) {
  const position = ref<Vec3>([...homePosition])
  const { lookAt, enabled: lookaroundOn } = useStashLookaround(homePosition, homeLookAt)
  const { camera } = useTres()

  let mode: Mode = 'home'
  let fromPos: Vec3 = [...homePosition]
  let fromLook: Vec3 = [...homeLookAt]
  let toPos: Vec3 = [...homePosition]
  let toLook: Vec3 = [...homeLookAt]
  let t = 0
  let moveTime = WALK_TIME
  let focused: AnchorId | null = null
  let perpX = 0
  let perpZ = 1

  function apply(pos: Vec3, look: Vec3) {
    position.value = pos
    lookAt.value = look
    const cam = camera.value
    if (!cam) {
      return
    }
    cam.position.set(pos[0], pos[1], pos[2])
    cam.lookAt(look[0], look[1], look[2])
  }

  function startMove(nextPos: Vec3, nextLook: Vec3, next: Mode) {
    fromPos = [...position.value]
    fromLook = [...lookAt.value]
    toPos = nextPos
    toLook = nextLook
    t = 0
    const dx = toPos[0] - fromPos[0]
    const dz = toPos[2] - fromPos[2]
    const len = Math.hypot(dx, dz) || 1
    perpX = -dz / len
    perpZ = dx / len
    moveTime =
      next === 'to-anchor' || next === 'to-home'
        ? WALK_TIME
        : next === 'to-read'
          ? READ_TIME
          : next === 'to-stand'
            ? STAND_TIME
            : SIT_TIME
    lookaroundOn.value = false
    stashAway.value = true
    mode = next
  }

  function goTo(id: AnchorId) {
    if (isMoving(mode) || mode === 'at-anchor') {
      return
    }
    stashFocused.value = id
    startMove(deskShot.position, deskShot.lookAt, 'to-anchor')
    focused = id
  }

  function goHome() {
    if (mode === 'home' || mode === 'to-home' || mode === 'to-stand') {
      return
    }
    if (mode === 'to-anchor') {
      startMove([...homePosition], [...homeLookAt], 'to-home')
      return
    }
    startMove(deskShot.position, deskShot.lookAt, 'to-stand')
  }

  const { onBeforeRender } = useLoop()
  const { off } = onBeforeRender(({ delta }) => {
    if (!isMoving(mode)) {
      return
    }
    t += delta
    const u = Math.min(1, t / moveTime)
    if (isWalk(mode)) {
      const pos: Vec3 = [
        fromPos[0] + (toPos[0] - fromPos[0]) * u,
        fromPos[1],
        fromPos[2] + (toPos[2] - fromPos[2]) * u,
      ]
      const bob = gait(u)
      pos[0] += perpX * bob.side
      pos[1] += bob.y
      pos[2] += perpZ * bob.side
      apply(pos, lerp3(fromLook, toLook, u))
    }
    else {
      const k = mode === 'to-sit' || mode === 'to-stand' ? smoother(u) : ease(u)
      apply(lerp3(fromPos, toPos, k), lerp3(fromLook, toLook, k))
    }
    if (u < 1) {
      return
    }
    apply([...toPos], [...toLook])
    if (mode === 'to-anchor') {
      startMove(sitShot.position, sitShot.lookAt, 'to-sit')
      return
    }
    if (mode === 'to-sit') {
      startMove(readShot.position, readShot.lookAt, 'to-read')
      return
    }
    if (mode === 'to-read') {
      mode = 'at-anchor'
      return
    }
    if (mode === 'to-stand') {
      startMove([...homePosition], [...homeLookAt], 'to-home')
      return
    }
    mode = 'home'
    focused = null
    stashFocused.value = null
    stashAway.value = false
    lookaroundOn.value = true
  })

  stashFocus.goHome = goHome
  stashFocus.goTo = goTo

  onUnmounted(() => {
    off()
    stashFocus.goHome = () => {}
    stashFocus.goTo = () => {}
  })

  return { position, lookAt, goTo, goHome }
}
