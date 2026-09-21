<script setup lang="ts">
/**
 * Стол у дальней стены слева: столешница, ЭЛТ, системник, лампа, клавиатура, стул.
 * Локально стол смотрит в +Z (к проёму), спиной к дальней стене.
 */
import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { useLoader, useLoop } from '@tresjs/core'
import { stashFocused, retargetDeskCrt } from '~/composables/useStashCamera'

const props = defineProps<{
  innerBackZ: number
  innerLeftX: number
}>()

const tableW = 1.85
const tableD = 1.12
const tableH = 0.92
const wallGap = 0.28

const originX = props.innerLeftX + wallGap + tableW / 2
const originZ = props.innerBackZ + tableD / 2

const pcH = 0.52
const pcX = -tableW / 2 + 0.36 - 0.065
const pcZ = 0.04 - 0.08
const pcYaw = 14 * Math.PI / 180

const lampX = 0.56
const lampZ = 0.09
const lampH = 0.47

const papersX = (pcX + lampX) / 2 + 0.12
const papersZ = (pcZ + lampZ) / 2 + 0.04
const papersSpan = 0.65
const papersYaw = (22 - 28 - 15) * Math.PI / 180

const chairAngle = (-30 - 160) * Math.PI / 180
const chairX = pcX + 0.22
const chairZ = tableD / 2 + 0.04
const chairH = 1.1
const seatD = 0.48

const hoverW = tableW + 0.04
const hoverH = tableH + pcH + 0.02
const hoverD = tableD + seatD * 0.5
const hoverY = hoverH / 2
const hoverZ = 0.1

const emit = defineEmits<{
  select: []
}>()

const { hovered, glow, onPointerEnter, onPointerLeave } = useStashAnchor('desk')

const LAMP_IDLE = 0.48
const LAMP_HOT = 2.2
const lampIntensity = ref(LAMP_IDLE)
const pcMats: MeshStandardMaterial[] = []
const { onBeforeRender } = useLoop()
onBeforeRender(({ delta }) => {
  const lit = hovered.value || stashFocused.value === 'desk'
  const target = lit ? LAMP_HOT : LAMP_IDLE
  const k = 1 - Math.exp(-7.2 * delta)
  lampIntensity.value += (target - lampIntensity.value) * k
  const emitGlow = 0.22 + glow.value * 0.95
  for (const mat of pcMats) {
    mat.emissiveIntensity = emitGlow
  }
})

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

function sitGltfOnFloorBySpan(scene: Group, maxSpanM: number) {
  const root = new Group()
  const model = scene.clone(true)
  const box = new Box3().setFromObject(model)
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  model.position.set(-center.x, -box.min.y, -center.z)
  root.add(model)
  const span = Math.max(size.x, size.z, 1e-6)
  root.scale.setScalar(maxSpanM / span)
  return { root, model }
}

function forEachStandardMat(object: Group, fn: (mat: MeshStandardMaterial) => void) {
  object.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return
    }
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const mat of materials) {
      if (mat instanceof MeshStandardMaterial) {
        fn(mat)
      }
    }
  })
}

const { state: tableGltf } = useLoader(GLTFLoader, '/models/old-soviet-table/scene.gltf')
const tableModel = shallowRef<Group | null>(null)

watch(tableGltf, (gltf) => {
  const scene = gltf?.scene
  if (!scene || tableModel.value) {
    return
  }
  const { root, model } = sitGltfOnFloor(scene, tableH)
  forEachStandardMat(model, (mat) => {
    // glTF metalness=1 без env map даёт чёрное дерево.
    mat.metalness = 0
    mat.metalnessMap = null
    mat.roughness = 0.85
    mat.needsUpdate = true
  })
  // Длинная сторона стола — вдоль стены (мир X). После yaw ≈ 90° это локальный Z.
  root.scale.z *= 1.215
  // влево = +Y; +180, спиной к дальней стене, лицом к камере
  root.rotation.y = (92 + 180) * Math.PI / 180
  tableModel.value = root
}, { immediate: true })

const { state: lampGltf } = useLoader(GLTFLoader, '/models/rusty-kerosene-lamp/scene.gltf')
const lampModel = shallowRef<Group | null>(null)

watch(lampGltf, (gltf) => {
  const scene = gltf?.scene
  if (!scene || lampModel.value) {
    return
  }
  const { root, model } = sitGltfOnFloor(scene, lampH)
  forEachStandardMat(model, (mat) => {
    // Ржавчина должна читаться без IBL; полный metalness=1 снова чёрный.
    mat.metalness = Math.min(mat.metalness, 0.35)
    mat.needsUpdate = true
  })
  lampModel.value = root
}, { immediate: true })

const { state: pcGltf } = useLoader(GLTFLoader, '/models/abandoned-computer-terminal/scene.gltf')
const pcModel = shallowRef<Group | null>(null)

watch(pcGltf, (gltf) => {
  const scene = gltf?.scene
  if (!scene || pcModel.value) {
    return
  }
  const { root, model } = sitGltfOnFloor(scene, pcH)
  pcMats.length = 0
  forEachStandardMat(model, (mat) => {
    mat.metalness = Math.min(mat.metalness, 0.4)
    mat.needsUpdate = true
    pcMats.push(mat)
  })
  pcModel.value = root
  root.updateMatrixWorld(true)
  const crtBox = new Box3()
  let found = false
  root.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return
    }
    const box = new Box3().setFromObject(child)
    if (!found || box.max.y > crtBox.max.y) {
      crtBox.copy(box)
      found = true
    }
  })
  if (found) {
    const localX = (crtBox.min.x + crtBox.max.x) / 2
    const localY = crtBox.min.y + (crtBox.max.y - crtBox.min.y) * 0.58
    const localZ = crtBox.max.z - 0.03
    const c = Math.cos(pcYaw)
    const s = Math.sin(pcYaw)
    retargetDeskCrt(
      [
        originX + pcX + localX * c + localZ * s,
        tableH + localY,
        originZ + pcZ - localX * s + localZ * c,
      ],
      pcYaw,
    )
  }
}, { immediate: true })

const { state: papersGltf } = useLoader(GLTFLoader, '/models/papers-envelopes/scene.gltf')
const papersModel = shallowRef<Group | null>(null)

watch(papersGltf, (gltf) => {
  const scene = gltf?.scene
  if (!scene || papersModel.value) {
    return
  }
  const { root, model } = sitGltfOnFloorBySpan(scene, papersSpan)
  forEachStandardMat(model, (mat) => {
    mat.metalness = 0
    mat.metalnessMap = null
    mat.roughness = 0.9
    mat.needsUpdate = true
  })
  papersModel.value = root
}, { immediate: true })

const { state: chairGltf } = useLoader(GLTFLoader, '/models/chair-texture-render/scene.gltf')
const chairModel = shallowRef<Group | null>(null)

watch(chairGltf, (gltf) => {
  const scene = gltf?.scene
  if (!scene || chairModel.value) {
    return
  }
  const { root, model } = sitGltfOnFloor(scene, chairH)
  forEachStandardMat(model, (mat) => {
    mat.metalness = 0
    mat.metalnessMap = null
    mat.roughness = 0.85
    mat.needsUpdate = true
  })
  chairModel.value = root
}, { immediate: true })
</script>

<template>
  <TresGroup :position="[originX, 0, originZ]">
    <TresMesh
      :position="[0, hoverY, hoverZ]"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
      @click="emit('select')"
    >
      <TresBoxGeometry :args="[hoverW, hoverH, hoverD]" />
      <TresMeshBasicMaterial :transparent="true" :opacity="0" :depth-write="false" />
    </TresMesh>
    <primitive v-if="tableModel" :object="tableModel" />

    <TresGroup :position="[pcX, tableH, pcZ]" :rotation="[0, pcYaw, 0]">
      <primitive v-if="pcModel" :object="pcModel" />
    </TresGroup>

    <TresGroup :position="[papersX, tableH, papersZ]" :rotation="[0, papersYaw, 0]">
      <primitive v-if="papersModel" :object="papersModel" />
    </TresGroup>

    <TresGroup :position="[lampX, tableH, lampZ]">
      <primitive v-if="lampModel" :object="lampModel" />
      <TresPointLight
        :position="[0, lampH * 0.58, 0]"
        color="#ffb15a"
        :intensity="lampIntensity"
        :distance="2.6"
        :decay="2"
      />
    </TresGroup>

    <TresGroup :position="[chairX, 0, chairZ]" :rotation="[0, chairAngle, 0]">
      <primitive v-if="chairModel" :object="chairModel" />
    </TresGroup>
  </TresGroup>
</template>
