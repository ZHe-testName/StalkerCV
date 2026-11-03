/**
 * Прогресс загрузки сцены: скачки по числу файлов (THREE DefaultLoadingManager).
 * Хук вешать в app.vue setup, до маунта TresCanvas.
 */
import { DefaultLoadingManager } from 'three'

const TICKS = 20
const QUIET_MS = 450

const progress = ref(0)
const filesReady = ref(false)

let hooked = false
let quiet: ReturnType<typeof setTimeout> | null = null

function hookManager() {
  if (hooked || import.meta.server) {
    return
  }
  hooked = true
  const mgr = DefaultLoadingManager
  const itemStart = mgr.itemStart.bind(mgr)
  mgr.itemStart = (url: string) => {
    if (quiet) {
      clearTimeout(quiet)
      quiet = null
    }
    itemStart(url)
  }
  const onProgress = mgr.onProgress
  mgr.onProgress = (url, loaded, total) => {
    onProgress?.(url, loaded, total)
    progress.value = total > 0 ? loaded / total : 0
    if (quiet) {
      clearTimeout(quiet)
      quiet = null
    }
    if (loaded === total && total > 0 && !filesReady.value) {
      quiet = setTimeout(() => {
        progress.value = 1
        filesReady.value = true
      }, QUIET_MS)
    }
  }
  const onLoad = mgr.onLoad
  mgr.onLoad = () => {
    onLoad?.()
    if (quiet) {
      clearTimeout(quiet)
    }
    if (!filesReady.value) {
      quiet = setTimeout(() => {
        progress.value = 1
        filesReady.value = true
      }, QUIET_MS)
    }
  }
  const onError = mgr.onError
  mgr.onError = (url) => {
    onError?.(url)
  }
}

export function useStashBootLoad() {
  hookManager()
  const lit = computed(() => {
    if (filesReady.value) {
      return TICKS
    }
    return Math.min(TICKS, Math.floor(progress.value * TICKS))
  })
  return { progress, filesReady, lit, tickCount: TICKS }
}
