<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { stashAway, stashFocused, stashFocus } from '~/composables/useStashCamera'

useStashBootLoad()

const sceneOpen = ref(false)
provide('stashSceneOpen', sceneOpen)
const backGone = ref(false)
let hideBack = 0
const showBack = computed(() => !backGone.value && (stashAway.value || stashFocused.value !== null))
const backTop = computed(() => stashFocused.value === 'armchair')

function leave() {
  if (!showBack.value) {
    return
  }
  stashFocus.goHome()
  if (hideBack) {
    return
  }
  hideBack = window.setTimeout(() => {
    backGone.value = true
    hideBack = 0
  }, 1000)
}

watch(stashFocused, (id) => {
  if (!id) {
    return
  }
  backGone.value = false
  if (hideBack) {
    window.clearTimeout(hideBack)
    hideBack = 0
  }
})

function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape' || e.repeat || !showBack.value) {
    return
  }
  e.preventDefault()
  leave()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  if (hideBack) {
    window.clearTimeout(hideBack)
  }
})
</script>

<template>
  <NuxtRouteAnnouncer />
  <TresCanvas
    window-size
    shadows
    render-mode="manual"
    clear-color="#4a5560"
    power-preference="high-performance"
    :dpr="[1, 1.5]"
    :antialias="false"
    :alpha="false"
  >
    <StashRenderGate />
    <StashExperience />
  </TresCanvas>
  <div class="vignette" aria-hidden="true" />
  <StashBoot v-if="!sceneOpen" @enter="sceneOpen = true" />
  <Teleport to="body">
    <button
      v-show="showBack"
      class="back"
      type="button"
      :class="{ top: backTop }"
      @click="leave()"
    >
      Назад
    </button>
  </Teleport>
</template>

<style scoped lang="scss">
.vignette {
  position: fixed;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  background: radial-gradient(
    ellipse farthest-corner at 50% 48%,
    rgb(0 0 0 / 0) 0%,
    rgb(0 0 0 / 0) 84%,
    rgb(0 0 0 / 0.12) 89%,
    rgb(0 0 0 / 0.38) 92%,
    rgb(0 0 0 / 0.7) 95%,
    rgb(0 0 0 / 0.92) 97.5%,
    #000 100%
  );
}

.back {
  position: fixed;
  bottom: 9vh;
  left: 50%;
  z-index: 100;
  transform: translateX(-50%);
  margin: 0;
  padding: 0.95rem 2.4rem;
  border: 1px solid #ece4d4;
  background: rgb(10 10 11 / 0.82);
  color: #f3eee4;
  font: 650 18px/1.2 system-ui, sans-serif;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  cursor: pointer;

  &:hover {
    background: rgb(18 18 16 / 0.88);
    color: #fff;
  }

  &.top {
    top: 9vh;
    bottom: auto;
  }
}
</style>
