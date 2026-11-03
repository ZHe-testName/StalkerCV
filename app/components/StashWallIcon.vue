<script setup lang="ts">
/**
 * Икона на левой стене между окном и дальней стеной.
 * Sketchfab «Икона» (CC-BY-4.0 Redisca). В glTF лежит плашмя лицом вниз, верх образа к −Z:
 * X +90° (−90° ставит вверх ногами), затем yaw +90° лицом в комнату (+X).
 */
import { useLoader } from '@tresjs/core'
import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const props = defineProps<{
  src: string
  height: number
  wallX: number
  z: number
  top: number
}>()

const { state: gltf } = useLoader(GLTFLoader, props.src)
const icon = shallowRef<Group | null>(null)

watch(gltf, (loaded) => {
  const scene = loaded?.scene
  if (!scene || icon.value) {
    return
  }
  const model = scene.clone(true)
  const pivot = new Group()
  pivot.add(model)
  pivot.rotation.set(Math.PI / 2, Math.PI / 2, 0, 'YXZ')
  pivot.updateMatrixWorld(true)
  const box = new Box3().setFromObject(pivot)
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  pivot.position.sub(center)

  const root = new Group()
  root.add(pivot)
  const k = props.height / (size.y || 1)
  root.scale.setScalar(k)
  const thick = size.x * k
  root.position.set(props.wallX + thick / 2 + 0.005, props.top - props.height / 2, props.z)

  model.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return
    }
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const mat of materials) {
      if (mat instanceof MeshStandardMaterial) {
        mat.metalness = 0
        mat.needsUpdate = true
      }
    }
  })
  icon.value = root
}, { immediate: true })
</script>

<template>
  <primitive v-if="icon" :object="icon" />
</template>
