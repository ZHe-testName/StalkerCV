<script setup lang="ts">
/**
 * Стол у дальней стены слева: столешница, ЭЛТ, системник, лампа, клавиатура, стул.
 * Локально стол смотрит в +Z (к проёму), спиной к дальней стене.
 */
const props = defineProps<{
  innerBackZ: number
  innerLeftX: number
}>()

const tableW = 1.85
const tableD = 1.12
const tableH = 0.84
const topT = 0.055
const leg = 0.04
const wallGap = 0.28

const originX = props.innerLeftX + wallGap + tableW / 2
const originZ = props.innerBackZ + tableD / 2
const topY = tableH - topT / 2
const legH = tableH - topT
const legY = legH / 2
const legInset = 0.07
const legX = tableW / 2 - legInset
const legZ = tableD / 2 - legInset

const monitorW = 0.52
const monitorH = 0.42
const monitorD = 0.4
const monitorY = tableH + monitorH / 2
const monitorX = -tableW / 2 + 0.1 + monitorW / 2
const monitorZ = -tableD / 2 + 0.1 + monitorD / 2
const screenW = 0.4
const screenH = 0.3
const screenT = 0.014
const monitorAngle = 14 * Math.PI / 180

const caseW = 0.28
const caseH = 0.56
const caseD = 0.58
const caseY = tableH + caseH / 2
const caseX = monitorX + monitorW / 2 + 0.22 + caseW / 2
const caseZ = -tableD / 2 + 0.08 + caseD / 2

const lampX = (caseX + caseW / 2 + tableW / 2) / 2
const lampZ = 0
const lampYaw = Math.PI / 2
const shadeRotX = Math.PI / 2

const keyW = 0.46
const keyH = 0.04
const keyD = 0.17
const keyY = tableH + keyH / 2
const keyX = monitorX
const keyZ = tableD / 2 - keyD / 2 - 0.11
const keyAngle = 15 * Math.PI / 180

const chairAngle = -Math.PI / 6
const chairX = monitorX + 0.22
const chairZ = tableD / 2 + 0.04
const seatY = 0.5
const seatT = 0.06
const seatW = 0.48
const seatD = 0.48
const backH = 0.5
const backT = 0.06
const chairLeg = 0.045
const chairLegH = seatY - seatT / 2

const hoverW = tableW + 0.04
const hoverH = tableH + caseH + 0.02
const hoverD = tableD + seatD * 0.5
const hoverY = hoverH / 2
const hoverZ = 0.1

const { glow, onPointerEnter, onPointerLeave } = useStashAnchor()
</script>

<template>
  <TresGroup :position="[originX, 0, originZ]">
    <TresMesh
      :position="[0, hoverY, hoverZ]"
      @pointerenter="onPointerEnter"
      @pointerleave="onPointerLeave"
    >
      <TresBoxGeometry :args="[hoverW, hoverH, hoverD]" />
      <TresMeshBasicMaterial :transparent="true" :opacity="0" :depth-write="false" />
    </TresMesh>
    <TresMesh :position="[0, topY, 0]">
      <TresBoxGeometry :args="[tableW, topT, tableD]" />
      <TresMeshStandardMaterial color="#6a5a48" :roughness="1" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[-legX, legY, -legZ]">
      <TresBoxGeometry :args="[leg, legH, leg]" />
      <TresMeshStandardMaterial color="#4e4438" :roughness="1" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[legX, legY, -legZ]">
      <TresBoxGeometry :args="[leg, legH, leg]" />
      <TresMeshStandardMaterial color="#4e4438" :roughness="1" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[-legX, legY, legZ]">
      <TresBoxGeometry :args="[leg, legH, leg]" />
      <TresMeshStandardMaterial color="#4e4438" :roughness="1" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[legX, legY, legZ]">
      <TresBoxGeometry :args="[leg, legH, leg]" />
      <TresMeshStandardMaterial color="#4e4438" :roughness="1" :metalness="0" />
    </TresMesh>

    <TresGroup :position="[monitorX, monitorY, monitorZ]" :rotation="[0, monitorAngle, 0]">
      <TresMesh>
        <TresBoxGeometry :args="[monitorW, monitorH, monitorD]" />
        <TresMeshStandardMaterial color="#b7b3a8" :roughness="0.85" :metalness="0" />
      </TresMesh>
      <TresMesh :position="[0, 0, monitorD / 2 + screenT / 2]">
        <TresBoxGeometry :args="[screenW, screenH, screenT]" />
        <TresMeshStandardMaterial
          color="#1a1c1e"
          emissive="#7ecf9a"
          :emissive-intensity="glow"
          :roughness="0.4"
          :metalness="0"
        />
      </TresMesh>
    </TresGroup>

    <TresMesh :position="[caseX, caseY, caseZ]">
      <TresBoxGeometry :args="[caseW, caseH, caseD]" />
      <TresMeshStandardMaterial color="#b7b3a8" :roughness="0.85" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[caseX, caseY, caseZ + caseD / 2 + 0.006]">
      <TresBoxGeometry :args="[caseW * 0.72, caseH * 0.72, 0.012]" />
      <TresMeshStandardMaterial color="#3a3a3a" :roughness="0.9" :metalness="0" />
    </TresMesh>

    <TresMesh :position="[lampX, tableH + 0.015, lampZ]">
      <TresCylinderGeometry :args="[0.055, 0.055, 0.03, 10]" />
      <TresMeshStandardMaterial color="#3f3d3a" :roughness="0.85" :metalness="0.05" />
    </TresMesh>
    <TresMesh :position="[lampX, tableH + 0.2, lampZ]">
      <TresCylinderGeometry :args="[0.012, 0.012, 0.38, 8]" />
      <TresMeshStandardMaterial color="#3f3d3a" :roughness="0.85" :metalness="0.05" />
    </TresMesh>
    <TresGroup
      :position="[lampX, tableH + 0.42, lampZ]"
      :rotation="[0, lampYaw, 0]"
    >
      <TresMesh :rotation="[shadeRotX, 0, 0]">
        <TresCylinderGeometry :args="[0.028, 0.09, 0.11, 10]" />
        <TresMeshStandardMaterial color="#c4bba8" :roughness="0.9" :metalness="0" />
      </TresMesh>
    </TresGroup>

    <TresMesh :position="[keyX, keyY, keyZ]" :rotation="[0, keyAngle, 0]">
      <TresBoxGeometry :args="[keyW, keyH, keyD]" />
      <TresMeshStandardMaterial color="#9c9890" :roughness="0.9" :metalness="0" />
    </TresMesh>

    <TresGroup :position="[chairX, 0, chairZ]" :rotation="[0, chairAngle, 0]">
      <TresMesh :position="[0, seatY, 0]">
        <TresBoxGeometry :args="[seatW, seatT, seatD]" />
        <TresMeshStandardMaterial color="#4a4742" :roughness="1" :metalness="0" />
      </TresMesh>
      <TresMesh :position="[0, seatY + seatT / 2 + backH / 2, seatD / 2 - backT / 2]">
        <TresBoxGeometry :args="[seatW, backH, backT]" />
        <TresMeshStandardMaterial color="#4a4742" :roughness="1" :metalness="0" />
      </TresMesh>
      <TresMesh :position="[-seatW / 2 + chairLeg, chairLegH / 2, -seatD / 2 + chairLeg]">
        <TresBoxGeometry :args="[chairLeg, chairLegH, chairLeg]" />
        <TresMeshStandardMaterial color="#3a3733" :roughness="1" :metalness="0" />
      </TresMesh>
      <TresMesh :position="[seatW / 2 - chairLeg, chairLegH / 2, -seatD / 2 + chairLeg]">
        <TresBoxGeometry :args="[chairLeg, chairLegH, chairLeg]" />
        <TresMeshStandardMaterial color="#3a3733" :roughness="1" :metalness="0" />
      </TresMesh>
      <TresMesh :position="[-seatW / 2 + chairLeg, chairLegH / 2, seatD / 2 - chairLeg]">
        <TresBoxGeometry :args="[chairLeg, chairLegH, chairLeg]" />
        <TresMeshStandardMaterial color="#3a3733" :roughness="1" :metalness="0" />
      </TresMesh>
      <TresMesh :position="[seatW / 2 - chairLeg, chairLegH / 2, seatD / 2 - chairLeg]">
        <TresBoxGeometry :args="[chairLeg, chairLegH, chairLeg]" />
        <TresMeshStandardMaterial color="#3a3733" :roughness="1" :metalness="0" />
      </TresMesh>
    </TresGroup>
  </TresGroup>
</template>
