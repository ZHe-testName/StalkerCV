<script setup lang="ts">
/**
 * Кучка lowpoly-травы в слоте StashOutside. Одна загрузка, InstancedMesh —
 * не 20× StashOutsideProp (иначе 20 fetch и по 5 draw call на травинку).
 */
import { useLoader } from '@tresjs/core'
import {
  Box3,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const props = withDefaults(defineProps<{
  src: string
  count?: number
  height?: number
  xMin?: number
  xMax?: number
  /** Дальняя граница, отрицательная (к дому). */
  zMin?: number
  /** Ближняя к схрону, отрицательная. */
  zMax?: number
  tint?: number
  seed?: number
}>(), {
  count: 28,
  height: 0.55,
  xMin: 0.5,
  xMax: 9.5,
  zMin: -16,
  zMax: -6,
  tint: 0.88,
  seed: 17,
})

const field = shallowRef<Group | null>(null)
const { state: gltf } = useLoader(GLTFLoader, props.src)

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

watch(gltf, (loaded) => {
  const scene = loaded?.scene
  if (!scene || field.value) {
    return
  }

  const measure = scene.clone(true)
  const box = new Box3().setFromObject(measure)
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  const sit = new Vector3(-center.x, -box.min.y, -center.z)
  const baseScale = props.height / (size.y || 1)

  const meshes: Mesh[] = []
  scene.traverse((child) => {
    if (child instanceof Mesh) {
      meshes.push(child)
    }
  })
  if (!meshes.length) {
    return
  }

  const srcMat = meshes[0]!.material
  const color = new Color(0xffffff)
  if (srcMat && !Array.isArray(srcMat) && 'color' in srcMat) {
    color.copy(srcMat.color)
  }
  color.multiplyScalar(props.tint)
  const mat = new MeshBasicMaterial({ color, side: DoubleSide })

  const rng = mulberry32(props.seed)
  const mSit = new Matrix4().makeTranslation(sit.x, sit.y, sit.z)
  const mScale = new Matrix4()
  const mRot = new Matrix4()
  const mPos = new Matrix4()
  const mOut = new Matrix4()

  const poses: Matrix4[] = []
  for (let i = 0; i < props.count; i++) {
    const x = props.xMin + rng() * (props.xMax - props.xMin)
    const z = props.zMin + rng() * (props.zMax - props.zMin)
    const yaw = Math.PI + (rng() - 0.5) * Math.PI
    const s = baseScale * (0.85 + rng() * 0.3)
    mScale.makeScale(s, s, s)
    mRot.makeRotationY(yaw)
    mPos.makeTranslation(x, 0, z)
    poses.push(mOut.copy(mPos).multiply(mRot).multiply(mScale).multiply(mSit).clone())
  }

  const root = new Group()
  for (const mesh of meshes) {
    const inst = new InstancedMesh(mesh.geometry, mat, props.count)
    inst.castShadow = false
    inst.receiveShadow = false
    inst.frustumCulled = false
    poses.forEach((m, i) => inst.setMatrixAt(i, m))
    inst.instanceMatrix.needsUpdate = true
    root.add(inst)
  }
  field.value = root
}, { immediate: true })
</script>

<template>
  <primitive v-if="field" :object="field" />
</template>
