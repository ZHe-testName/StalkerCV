<script setup lang="ts">
/**
 * Пол: Poly Haven Worn Planks (CC0 Dimitrios Savva), тайл 1.4 м.
 * Доски вдоль взгляда — от камеры (+Z) к дальней стене (−Z).
 */
import { useLoader } from '@tresjs/core'
import { NoColorSpace, RepeatWrapping, SRGBColorSpace, Texture, TextureLoader } from 'three'

const props = defineProps<{
  width: number
  depth: number
}>()

const TILE = 1.4

const { state: diff } = useLoader(TextureLoader, '/textures/worn-planks/worn_planks_diff.1k.avif')
const { state: nor } = useLoader(TextureLoader, '/textures/worn-planks/worn_planks_nor_gl.1k.avif')
const { state: arm } = useLoader(TextureLoader, '/textures/worn-planks/worn_planks_arm.1k.avif')

function prep(tex: Texture, srgb: boolean, repeatX: number, repeatY: number) {
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.repeat.set(repeatX, repeatY)
  tex.colorSpace = srgb ? SRGBColorSpace : NoColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
}

const repeatU = props.width / TILE
const repeatV = props.depth / TILE

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
watch(arm, (tex) => {
  if (tex) {
    prep(tex, false, repeatU, repeatV)
  }
}, { immediate: true })

const ready = computed(() => !!(diff.value && nor.value && arm.value))
</script>

<template>
  <TresMesh
    v-if="ready"
    :position="[0, 0.001, 0]"
    :rotation="[-Math.PI / 2, 0, 0]"
  >
    <TresPlaneGeometry :args="[width, depth]" />
    <TresMeshStandardMaterial
      :map="diff"
      :normal-map="nor"
      :roughness-map="arm"
      :metalness="0"
      :roughness="1"
    />
  </TresMesh>
</template>
