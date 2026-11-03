/**
 * UI шага шкалы прибора: кнопки живут в app.vue (вне TresCanvas),
 * шаг и «в руках» регистрирует StashSideboard.
 */
import { ref } from 'vue'

export const stashDeviceDialHeld = ref(false)

let stepFn: ((dir: -1 | 1) => void) | null = null

export function bindStashDeviceDialStep(fn: (dir: -1 | 1) => void) {
  stepFn = fn
  return () => {
    if (stepFn === fn) {
      stepFn = null
    }
  }
}

export function stepStashDeviceDial(dir: -1 | 1) {
  stepFn?.(dir)
}
