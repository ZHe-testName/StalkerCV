/**
 * Звуки схрона в одном месте. Снаружи только play(name).
 * loop: false — короткий эффект, AudioBuffer.
 * loop: true — фон через <audio>, в буфер не декодируем.
 * Контекст молчит, пока не нажали «Вперёд».
 */

type StashSound = {
  name: string
  file: string
  volume: number
  loop: boolean
}

const catalog = [
  {
    name: 'step1',
    file: '/audio/step_1.mp3',
    volume: 0.4,
    loop: false,
  },
  {
    name: 'step2',
    file: '/audio/step_2.mp3',
    volume: 0.4,
    loop: false,
  },
  {
    name: 'light_on',
    file: '/audio/light_on.mp3',
    volume: 0.25,
    loop: false,
  },
  {
    name: 'light_off',
    file: '/audio/light_off.mp3',
    volume: 0.25,
    loop: false,
  },
  {
    name: 'radio_move',
    file: '/audio/radio_move.mp3',
    volume: 0.4,
    loop: false,
  },
  {
    name: 'radio_backmove',
    file: '/audio/radio_backmove.mp3',
    volume: 0.4,
    loop: false,
  },
  {
    name: 'chair_on',
    file: '/audio/chair_on.mp3',
    volume: 0.4,
    loop: false,
  },
  {
    name: 'chair_off',
    file: '/audio/chair_off.mp3',
    volume: 0.4,
    loop: false,
  },
  {
    name: 'sofa_on',
    file: '/audio/sofa_on.mp3',
    volume: 0.4,
    loop: false,
  },
  {
    name: 'sofa_off',
    file: '/audio/sofa_off.mp3',
    volume: 0.4,
    loop: false,
  },
  {
    name: 'rain',
    file: '/audio/rain.mp3',
    volume: 0.32,
    loop: true,
  },
] as const satisfies readonly StashSound[]

type SoundName = (typeof catalog)[number]['name']

const byName = new Map<string, StashSound>(catalog.map(sound => [sound.name, sound]))

let ctx: AudioContext | null = null
let unlocked = false
let loading: Promise<void> | null = null
const buffers = new Map<string, AudioBuffer>()
const loops = new Map<string, HTMLAudioElement>()
const loopStarted = new Set<string>()
let attentionBound = false
let away = false

function pageHeard() {
  return !away && document.visibilityState === 'visible' && document.hasFocus()
}

function syncLoops() {
  for (const name of loopStarted) {
    const el = loops.get(name)
    if (!el) {
      continue
    }
    if (pageHeard()) {
      void el.play().catch(() => {})
    }
    else {
      el.pause()
    }
  }
}

function onAttention(event: Event) {
  if (event.type === 'blur' || (event.type === 'visibilitychange' && document.hidden)) {
    away = true
  }
  else if (document.visibilityState === 'visible' && document.hasFocus()) {
    away = false
  }
  syncLoops()
}

function bindAttention() {
  if (attentionBound) {
    return
  }
  attentionBound = true
  away = document.hidden || !document.hasFocus()
  document.addEventListener('visibilitychange', onAttention)
  window.addEventListener('blur', onAttention)
  window.addEventListener('focus', onAttention)
}

function context() {
  if (!ctx) {
    ctx = new AudioContext()
  }
  return ctx
}

export function preloadStashAudio() {
  if (loading || import.meta.server) {
    return
  }
  try {
    const audio = context()
    bindAttention()
    for (const sound of catalog) {
      if (sound.loop) {
        ensureLoop(sound)
      }
    }
    const urls = catalog.filter(sound => !sound.loop).map(sound => sound.file)
    loading = Promise.all(urls.map(async (url) => {
      const res = await fetch(url)
      const raw = await res.arrayBuffer()
      buffers.set(url, await audio.decodeAudioData(raw.slice(0)))
    })).then(() => undefined)
  }
  catch (err) {
    console.error('[stash-audio]', err)
  }
}

export function unlockStashAudio() {
  if (import.meta.server) {
    return
  }
  const audio = context()
  void audio.resume()
  unlocked = true
}

function ensureLoop(sound: StashSound) {
  let el = loops.get(sound.name)
  if (!el) {
    el = new Audio(sound.file)
    el.loop = true
    el.preload = 'auto'
    el.addEventListener('play', () => {
      if (!pageHeard()) {
        el.pause()
      }
    })
    loops.set(sound.name, el)
  }
  return el
}

function startLoop(sound: StashSound) {
  if (!ctx || loopStarted.has(sound.name)) {
    return
  }
  const el = ensureLoop(sound)
  const source = ctx.createMediaElementSource(el)
  const gain = ctx.createGain()
  gain.gain.value = sound.volume
  source.connect(gain)
  gain.connect(ctx.destination)
  loopStarted.add(sound.name)
  if (pageHeard()) {
    void el.play().catch(() => {})
  }
}

export function play(name: SoundName) {
  const sound = byName.get(name)
  if (!sound || !unlocked || !ctx) {
    return
  }
  if (sound.loop) {
    startLoop(sound)
    return
  }
  if (ctx.state !== 'running') {
    return
  }
  const buffer = buffers.get(sound.file)
  if (!buffer) {
    return
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const gain = ctx.createGain()
  gain.gain.value = sound.volume
  source.connect(gain)
  gain.connect(ctx.destination)
  source.start()
}
