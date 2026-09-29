<script setup lang="ts">
/**
 * Три стены. Микс кирпич/штукатурка по маске.
 * Левая/правая 80/20, дальняя 60/40. Откос окна — только кирпич.
 */
const props = defineProps<{
  room: {
    width: number
    depth: number
    height: number
    wall: number
  }
  opening: {
    width: number
    height: number
    sill: number
    z: number
  }
  backOpening: {
    width: number
    height: number
    sill: number
    x: number
  }
}>()

const leftX = -(props.room.width / 2) + props.room.wall / 2
const rightX = props.room.width / 2 - props.room.wall / 2
const backZ = -(props.room.depth / 2) + props.room.wall / 2
const wallY = props.room.height / 2
const innerLeftX = -(props.room.width / 2) + props.room.wall + 0.001
const innerRightX = props.room.width / 2 - props.room.wall - 0.001
const innerBackZ = -(props.room.depth / 2) + props.room.wall + 0.001
const innerW = props.room.width - props.room.wall * 2
const openingMinZ = props.opening.z - props.opening.width / 2
const openingMaxZ = props.opening.z + props.opening.width / 2
const openingTop = props.opening.sill + props.opening.height
const openingMidY = props.opening.sill + props.opening.height / 2
const wallTopH = props.room.height - openingTop
const wallBackD = openingMinZ - (-props.room.depth / 2)
const wallFrontD = props.room.depth / 2 - openingMaxZ
const leftYaw = Math.PI / 2
const rightYaw = -Math.PI / 2
const wallD = props.room.depth
const wallH = props.room.height

function leftUv(cz: number, cy: number, pw: number, ph: number) {
  return {
    u0: (-pw / 2 - cz + wallD / 2) / wallD,
    u1: (pw / 2 - cz + wallD / 2) / wallD,
    v0: (cy - ph / 2) / wallH,
    v1: (cy + ph / 2) / wallH,
  }
}

const leftPanels = [
  {
    y: props.opening.sill / 2,
    z: 0,
    w: wallD,
    h: props.opening.sill,
    ...leftUv(0, props.opening.sill / 2, wallD, props.opening.sill),
  },
  {
    y: openingTop + wallTopH / 2,
    z: 0,
    w: wallD,
    h: wallTopH,
    ...leftUv(0, openingTop + wallTopH / 2, wallD, wallTopH),
  },
  {
    y: openingMidY,
    z: -wallD / 2 + wallBackD / 2,
    w: wallBackD,
    h: props.opening.height,
    ...leftUv(-wallD / 2 + wallBackD / 2, openingMidY, wallBackD, props.opening.height),
  },
  {
    y: openingMidY,
    z: openingMaxZ + wallFrontD / 2,
    w: wallFrontD,
    h: props.opening.height,
    ...leftUv(openingMaxZ + wallFrontD / 2, openingMidY, wallFrontD, props.opening.height),
  },
]

const backOpeningMinX = props.backOpening.x - props.backOpening.width / 2
const backOpeningMaxX = props.backOpening.x + props.backOpening.width / 2
const backOpeningTop = props.backOpening.sill + props.backOpening.height
const backOpeningMidY = props.backOpening.sill + props.backOpening.height / 2
const backWallTopH = props.room.height - backOpeningTop
const backLeftW = backOpeningMinX - (-props.room.width / 2)
const backRightW = props.room.width / 2 - backOpeningMaxX

function backUv(cx: number, cy: number, pw: number, ph: number) {
  return {
    u0: (cx - pw / 2 + innerW / 2) / innerW,
    u1: (cx + pw / 2 + innerW / 2) / innerW,
    v0: (cy - ph / 2) / wallH,
    v1: (cy + ph / 2) / wallH,
  }
}

const backLeftMixW = backOpeningMinX - innerLeftX
const backRightMixW = innerRightX - backOpeningMaxX
const backLeftMixX = innerLeftX + backLeftMixW / 2
const backRightMixX = backOpeningMaxX + backRightMixW / 2

const backPanels = [
  {
    x: 0,
    y: props.backOpening.sill / 2,
    w: innerW,
    h: props.backOpening.sill,
    ...backUv(0, props.backOpening.sill / 2, innerW, props.backOpening.sill),
  },
  {
    x: 0,
    y: backOpeningTop + backWallTopH / 2,
    w: innerW,
    h: backWallTopH,
    ...backUv(0, backOpeningTop + backWallTopH / 2, innerW, backWallTopH),
  },
  {
    x: backLeftMixX,
    y: backOpeningMidY,
    w: backLeftMixW,
    h: props.backOpening.height,
    ...backUv(backLeftMixX, backOpeningMidY, backLeftMixW, props.backOpening.height),
  },
  {
    x: backRightMixX,
    y: backOpeningMidY,
    w: backRightMixW,
    h: props.backOpening.height,
    ...backUv(backRightMixX, backOpeningMidY, backRightMixW, props.backOpening.height),
  },
]
</script>

<template>
  <TresMesh :position="[leftX, opening.sill / 2, 0]">
    <TresBoxGeometry :args="[room.wall, opening.sill, room.depth]" />
    <TresMeshStandardMaterial color="#b7aa98" :roughness="1" :metalness="0" />
  </TresMesh>
  <TresMesh :position="[leftX, openingTop + wallTopH / 2, 0]">
    <TresBoxGeometry :args="[room.wall, wallTopH, room.depth]" />
    <TresMeshStandardMaterial color="#b7aa98" :roughness="1" :metalness="0" />
  </TresMesh>
  <TresMesh :position="[leftX, openingMidY, -room.depth / 2 + wallBackD / 2]">
    <TresBoxGeometry :args="[room.wall, opening.height, wallBackD]" />
    <TresMeshStandardMaterial color="#b7aa98" :roughness="1" :metalness="0" />
  </TresMesh>
  <TresMesh :position="[leftX, openingMidY, openingMaxZ + wallFrontD / 2]">
    <TresBoxGeometry :args="[room.wall, opening.height, wallFrontD]" />
    <TresMeshStandardMaterial color="#b7aa98" :roughness="1" :metalness="0" />
  </TresMesh>

  <TresMesh :position="[0, backOpening.sill / 2, backZ]">
    <TresBoxGeometry :args="[room.width, backOpening.sill, room.wall]" />
    <TresMeshStandardMaterial color="#b7aa98" :roughness="1" :metalness="0" />
  </TresMesh>
  <TresMesh :position="[0, backOpeningTop + backWallTopH / 2, backZ]">
    <TresBoxGeometry :args="[room.width, backWallTopH, room.wall]" />
    <TresMeshStandardMaterial color="#b7aa98" :roughness="1" :metalness="0" />
  </TresMesh>
  <TresMesh :position="[-room.width / 2 + backLeftW / 2, backOpeningMidY, backZ]">
    <TresBoxGeometry :args="[backLeftW, backOpening.height, room.wall]" />
    <TresMeshStandardMaterial color="#b7aa98" :roughness="1" :metalness="0" />
  </TresMesh>
  <TresMesh :position="[room.width / 2 - backRightW / 2, backOpeningMidY, backZ]">
    <TresBoxGeometry :args="[backRightW, backOpening.height, room.wall]" />
    <TresMeshStandardMaterial color="#b7aa98" :roughness="1" :metalness="0" />
  </TresMesh>
  <TresMesh :position="[rightX, wallY, 0]">
    <TresBoxGeometry :args="[room.wall, room.height, room.depth]" />
    <TresMeshStandardMaterial color="#b7aa98" :roughness="1" :metalness="0" />
  </TresMesh>

  <TresGroup
    v-for="(panel, i) in leftPanels"
    :key="'l' + i"
    :position="[innerLeftX, panel.y, panel.z]"
    :rotation="[0, leftYaw, 0]"
  >
    <StashWallMix
      :width="panel.w"
      :height="panel.h"
      :tile-width="wallD"
      :tile-height="wallH"
      :u0="panel.u0"
      :v0="panel.v0"
      :u1="panel.u1"
      :v1="panel.v1"
      mask-url="/textures/wall-masks/left.80.png"
    />
  </TresGroup>

  <TresGroup :position="[leftX, opening.sill + 0.001, opening.z]" :rotation="[-Math.PI / 2, 0, 0]">
    <StashBrickOnly :width="room.wall" :height="opening.width" />
  </TresGroup>
  <TresGroup :position="[leftX, openingTop - 0.001, opening.z]" :rotation="[Math.PI / 2, 0, 0]">
    <StashBrickOnly :width="room.wall" :height="opening.width" />
  </TresGroup>
  <TresGroup :position="[leftX, openingMidY, openingMinZ + 0.001]">
    <StashBrickOnly :width="room.wall" :height="opening.height" />
  </TresGroup>
  <TresGroup :position="[leftX, openingMidY, openingMaxZ - 0.001]" :rotation="[0, Math.PI, 0]">
    <StashBrickOnly :width="room.wall" :height="opening.height" />
  </TresGroup>

  <TresGroup
    v-for="(panel, i) in backPanels"
    :key="'b' + i"
    :position="[panel.x, panel.y, innerBackZ]"
  >
    <StashWallMix
      :width="panel.w"
      :height="panel.h"
      :tile-width="innerW"
      :tile-height="wallH"
      :u0="panel.u0"
      :v0="panel.v0"
      :u1="panel.u1"
      :v1="panel.v1"
      mask-url="/textures/wall-masks/back.60.png"
    />
  </TresGroup>

  <TresGroup :position="[backOpening.x, backOpening.sill + 0.001, backZ]" :rotation="[-Math.PI / 2, 0, 0]">
    <StashBrickOnly :width="backOpening.width" :height="room.wall" />
  </TresGroup>
  <TresGroup :position="[backOpening.x, backOpeningTop - 0.001, backZ]" :rotation="[Math.PI / 2, 0, 0]">
    <StashBrickOnly :width="backOpening.width" :height="room.wall" />
  </TresGroup>
  <TresGroup :position="[backOpeningMinX + 0.001, backOpeningMidY, backZ]" :rotation="[0, -Math.PI / 2, 0]">
    <StashBrickOnly :width="room.wall" :height="backOpening.height" />
  </TresGroup>
  <TresGroup :position="[backOpeningMaxX - 0.001, backOpeningMidY, backZ]" :rotation="[0, Math.PI / 2, 0]">
    <StashBrickOnly :width="room.wall" :height="backOpening.height" />
  </TresGroup>
  <TresGroup :position="[innerRightX, wallY, 0]" :rotation="[0, rightYaw, 0]">
    <StashWallMix
      :width="room.depth"
      :height="room.height"
      mask-url="/textures/wall-masks/right.80.png"
    />
  </TresGroup>
</template>
