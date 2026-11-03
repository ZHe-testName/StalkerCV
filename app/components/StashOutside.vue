<script setup lang="ts">
/**
 * Площадка за окном: земля + задник + слот под пропы.
 *
 * Всё unlit (`MeshBasicMaterial`) и без теней — свет «запечён» в текстуру,
 * источники в комнате двигаются, улица не меняется. Кастить тени сюда НЕЛЬЗЯ:
 * directional стоит в 10 см снаружи левой стены, любой кастер перекроет свет
 * и комната потемнеет, а карта теней заморожена (`shadow.autoUpdate = false`).
 *
 * Локальные координаты внутри слота (ставить пропы в них):
 *   −Z — наружу от убежища, +X — вправо если смотреть из окна, y = 0 — земля.
 *
 * Куда реально смотрит глаз (посчитано от камеры кадра 0, оба окна):
 *   левое  — 5 м: X 2.2..5.3 | 10 м: X 6.9..11.9 | 20 м: X 14.4..23.1
 *   дальнее — 5 м: X 0.0..2.8 | 10 м: X 0.6..5.0 | 20 м: X 1.8..9.2
 * То есть конус сильно уведён в локальный +X, а не идёт прямо из окна —
 * камера стоит сбоку. Прямо перед окном ставить бесполезно, не видно.
 *
 * Земля видна только дальше ~5 м: ближе её срезает подоконник.
 */
import {
  BackSide,
  DoubleSide,
  LinearFilter,
  MeshBasicMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
} from 'three'
import { useLoader } from '@tresjs/core'
import { overcastSkyTexture } from '~/utils/overcastSky'

const props = withDefaults(defineProps<{
  /** Какое окно: левая стена (−X) или дальняя (−Z). */
  facing: 'left' | 'back'
  /** Внешняя грань стены: x для left, z для back. */
  wallAt: number
  /** Центр проёма по второй оси: z для left, x для back. */
  openingAt: number
  /** Задник на этом расстоянии от стены. */
  backdropAt?: number
  backdropWidth?: number
  backdropHeight?: number
  /** Текстура задника. Без неё — пасмурный холст, не плоский `skyColor`. */
  backdropSrc?: string
  skyColor?: string
  groundColor?: string
  groundSrc?: string
  /** Тайл текстуры земли в метрах. */
  groundTile?: number
  /** Опустить землю/горизонт вместе с пропами, метры. */
  drop?: number
}>(), {
  backdropAt: 48,
  backdropWidth: 76,
  backdropHeight: 46,
  skyColor: '#4a5560',
  groundColor: '#4b4a40',
  groundTile: 4,
  drop: 0,
})

/** Земля заходит на 1 м «внутрь» стены — стык прячется за кладкой. */
const GROUND_OVERLAP = 1
/** Задник опущен ниже горизонта, чтобы не было щели на стыке с землёй. */
const GROUND_BELOW = 2.5

const groundDepth = props.backdropAt + GROUND_OVERLAP + 4
const groundWidth = props.backdropWidth

const yaw = props.facing === 'left' ? Math.PI / 2 : 0
const origin: [number, number, number] = props.facing === 'left'
  ? [props.wallAt, -props.drop, props.openingAt]
  : [props.openingAt, -props.drop, props.wallAt]

/** Земля: горизонтально, от стены наружу. */
const groundPos: [number, number, number] = [
  0,
  0,
  GROUND_OVERLAP - groundDepth / 2,
]

/**
 * Только дальнее окно, только справа от дома. У стены (z > −8) высота строго 0 —
 * иначе грунт лезет в комнату: плоскость заходит на 1 м под кладку.
 */
const BACK_WAVES = [
  { x: 6.8, z: -14, amp: 1.35, r: 5 },
  { x: 9.2, z: -18, amp: -0.9, r: 4.5 },
  { x: 11, z: -32, amp: 2.4, r: 9 },
] as const

function makeGround() {
  if (props.facing !== 'back') {
    return new PlaneGeometry(groundWidth, groundDepth)
  }
  const geo = new PlaneGeometry(groundWidth, groundDepth, 48, 36)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i)
    const lz = groundPos[2] - pos.getY(i)
    let gate = 1
    if (lz > -8 || lx < 5) {
      continue
    }
    if (lz > -11) {
      const t = (-8 - lz) / 3
      gate = t * t * (3 - 2 * t)
    }
    if (lx < 7) {
      const t = (lx - 5) / 2
      gate *= t * t * (3 - 2 * t)
    }
    let h = 0
    for (const w of BACK_WAVES) {
      const dx = lx - w.x
      const dz = lz - w.z
      h += w.amp * Math.exp(-(dx * dx + dz * dz) / (2 * w.r * w.r))
    }
    pos.setZ(i, h * gate)
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

const groundGeo = makeGround()
const backdropGeo = new PlaneGeometry(props.backdropWidth, props.backdropHeight)

const groundMat = new MeshBasicMaterial({ color: props.groundColor, side: DoubleSide })
const backdropMat = new MeshBasicMaterial({
  color: props.skyColor,
  side: BackSide,
  toneMapped: false,
})

const skyTex = overcastSkyTexture()
if (skyTex && !props.backdropSrc) {
  backdropMat.map = skyTex
  backdropMat.color.set('#ffffff')
}

if (props.groundSrc) {
  const { state } = useLoader(TextureLoader, props.groundSrc)
  watch(state, (tex) => {
    if (!tex) {
      return
    }
    tex.colorSpace = SRGBColorSpace
    tex.wrapS = RepeatWrapping
    tex.wrapT = RepeatWrapping
    tex.repeat.set(groundWidth / props.groundTile, groundDepth / props.groundTile)
    tex.anisotropy = 4
    groundMat.map = tex
    groundMat.color.set('#ffffff')
    groundMat.needsUpdate = true
  }, { immediate: true })
}

if (props.backdropSrc) {
  const { state } = useLoader(TextureLoader, props.backdropSrc)
  watch(state, (tex) => {
    if (!tex) {
      return
    }
    tex.colorSpace = SRGBColorSpace
    tex.minFilter = LinearFilter
    tex.anisotropy = 4
    backdropMat.map = tex
    backdropMat.color.set('#ffffff')
    backdropMat.needsUpdate = true
  }, { immediate: true })
}

const backdropPos: [number, number, number] = [
  0,
  props.backdropHeight / 2 - GROUND_BELOW,
  -props.backdropAt,
]

onBeforeUnmount(() => {
  groundGeo.dispose()
  backdropGeo.dispose()
  groundMat.dispose()
  backdropMat.dispose()
})
</script>

<template>
  <TresGroup :position="origin" :rotation="[0, yaw, 0]">
    <TresMesh
      :geometry="groundGeo"
      :material="groundMat"
      :position="groundPos"
      :rotation="[-Math.PI / 2, 0, 0]"
      :cast-shadow="false"
      :receive-shadow="false"
    />
    <TresMesh
      :geometry="backdropGeo"
      :material="backdropMat"
      :position="backdropPos"
      :rotation="[0, Math.PI, 0]"
      :cast-shadow="false"
      :receive-shadow="false"
    />
    <slot />
  </TresGroup>
</template>
