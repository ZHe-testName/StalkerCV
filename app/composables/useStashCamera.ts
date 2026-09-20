/**
 * Камера схрона: кадр 0, стол (шаги → посадка → вплотную),
 * сервант (шаги с взглядом мимо → фокус → берём прибор в руки).
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
  | 'to-hold'
  | 'to-place'
  | 'sideboard-wait'
  | 'to-home'

const DESK_STEPS = 2
const SIDEBOARD_STEPS = 3
const WALK_TIME = 1.18
const SIT_TIME = 1.05
const READ_TIME = 0.48
const STAND_TIME = 0.82
const HOLD_TIME = 0.9
const WAIT_TIME = 0.4
const HOLD_SCALE = 1.9
const DEVICE_HALF_D = 0.1
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
const sideboard = makeSideboardShots()

export const stashAway = ref(false)
export const stashFocused = ref<AnchorId | null>(null)
export const stashHold = ref({
  lift: 0,
  x: sideboard.hold[0],
  y: sideboard.hold[1],
  z: sideboard.hold[2],
  yaw: sideboard.holdYaw,
  pitch: sideboard.holdPitch,
  scale: HOLD_SCALE,
})

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

function makeSideboardShots() {
  const innerRightX = 6.2 / 2 - 0.24
  const innerBackZ = -(3.4 / 2) + 0.24
  const cabW = 1.48
  const bodyD = 0.52 * 1.5
  const doorT = 0.018
  const yaw = -7 * Math.PI / 180
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  const rot = (x: number, z: number) => ({
    x: x * c + z * s,
    z: -x * s + z * c,
  })
  const pts = [
    rot(cabW / 2, bodyD / 2 + doorT),
    rot(-cabW / 2, bodyD / 2 + doorT),
    rot(cabW / 2, -bodyD / 2),
    rot(-cabW / 2, -bodyD / 2),
  ]
  const originX = innerRightX - 0.5 - Math.max(...pts.map(p => p.x))
  const originZ = innerBackZ - Math.min(...pts.map(p => p.z))
  const d = rot(-cabW / 2 + 0.22, 0.18)
  const device: Vec3 = [originX + d.x, 0.92 + 0.065, originZ + d.z]
  const lf = rot(-cabW / 2, bodyD / 2)
  const leftFront: Vec3 = [originX + lf.x, 0, originZ + lf.z]
  const stand: Vec3 = [leftFront[0] - 0.12, EYE, leftFront[2] + 0.58]
  const glance: Vec3 = [leftFront[0] + 0.1, 0.92, leftFront[2] + 0.05]
  const hold: Vec3 = [stand[0] + 0.015, 1.4, stand[2] - 0.4]
  const toCam = [
    stand[0] - hold[0],
    stand[1] - hold[1],
    stand[2] - hold[2],
  ]
  const toCamLen = Math.hypot(toCam[0], toCam[1], toCam[2]) || 1
  const holdYaw = Math.atan2(toCam[0], toCam[2])
  const holdPitch = -Math.atan2(toCam[1], Math.hypot(toCam[0], toCam[2]))
  const screenOff = DEVICE_HALF_D * HOLD_SCALE
  const holdLook: Vec3 = [
    hold[0] + toCam[0] / toCamLen * screenOff,
    hold[1] + toCam[1] / toCamLen * screenOff,
    hold[2] + toCam[2] / toCamLen * screenOff,
  ]
  return {
    stand: { position: stand, lookAt: device },
    glance,
    device,
    hold,
    holdLook,
    holdYaw,
    holdPitch,
  }
}

function gait(u: number, steps: number) {
  if (u <= 0 || u >= 1) {
    return { y: 0, side: 0 }
  }
  const along = u * steps
  const i = Math.min(steps - 1, Math.floor(along))
  const local = along - i
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
    || mode === 'to-hold'
    || mode === 'to-place'
    || mode === 'sideboard-wait'
    || mode === 'to-home'
  )
}

function durationFor(next: Mode, steps: number) {
  if (next === 'to-anchor' || next === 'to-home') {
    return WALK_TIME * steps / DESK_STEPS
  }
  if (next === 'to-read') {
    return READ_TIME
  }
  if (next === 'to-stand') {
    return STAND_TIME
  }
  if (next === 'to-hold' || next === 'to-place') {
    return HOLD_TIME
  }
  return SIT_TIME
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
  let dwell = 0
  let liftFrom = 0
  let focused: AnchorId | null = null
  let walkSteps = DESK_STEPS
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
    walkSteps = focused === 'sideboard' && (next === 'to-anchor' || next === 'to-home')
      ? SIDEBOARD_STEPS
      : DESK_STEPS
    moveTime = durationFor(next, walkSteps)
    if (next === 'to-hold' || next === 'to-place') {
      liftFrom = stashHold.value.lift
    }
    lookaroundOn.value = false
    stashAway.value = true
    mode = next
  }

  function walkLook(u: number): Vec3 {
    if (focused !== 'sideboard' || mode !== 'to-anchor') {
      return lerp3(fromLook, toLook, u)
    }
    const glanceUntil = 2 / SIDEBOARD_STEPS
    if (u < glanceUntil) {
      return lerp3(fromLook, sideboard.glance, ease(u / glanceUntil))
    }
    return lerp3(sideboard.glance, sideboard.device, ease((u - glanceUntil) / (1 - glanceUntil)))
  }

  function setLift(amount: number) {
    stashHold.value = {
      ...stashHold.value,
      lift: amount,
    }
  }

  function goTo(id: AnchorId) {
    if (isMoving(mode) || mode === 'at-anchor' || id === 'armchair') {
      return
    }
    stashFocused.value = id
    focused = id
    if (id === 'sideboard') {
      startMove(sideboard.stand.position, sideboard.stand.lookAt, 'to-anchor')
      return
    }
    startMove(deskShot.position, deskShot.lookAt, 'to-anchor')
  }

  function goHome() {
    if (mode === 'home' || mode === 'to-home' || mode === 'to-stand' || mode === 'to-place') {
      return
    }
    if (mode === 'to-anchor' || mode === 'sideboard-wait') {
      setLift(0)
      startMove([...homePosition], [...homeLookAt], 'to-home')
      return
    }
    if (focused === 'sideboard') {
      startMove(sideboard.stand.position, sideboard.stand.lookAt, 'to-place')
      return
    }
    startMove(deskShot.position, deskShot.lookAt, 'to-stand')
  }

  const { onBeforeRender } = useLoop()
  const { off } = onBeforeRender(({ delta }) => {
    if (mode === 'sideboard-wait') {
      dwell -= delta
      if (dwell <= 0) {
        startMove(sideboard.stand.position, sideboard.holdLook, 'to-hold')
      }
      return
    }
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
      const bob = gait(u, walkSteps)
      pos[0] += perpX * bob.side
      pos[1] += bob.y
      pos[2] += perpZ * bob.side
      apply(pos, walkLook(u))
    }
    else {
      const k = mode === 'to-sit' || mode === 'to-stand' || mode === 'to-hold' || mode === 'to-place'
        ? smoother(u)
        : ease(u)
      apply(lerp3(fromPos, toPos, k), lerp3(fromLook, toLook, k))
      if (mode === 'to-hold') {
        setLift(liftFrom + (1 - liftFrom) * k)
      }
      if (mode === 'to-place') {
        setLift(liftFrom * (1 - k))
      }
    }
    if (u < 1) {
      return
    }
    apply([...toPos], [...toLook])
    if (mode === 'to-anchor') {
      if (focused === 'sideboard') {
        mode = 'sideboard-wait'
        dwell = WAIT_TIME
        return
      }
      startMove(sitShot.position, sitShot.lookAt, 'to-sit')
      return
    }
    if (mode === 'to-sit') {
      startMove(readShot.position, readShot.lookAt, 'to-read')
      return
    }
    if (mode === 'to-read' || mode === 'to-hold') {
      if (mode === 'to-hold') {
        setLift(1)
      }
      mode = 'at-anchor'
      return
    }
    if (mode === 'to-stand' || mode === 'to-place') {
      setLift(0)
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
