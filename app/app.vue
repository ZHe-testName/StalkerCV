<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { stashAway, stashFocused, stashFocus } from '~/composables/useStashCamera'
import { play, preloadStashAudio, unlockStashAudio } from '~/composables/useStashAudio'
import { stashDeviceDialHeld, stepStashDeviceDial } from '~/composables/useStashDeviceDial'
import { stashCopy } from '~/data/stashCopy'

useStashBootLoad()

const sceneOpen = ref(false)
provide('stashSceneOpen', sceneOpen)
const backGone = ref(false)
const hintOn = ref(true)
let hideBack = 0
const showBack = computed(() => !backGone.value && (stashAway.value || stashFocused.value !== null))
const backTop = computed(() => stashFocused.value === 'armchair')

function enter() {
  unlockStashAudio()
  play('rain')
  sceneOpen.value = true
}

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
  hintOn.value = false
  backGone.value = false
  if (hideBack) {
    window.clearTimeout(hideBack)
    hideBack = 0
  }
})

function onKey(e: KeyboardEvent) {
  if (stashDeviceDialHeld.value && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    const tag = (e.target as HTMLElement | null)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      return
    }
    e.preventDefault()
    stepStashDeviceDial(e.key === 'ArrowLeft' ? -1 : 1)
    return
  }
  if (e.key !== 'Escape' || e.repeat || !showBack.value) {
    return
  }
  e.preventDefault()
  leave()
}

onMounted(() => {
  preloadStashAudio()
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
  <div class="screen">
  <div class="stage">
    <TresCanvas
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
    <button
      v-show="showBack"
      class="back"
      type="button"
      :class="{ top: backTop }"
      @click="leave()"
    >
      {{ stashCopy.buttons.back }}
    </button>
    <div
      v-show="stashDeviceDialHeld"
      class="dialnav"
    >
      <button
        class="dialnavbtn"
        type="button"
        @click="stepStashDeviceDial(-1)"
      >
        {{ stashCopy.buttons.bearLeftSwitch }}
      </button>
      <button
        class="dialnavbtn"
        type="button"
        @click="stepStashDeviceDial(1)"
      >
        {{ stashCopy.buttons.bearRightSwitch }}
      </button>
    </div>
    <div class="vignette" aria-hidden="true" />
    <p
      v-if="sceneOpen && hintOn"
      class="hint"
    >
      {{ stashCopy.description.modalTxt }}
    </p>
  </div>
  </div>
  <StashPdaFields />
  <StashBoot v-if="!sceneOpen" @enter="enter" />
</template>

<style scoped lang="scss">
.screen {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: #0b0b0c;
}

.stage {
  position: relative;
  width: min(100vw, 2560px);
  height: 100vh;
  overflow: hidden;
}

.vignette {
  position: absolute;
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

.hint {
  position: absolute;
  top: 3%;
  right: 3%;
  z-index: 100;
  box-sizing: border-box;
  width: min(380px, 36%);
  margin: 0;
  padding: 1.15rem 1.3rem;
  border: 1px solid #ece4d4;
  background: rgb(10 10 11 / 0.82);
  color: #f3eee4;
  font: 600 18px/1.35 system-ui, sans-serif;
  pointer-events: none;
}

.back {
  position: absolute;
  bottom: 3%;
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
    top: 9%;
    bottom: auto;
  }
}

.dialnav {
  position: absolute;
  right: 0;
  bottom: 3%;
  left: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  padding: 0 3%;
  pointer-events: none;
}

.dialnavbtn {
  pointer-events: auto;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(280px, 38vh);
  aspect-ratio: 1;
  margin: 0;
  padding: 1.1rem;
  border: 1px solid #ece4d4;
  background: rgb(10 10 11 / 0.82);
  color: #f3eee4;
  font: 650 30px/1.25 system-ui, sans-serif;
  text-align: center;
  text-wrap: balance;
  cursor: pointer;

  &:hover {
    background: rgb(18 18 16 / 0.88);
    color: #fff;
  }
}
</style>
