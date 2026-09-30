<script setup lang="ts">
/**
 * Экран загрузки: пульс scale 0.9↔1.05; посадка из гиганта
 * (opacity медленно → быстрый доезд, 2 оборота Z, 1.6 с); потом «Вперёд».
 */
const emit = defineEmits<{
  enter: []
}>()

const { filesReady, lit, tickCount } = useStashBootLoad()
const ticks = Array.from({ length: tickCount }, (_, i) => i * 18)
const phase = ref<'pulse' | 'armed' | 'reveal' | 'done'>('pulse')
const showGo = ref(false)

function startReveal() {
  if (phase.value !== 'pulse') {
    return
  }
  // Сначала кадр в позе вспышки, со следующего тика — посадка (без рывка HMR/композита).
  phase.value = 'armed'
  nextTick(() => {
    requestAnimationFrame(() => {
      if (phase.value === 'armed') {
        phase.value = 'reveal'
      }
    })
  })
}

function onIconIteration() {
  if (!filesReady.value || phase.value !== 'pulse') {
    return
  }
  startReveal()
}

function onRevealEnd(ev: AnimationEvent) {
  if (phase.value !== 'reveal') {
    return
  }
  // Scoped CSS хеширует имя @keyframes — только префикс.
  if (!ev.animationName.includes('stash-boot-reveal')) {
    return
  }
  phase.value = 'done'
  showGo.value = true
}

watch(filesReady, (ready) => {
  if (!ready) {
    return
  }
  window.setTimeout(() => {
    if (phase.value === 'pulse') {
      startReveal()
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
        :class="{
          'stash-boot__icon--pulse': phase === 'pulse',
          'stash-boot__icon--armed': phase === 'armed',
          'stash-boot__icon--reveal': phase === 'reveal',
          'stash-boot__icon--done': phase === 'done',
        }"
        src="/ui/radiation.avif"
        alt=""
        width="80"
        height="80"
        @animationiteration="onIconIteration"
        @animationend="onRevealEnd"
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
  overflow: hidden;
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
  will-change: transform, opacity;
}

.stash-boot__icon--pulse {
  animation: stash-boot-pulse 1.2s ease-in-out infinite;
}

.stash-boot__icon--armed {
  opacity: 0;
  transform: scale(18) rotate(0deg);
}

.stash-boot__icon--reveal {
  animation: stash-boot-reveal 1.6s linear forwards;
}

.stash-boot__icon--done {
  opacity: 1;
  transform: scale(1) rotate(720deg);
}

@keyframes stash-boot-pulse {
  0%,
  100% {
    transform: scale(0.9);
  }

  50% {
    transform: scale(1.05);
  }
}

/* Opacity: долго почти ноль, быстрый доезд к концу. Transform ровнее. */
@keyframes stash-boot-reveal {
  0% {
    opacity: 0;
    transform: scale(18) rotate(0deg);
  }

  40% {
    opacity: 0.06;
    transform: scale(8.5) rotate(288deg);
  }

  70% {
    opacity: 0.22;
    transform: scale(3.4) rotate(504deg);
  }

  88% {
    opacity: 0.72;
    transform: scale(1.35) rotate(640deg);
  }

  100% {
    opacity: 1;
    transform: scale(1) rotate(720deg);
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
  transition: opacity 0.4s ease-out;
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
