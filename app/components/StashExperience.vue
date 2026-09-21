<script setup lang="ts">
/**
 * Graybox схрона.
 *
 * Three.js: Y — вверх, камера по умолчанию смотрит в −Z.
 * Открытая сторона (четвёртая стена) — +Z, там стоим мы.
 * Размеры в метрах. Позиция меша — центр бокса, не угол.
 */
const room = {
  width: 6.2,
  depth: 3.4,
  height: 2.7,
  wall: 0.24,
}

const floorY = -room.wall / 2
const ceilingY = room.height + room.wall / 2
const wallY = room.height / 2
const backZ = -(room.depth / 2) + room.wall / 2
const leftX = -(room.width / 2) + room.wall / 2
const rightX = room.width / 2 - room.wall / 2

// Проём в левой стене. Рама — отдельный StashWindow.
const opening = {
  width: 1.35,
  height: 1.15,
  sill: 1.05,
  z: -0.15,
}

const openingMinZ = opening.z - opening.width / 2
const openingMaxZ = opening.z + opening.width / 2
const openingTop = opening.sill + opening.height
const wallTopH = room.height - openingTop
const wallBackD = openingMinZ - (-room.depth / 2)
const wallFrontD = room.depth / 2 - openingMaxZ

const cameraPosition: [number, number, number] = [
  0,
  1.7,
  room.depth / 2 + 0.95,
]

const innerBackZ = -(room.depth / 2) + room.wall
const innerLeftX = -(room.width / 2) + room.wall
const innerRightX = room.width / 2 - room.wall
const innerFrontZ = room.depth / 2

const homeLookAt: [number, number, number] = [0, 1.15, 0]
const { position, lookAt, goTo } = useStashCamera(cameraPosition, homeLookAt)
</script>

<template>
  <TresPerspectiveCamera
    :position="position"
    :look-at="lookAt"
    :fov="56"
  />

  <TresAmbientLight :intensity="0.45" />
  <TresDirectionalLight
    :position="[-6, 3.2, 0.4]"
    :intensity="1.2"
  />

  <!-- Пол: тонкий бокс, верхняя грань на y = 0 -->
  <TresMesh :position="[0, floorY, 0]">
    <TresBoxGeometry :args="[room.width, room.wall, room.depth]" />
    <TresMeshStandardMaterial color="#4a4a4a" :roughness="1" :metalness="0" />
  </TresMesh>

  <!-- Потолок -->
  <TresMesh :position="[0, ceilingY, 0]">
    <TresBoxGeometry :args="[room.width, room.wall, room.depth]" />
    <TresMeshStandardMaterial color="#2f2f2f" :roughness="1" :metalness="0" />
  </TresMesh>

  <!-- Задняя стена (−Z) -->
  <TresMesh :position="[0, wallY, backZ]">
    <TresBoxGeometry :args="[room.width, room.height, room.wall]" />
    <TresMeshStandardMaterial color="#6a6a6a" :roughness="1" :metalness="0" />
  </TresMesh>

  <!-- Левая стена (−X): четыре ящика вокруг проёма, дырку не строим -->
  <TresMesh :position="[leftX, opening.sill / 2, 0]">
    <TresBoxGeometry :args="[room.wall, opening.sill, room.depth]" />
    <TresMeshStandardMaterial color="#5c5c5c" :roughness="1" :metalness="0" />
  </TresMesh>
  <TresMesh :position="[leftX, openingTop + wallTopH / 2, 0]">
    <TresBoxGeometry :args="[room.wall, wallTopH, room.depth]" />
    <TresMeshStandardMaterial color="#5c5c5c" :roughness="1" :metalness="0" />
  </TresMesh>
  <TresMesh :position="[leftX, opening.sill + opening.height / 2, -room.depth / 2 + wallBackD / 2]">
    <TresBoxGeometry :args="[room.wall, opening.height, wallBackD]" />
    <TresMeshStandardMaterial color="#5c5c5c" :roughness="1" :metalness="0" />
  </TresMesh>
  <TresMesh :position="[leftX, opening.sill + opening.height / 2, openingMaxZ + wallFrontD / 2]">
    <TresBoxGeometry :args="[room.wall, opening.height, wallFrontD]" />
    <TresMeshStandardMaterial color="#5c5c5c" :roughness="1" :metalness="0" />
  </TresMesh>

  <StashWindow
    :wall-x="leftX"
    :wall-thickness="room.wall"
    :opening="opening"
  />

  <StashDesk
    :inner-back-z="innerBackZ"
    :inner-left-x="innerLeftX"
    @select="goTo('desk')"
  />

  <StashSideboard
    :inner-back-z="innerBackZ"
    :inner-right-x="innerRightX"
    @select="goTo('sideboard')"
  />

  <StashArmchair
    :inner-right-x="innerRightX"
    :inner-front-z="innerFrontZ"
    @select="goTo('armchair')"
  />

  <!-- Правая стена (+X) -->
  <TresMesh :position="[rightX, wallY, 0]">
    <TresBoxGeometry :args="[room.wall, room.height, room.depth]" />
    <TresMeshStandardMaterial color="#5c5c5c" :roughness="1" :metalness="0" />
  </TresMesh>
</template>
