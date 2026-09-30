<script setup lang="ts">
/**
 * Персидский ковёр на полу у дивана.
 * Sketchfab «Old Persian Carpet_14_MB» (CC-BY-4.0 Mehdi Shahsavan).
 * Длинная сторона к центру комнаты (вдоль X).
 */
import { useLoader } from '@tresjs/core'
import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const props = defineProps<{
  src: string
  long: number
  x: number
  z: number
}>()

function sitRugOnFloor(scene: Group, longM: number) {
  const root = new Group()
  const model = scene.clone(true)
  const box0 = new Box3().setFromObject(model)
  const size0 = box0.getSize(new Vector3())
  const center0 = box0.getCenter(new Vector3())
  model.position.sub(center0)

  const axes: Array<{ axis: 'x' | 'y' | 'z', len: number }> = [
    { axis: 'x', len: size0.x },
    { axis: 'y', len: size0.y },
    { axis: 'z', len: size0.z },
  ]
  axes.sort((a, b) => a.len - b.len)
  const thin = axes[0].axis
  if (thin === 'x') {
    model.rotation.z = Math.PI / 2
  }
  else if (thin === 'z') {
    model.rotation.x = Math.PI / 2
  }
  model.updateMatrixWorld(true)

  let box = new Box3().setFromObject(model)
  let size = box.getSize(new Vector3())
  if (size.x > size.z) {
    model.rotation.y += Math.PI / 2
    model.updateMatrixWorld(true)
    box = new Box3().setFromObject(model)
    size = box.getSize(new Vector3())
  }

  const center = box.getCenter(new Vector3())
  model.position.x -= center.x
  model.position.y -= box.min.y
  model.position.z -= center.z
  root.add(model)
  root.scale.setScalar(longM / Math.max(size.z, 1e-6))
  return { root, model }
}

const { state: gltf } = useLoader(GLTFLoader, props.src)
const rug = shallowRef<Group | null>(null)

watch(gltf, (loaded) => {
  const scene = loaded?.scene
  if (!scene || rug.value) {
    return
  }
  const { root, model } = sitRugOnFloor(scene, props.long)
  model.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return
    }
    child.receiveShadow = true
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const mat of materials) {
      if (!(mat instanceof MeshStandardMaterial)) {
        continue
      }
      mat.metalness = 0
      mat.roughness = Math.max(mat.roughness, 0.9)
      mat.polygonOffset = true
      mat.polygonOffsetFactor = -1
      mat.polygonOffsetUnits = -1
      mat.needsUpdate = true
    }
  })
  root.updateMatrixWorld(true)
  // Длинная сторона к центру (вдоль X), затем −20° вправо (−Y).
  root.rotation.y = Math.PI / 2 - 20 * Math.PI / 180
  root.updateMatrixWorld(true)
  const seated = new Box3().setFromObject(root)
  root.position.y -= seated.min.y - 0.002
  root.position.x = props.x
  root.position.z = props.z
  rug.value = root
}, { immediate: true })
</script>

<template>
  <primitive v-if="rug" :object="rug" />
</template>
