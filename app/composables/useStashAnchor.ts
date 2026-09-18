/**
 * Ховер якоря: курсор pointer и пульс glow.
 * Слушатели — на объёме всей группы (стол / сервант / кресло), не на мелком предмете.
 */
import { onUnmounted, ref } from 'vue'
import { useLoop } from '@tresjs/core'

let hoverCount = 0

export function useStashAnchor() {
  const hovered = ref(false)
  const glow = ref(0)
  let leaveTimer: ReturnType<typeof setTimeout> | null = null

  const { onBeforeRender } = useLoop()
  onBeforeRender(({ elapsed }) => {
    if (!hovered.value) {
      glow.value = 0
      return
    }
    glow.value = 0.62 + Math.sin(elapsed * 3.4) * 0.3
  })

  function onPointerEnter() {
    if (leaveTimer) {
      clearTimeout(leaveTimer)
      leaveTimer = null
    }
    if (hovered.value) {
      return
    }
    hovered.value = true
    hoverCount++
    document.body.style.cursor = 'pointer'
  }

  function onPointerLeave() {
    if (leaveTimer) {
      clearTimeout(leaveTimer)
    }
    leaveTimer = setTimeout(() => {
      leaveTimer = null
      if (!hovered.value) {
        return
      }
      hovered.value = false
      hoverCount = Math.max(0, hoverCount - 1)
      if (hoverCount === 0) {
        document.body.style.cursor = ''
      }
    }, 40)
  }

  onUnmounted(() => {
    if (leaveTimer) {
      clearTimeout(leaveTimer)
    }
    if (hovered.value) {
      hovered.value = false
      hoverCount = Math.max(0, hoverCount - 1)
      if (hoverCount === 0) {
        document.body.style.cursor = ''
      }
    }
  })

  return { hovered, glow, onPointerEnter, onPointerLeave }
}
