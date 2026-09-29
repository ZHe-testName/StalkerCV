<script setup lang="ts">
/**
 * TresCanvas в manual: во время качания файлов не рисуем.
 * После filesReady — несколько кадров прогрева (шейдеры).
 * После «Вперёд» — кадр каждый rAF.
 */
const sceneOpen = inject<Ref<boolean>>('stashSceneOpen', ref(false))
const { filesReady } = useStashBootLoad()
const { advance } = useTres()
const { onBeforeRender } = useLoop()

const WARM_FRAMES = 16
let warmLeft = 0

watch(filesReady, (ready) => {
  if (ready) {
    warmLeft = WARM_FRAMES
  }
}, { immediate: true })

onBeforeRender(() => {
  if (sceneOpen.value) {
    advance()
    return
  }
  if (warmLeft > 0) {
    warmLeft -= 1
    advance()
  }
})
</script>

<template>
</template>
