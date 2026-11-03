<script setup lang="ts">
/**
 * Запечённый микс стены: цвет, нормаль, шероховатость.
 * UV те же, что у StashWallMix, чтобы панели окна брали свой кусок общей карты.
 */
import { useLoader } from '@tresjs/core'
import {
  MeshStandardMaterial,
  NoColorSpace,
  PlaneGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from 'three'

const props = withDefaults(defineProps<{
  width: number
  height: number
  wall: 'left' | 'back' | 'right'
  u0?: number
  v0?: number
  u1?: number
  v1?: number
}>(), {
  u0: 0,
  v0: 0,
  u1: 1,
  v1: 1,
})

const base = `/textures/wall-baked/${props.wall}`
const { state: diff } = useLoader(TextureLoader, `${base}-diff.avif`)
const { state: nor } = useLoader(TextureLoader, `${base}-nor.avif`)
const { state: rough } = useLoader(TextureLoader, `${base}-rough.avif`)

function prep(tex: Texture, srgb: boolean) {
  tex.colorSpace = srgb ? SRGBColorSpace : NoColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
}

watch(diff, (tex) => {
  if (tex) {
    prep(tex, true)
  }
}, { immediate: true })
watch(nor, (tex) => {
  if (tex) {
    prep(tex, false)
  }
}, { immediate: true })
watch(rough, (tex) => {
  if (tex) {
    prep(tex, false)
  }
}, { immediate: true })

const mat = shallowRef<MeshStandardMaterial | null>(null)
watch([diff, nor, rough], ([map, normalMap, roughnessMap]) => {
  if (!map || !normalMap || !roughnessMap) {
    return
  }
  mat.value = new MeshStandardMaterial({
    map,
    normalMap,
    roughnessMap,
    metalness: 0,
    roughness: 1,
  })
}, { immediate: true })

const geo = new PlaneGeometry(props.width, props.height)
{
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    const u = props.u0 + (pos.getX(i) / props.width + 0.5) * (props.u1 - props.u0)
    const v = props.v0 + (pos.getY(i) / props.height + 0.5) * (props.v1 - props.v0)
    uv.setXY(i, u, v)
  }
  uv.needsUpdate = true
}
</script>

<template>
  <TresMesh v-if="mat" :geometry="geo" :material="mat" :receive-shadow="true" />
</template>
