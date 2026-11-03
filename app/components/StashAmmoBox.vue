<script setup lang="ts">
/**
 * Ящик патронов у левой стены под окном.
 * Sketchfab «AmmoBox» (CC-BY-4.0 Mikey x pc). Sit на пол по высоте,
 * длинная сторона вдоль стены, спинка к стене (yaw +180°).
 */
import { useLoader } from '@tresjs/core'
import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const props = defineProps<{
  src: string
  height: number
  wallX: number
  z: number
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
const boxModel = shallowRef<Group | null>(null)

watch(gltf, (loaded) => {
  const scene = loaded?.scene
  if (!scene || boxModel.value) {
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
      mat.metalness = 0
      mat.roughness = Math.max(mat.roughness, 0.82)
      mat.needsUpdate = true
    }
  })
  root.updateMatrixWorld(true)
  let size = new Box3().setFromObject(root).getSize(new Vector3())
  let yaw = size.x > size.z ? Math.PI / 2 : 0
  yaw += Math.PI
  root.rotation.y = yaw
  root.updateMatrixWorld(true)
  const seated = new Box3().setFromObject(root)
  root.position.y -= seated.min.y
  size = new Box3().setFromObject(root).getSize(new Vector3())
  const wrap = new Group()
  wrap.add(root)
  wrap.position.set(props.wallX + size.x / 2 + 0.04 + 0.04, 0, props.z)
  enableCastShadow(wrap)
  boxModel.value = wrap
}, { immediate: true })
</script>

<template>
  <primitive v-if="boxModel" :object="boxModel" />
</template>
