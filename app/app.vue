<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
</script>

<template>
  <NuxtRouteAnnouncer />
  <TresCanvas
    window-size
    clear-color="#0b0b0c"
  >
    <StashExperience />
  </TresCanvas>
</template>
