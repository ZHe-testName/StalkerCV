<script setup lang="ts">
/**
 * Sketchfab stalker_pda (b4_cobra). Лежит экраном вверх.
 * Печёный экран тёмный — ховер и своя инфа через плоскость на стекле.
 */
import { useLoader } from '@tresjs/core'
import { Box3, Group, Mesh, MeshStandardMaterial, PlaneGeometry, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const props = defineProps<{
  glow: number
}>()

const pdaSpan = 0.16 * 1.1 * 1.1 * 1.2
const lieZ = 90 * Math.PI / 180

function sitGltfOnFloorBySpan(scene: Group, maxSpanM: number, extraRot: [number, number, number]) {
  const root = new Group()
  const model = scene.clone(true)
  const pivot = new Group()
  pivot.add(model)
  pivot.rotation.set(extraRot[0], extraRot[1], extraRot[2])
  pivot.updateMatrixWorld(true)
  const box = new Box3().setFromObject(pivot)
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  pivot.position.set(-center.x, -box.min.y, -center.z)
  root.add(pivot)
  const span = Math.max(size.x, size.z, 1e-6)
  root.scale.setScalar(maxSpanM / span)
  return { root, model, size }
}

const { state: gltf } = useLoader(GLTFLoader, '/models/stalker-pda/scene.gltf')
const pdaModel = shallowRef<Group | null>(null)
const screenMat = shallowRef<MeshStandardMaterial | null>(null)

watch(gltf, (loaded) => {
  const scene = loaded?.scene
  if (!scene || pdaModel.value) {
    return
  }
  const { root, model, size } = sitGltfOnFloorBySpan(scene, pdaSpan, [0, 0, lieZ])
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
      mat.roughness = Math.max(mat.roughness, 0.72)
    }
  })
  const glass = new MeshStandardMaterial({
    color: '#08140c',
    emissive: '#2f8f55',
    emissiveIntensity: 0.1,
    roughness: 0.5,
    metalness: 0,
  })
  const pane = new Mesh(
    new PlaneGeometry(size.x * 0.58, size.z * 0.68),
    glass,
  )
  pane.rotation.x = -Math.PI / 2
  pane.position.y = size.y + 0.0008
  root.add(pane)
  screenMat.value = glass
  pdaModel.value = root
}, { immediate: true })

watch(() => props.glow, (g) => {
  if (screenMat.value) {
    screenMat.value.emissiveIntensity = 0.1 + g * 0.5
  }
}, { immediate: true })
</script>

<template>
  <primitive v-if="pdaModel" :object="pdaModel" />
</template>
