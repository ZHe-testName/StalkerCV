<script setup lang="ts">
/**
 * Сервант справа от стола. Модель без полок — прибор скилов на крышке.
 */
import { Box3, Group, Mesh, MeshStandardMaterial, Object3D, Quaternion, Vector3 } from 'three'
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { useLoader } from '@tresjs/core'
import { stashHold } from '~/composables/useStashCamera'

const props = defineProps<{
  innerBackZ: number
  innerRightX: number
}>()

const cabW = 1.48
const hutchD = 0.52
const bodyD = hutchD * 1.5
const cabH = 0.92
const doorT = 0.018
const wallGap = 0.5
const yaw = -7 * Math.PI / 180

const cosY = Math.cos(yaw)
const sinY = Math.sin(yaw)
const rotateXZ = (x: number, z: number) => ({
  x: x * cosY + z * sinY,
  z: -x * sinY + z * cosY,
})

const footprint = [
  rotateXZ(cabW / 2, bodyD / 2 + doorT),
  rotateXZ(-cabW / 2, bodyD / 2 + doorT),
  rotateXZ(cabW / 2, -bodyD / 2),
  rotateXZ(-cabW / 2, -bodyD / 2),
]
const originX = props.innerRightX - wallGap - Math.max(...footprint.map(p => p.x))
const originZ = props.innerBackZ - Math.min(...footprint.map(p => p.z))

const deviceW = 0.26
const deviceH = 0.13
const deviceD = 0.2
const deviceX = -cabW / 2 + 0.22
const deviceY = cabH + deviceH / 2
const deviceZ = 0.18
const deviceYaw = -24 * Math.PI / 180

const hoverW = cabW + 0.03
const hoverH = cabH + 0.16
const hoverD = bodyD + 0.03
const hoverY = hoverH / 2

const emit = defineEmits<{
  select: []
}>()

const { glow, onPointerEnter, onPointerLeave } = useStashAnchor('sideboard')

const restLocal = rotateXZ(deviceX, deviceZ)
const restWorldPos: [number, number, number] = [
  originX + restLocal.x,
  deviceY,
  originZ + restLocal.z,
]
const restWorldYaw = yaw + deviceYaw

const svdLen = 1.6 * 1.1
const svdX = -cabW / 2 - 0.28 - 0.02
const svdY = 0.08
const svdZ = -bodyD / 2 + 0.39
const svdLeanX = -8 * Math.PI / 180
const svdLeanZ = -15 * Math.PI / 180
const svdYaw = (-90 - 64 - 31 + 32 + 17 + 15) * Math.PI / 180
const svdRotZ = 172 * Math.PI / 180

const maskSpan = 0.28 * 1.1 * 1.1 * 2.5 * 0.7 * 1.2 * 0.9
const maskX = cabW / 2 - 0.18 - 0.30
const maskY = cabH - 0.1 + 0.10
const maskZ = bodyD / 2 - 0.16
const maskRotX = -90 * Math.PI / 180
const maskRotZ = 90 * Math.PI / 180
const maskYaw = -45 * Math.PI / 180
const maskExtraX = 90 * Math.PI / 180
const maskCamX = 50 * Math.PI / 180
const maskCamZ = 90 * Math.PI / 180
const maskCamPitch = -90 * Math.PI / 180
const maskLieX = (86 - 10 - 10) * Math.PI / 180
const maskLieYaw = (160 + 180 - 90 + 180 - 180 - 30 - 20) * Math.PI / 180
const maskSnoutX = (-10 + 12 + 10 - 7 + 11) * Math.PI / 180
const maskFlipZ = 180 * Math.PI / 180
const maskFlipX = 180 * Math.PI / 180

const radioSpan = 0.36 * 1.2
const radioWide = 1.25
const radioTall = 1.3
const radioX = -0.12 - 0.10
const radioY = cabH
const radioZ = -0.05
const radioYaw = -90 * Math.PI / 180

function findNamed(root: Object3D, name: string) {
  let found: Object3D | null = null
  root.traverse((child) => {
    if (!found && child.name === name) {
      found = child
    }
  })
  return found
}

function plantFilterBesideMask(root: Group) {
  root.updateMatrixWorld(true)
  const maskObj = findNamed(root, 'Mask_LP')
  const filterObj = findNamed(root, 'Filter_LP')
  if (!maskObj || !filterObj) {
    return
  }
  const maskBox = new Box3().setFromObject(maskObj)
  const filterBox = new Box3().setFromObject(filterObj)
  const maskC = maskBox.getCenter(new Vector3())
  const filterC = filterBox.getCenter(new Vector3())
  const across = new Vector3(filterC.x - maskC.x, 0, filterC.z - maskC.z)
  const horiz = across.length()
  if (horiz < 0.02) {
    return
  }
  const dy = filterBox.min.y - maskBox.min.y
  const angle = Math.atan2(dy, horiz)
  if (Math.abs(angle) < 0.01) {
    return
  }
  const axis = new Vector3(0, 1, 0).cross(across).normalize()
  const q = new Quaternion().setFromAxisAngle(axis, angle)
  root.position.sub(maskC).applyQuaternion(q).add(maskC)
  root.quaternion.premultiply(q)
  root.updateMatrixWorld(true)
}

function sitOnNamedParts(root: Group, names: string[]) {
  root.updateMatrixWorld(true)
  const box = new Box3()
  let any = false
  for (const name of names) {
    const obj = findNamed(root, name)
    if (!obj) {
      continue
    }
    if (!any) {
      box.setFromObject(obj)
      any = true
    }
    else {
      box.union(new Box3().setFromObject(obj))
    }
  }
  if (!any) {
    box.setFromObject(root)
  }
  const center = box.getCenter(new Vector3())
  root.position.x -= center.x
  root.position.y -= box.min.y
  root.position.z -= center.z
}

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

function sitGltfOnFloorBySpan(scene: Group, maxSpanM: number, extraRot?: [number, number, number]) {
  const root = new Group()
  const model = cloneSkinned(scene) as Group
  const pivot = new Group()
  pivot.add(model)
  if (extraRot) {
    pivot.rotation.set(extraRot[0], extraRot[1], extraRot[2])
    pivot.updateMatrixWorld(true)
  }
  const box = new Box3().setFromObject(pivot)
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  pivot.position.set(-center.x, -box.min.y, -center.z)
  root.add(pivot)
  const span = Math.max(size.x, size.z, 1e-6)
  root.scale.setScalar(maxSpanM / span)
  return { root, model }
}

function sitLongAxisUp(scene: Group, lengthM: number) {
  const root = new Group()
  const model = scene.clone(true)
  const box0 = new Box3().setFromObject(model)
  const size0 = box0.getSize(new Vector3())
  if (size0.x >= size0.y && size0.x >= size0.z) {
    model.rotation.z = Math.PI / 2
  }
  else if (size0.z >= size0.y && size0.z >= size0.x) {
    model.rotation.x = -Math.PI / 2
  }
  model.rotation.z += svdRotZ
  model.updateMatrixWorld(true)
  const box = new Box3().setFromObject(model)
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  model.position.set(-center.x, -box.min.y, -center.z)
  root.add(model)
  root.scale.setScalar(lengthM / (size.y || 1))
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

const { state: svdGltf } = useLoader(GLTFLoader, '/models/dragunov-svd/scene.gltf')
const svdModel = shallowRef<Group | null>(null)

watch(svdGltf, (gltf) => {
  const scene = gltf?.scene
  if (!scene || svdModel.value) {
    return
  }
  const { root, model } = sitLongAxisUp(scene, svdLen)
  const svdMats = new Set<MeshStandardMaterial>()
  forEachStandardMat(model, (mat) => svdMats.add(mat))
  for (const mat of svdMats) {
    mat.metalness = Math.min(mat.metalness, 0.18)
    mat.roughness = Math.max(mat.roughness, 0.86)
    mat.color.multiplyScalar(0.72)
    mat.needsUpdate = true
  }
  svdModel.value = root
}, { immediate: true })

const { state: cabGltf } = useLoader(GLTFLoader, '/models/cabinet/scene.gltf')
const cabModel = shallowRef<Group | null>(null)

watch(cabGltf, (gltf) => {
  const scene = gltf?.scene
  if (!scene || cabModel.value) {
    return
  }
  const { root, model } = sitGltfOnFloor(scene, cabH)
  forEachStandardMat(model, (mat) => {
    mat.metalness = 0
    mat.metalnessMap = null
    mat.roughness = 0.94
    mat.color.setRGB(0.36, 0.33, 0.29)
    mat.needsUpdate = true
  })
  cabModel.value = root
}, { immediate: true })

const { state: radioGltf } = useLoader(GLTFLoader, '/models/radio/scene.gltf')
const radioModel = shallowRef<Group | null>(null)

watch(radioGltf, (gltf) => {
  const scene = gltf?.scene
  if (!scene || radioModel.value) {
    return
  }
  const { root, model } = sitGltfOnFloorBySpan(scene, radioSpan)
  root.scale.x *= radioWide
  root.scale.y *= radioTall
  root.scale.z *= radioWide
  forEachStandardMat(model, (mat) => {
    mat.metalness = Math.min(mat.metalness, 0.35)
    mat.roughness = Math.max(mat.roughness, 0.75)
    mat.emissiveIntensity = Math.min(mat.emissiveIntensity || 1, 0.45)
    mat.needsUpdate = true
  })
  radioModel.value = root
}, { immediate: true })

const { state: maskGltf } = useLoader(GLTFLoader, '/models/gp-5-gas-mask-kit/scene.gltf')
const maskModel = shallowRef<Group | null>(null)

watch(maskGltf, (gltf) => {
  const scene = gltf?.scene
  if (!scene || maskModel.value) {
    return
  }
  const { root, model } = sitGltfOnFloorBySpan(scene, maskSpan, [maskRotX, 0, 0])
  const maskMats = new Set<MeshStandardMaterial>()
  forEachStandardMat(model, (mat) => maskMats.add(mat))
  for (const mat of maskMats) {
    mat.metalness = 0
    mat.metalnessMap = null
    mat.roughness = 0.94
    mat.roughnessMap = null
    mat.color.multiplyScalar(0.62)
    mat.needsUpdate = true
  }
  model.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return
    }
    const onEye = child.name === 'Eye_LP' || child.parent?.name === 'Eye_LP'
    if (!onEye) {
      return
    }
    const src = Array.isArray(child.material) ? child.material[0] : child.material
    if (!(src instanceof MeshStandardMaterial)) {
      return
    }
    const glass = src.clone()
    glass.metalness = 0
    glass.metalnessMap = null
    glass.roughness = 1
    glass.roughnessMap = null
    glass.normalMap = null
    glass.envMapIntensity = 0
    glass.color.multiplyScalar(0.5)
    glass.needsUpdate = true
    child.material = glass
  })
  const spin = new Group()
  spin.add(root)
  spin.rotation.z = maskRotZ
  const yaw = new Group()
  yaw.add(spin)
  yaw.rotation.y = maskYaw
  const tilt = new Group()
  tilt.add(yaw)
  tilt.rotation.x = maskExtraX
  const lean = new Group()
  lean.add(tilt)
  lean.rotation.x = maskCamX
  const camSpin = new Group()
  camSpin.add(lean)
  camSpin.rotation.z = maskCamZ
  const camPitch = new Group()
  camPitch.add(camSpin)
  camPitch.rotation.x = maskCamPitch
  const lieX = new Group()
  lieX.add(camPitch)
  lieX.rotation.x = maskLieX
  const lieYaw = new Group()
  lieYaw.add(lieX)
  lieYaw.rotation.y = maskLieYaw
  const snout = new Group()
  snout.add(lieYaw)
  snout.rotation.x = maskSnoutX
  const flipZ = new Group()
  flipZ.add(snout)
  flipZ.rotation.z = maskFlipZ
  const flipX = new Group()
  flipX.add(flipZ)
  flipX.rotation.x = maskFlipX
  flipX.updateMatrixWorld(true)
  plantFilterBesideMask(flipX)
  sitOnNamedParts(flipX, ['Mask_LP', 'Filter_LP'])
  const holder = new Group()
  holder.add(flipX)
  maskModel.value = holder
}, { immediate: true })

const devicePose = computed(() => {
  const h = stashHold.value
  const k = h.id === 'sideboard' ? h.lift : 0
  return {
    position: [
      restWorldPos[0] + (h.x - restWorldPos[0]) * k,
      restWorldPos[1] + (h.y - restWorldPos[1]) * k,
      restWorldPos[2] + (h.z - restWorldPos[2]) * k,
    ] as [number, number, number],
    rotation: [
      h.pitch * k,
      restWorldYaw + (h.yaw - restWorldYaw) * k,
      0,
    ] as [number, number, number],
    scale: 1 + (h.scale - 1) * k,
  }
})
</script>

<template>
  <TresGroup>
    <TresGroup :position="[originX, 0, originZ]" :rotation="[0, yaw, 0]">
    <TresMesh
      :position="[0, hoverY, 0]"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
      @click="emit('select')"
    >
      <TresBoxGeometry :args="[hoverW, hoverH, hoverD]" />
      <TresMeshBasicMaterial :transparent="true" :opacity="0" :depth-write="false" />
    </TresMesh>
    <primitive v-if="cabModel" :object="cabModel" />
    <TresGroup :position="[svdX, svdY, svdZ]" :rotation="[svdLeanX, 0, svdLeanZ]">
      <TresGroup :rotation="[0, svdYaw, 0]">
        <primitive v-if="svdModel" :object="svdModel" />
      </TresGroup>
    </TresGroup>
    <TresGroup :position="[radioX, radioY, radioZ]" :rotation="[0, radioYaw, 0]">
      <primitive v-if="radioModel" :object="radioModel" />
    </TresGroup>
    <TresGroup :position="[maskX, maskY, maskZ]">
      <primitive v-if="maskModel" :object="maskModel" />
    </TresGroup>
    </TresGroup>

    <TresGroup
      :position="devicePose.position"
      :rotation="devicePose.rotation"
      :scale="[devicePose.scale, devicePose.scale, devicePose.scale]"
    >
      <TresMesh>
        <TresBoxGeometry :args="[deviceW, deviceH, deviceD]" />
        <TresMeshStandardMaterial
          color="#4a5238"
          emissive="#4a5238"
          :emissive-intensity="glow * 0.25"
          :roughness="0.9"
          :metalness="0.08"
        />
      </TresMesh>
      <TresMesh :position="[0, deviceH / 2 + 0.012, 0]">
        <TresBoxGeometry :args="[deviceW * 0.55, 0.024, 0.03]" />
        <TresMeshStandardMaterial color="#3a3e32" :roughness="0.85" :metalness="0.1" />
      </TresMesh>
      <TresMesh :position="[0, 0.01, deviceD / 2 + 0.004]">
        <TresBoxGeometry :args="[deviceW * 0.42, deviceH * 0.38, 0.008]" />
        <TresMeshStandardMaterial
          color="#c4a04a"
          emissive="#e0c060"
          :emissive-intensity="glow"
          :roughness="0.4"
          :metalness="0"
        />
      </TresMesh>
      <TresMesh :position="[deviceW / 2 - 0.03, deviceH / 2 + 0.05, -deviceD / 2 + 0.04]">
        <TresBoxGeometry :args="[0.012, 0.1, 0.012]" />
        <TresMeshStandardMaterial color="#3a3e32" :roughness="0.8" :metalness="0.15" />
      </TresMesh>
    </TresGroup>
  </TresGroup>
</template>
