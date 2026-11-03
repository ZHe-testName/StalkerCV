<script setup lang="ts">
/**
 * Подоконник: a-1 слева, a-2 на дальней.
 * Sketchfab b2_x_st_windowsill (CC-BY-4.0 sunayama studio).
 * Длинная сторона вдоль проёма, крен влево 90° вокруг мировой Z.
 * Верх — вплотную к нижней кромке рамы.
 */
import { useLoader } from '@tresjs/core'
import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const props = defineProps<{
  src: string
  facing?: 'left' | 'back'
  wallX?: number
  wallZ?: number
  x?: number
  z?: number
  sillY: number
  length: number
}>()

function sitOnSill(scene: Group, lengthM: number) {
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
  axes.sort((a, b) => b.len - a.len)
  const longest = axes[0].axis
  if (longest === 'y') {
    model.rotation.z = Math.PI / 2
  }
  else if (longest === 'z') {
    model.rotation.y = Math.PI / 2
  }
  model.updateMatrixWorld(true)

  let box = new Box3().setFromObject(model)
  let size = box.getSize(new Vector3())
  if (size.y > size.x && size.y > size.z) {
    model.rotation.z += Math.PI / 2
    model.updateMatrixWorld(true)
    box = new Box3().setFromObject(model)
    size = box.getSize(new Vector3())
  }
  if (size.x > size.z) {
    model.rotation.y += Math.PI / 2
    model.updateMatrixWorld(true)
    box = new Box3().setFromObject(model)
    size = box.getSize(new Vector3())
  }

  // Влево вокруг мировой Z, не локальной (после yaw локальная Z уже не ось комнаты).
  model.rotateOnWorldAxis(new Vector3(0, 0, 1), Math.PI / 2)
  model.updateMatrixWorld(true)
  box = new Box3().setFromObject(model)
  size = box.getSize(new Vector3())

  const center = box.getCenter(new Vector3())
  model.position.x -= center.x
  model.position.y -= box.min.y
  model.position.z -= center.z
  root.add(model)
  root.scale.setScalar(lengthM / Math.max(size.z, 1e-6))
  return { root, model }
}

const { state: gltf } = useLoader(GLTFLoader, props.src)
const sill = shallowRef<Group | null>(null)

watch(gltf, (loaded) => {
  const scene = loaded?.scene
  if (!scene || sill.value) {
    return
  }
  const { root, model } = sitOnSill(scene, props.length)
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
  if (props.facing === 'back') {
    root.rotation.y = -Math.PI / 2
    root.updateMatrixWorld(true)
  }
  const seated = new Box3().setFromObject(root)
  const size = seated.getSize(new Vector3())
  if (props.facing === 'back') {
    root.position.set(
      props.x ?? 0,
      props.sillY - size.y,
      (props.wallZ ?? 0) + size.z / 2,
    )
  }
  else {
    root.position.set(
      (props.wallX ?? 0) + size.x / 2,
      props.sillY - size.y,
      props.z ?? 0,
    )
  }
  sill.value = root
}, { immediate: true })
</script>

<template>
  <primitive v-if="sill" :object="sill" />
</template>
