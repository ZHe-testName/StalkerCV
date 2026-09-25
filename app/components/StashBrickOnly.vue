<script setup lang="ts">
/**
 * Только кирпич, без маски и штукатурки. Откос окна.
 */
import { useLoader } from '@tresjs/core'
import { NoColorSpace, PlaneGeometry, RepeatWrapping, SRGBColorSpace, Texture, TextureLoader } from 'three'

const props = defineProps<{
  width: number
  height: number
}>()

const TILE = 1.8

const { state: diff } = useLoader(TextureLoader, '/textures/broken-brick/broken_brick_wall_diff.1k.avif')
const { state: nor } = useLoader(TextureLoader, '/textures/broken-brick/broken_brick_wall_nor_gl.1k.avif')
const { state: arm } = useLoader(TextureLoader, '/textures/broken-brick/broken_brick_wall_arm.1k.avif')

function prep(tex: Texture, srgb: boolean) {
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
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
watch(arm, (tex) => {
  if (tex) {
    prep(tex, false)
  }
}, { immediate: true })

const ready = computed(() => !!(diff.value && nor.value && arm.value))

const geo = new PlaneGeometry(props.width, props.height)
{
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(
      i,
      (pos.getX(i) / props.width + 0.5) * (props.width / TILE),
      (pos.getY(i) / props.height + 0.5) * (props.height / TILE),
    )
  }
  uv.needsUpdate = true
}
</script>

<template>
  <TresMesh v-if="ready" :geometry="geo">
    <TresMeshStandardMaterial
      :map="diff"
      :normal-map="nor"
      :roughness-map="arm"
      :metalness="0"
      :roughness="1"
    />
  </TresMesh>
</template>
