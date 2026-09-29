<script setup lang="ts">
/**
 * Ковёр на правой стене: Sketchfab «Carpet» (CC-BY-4.0 maherart).
 * Длинная сторона вдоль пола, верх на 60 см ниже потолка.
 */
import { useLoader } from '@tresjs/core'
import { Box3, Group, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const props = defineProps<{
  src: string
  long: number
  wallX: number
  z: number
  roomHeight: number
  fromCeiling: number
}>()

function hangLandscape(scene: Group, longM: number) {
  const root = new Group()
  const model = scene.clone(true)
  root.add(model)
  root.updateMatrixWorld(true)

  const box0 = new Box3().setFromObject(root)
  const size0 = box0.getSize(new Vector3())
  const center0 = box0.getCenter(new Vector3())
  model.position.sub(center0)

  const axes: { key: 'x' | 'y' | 'z', len: number }[] = [
    { key: 'x', len: size0.x },
    { key: 'y', len: size0.y },
    { key: 'z', len: size0.z },
  ]
  axes.sort((a, b) => b.len - a.len)
  const long = new Vector3()
  long[axes[0].key] = 1
  const thin = new Vector3()
  thin[axes[2].key] = 1
  const xAxis = long.clone().normalize()
  const zAxis = thin.clone().normalize()
  const yAxis = new Vector3().crossVectors(zAxis, xAxis)
  if (yAxis.lengthSq() < 1e-8) {
    yAxis.set(0, 1, 0)
  }
  yAxis.normalize()
  if (yAxis.y < 0) {
    yAxis.negate()
    xAxis.negate()
  }
  zAxis.crossVectors(xAxis, yAxis).normalize()
  xAxis.crossVectors(yAxis, zAxis).normalize()

  const basis = new Matrix4().makeBasis(xAxis, yAxis, zAxis)
  basis.invert()
  model.quaternion.premultiply(new Quaternion().setFromRotationMatrix(basis))

  root.updateMatrixWorld(true)
  const box1 = new Box3().setFromObject(root)
  const size1 = box1.getSize(new Vector3())
  const center1 = box1.getCenter(new Vector3())
  model.position.sub(center1)
  root.scale.setScalar(longM / (size1.x || 1))
  root.updateMatrixWorld(true)
  const box2 = new Box3().setFromObject(root)
  const size2 = box2.getSize(new Vector3())
  return { root, short: size2.y, thick: size2.z }
}

const { state: gltf } = useLoader(GLTFLoader, props.src)
const carpet = shallowRef<Group | null>(null)
const hung = shallowRef<{ short: number, thick: number } | null>(null)
const pos = ref<[number, number, number]>([props.wallX - 0.008, 1.5, props.z])

function place() {
  if (!hung.value) {
    return
  }
  const top = props.roomHeight - props.fromCeiling
  pos.value = [props.wallX - hung.value.thick / 2 - 0.006, top - hung.value.short / 2, props.z]
}

watch(gltf, (loaded) => {
  const scene = loaded?.scene
  if (!scene) {
    return
  }
  if (!carpet.value) {
    const { root, short, thick } = hangLandscape(scene, props.long)
    hung.value = { short, thick }
    carpet.value = root
    place()
  }
  carpet.value.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return
    }
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const mat of materials) {
      if (!(mat instanceof MeshStandardMaterial)) {
        continue
      }
      mat.color.setScalar(0.56)
      mat.metalness = 0
      mat.roughness = 0.94
      mat.needsUpdate = true
    }
  })
}, { immediate: true })

watch(() => [props.roomHeight, props.fromCeiling, props.z, props.wallX], place)
</script>

<template>
  <TresGroup :position="pos" :rotation="[0, -Math.PI / 2, 0]">
    <primitive v-if="carpet" :object="carpet" />
  </TresGroup>
</template>
