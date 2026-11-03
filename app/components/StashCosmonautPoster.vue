<script setup lang="ts">
/**
 * Плакат космонавта (Plk1) на дальней стене между окном и правой стеной.
 * Tipografiya / blenderist, CC-BY-4.0. В glTF — плоская карточка; сажаем лицом в комнату (+Z).
 */
import { useLoader } from '@tresjs/core'
import { Box3, Group, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

/** Unlit из пака светится полной альбедо — в сцене бумага под лампой/окном. */
const ALBEDO = 0.80

const props = defineProps<{
  src: string
  height: number
  wallZ: number
  x: number
  top: number
}>()

function hangOnBackWall(scene: Group, heightM: number) {
  const root = new Group()
  const model = scene.clone(true)
  root.add(model)
  root.updateMatrixWorld(true)

  const box0 = new Box3().setFromObject(root)
  const size0 = box0.getSize(new Vector3())
  model.position.sub(box0.getCenter(new Vector3()))

  const axes: { key: 'x' | 'y' | 'z', len: number }[] = [
    { key: 'x', len: size0.x },
    { key: 'y', len: size0.y },
    { key: 'z', len: size0.z },
  ]
  axes.sort((a, b) => b.len - a.len)

  const long = new Vector3()
  long[axes[0].key] = 1
  const mid = new Vector3()
  mid[axes[1].key] = 1

  const xAxis = long.clone().normalize()
  const yAxis = mid.clone().normalize()
  if (yAxis.y < 0) {
    yAxis.negate()
  }
  const zAxis = new Vector3().crossVectors(xAxis, yAxis).normalize()
  if (zAxis.z < 0) {
    zAxis.negate()
    xAxis.negate()
  }
  xAxis.crossVectors(yAxis, zAxis).normalize()
  yAxis.crossVectors(zAxis, xAxis).normalize()

  const basis = new Matrix4().makeBasis(xAxis, yAxis, zAxis)
  basis.invert()
  model.quaternion.premultiply(new Quaternion().setFromRotationMatrix(basis))

  root.updateMatrixWorld(true)
  const box1 = new Box3().setFromObject(root)
  model.position.sub(box1.getCenter(new Vector3()))
  const size1 = box1.getSize(new Vector3())
  root.scale.setScalar(heightM / (size1.y || 1))
  root.updateMatrixWorld(true)
  const size2 = new Box3().setFromObject(root).getSize(new Vector3())
  return { root, thick: size2.z }
}

const { state: gltf } = useLoader(GLTFLoader, props.src)
const poster = shallowRef<Group | null>(null)

watch(gltf, (loaded) => {
  const scene = loaded?.scene
  if (!scene || poster.value) {
    return
  }
  const { root, thick } = hangOnBackWall(scene, props.height)
  root.position.set(
    props.x,
    props.top - props.height / 2,
    props.wallZ + thick / 2 + 0.005,
  )
  root.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return
    }
    const list = Array.isArray(child.material) ? child.material : [child.material]
    const next = list.map((mat) => {
      if (mat instanceof MeshBasicMaterial) {
        const std = new MeshStandardMaterial({
          map: mat.map,
          color: mat.color.clone().multiplyScalar(ALBEDO),
          roughness: 0.92,
          metalness: 0,
        })
        return std
      }
      if (mat instanceof MeshStandardMaterial) {
        mat.color.multiplyScalar(ALBEDO)
        mat.metalness = 0
        mat.roughness = 0.92
        mat.needsUpdate = true
      }
      return mat
    })
    child.material = Array.isArray(child.material) ? next : next[0]
  })
  poster.value = root
}, { immediate: true })
</script>

<template>
  <primitive v-if="poster" :object="poster" />
</template>
