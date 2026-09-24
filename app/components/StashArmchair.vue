<script setup lang="ts">
/**
 * Кресло у правой стены: Old Sofa, КПК на сиденье.
 * Спинка к стене, сиденье в комнату, чуть вправо по Y.
 */
import { useLoop } from '@tresjs/core'
import { Euler, Object3D, Quaternion } from 'three'
import { stashHold } from '~/composables/useStashCamera'

const sofaSrc = '/models/old-sofa/scene.gltf'
const sofaH = 0.90

const props = defineProps<{
  innerRightX: number
  innerFrontZ: number
}>()

const seatW = 0.7
const seatD = 0.64
const seatT = 0.13
const seatY = 0.42
const armW = 0.17
const armOverhang = 0.07
const armD = seatD + armOverhang
const backH = 0.72
const wallGap = 0.43
const yaw = Math.PI / 2 - 18 * Math.PI / 180

const overallW = seatW + armW * 2
const armX = seatW / 2 + armW / 2
const armZ = -armOverhang / 2
const armFrontZ = armZ - armD / 2
const chairBackZ = seatD / 2

const cosY = Math.cos(yaw)
const sinY = Math.sin(yaw)
const rotateXZ = (x: number, z: number) => ({
  x: x * cosY + z * sinY,
  z: -x * sinY + z * cosY,
})

const footprint = [
  rotateXZ(overallW / 2, chairBackZ),
  rotateXZ(-overallW / 2, chairBackZ),
  rotateXZ(overallW / 2, armFrontZ),
  rotateXZ(-overallW / 2, armFrontZ),
]
const originX = props.innerRightX - wallGap - Math.max(...footprint.map(p => p.x))
const originZ = props.innerFrontZ - 0.72

const pdaSeatX = (armX + 0.18) / 2
const pdaSeatZ = (armFrontZ + 0.1 - 0.08) / 2
const pdaY = 0.38 - 0.15 + 0.13 - 0.02
const pdaAlong = 0.15
const pdaForward = 0.08
const pdaFromCam = 0.10 + 0.05
const pdaLeft = 0.05
const pdaYawRight = -27 * Math.PI / 180

const hoverW = overallW + 0.04
const hoverH = seatY + seatT / 2 + backH + 0.02
const hoverD = armD + 0.05
const hoverY = hoverH / 2

const { glow, onPointerEnter, onPointerLeave } = useStashAnchor('armchair')

const emit = defineEmits<{
  select: []
}>()

const restLocal = rotateXZ(pdaSeatX, pdaSeatZ)
const restWorldPos: [number, number, number] = [
  originX + restLocal.x - pdaLeft,
  pdaY,
  originZ + restLocal.z - pdaAlong + pdaForward - pdaFromCam,
]
const restWorldYaw = yaw + pdaYawRight
const restQuat = new Quaternion().setFromEuler(new Euler(0, restWorldYaw, 0))
const holdQuat = new Quaternion()
const dummy = new Object3D()

const pdaQuat = ref<[number, number, number, number]>([
  restQuat.x,
  restQuat.y,
  restQuat.z,
  restQuat.w,
])
const pdaPos = ref<[number, number, number]>([...restWorldPos])
const pdaScale = ref(1)
const { onBeforeRender } = useLoop()
onBeforeRender(() => {
  const h = stashHold.value
  const k = h.id === 'armchair' ? h.lift : 0
  pdaPos.value = [
    restWorldPos[0] + (h.x - restWorldPos[0]) * k,
    restWorldPos[1] + (h.y - restWorldPos[1]) * k,
    restWorldPos[2] + (h.z - restWorldPos[2]) * k,
  ]
  pdaScale.value = 1 + (h.scale - 1) * k
  if (k < 0.001) {
    pdaQuat.value = [restQuat.x, restQuat.y, restQuat.z, restQuat.w]
    return
  }
  dummy.position.set(pdaPos.value[0], pdaPos.value[1], pdaPos.value[2])
  dummy.up.set(0, 1, 0)
  dummy.lookAt(h.camX, h.camY, h.camZ)
  dummy.rotateX(Math.PI / 2)
  dummy.rotateY(Math.PI / 2)
  holdQuat.copy(dummy.quaternion)
  const q = restQuat.clone().slerp(holdQuat, k)
  pdaQuat.value = [q.x, q.y, q.z, q.w]
})
</script>

<template>
  <TresGroup>
    <TresGroup :position="[originX, 0, originZ]" :rotation="[0, yaw, 0]">
    <TresMesh
      :position="[0, hoverY, armZ]"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
      @click="emit('select')"
    >
      <TresBoxGeometry :args="[hoverW, hoverH, hoverD]" />
      <TresMeshBasicMaterial :transparent="true" :opacity="0" :depth-write="false" />
    </TresMesh>
    <StashSofaCandidate :src="sofaSrc" :height="sofaH" />
    </TresGroup>

    <TresGroup
      :position="pdaPos"
      :quaternion="pdaQuat"
      :scale="[pdaScale, pdaScale, pdaScale]"
      @click="emit('select')"
    >
      <StashPda :glow="glow" />
    </TresGroup>
  </TresGroup>
</template>
