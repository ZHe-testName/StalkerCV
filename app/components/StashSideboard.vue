<script setup lang="ts">
/**
 * Совковый сервант справа от стола: низ с двумя дверками, верх — открытый короб с полками.
 * Нижний ящик глубже полок — на крышке лежит прибор скилов, криво, ближе к правому краю.
 */
const props = defineProps<{
  innerBackZ: number
  innerRightX: number
}>()

const cabW = 1.48
const hutchD = 0.52
const bodyD = hutchD * 1.5
const cabH = 0.92
const hutchH = 1.32
const board = 0.028
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

const bodyY = cabH / 2
const doorH = cabH - 0.1
const doorW = cabW / 2 - 0.05
const doorY = 0.06 + doorH / 2
const doorZ = bodyD / 2 + doorT / 2
const stileW = 0.03

const hutchY = cabH + hutchH / 2
const hutchZ = -bodyD / 2 + hutchD / 2
const hutchInnerH = hutchH - board
const shelf1Y = cabH + hutchInnerH / 3
const shelf2Y = cabH + (hutchInnerH * 2) / 3
const shelfZ = -bodyD / 2 + (hutchD + board) / 2

const deviceW = 0.26
const deviceH = 0.13
const deviceD = 0.2
const deviceX = -cabW / 2 + 0.22
const deviceY = cabH + deviceH / 2
const deviceZ = 0.18
const deviceYaw = -24 * Math.PI / 180

const hoverW = cabW + 0.03
const hoverH = cabH + hutchH + 0.02
const hoverD = bodyD + 0.03
const hoverY = hoverH / 2

const { glow, onPointerEnter, onPointerLeave } = useStashAnchor()
</script>

<template>
  <TresGroup :position="[originX, 0, originZ]" :rotation="[0, yaw, 0]">
    <TresMesh
      :position="[0, hoverY, 0]"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
    >
      <TresBoxGeometry :args="[hoverW, hoverH, hoverD]" />
      <TresMeshBasicMaterial :transparent="true" :opacity="0" :depth-write="false" />
    </TresMesh>
    <TresMesh :position="[0, bodyY, 0]">
      <TresBoxGeometry :args="[cabW, cabH, bodyD]" />
      <TresMeshStandardMaterial color="#5a3f32" :roughness="1" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[0, 0.025, bodyD / 2 + 0.004]">
      <TresBoxGeometry :args="[cabW - 0.04, 0.05, 0.008]" />
      <TresMeshStandardMaterial color="#4a342a" :roughness="1" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[-doorW / 2 - stileW / 2, doorY, doorZ]">
      <TresBoxGeometry :args="[doorW, doorH, doorT]" />
      <TresMeshStandardMaterial color="#6b4c3c" :roughness="0.95" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[doorW / 2 + stileW / 2, doorY, doorZ]">
      <TresBoxGeometry :args="[doorW, doorH, doorT]" />
      <TresMeshStandardMaterial color="#6b4c3c" :roughness="0.95" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[0, doorY, doorZ + 0.002]">
      <TresBoxGeometry :args="[stileW, doorH, doorT]" />
      <TresMeshStandardMaterial color="#4a342a" :roughness="1" :metalness="0" />
    </TresMesh>

    <TresMesh :position="[0, hutchY, -bodyD / 2 + board / 2]">
      <TresBoxGeometry :args="[cabW, hutchH, board]" />
      <TresMeshStandardMaterial color="#5a3f32" :roughness="1" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[-cabW / 2 + board / 2, hutchY, hutchZ]">
      <TresBoxGeometry :args="[board, hutchH, hutchD]" />
      <TresMeshStandardMaterial color="#5a3f32" :roughness="1" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[cabW / 2 - board / 2, hutchY, hutchZ]">
      <TresBoxGeometry :args="[board, hutchH, hutchD]" />
      <TresMeshStandardMaterial color="#5a3f32" :roughness="1" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[0, cabH + hutchH - board / 2, hutchZ]">
      <TresBoxGeometry :args="[cabW, board, hutchD]" />
      <TresMeshStandardMaterial color="#5a3f32" :roughness="1" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[0, shelf1Y, shelfZ]">
      <TresBoxGeometry :args="[cabW - board * 2, board, hutchD - board]" />
      <TresMeshStandardMaterial color="#6b4c3c" :roughness="1" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[0, shelf2Y, shelfZ]">
      <TresBoxGeometry :args="[cabW - board * 2, board, hutchD - board]" />
      <TresMeshStandardMaterial color="#6b4c3c" :roughness="1" :metalness="0" />
    </TresMesh>

    <TresGroup
      :position="[deviceX, deviceY, deviceZ]"
      :rotation="[0, deviceYaw, 0]"
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
