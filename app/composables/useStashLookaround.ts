/**
 * Живой кадр 0: камера стоит, взгляд блуждает по yaw на пару градусов.
 * Не шум каждый кадр — цель, плавный доезд, пауза, новая цель.
 * `enabled` потом выключим на время подхода к якорю.
 */
import { onUnmounted, ref } from 'vue'
import { useLoop, useTres } from '@tresjs/core'

const DEG = Math.PI / 180
const AMP_MIN = 1.5 * DEG
const AMP_MAX = 2.5 * DEG
const MOVE_MIN = 2.6
const MOVE_MAX = 4.4
const DWELL_MIN = 0.9
const DWELL_MAX = 2.4

const rand = (min: number, max: number) => min + Math.random() * (max - min)

export function useStashLookaround(
  cameraPosition: [number, number, number],
  homeLookAt: [number, number, number],
) {
  const enabled = ref(true)
  const lookAt = ref<[number, number, number]>([...homeLookAt])

  let yaw = 0
  let fromYaw = 0
  let toYaw = pickTarget(0)
  let t = 0
  let duration = rand(MOVE_MIN, MOVE_MAX)
  let dwelling = false
  let dwellLeft = 0
  let wasEnabled = true

  const homeDirX = homeLookAt[0] - cameraPosition[0]
  const homeDirY = homeLookAt[1] - cameraPosition[1]
  const homeDirZ = homeLookAt[2] - cameraPosition[2]

  function applyYaw(angle: number) {
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    const next: [number, number, number] = [
      cameraPosition[0] + homeDirX * c + homeDirZ * s,
      cameraPosition[1] + homeDirY,
      cameraPosition[2] + -homeDirX * s + homeDirZ * c,
    ]
    lookAt.value = next
    camera.value?.lookAt(next[0], next[1], next[2])
  }

  const { camera } = useTres()
  const { onBeforeRender } = useLoop()
  const { off } = onBeforeRender(({ delta }) => {
    if (!enabled.value) {
      wasEnabled = false
      return
    }

    if (!wasEnabled) {
      yaw = 0
      fromYaw = 0
      toYaw = pickTarget(0)
      t = 0
      duration = rand(MOVE_MIN, MOVE_MAX)
      dwelling = false
      wasEnabled = true
    }

    if (dwelling) {
      dwellLeft -= delta
      if (dwellLeft <= 0) {
        dwelling = false
        fromYaw = yaw
        toYaw = pickTarget(yaw)
        t = 0
        duration = rand(MOVE_MIN, MOVE_MAX)
      }
      return
    }

    t += delta
    const u = Math.min(1, t / duration)
    const eased = u * u * (3 - 2 * u)
    yaw = fromYaw + (toYaw - fromYaw) * eased
    applyYaw(yaw)

    if (u >= 1) {
      dwelling = true
      dwellLeft = rand(DWELL_MIN, DWELL_MAX)
    }
  })

  onUnmounted(() => {
    off()
  })

  return { lookAt, enabled }
}

function pickTarget(current: number) {
  if (Math.random() < 0.28) {
    return 0
  }

  for (let i = 0; i < 8; i++) {
    const mag = rand(AMP_MIN, AMP_MAX)
    const next = (Math.random() < 0.5 ? -1 : 1) * mag
    if (Math.abs(next - current) > AMP_MIN * 0.7) {
      return next
    }
  }

  return current > 0 ? -AMP_MAX : AMP_MAX
}
