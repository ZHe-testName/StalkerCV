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
const leftX = -(room.width / 2) + room.wall / 2

// Проём в левой стене. Рама — отдельный StashWindow.
const opening = {
  width: 1.35,
  height: 1.15,
  sill: 1.05,
  z: -0.15,
}

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

const lampSrc = '/models/wooden-floor-lamp/scene.gltf'
const lampX = innerRightX - 0.30 - 0.10
const lampZ = 0.18 - 0.30 - 0.10
const lampH = 1.55
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
    <TresMeshStandardMaterial color="#3a2e24" :roughness="1" :metalness="0" />
  </TresMesh>
  <StashFloor :width="room.width" :depth="room.depth" />

  <!-- Потолок -->
  <TresMesh :position="[0, ceilingY, 0]">
    <TresBoxGeometry :args="[room.width, room.wall, room.depth]" />
    <TresMeshStandardMaterial color="#2f2f2f" :roughness="1" :metalness="0" />
  </TresMesh>

  <StashWalls :room="room" :opening="opening" />

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

  <TresGroup :position="[lampX, 0, lampZ]">
    <StashFloorLamp :src="lampSrc" :height="lampH" />
  </TresGroup>
</template>
