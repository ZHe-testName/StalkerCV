<script setup lang="ts">
/**
 * Old Sofa (Reinaw13) на месте кресла. Спинка была на камеру — yaw +90° влево.
 */
import { useLoader } from '@tresjs/core'
import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const props = defineProps<{
  src: string
  height: number
}>()

/** влево = +Y. После sit — отдельная группа, пол ещё раз, без второго scale. */
const sofaYawLeft = 90 * Math.PI / 180
/** Днище модели выше видимого края — bbox на полу, визуально висит. */
const sofaSink = 0.06

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
const sofaModel = shallowRef<Group | null>(null)

watch(gltf, (loaded) => {
  const scene = loaded?.scene
  if (!scene || sofaModel.value) {
    return
  }
  const { root, model } = sitGltfOnFloor(scene, props.height)
  model.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return
    }
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const mat of materials) {
      if (mat instanceof MeshStandardMaterial) {
        mat.metalness = 0
        mat.roughness = Math.max(mat.roughness, 0.88)
        mat.needsUpdate = true
      }
    }
  })
  const wrap = new Group()
  wrap.add(root)
  wrap.rotation.y = sofaYawLeft
  wrap.updateMatrixWorld(true)
  const seated = new Box3().setFromObject(wrap)
  wrap.position.y -= seated.min.y + sofaSink
  sofaModel.value = wrap
}, { immediate: true })
</script>

<template>
  <primitive v-if="sofaModel" :object="sofaModel" />
</template>
