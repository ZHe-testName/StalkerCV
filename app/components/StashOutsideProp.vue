<script setup lang="ts">
/**
 * Проп за окном. Ставится в локальные координаты `StashOutside`:
 * −Z наружу, +X вправо из окна, y = 0 земля.
 *
 * Материалы переводятся в `MeshBasicMaterial` — свет считается запечённым
 * в текстуру. Это и дёшево (самый простой шейдер), и правильно по смыслу:
 * комнатные источники сюда не достают, под MeshStandard проп был бы чёрным.
 * Тени выключены принудительно, см. предупреждение в StashOutside.
 */
import { useLoader } from '@tresjs/core'
import {
  Box3,
  Group,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from 'three'
import type { Material } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const props = withDefaults(defineProps<{
  src: string
  /** Высота в метрах; масштаб равномерный. */
  height: number
  /** Локальный X: вправо, если смотреть из окна. */
  x?: number
  /** Локальный Z: наружу — отрицательный. */
  z?: number
  /** Поворот вокруг Y, градусы. */
  yaw?: number
  /** Умножает albedo. <1 — увести вдаль к цвету задника. */
  tint?: number
  /** Утопить в землю, метры (неровность рельефа). */
  sink?: number
}>(), {
  x: 0,
  z: -10,
  yaw: 0,
  tint: 1,
  sink: 0,
})

const model = shallowRef<Group | null>(null)
const { state: gltf } = useLoader(GLTFLoader, props.src)

function pickMap(mat: Material | null | undefined) {
  return mat && 'map' in mat ? (mat as { map?: MeshBasicMaterial['map'] }).map ?? null : null
}

function toUnlit(root: Group, tint: number) {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return
    }
    child.castShadow = false
    child.receiveShadow = false
    const list = Array.isArray(child.material) ? child.material : [child.material]
    const swapped = list.map((mat) => {
      const basic = new MeshBasicMaterial()
      const map = pickMap(mat)
      if (map) {
        basic.map = map
      }
      if (mat && 'color' in mat) {
        basic.color.copy((mat as { color: MeshBasicMaterial['color'] }).color)
      }
      basic.color.multiplyScalar(tint)
      basic.transparent = mat?.transparent ?? false
      basic.opacity = mat?.opacity ?? 1
      basic.alphaTest = mat?.alphaTest ?? 0
      basic.depthWrite = mat?.depthWrite ?? true
      if (mat && 'side' in mat) {
        basic.side = (mat as { side: MeshBasicMaterial['side'] }).side
      }
      return basic
    })
    child.material = Array.isArray(child.material) ? swapped : swapped[0]!
  })
}

watch(gltf, (loaded) => {
  const scene = loaded?.scene
  if (!scene || model.value) {
    return
  }

  const inner = scene.clone(true)
  const box = new Box3().setFromObject(inner)
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  inner.position.set(-center.x, -box.min.y, -center.z)

  const scaled = new Group()
  scaled.add(inner)
  scaled.scale.setScalar(props.height / (size.y || 1))

  toUnlit(scaled, props.tint)
  disableShadows(scaled)

  const wrap = new Group()
  wrap.add(scaled)
  wrap.position.set(props.x, -props.sink, props.z)
  wrap.rotation.y = (props.yaw * Math.PI) / 180
  model.value = wrap
}, { immediate: true })
</script>

<template>
  <primitive v-if="model" :object="model" />
</template>
