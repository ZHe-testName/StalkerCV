<script setup lang="ts">
/**
 * Экран загрузки: значок крутит CSS rotate(Z), стоп на animationiteration.
 * Штрихи opacity по числу файлов. «Вперёд» после остановки.
 */
const emit = defineEmits<{
  enter: []
}>()

const { filesReady, lit, tickCount } = useStashBootLoad()
const ticks = Array.from({ length: tickCount }, (_, i) => i * 18)
const spinning = ref(true)
const showGo = ref(false)

function onIconIteration() {
  if (!filesReady.value || !spinning.value) {
    return
  }
  spinning.value = false
  showGo.value = true
}

watch(filesReady, (ready) => {
  if (!ready) {
    return
  }
  window.setTimeout(() => {
    if (spinning.value) {
      spinning.value = false
      showGo.value = true
    }
  }, 1100)
})
</script>

<template>
  <div class="stash-boot">
    <div class="stash-boot__frame" aria-hidden="true" />
    <div class="stash-boot__dial" aria-hidden="true">
      <span
        v-for="(deg, i) in ticks"
        :key="deg"
        class="stash-boot__tick"
        :class="{ 'is-on': i < lit }"
        :style="{ transform: `rotate(${deg}deg)` }"
      />
      <img
        class="stash-boot__icon"
        :class="{ 'stash-boot__icon--spin': spinning }"
        src="/ui/radiation.avif"
        alt=""
        width="80"
        height="80"
        @animationiteration="onIconIteration"
      >
    </div>
    <button
      class="stash-boot__go"
      :class="{ 'is-on': showGo }"
      type="button"
      :tabindex="showGo ? 0 : -1"
      @click="showGo && emit('enter')"
    >
      Вперёд
    </button>
  </div>
</template>

<style scoped>
.stash-boot {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.6rem;
  background: #0b0b0c;
}

.stash-boot__frame {
  position: absolute;
  inset: 20px;
  border: 1px solid #b99b30;
  border-radius: 4px;
  pointer-events: none;
}

.stash-boot__dial {
  position: relative;
  width: 104px;
  height: 104px;
}

.stash-boot__icon {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 80px;
  height: 80px;
  margin: -40px 0 0 -40px;
  object-fit: contain;
  transform-origin: 50% 50%;
  will-change: transform;
}

.stash-boot__icon--spin {
  animation: stash-boot-spin 1s linear infinite;
}

@keyframes stash-boot-spin {
  to {
    transform: rotate(360deg);
  }
}

.stash-boot__tick {
  position: absolute;
  left: 50%;
  top: 0;
  width: 2px;
  height: 6px;
  margin-left: -1px;
  background: #d8c9a8;
  transform-origin: 50% 52px;
  opacity: 0;
  transition: opacity 0.35s ease;
}

.stash-boot__tick.is-on {
  opacity: 1;
}

.stash-boot__go {
  margin: 0;
  padding: 0.95rem 2.4rem;
  border: 1px solid #ece4d4;
  background: rgb(10 10 11 / 0.82);
  color: #f3eee4;
  font: 650 18px/1.2 system-ui, sans-serif;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s ease;
}

.stash-boot__go.is-on {
  opacity: 1;
  pointer-events: auto;
}

.stash-boot__go.is-on:hover {
  background: rgb(18 18 16 / 0.88);
  color: #fff;
}
</style>
