/**
 * Камера схрона: кадр 0, стол (шаги → посадка → вплотную),
 * сервант (шаги с взглядом мимо → фокус → берём прибор в руки),
 * кресло (шаги → разворот спиной → посадка со взглядом на КПК → КПК в руки).
 */
import { onUnmounted, ref } from 'vue'
import { useLoop, useTres } from '@tresjs/core'
import { Object3D, Vector3 } from 'three'

type Vec3 = [number, number, number]
export type AnchorId = 'desk' | 'sideboard' | 'armchair'
type Mode =
  | 'home'
  | 'to-anchor'
  | 'to-turn'
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
const TURN_TIME = 0.72
const HOLD_TIME = 0.9
const WAIT_TIME = 0.4
const HOLD_SCALE = 1.9
const PDA_SCALE = 2.3
const DEVICE_HALF_D = 0.1
const PDA_HALF_D = 0.0225
const ARC_SIDE = 0.078
const ARC_UP = 0.095
const EYE = 1.7
const SIT_DIST = 0.7
const READ_DIST = 0.17

const deskShot = {
  position: [-1.42, EYE, 0.28] as Vec3,
  lookAt: [-2.08, 1.08, -1.02] as Vec3,
}

const sitShot = shotAlongScreen(SIT_DIST)
const readShot = shotAlongScreen(READ_DIST, 0.05, 0)

export function retargetDeskCrt(screen: Vec3, yaw: number) {
  const s = Math.sin(yaw)
  const c = Math.cos(yaw)
  const write = (shot: { position: Vec3, lookAt: Vec3 }, dist: number, y: number) => {
    shot.lookAt[0] = screen[0]
    shot.lookAt[1] = y
    shot.lookAt[2] = screen[2]
    shot.position[0] = screen[0] + s * dist
    shot.position[1] = y
    shot.position[2] = screen[2] + c * dist
  }
  write(sitShot, SIT_DIST, screen[1])
  write(readShot, READ_DIST, screen[1] + 0.05)
}
const sideboard = makeSideboardShots()
const armchair = makeArmchairShots()

export const stashAway = ref(false)
export const stashFocused = ref<AnchorId | null>(null)
export const stashHold = ref({
  lift: 0,
  x: sideboard.hold[0],
  y: sideboard.hold[1],
  z: sideboard.hold[2],
  yaw: sideboard.holdYaw,
  pitch: sideboard.holdPitch,
  roll: 0,
  scale: HOLD_SCALE,
  camX: 0,
  camY: EYE,
  camZ: 0,
  id: null as AnchorId | null,
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

function facingEuler(from: Vec3, toward: Vec3) {
  const obj = new Object3D()
  obj.position.set(from[0], from[1], from[2])
  obj.up.copy(new Vector3(0, 1, 0))
  obj.lookAt(toward[0], toward[1], toward[2])
  return { yaw: obj.rotation.y, pitch: obj.rotation.x, roll: obj.rotation.z }
}

function nearestAngle(from: number, to: number) {
  let delta = to - from
  while (delta > Math.PI) {
    delta -= Math.PI * 2
  }
  while (delta < -Math.PI) {
    delta += Math.PI * 2
  }
  return from + delta
}

function shotAlongScreen(dist: number, yShift = 0, lateral = 0) {
  const wall = 0.24
  const originX = -(6.2 / 2) + wall + 0.28 + 1.85 / 2
  const originZ = -(3.4 / 2) + wall + 1.12 / 2
  const monitorX = -1.85 / 2 + 0.36 - 0.065
  const monitorY = 0.92 + 0.52 * 0.78 + yShift
  const monitorZ = 0.04 - 0.08
  const angle = 14 * Math.PI / 180
  const localZ = 0.12
  const s = Math.sin(angle)
  const c = Math.cos(angle)
  const screen: Vec3 = [
    originX + monitorX + localZ * s + c * lateral,
    monitorY,
    originZ + monitorZ + localZ * c - s * lateral,
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

function makeArmchairShots() {
  const innerRightX = 6.2 / 2 - 0.24
  const innerFrontZ = 3.4 / 2
  const seatW = 0.7
  const seatD = 0.64
  const armW = 0.17
  const armOverhang = 0.07
  const armD = seatD + armOverhang
  const wallGap = 0.43
  const yaw = Math.PI / 2 - 18 * Math.PI / 180
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  const rot = (x: number, z: number) => ({
    x: x * c + z * s,
    z: -x * s + z * c,
  })
  const overallW = seatW + armW * 2
  const armX = seatW / 2 + armW / 2
  const armZ = -armOverhang / 2
  const armFrontZ = armZ - armD / 2
  const chairBackZ = seatD / 2
  const pts = [
    rot(overallW / 2, chairBackZ),
    rot(-overallW / 2, chairBackZ),
    rot(overallW / 2, armFrontZ),
    rot(-overallW / 2, armFrontZ),
  ]
  const originX = innerRightX - wallGap - Math.max(...pts.map(p => p.x))
  const originZ = innerFrontZ - 0.72
  const seat = rot(0, 0)
  const seatWorld: Vec3 = [originX + seat.x, 0, originZ + seat.z]
  const facing: Vec3 = [-s, 0, -c]
  const stand: Vec3 = [
    seatWorld[0] + facing[0] * 0.78,
    EYE,
    seatWorld[2] + facing[2] * 0.78,
  ]
  const sit: Vec3 = [
    seatWorld[0] + facing[0] * 0.1,
    1.18,
    seatWorld[2] + facing[2] * 0.1,
  ]
  const pdaSeatX = (armX + 0.18) / 2
  const pdaSeatZ = (armFrontZ + 0.1 - 0.08) / 2
  const pdaLocal = rot(pdaSeatX, pdaSeatZ)
  const pda: Vec3 = [originX + pdaLocal.x - 0.05, 0.38 - 0.15 + 0.13 - 0.02, originZ + pdaLocal.z - 0.15 + 0.08 - 0.10 - 0.05]
  const pdaScreen: Vec3 = [
    pda[0],
    pda[1] + 0.01,
    pda[2],
  ]
  const look = [
    pdaScreen[0] - sit[0],
    pdaScreen[1] - sit[1],
    pdaScreen[2] - sit[2],
  ]
  const sitLookLeft = 20 * Math.PI / 180
  const sitLookUp = 12 * Math.PI / 180
  const sitCos = Math.cos(sitLookLeft)
  const sitSin = Math.sin(sitLookLeft)
  const sitLookYawed = [
    look[0] * sitCos + look[2] * sitSin,
    look[1],
    -look[0] * sitSin + look[2] * sitCos,
  ]
  const sitLookHoriz = Math.hypot(sitLookYawed[0], sitLookYawed[2]) || 1
  const sitLookAt: Vec3 = [
    sit[0] + sitLookYawed[0],
    sit[1] + sitLookYawed[1] + sitLookHoriz * Math.tan(sitLookUp),
    sit[2] + sitLookYawed[2],
  ]
  const sitLook = [
    sitLookAt[0] - sit[0],
    sitLookAt[1] - sit[1],
    sitLookAt[2] - sit[2],
  ]
  const sitLookLen = Math.hypot(sitLook[0], sitLook[1], sitLook[2]) || 1
  const holdDist = 0.34
  const hold: Vec3 = [
    sit[0] + sitLook[0] / sitLookLen * holdDist,
    sit[1] + sitLook[1] / sitLookLen * holdDist,
    sit[2] + sitLook[2] / sitLookLen * holdDist,
  ]
  const toCam = [
    sit[0] - hold[0],
    sit[1] - hold[1],
    sit[2] - hold[2],
  ]
  const toCamLen = Math.hypot(toCam[0], toCam[1], toCam[2]) || 1
  const face = facingEuler(hold, sit)
  const holdYaw = nearestAngle(yaw, face.yaw)
  const holdPitch = face.pitch
  const holdRoll = 0
  const screenOff = PDA_HALF_D * PDA_SCALE
  const holdLook: Vec3 = [
    hold[0] + toCam[0] / toCamLen * screenOff,
    hold[1] + toCam[1] / toCamLen * screenOff,
    hold[2] + toCam[2] / toCamLen * screenOff,
  ]
  return {
    stand: {
      position: stand,
      lookAt: pdaScreen,
    },
    sit,
    sitLookAt,
    holdCam: sit,
    pda,
    pdaScreen,
    hold,
    holdLook,
    holdYaw,
    holdPitch,
    holdRoll,
    restYaw: yaw,
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
    || mode === 'to-turn'
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
  if (next === 'to-turn') {
    return TURN_TIME
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

  function bindHold(id: AnchorId) {
    if (id === 'sideboard') {
      stashHold.value = {
        lift: 0,
        x: sideboard.hold[0],
        y: sideboard.hold[1],
        z: sideboard.hold[2],
        yaw: sideboard.holdYaw,
        pitch: sideboard.holdPitch,
        roll: 0,
        scale: HOLD_SCALE,
        camX: sideboard.stand.position[0],
        camY: sideboard.stand.position[1],
        camZ: sideboard.stand.position[2],
        id: 'sideboard',
      }
      return
    }
    if (id === 'armchair') {
      stashHold.value = {
        lift: 0,
        x: armchair.hold[0],
        y: armchair.hold[1],
        z: armchair.hold[2],
        yaw: armchair.holdYaw,
        pitch: armchair.holdPitch,
        roll: armchair.holdRoll,
        scale: PDA_SCALE,
        camX: armchair.sit[0],
        camY: armchair.sit[1],
        camZ: armchair.sit[2],
        id: 'armchair',
      }
    }
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
    if (isMoving(mode) || mode === 'at-anchor') {
      return
    }
    stashFocused.value = id
    focused = id
    bindHold(id)
    if (id === 'sideboard') {
      startMove(sideboard.stand.position, sideboard.stand.lookAt, 'to-anchor')
      return
    }
    if (id === 'armchair') {
      startMove(armchair.stand.position, armchair.stand.lookAt, 'to-anchor')
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
    if (focused === 'armchair') {
      if (stashHold.value.lift > 0.02 || mode === 'to-hold' || mode === 'at-anchor') {
        startMove(armchair.sit, armchair.sitLookAt, 'to-place')
        return
      }
      startMove(armchair.stand.position, armchair.stand.lookAt, 'to-stand')
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
      const k = mode === 'to-sit' || mode === 'to-stand' || mode === 'to-hold' || mode === 'to-place' || mode === 'to-turn'
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
      if (focused === 'armchair') {
        startMove(armchair.sit, armchair.sitLookAt, 'to-sit')
        return
      }
      startMove(sitShot.position, sitShot.lookAt, 'to-sit')
      return
    }
    if (mode === 'to-sit') {
      if (focused === 'armchair') {
        startMove(armchair.sit, armchair.sitLookAt, 'to-hold')
        return
      }
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
    if (mode === 'to-place') {
      setLift(0)
      if (focused === 'armchair') {
        startMove(armchair.stand.position, armchair.stand.lookAt, 'to-stand')
        return
      }
      startMove([...homePosition], [...homeLookAt], 'to-home')
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
