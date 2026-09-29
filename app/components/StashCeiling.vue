<script setup lang="ts">
/**
 * Потолок: Poly Haven Rough Wood (CC0 Rob Tuytel), тайл 0.5 м.
 * Волокно поперёк взгляда (вдоль X), texture.rotation +90°.
 */
import { useLoader } from '@tresjs/core'
import { NoColorSpace, RepeatWrapping, SRGBColorSpace, Texture, TextureLoader } from 'three'

const props = defineProps<{
  width: number
  depth: number
  height: number
}>()

const TILE = 0.5

const { state: diff } = useLoader(TextureLoader, '/textures/rough-wood/rough_wood_diff.1k.avif')
const { state: nor } = useLoader(TextureLoader, '/textures/rough-wood/rough_wood_nor_gl.1k.avif')
const { state: rough } = useLoader(TextureLoader, '/textures/rough-wood/rough_wood_rough.1k.avif')

function prep(tex: Texture, srgb: boolean, repeatX: number, repeatY: number) {
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.center.set(0.5, 0.5)
  tex.rotation = Math.PI / 2
  tex.repeat.set(repeatX, repeatY)
  tex.colorSpace = srgb ? SRGBColorSpace : NoColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
}

const repeatU = props.depth / TILE
const repeatV = props.width / TILE

watch(diff, (tex) => {
  if (tex) {
    prep(tex, true, repeatU, repeatV)
  }
}, { immediate: true })
watch(nor, (tex) => {
  if (tex) {
    prep(tex, false, repeatU, repeatV)
  }
}, { immediate: true })
watch(rough, (tex) => {
  if (tex) {
    prep(tex, false, repeatU, repeatV)
  }
}, { immediate: true })

const ready = computed(() => !!(diff.value && nor.value && rough.value))
</script>

<template>
  <TresMesh
    v-if="ready"
    :position="[0, height - 0.001, 0]"
    :rotation="[Math.PI / 2, 0, 0]"
  >
    <TresPlaneGeometry :args="[width, depth]" />
    <TresMeshStandardMaterial
      :map="diff"
      :normal-map="nor"
      :roughness-map="rough"
      :metalness="0"
      :roughness="1"
    />
  </TresMesh>
</template>
