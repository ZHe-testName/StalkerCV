<script setup lang="ts">
/**
 * Кресло у правой стены: быльца до пола, КПК на дальнем.
 * Спинка к стене, сиденье в комнату, чуть вправо по Y.
 */
import { useLoop } from '@tresjs/core'
import { Euler, Object3D, Quaternion } from 'three'
import { stashHold } from '~/composables/useStashCamera'

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
const armTop = 0.58
const backH = 0.72
const backT = 0.13
const baseH = seatY - seatT / 2
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

const backY = seatY + seatT / 2 + backH / 2
const backZ = seatD / 2 - backT / 2

const pdaW = 0.13
const pdaT = 0.045
const pdaH = 0.16
const pdaY = armTop + pdaH / 2

const hoverW = overallW + 0.04
const hoverH = seatY + seatT / 2 + backH + 0.02
const hoverD = armD + 0.05
const hoverY = hoverH / 2

const { glow, onPointerEnter, onPointerLeave } = useStashAnchor('armchair')

const emit = defineEmits<{
  select: []
}>()

const restLocal = rotateXZ(armX, armFrontZ + 0.1)
const restWorldPos: [number, number, number] = [
  originX + restLocal.x,
  pdaY,
  originZ + restLocal.z,
]
const restWorldYaw = yaw
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
  dummy.rotateY(Math.PI)
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
    <TresMesh :position="[0, baseH / 2, 0.02]">
      <TresBoxGeometry :args="[seatW - 0.04, baseH, seatD - 0.12]" />
      <TresMeshStandardMaterial color="#2c2723" :roughness="1" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[0, seatY, 0]">
      <TresBoxGeometry :args="[seatW, seatT, seatD]" />
      <TresMeshStandardMaterial color="#45362c" :roughness="1" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[0, backY, backZ]">
      <TresBoxGeometry :args="[seatW, backH, backT]" />
      <TresMeshStandardMaterial color="#3d2f26" :roughness="1" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[-armX, armTop / 2, armZ]">
      <TresBoxGeometry :args="[armW, armTop, armD]" />
      <TresMeshStandardMaterial color="#3d2f26" :roughness="1" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[armX, armTop / 2, armZ]">
      <TresBoxGeometry :args="[armW, armTop, armD]" />
      <TresMeshStandardMaterial color="#3d2f26" :roughness="1" :metalness="0" />
    </TresMesh>
    </TresGroup>

    <TresGroup
      :position="pdaPos"
      :quaternion="pdaQuat"
      :scale="[pdaScale, pdaScale, pdaScale]"
    >
      <TresMesh @click="emit('select')">
        <TresBoxGeometry :args="[pdaW, pdaH, pdaT]" />
        <TresMeshStandardMaterial
          color="#5a5e56"
          emissive="#3a4a40"
          :emissive-intensity="glow * 0.2"
          :roughness="0.65"
          :metalness="0.08"
        />
      </TresMesh>
      <TresMesh :position="[0, 0.008, -pdaT / 2 - 0.003]">
        <TresBoxGeometry :args="[pdaW * 0.85, pdaH * 0.62, 0.006]" />
        <TresMeshStandardMaterial
          color="#5ad08a"
          emissive="#7dffb0"
          :emissive-intensity="glow"
          :roughness="0.35"
          :metalness="0"
        />
      </TresMesh>
    </TresGroup>
  </TresGroup>
</template>
