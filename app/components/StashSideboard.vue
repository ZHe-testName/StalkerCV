<script setup lang="ts">
/**
 * Сервант справа от стола. Soviet Old Table — прибор скилов на крышке.
 */
import { Box3, Group, Mesh, MeshStandardMaterial, Object3D, Quaternion, Vector3 } from 'three'
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { useLoader, useLoop } from '@tresjs/core'
import { stashFocused, stashHold } from '~/composables/useStashCamera'

const cabSrc = '/models/soviet-old-table/scene.gltf'
const cabYawY = -90 * Math.PI / 180
const cabCamZ = 0.05
const svdLeft = 0.22

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
const originZ = props.innerBackZ - Math.min(...footprint.map(p => p.z)) + cabCamZ

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

const { hovered, glow, onPointerEnter, onPointerLeave } = useStashAnchor('sideboard')

const restLocal = rotateXZ(deviceX, deviceZ)
const restWorldPos: [number, number, number] = [
  originX + restLocal.x,
  deviceY,
  originZ + restLocal.z,
]
const restWorldYaw = yaw + deviceYaw

const svdLen = 1.6 * 1.1
const svdX = -cabW / 2 - 0.28 - 0.02 - svdLeft
const svdY = 0.08
const svdZ = -bodyD / 2 + 0.39
const svdLeanX = -8 * Math.PI / 180
const svdLeanZ = -15 * Math.PI / 180
const svdYaw = (-90 - 64 - 31 + 32 + 17 + 15) * Math.PI / 180
const svdRotZ = 172 * Math.PI / 180

const maskSpan = 0.28 * 1.1 * 1.1 * 2.5 * 0.7 * 1.2 * 0.9
const maskX = cabW / 2 - 0.18 - 0.30
const maskY = cabH - 0.1 + 0.10
const maskZ = bodyD / 2 - 0.16 - 0.10
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

const papersSpan = 0.42
const papersX = 0
const papersY = 0.553
const papersZ = 0.05 - 0.06
const papersYaw = 17 * Math.PI / 180

const nicheLeftX = -0.337
const nicheFloorY = 0.206
const milkSpan = 0.078
const milkCans = [
  { x: nicheLeftX + 0.05 + milkSpan / 2, z: 0.12, yaw: 0, lie: false },
  { x: nicheLeftX + 0.05 + milkSpan / 2 + milkSpan + 0.04, z: 0.12 + 0.03, yaw: 25 * Math.PI / 180, lie: false },
  { x: nicheLeftX + 0.05 + milkSpan / 2 + (milkSpan + 0.04) * 2 - milkSpan, z: 0.12 + 0.03 + 0.05 + 0.03, yaw: 10 * Math.PI / 180, lie: true },
]

const radioTopY = 1.081
const radioFarLeft = { x: -0.424, z: -0.32 }
const medkitSpan = 0.2 * 0.8
const medkitLowSrc = '/models/medkit-low/scene.gltf'
const medkitHighSrc = '/models/medkit-high/scene.gltf'
const medkitBase = {
  src: medkitLowSrc,
  x: radioFarLeft.x + 0.02 + 0.178 / 2 - 0.03,
  z: radioFarLeft.z + 0.02 + 0.2 / 2 + 0.04,
  yaw: (4 + 7) * Math.PI / 180,
}
const medkitMid = {
  src: medkitLowSrc,
  x: medkitBase.x - 0.03,
  z: medkitBase.z + 0.03,
  yaw: medkitBase.yaw + 14 * Math.PI / 180,
}
const medkitStack = [
  medkitBase,
  medkitMid,
  {
    src: medkitHighSrc,
    x: medkitMid.x + 0.08,
    z: medkitMid.z + 0.02,
    yaw: medkitMid.yaw - 20 * Math.PI / 180,
  },
]

const artifactSpan = 0.1 * 1.2
const artifactX = 0.12
const artifactY = papersY + 0.03 + 0.02
const artifactZ = 0.27
const artifactBobAmp = 0.01
const artifactBobPeriod = 4.5 / 2
const artifactLightColor = '#2ee6ee'
const artifactLightIdle = 0.3
const artifactLightHot = 1.4
const artifactGlowIdle = 1
const artifactGlowHot = 2.4
const artifactHoverLift = 0.10 - artifactBobAmp
const artifactSpinSpeed = -2 * Math.PI / 2.3

const artifactBob = ref(0)
const artifactSpin = ref(0)
const artifactLight = ref(artifactLightIdle)
const artifactGlowMats: MeshStandardMaterial[] = []
let artifactTime = 0
let artifactLift = 0
let artifactSpinVel = 0
const { onBeforeRender } = useLoop()
onBeforeRender(({ delta }) => {
  const lit = hovered.value || stashFocused.value === 'sideboard'
  artifactTime += delta
  artifactLift += ((lit ? 1 : 0) - artifactLift) * (1 - Math.exp(-3.2 * delta))
  artifactSpinVel += ((lit ? artifactSpinSpeed : 0) - artifactSpinVel) * (1 - Math.exp(-2.5 * delta))
  artifactSpin.value += artifactSpinVel * delta
  const bob = artifactBobAmp * Math.sin(artifactTime * 2 * Math.PI / artifactBobPeriod)
  artifactBob.value = bob + (artifactHoverLift - bob) * artifactLift
  artifactLight.value = artifactLightIdle + (artifactLightHot - artifactLightIdle) * artifactLift
  const glowK = artifactGlowIdle + (artifactGlowHot - artifactGlowIdle) * artifactLift
  for (const mat of artifactGlowMats) {
    mat.emissiveIntensity = glowK
  }
})

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

// Рипы из игры — skinned mesh: sitGltfOnFloorBySpan меряет bind-позу, досаживаем по bbox со скиннингом.
function seatSkinned(root: Group) {
  root.updateMatrixWorld(true)
  const box = new Box3().setFromObject(root, true)
  const c = box.getCenter(new Vector3())
  root.position.x -= c.x
  root.position.y -= box.min.y
  root.position.z -= c.z
  root.updateMatrixWorld(true)
  return new Box3().setFromObject(root, true).getSize(new Vector3()).y
}

function sitSkinnedBySpan(scene: Group, maxSpanM: number) {
  const root = new Group()
  const model = cloneSkinned(scene) as Group
  root.add(model)
  root.updateMatrixWorld(true)
  const size = new Box3().setFromObject(root, true).getSize(new Vector3())
  root.scale.setScalar(maxSpanM / Math.max(size.x, size.z, 1e-6))
  const height = seatSkinned(root)
  return { root, model, height }
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

const { state: milkGltf } = useLoader(GLTFLoader, '/models/condensed-milk/scene.gltf')
const milkModels = shallowRef<Group[]>([])

watch(milkGltf, (gltf) => {
  const scene = gltf?.scene
  if (!scene || milkModels.value.length) {
    return
  }
  milkModels.value = milkCans.map((can) => {
    const { root, model } = sitGltfOnFloorBySpan(scene, milkSpan, can.lie ? [0, 0, Math.PI / 2] : undefined)
    forEachStandardMat(model, (mat) => {
      mat.metalness = 0
      mat.needsUpdate = true
    })
    seatSkinned(root)
    return root
  })
}, { immediate: true })

const { state: medkitLowGltf } = useLoader(GLTFLoader, medkitLowSrc)
const { state: medkitHighGltf } = useLoader(GLTFLoader, medkitHighSrc)
const medkitModels = shallowRef<Group[]>([])
const medkitHeights = ref<number[]>([])
const medkitY = computed(() => medkitStack.map((_, i) =>
  radioTopY + medkitHeights.value.slice(0, i).reduce((sum, h) => sum + h, 0)))

function seatMedkit(scene: Group) {
  const { root, model, height: h } = sitSkinnedBySpan(scene, medkitSpan)
  forEachStandardMat(model, (mat) => {
    mat.metalness = 0
    mat.roughness = 0.7
    mat.needsUpdate = true
  })
  return { root, height: h }
}

watch([medkitLowGltf, medkitHighGltf], ([lowGltf, highGltf]) => {
  const low = lowGltf?.scene
  const high = highGltf?.scene
  if (!low || !high || medkitModels.value.length) {
    return
  }
  const scenes: Record<string, Group> = {
    [medkitLowSrc]: low,
    [medkitHighSrc]: high,
  }
  const roots: Group[] = []
  const heights: number[] = []
  for (const kit of medkitStack) {
    const { root, height: h } = seatMedkit(scenes[kit.src])
    roots.push(root)
    heights.push(h)
  }
  medkitHeights.value = heights
  medkitModels.value = roots
}, { immediate: true })

const { state: artifactGltf } = useLoader(GLTFLoader, '/models/cyan-artifact/scene.gltf')
const artifactModel = shallowRef<Group | null>(null)

watch(artifactGltf, (gltf) => {
  const scene = gltf?.scene
  if (!scene || artifactModel.value) {
    return
  }
  const { root, model } = sitGltfOnFloorBySpan(scene, artifactSpan)
  artifactGlowMats.length = 0
  forEachStandardMat(model, (mat) => {
    mat.metalness = 0
    mat.needsUpdate = true
    if (mat.emissive.getHex() !== 0) {
      artifactGlowMats.push(mat)
    }
  })
  artifactModel.value = root
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
    <StashCabinetBody :src="cabSrc" :height="cabH" :yaw-y="cabYawY" />
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
    <TresGroup :position="[papersX, papersY, papersZ]" :rotation="[0, papersYaw, 0]">
      <primitive v-if="papersModel" :object="papersModel" />
    </TresGroup>
    <TresGroup
      v-for="(kit, i) in medkitStack"
      :key="`medkit-${i}`"
      :position="[kit.x, medkitY[i], kit.z]"
      :rotation="[0, kit.yaw, 0]"
    >
      <primitive v-if="medkitModels[i]" :object="medkitModels[i]" />
    </TresGroup>
    <TresGroup
      v-for="(can, i) in milkCans"
      :key="`milk-${i}`"
      :position="[can.x, nicheFloorY, can.z]"
      :rotation="[0, can.yaw, 0]"
    >
      <primitive v-if="milkModels[i]" :object="milkModels[i]" />
    </TresGroup>
    <TresGroup :position="[artifactX, artifactY + artifactBob, artifactZ]">
      <TresGroup :rotation="[0, artifactSpin, 0]">
        <primitive v-if="artifactModel" :object="artifactModel" />
      </TresGroup>
      <TresPointLight
        :position="[0, artifactSpan / 2, 0]"
        :color="artifactLightColor"
        :intensity="artifactLight"
        :distance="0.9"
        :decay="2"
      />
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
