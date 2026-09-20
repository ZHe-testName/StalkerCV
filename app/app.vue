<script setup lang="ts">
import { computed } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { stashAway, stashFocused, stashFocus } from '~/composables/useStashCamera'

const showBack = computed(() => stashAway.value || stashFocused.value !== null)
</script>

<template>
  <NuxtRouteAnnouncer />
  <TresCanvas
    window-size
    clear-color="#0b0b0c"
  >
    <StashExperience />
  </TresCanvas>
  <div class="stash-vignette" aria-hidden="true" />
  <Teleport to="body">
    <button
      v-show="showBack"
      class="stash-home"
      type="button"
      @click="stashFocus.goHome()"
    >
      Назад
    </button>
  </Teleport>
</template>

<style scoped>
.stash-vignette {
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

.stash-home {
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
}

.stash-home:hover {
  background: rgb(18 18 16 / 0.88);
  color: #fff;
}
</style>
