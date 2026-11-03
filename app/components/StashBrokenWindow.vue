<script setup lang="ts">
/**
 * Sketchfab Broken Window в проёме: 06 слева, 05 на дальней.
 * Боксы рамы сняты; проём в стене и откос остаются.
 */
import { useLoader } from '@tresjs/core'
import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const props = defineProps<{
  src: string
  facing?: 'left' | 'back'
  /** Ширина по створке Window_001, не по нижней рейке Frame_001. */
  fitSash?: boolean
  wallX?: number
  wallZ?: number
  opening: {
    width: number
    height: number
    sill: number
    z?: number
    x?: number
  }
}>()

const openingMidY = props.opening.sill + props.opening.height / 2

function sitInOpening(scene: Group, openingW: number, openingH: number, fitSash: boolean) {
  const root = new Group()
  const model = scene.clone(true)
  const box0 = new Box3().setFromObject(model)
  const size0 = box0.getSize(new Vector3())
  const center0 = box0.getCenter(new Vector3())
  model.position.sub(center0)

  if (size0.y <= size0.x && size0.y <= size0.z) {
    model.rotation.z = Math.PI / 2
  }
  else if (size0.z <= size0.x && size0.z <= size0.y) {
    model.rotation.y = Math.PI / 2
  }
  model.updateMatrixWorld(true)

  let box = new Box3().setFromObject(model)
  let size = box.getSize(new Vector3())
  if (size.z > size.y) {
    model.rotation.x += Math.PI / 2
    model.updateMatrixWorld(true)
    box = new Box3().setFromObject(model)
    size = box.getSize(new Vector3())
  }

  const center = box.getCenter(new Vector3())
  model.position.x -= center.x
  model.position.y -= center.y
  model.position.z -= center.z
  root.add(model)
  let widthSize = size.z
  if (fitSash) {
    const sash = model.getObjectByName('Window_001')
    if (sash) {
      sash.updateMatrixWorld(true)
      widthSize = new Box3().setFromObject(sash).getSize(new Vector3()).z
    }
  }
  root.scale.set(
    openingH / Math.max(size.y, 1e-6),
    openingH / Math.max(size.y, 1e-6),
    openingW / Math.max(widthSize, 1e-6),
  )
  return { root, model }
}

const { state: gltf } = useLoader(GLTFLoader, props.src)
const frame = shallowRef<Group | null>(null)

watch(gltf, (loaded) => {
  const scene = loaded?.scene
  if (!scene || frame.value) {
    return
  }
  const { root, model } = sitInOpening(scene, props.opening.width, props.opening.height, !!props.fitSash)
  model.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return
    }
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const mat of materials) {
      if (!(mat instanceof MeshStandardMaterial)) {
        continue
      }
      if (mat.name === 'Glass' || mat.transparent) {
        mat.transparent = true
        mat.depthWrite = false
        mat.metalness = 0
      }
      else {
        mat.metalness = Math.min(mat.metalness, 0.25)
        mat.roughness = Math.max(mat.roughness, 0.8)
      }
      mat.needsUpdate = true
    }
  })
  if (props.facing === 'back') {
    root.rotation.y = -Math.PI / 2
    root.position.set(props.opening.x ?? 0, openingMidY, props.wallZ ?? 0)
  }
  else {
    root.position.set(props.wallX ?? 0, openingMidY, props.opening.z ?? 0)
  }
  frame.value = root
}, { immediate: true })
</script>

<template>
  <primitive v-if="frame" :object="frame" />
</template>
