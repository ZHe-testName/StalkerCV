<script setup lang="ts">
/**
 * Wooden Floor Lamp (Atalaya22) у правой стены. Sit на пол по высоте.
 * Point light в абажуре: тускло в покое, ярче на ховере/фокусе дивана.
 */
import { useLoader, useLoop } from '@tresjs/core'
import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { stashFocused } from '~/composables/useStashCamera'
import { stashHovered } from '~/composables/useStashAnchor'

const props = defineProps<{
  src: string
  height: number
}>()

function sitGltfOnFloor(scene: Group, heightM: number) {
  const root = new Group()
  const model = scene.clone(true)
  const box = new Box3().setFromObject(model)
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  model.position.set(-center.x, -box.min.y, -center.z)
  root.add(model)
  root.scale.setScalar(heightM / (size.y || 1))
  return { root, model }
}

const { state: gltf } = useLoader(GLTFLoader, props.src)
const lampModel = shallowRef<Group | null>(null)
const shadeMats: MeshStandardMaterial[] = []

watch(gltf, (loaded) => {
  const scene = loaded?.scene
  if (!scene || lampModel.value) {
    return
  }
  const { root, model } = sitGltfOnFloor(scene, props.height)
  model.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return
    }
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const mat of materials) {
      if (!(mat instanceof MeshStandardMaterial)) {
        continue
      }
      mat.metalness = Math.min(mat.metalness, 0.35)
      mat.roughness = Math.max(mat.roughness, 0.62)
      if (mat.map) {
        mat.emissiveMap = mat.map
        mat.emissive.setRGB(1, 0.78, 0.35)
      }
      mat.needsUpdate = true
      shadeMats.push(mat)
    }
  })
  lampModel.value = root
}, { immediate: true })

const LAMP_IDLE = 0.48
const LAMP_HOT = 2.2
const SHADE_IDLE = 0.16
const SHADE_HOT = 0.42
const lampIntensity = ref(LAMP_IDLE)
const { onBeforeRender } = useLoop()
onBeforeRender(({ delta }) => {
  const lit = stashHovered.value === 'armchair' || stashFocused.value === 'armchair'
  const target = lit ? LAMP_HOT : LAMP_IDLE
  const k = 1 - Math.exp(-7.2 * delta)
  lampIntensity.value += (target - lampIntensity.value) * k
  const u = (lampIntensity.value - LAMP_IDLE) / (LAMP_HOT - LAMP_IDLE)
  const shade = SHADE_IDLE + Math.min(1, Math.max(0, u)) * (SHADE_HOT - SHADE_IDLE)
  for (const mat of shadeMats) {
    mat.emissiveIntensity = shade
  }
})
</script>

<template>
  <primitive v-if="lampModel" :object="lampModel" />
  <TresPointLight
    :position="[0, height * 0.86, 0]"
    color="#ffc85a"
    :intensity="lampIntensity"
    :distance="2.6"
    :decay="2"
  />
</template>
