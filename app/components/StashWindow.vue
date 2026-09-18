<script setup lang="ts">
/**
 * Рама тоньше стены в 2.5 раза, утоплена от внутреннего края — виден откос.
 * Форточка — отдельная группа вокруг петли, приоткрыта внутрь.
 */
const props = defineProps<{
  wallX: number
  wallThickness: number
  opening: {
    width: number
    height: number
    sill: number
    z: number
  }
}>()

const profile = 0.07
const mullionW = 0.05
const ventGlassH = 0.3
const glassT = 0.012
const leafProfile = 0.032
const innerReveal = 0.05
const ventAngle = -0.22

const frameDepth = props.wallThickness / 2.5
const wallInnerX = props.wallX + props.wallThickness / 2
const frameX = wallInnerX - innerReveal - frameDepth / 2

const openingMinZ = props.opening.z - props.opening.width / 2
const openingMaxZ = props.opening.z + props.opening.width / 2
const openingMidY = props.opening.sill + props.opening.height / 2
const jambH = props.opening.height - profile * 2
const innerBottom = props.opening.sill + profile
const innerTop = props.opening.sill + props.opening.height - profile
const innerZ0 = openingMinZ + profile
const innerZ1 = openingMaxZ - profile
const mullionZ0 = props.opening.z - mullionW / 2
const mullionZ1 = props.opening.z + mullionW / 2

const rearCellW = mullionZ0 - innerZ0
const rearCellZ = (innerZ0 + mullionZ0) / 2
const frontCellW = innerZ1 - mullionZ1
const frontCellZ = (mullionZ1 + innerZ1) / 2

const ventBarY = innerTop - ventGlassH - profile / 2
const ventGlassY = innerTop - ventGlassH / 2
const lowerTop = innerTop - ventGlassH - profile
const lowerH = lowerTop - innerBottom
const lowerY = innerBottom + lowerH / 2
const frontGlassH = innerTop - innerBottom
const frontGlassY = innerBottom + frontGlassH / 2

const leafGap = 0.008
const leafW = rearCellW - leafGap * 2
const leafH = ventGlassH - leafGap * 2
const hingeZ = mullionZ0 - leafGap
const leafGlassW = leafW - leafProfile * 2
const leafGlassH = leafH - leafProfile * 2
const leafJambH = leafH - leafProfile * 2

const outsideX = props.wallX - props.wallThickness / 2 - 1.1
const skyRotY = Math.PI / 2
</script>

<template>
  <TresMesh :position="[outsideX, 1.45, opening.z]" :rotation="[0, skyRotY, 0]">
    <TresPlaneGeometry :args="[10, 7]" />
    <TresMeshBasicMaterial color="#4a5560" />
  </TresMesh>

  <TresMesh :position="[frameX, opening.sill + profile / 2, opening.z]">
    <TresBoxGeometry :args="[frameDepth, profile, opening.width]" />
    <TresMeshStandardMaterial color="#2a2621" :roughness="1" :metalness="0" />
  </TresMesh>
  <TresMesh :position="[frameX, opening.sill + opening.height - profile / 2, opening.z]">
    <TresBoxGeometry :args="[frameDepth, profile, opening.width]" />
    <TresMeshStandardMaterial color="#2a2621" :roughness="1" :metalness="0" />
  </TresMesh>
  <TresMesh :position="[frameX, openingMidY, openingMinZ + profile / 2]">
    <TresBoxGeometry :args="[frameDepth, jambH, profile]" />
    <TresMeshStandardMaterial color="#2a2621" :roughness="1" :metalness="0" />
  </TresMesh>
  <TresMesh :position="[frameX, openingMidY, openingMaxZ - profile / 2]">
    <TresBoxGeometry :args="[frameDepth, jambH, profile]" />
    <TresMeshStandardMaterial color="#2a2621" :roughness="1" :metalness="0" />
  </TresMesh>
  <TresMesh :position="[frameX, openingMidY, opening.z]">
    <TresBoxGeometry :args="[frameDepth, jambH, mullionW]" />
    <TresMeshStandardMaterial color="#2a2621" :roughness="1" :metalness="0" />
  </TresMesh>
  <TresMesh :position="[frameX, ventBarY, rearCellZ]">
    <TresBoxGeometry :args="[frameDepth, profile, rearCellW]" />
    <TresMeshStandardMaterial color="#2a2621" :roughness="1" :metalness="0" />
  </TresMesh>

  <TresMesh :position="[frameX, lowerY, rearCellZ]">
    <TresBoxGeometry :args="[glassT, lowerH, rearCellW]" />
    <TresMeshStandardMaterial
      color="#8aa8b8"
      :transparent="true"
      :opacity="0.32"
      :roughness="0.12"
      :metalness="0"
      :depth-write="false"
    />
  </TresMesh>
  <TresMesh :position="[frameX, frontGlassY, frontCellZ]">
    <TresBoxGeometry :args="[glassT, frontGlassH, frontCellW]" />
    <TresMeshStandardMaterial
      color="#8aa8b8"
      :transparent="true"
      :opacity="0.32"
      :roughness="0.12"
      :metalness="0"
      :depth-write="false"
    />
  </TresMesh>

  <!-- Петля на средней стойке: позже сюда же покачивание от ветра -->
  <TresGroup :position="[frameX, ventGlassY, hingeZ]" :rotation="[0, ventAngle, 0]">
    <TresMesh :position="[0, -leafH / 2 + leafProfile / 2, -leafW / 2]">
      <TresBoxGeometry :args="[frameDepth, leafProfile, leafW]" />
      <TresMeshStandardMaterial color="#2a2621" :roughness="1" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[0, leafH / 2 - leafProfile / 2, -leafW / 2]">
      <TresBoxGeometry :args="[frameDepth, leafProfile, leafW]" />
      <TresMeshStandardMaterial color="#2a2621" :roughness="1" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[0, 0, -leafProfile / 2]">
      <TresBoxGeometry :args="[frameDepth, leafJambH, leafProfile]" />
      <TresMeshStandardMaterial color="#2a2621" :roughness="1" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[0, 0, -leafW + leafProfile / 2]">
      <TresBoxGeometry :args="[frameDepth, leafJambH, leafProfile]" />
      <TresMeshStandardMaterial color="#2a2621" :roughness="1" :metalness="0" />
    </TresMesh>
    <TresMesh :position="[0, 0, -leafW / 2]">
      <TresBoxGeometry :args="[glassT, leafGlassH, leafGlassW]" />
      <TresMeshStandardMaterial
        color="#8aa8b8"
        :transparent="true"
        :opacity="0.32"
        :roughness="0.12"
        :metalness="0"
        :depth-write="false"
      />
    </TresMesh>
  </TresGroup>
</template>
