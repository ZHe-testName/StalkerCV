<script setup lang="ts">
/**
 * Graybox схрона.
 *
 * Three.js: Y — вверх, камера по умолчанию смотрит в −Z.
 * Открытая сторона (четвёртая стена) — +Z, там стоим мы.
 * Размеры в метрах. Позиция меша — центр бокса, не угол.
 */
import { DirectionalLight } from 'three'

const room = {
  width: 6.2,
  depth: 3.4,
  height: 2.7,
  wall: 0.24,
}

const floorY = -room.wall / 2
const ceilingY = room.height + room.wall / 2
const leftX = -(room.width / 2) + room.wall / 2

// Проёмы: рамы — StashBrokenWindow (06 слева, 05 на дальней).
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
const backZ = -(room.depth / 2) + room.wall / 2
const backOpening = {
  width: opening.width,
  height: opening.height,
  sill: opening.sill + 0.10,
  x: innerRightX - 1.0 - opening.width / 2,
}

const homeLookAt: [number, number, number] = [0, 1.15, 0]
const { position, lookAt, goTo } = useStashCamera(cameraPosition, homeLookAt)

const lampSrc = '/models/wooden-floor-lamp/scene.gltf'
const lampX = innerRightX - 0.30 - 0.10
const lampZ = 0.18 - 0.30 - 0.10
const lampH = 1.55

const carpetSrc = '/models/carpet/scene.gltf'
const carpetLong = 1.55 * 1.3 * 1.2
const carpetZ = 0.845 - 1.2 + 0.50

const ammoSrc = '/models/ammobox/scene.gltf'
const ammoH = 0.30
const ammoZ = opening.z + 0.25 + 0.20

const iconSrc = '/models/stalker-icon/scene.gltf'
const iconH = 0.36
const iconTop = opening.sill + opening.height - 0.15
const iconZ = (opening.z - opening.width / 2 + innerBackZ) / 2

const posterSrc = '/models/cosmonaut-poster/scene.gltf'
const posterH = 0.48
const posterTop = backOpening.sill + backOpening.height - 0.20
const posterPierL = backOpening.x + backOpening.width / 2
const posterX = (posterPierL + innerRightX) / 2 - 0.08

const sillSrc = '/models/windowsill-a1/scene.gltf'
const backSillSrc = '/models/windowsill-a2/scene.gltf'
const floorCarpetSrc = '/models/old-persian-carpet/scene.gltf'
const floorCarpetLong = 2.2 * 1.2
const floorCarpetX = 0.45
const floorCarpetZ = 0.98 - 0.40

// Directional у окон: 0.1 м снаружи, луч −35° вниз. Карта теней 512.
// Карту/frustum в конструкторе: Tres pierced `shadow-map-size-*` ломается о shadow.map === null.
const sunColor = '#efe6c2'
const sunIntensity = 1.4
const ambientIntensity = 0.24
const sunPitchDeg = 35
const sunOutside = 0.1
const sunShadowMap = 512
const sunShadowFrustum = 4

function makeWindowSun(
  pos: [number, number, number],
  aimX: number,
  aimZ: number,
  pitchDeg = sunPitchDeg,
) {
  const dx = aimX - pos[0]
  const dz = aimZ - pos[2]
  const horiz = Math.hypot(dx, dz)
  const aimY = pos[1] - horiz * Math.tan((pitchDeg * Math.PI) / 180)
  const light = new DirectionalLight(sunColor, sunIntensity)
  light.position.set(...pos)
  light.target.position.set(aimX, aimY, aimZ)
  light.castShadow = true
  light.shadow.mapSize.set(sunShadowMap, sunShadowMap)
  light.shadow.bias = -0.0002
  light.shadow.normalBias = 0.02
  light.shadow.camera.near = 0.3
  light.shadow.camera.far = 14
  light.shadow.camera.left = -sunShadowFrustum
  light.shadow.camera.right = sunShadowFrustum
  light.shadow.camera.top = sunShadowFrustum
  light.shadow.camera.bottom = -sunShadowFrustum
  light.shadow.camera.updateProjectionMatrix()
  return light
}

const sunLeft = makeWindowSun(
  [-(room.width / 2) - sunOutside, opening.sill + opening.height / 2, opening.z],
  1.8,
  opening.z + 0.2,
)
const sunBack = makeWindowSun(
  [
    backOpening.x,
    backOpening.sill + backOpening.height / 2 - 0.20,
    -(room.depth / 2) - sunOutside,
  ],
  backOpening.x,
  1.2,
  30,
)
</script>

<template>
  <TresPerspectiveCamera
    :position="position"
    :look-at="lookAt"
    :fov="56"
  />

  <TresAmbientLight :color="sunColor" :intensity="ambientIntensity" />
  <primitive :object="sunLeft" />
  <primitive :object="sunLeft.target" />
  <primitive :object="sunBack" />
  <primitive :object="sunBack.target" />

  <!-- Пол: тонкий бокс, верхняя грань на y = 0 -->
  <TresMesh :position="[0, floorY, 0]" :receive-shadow="true">
    <TresBoxGeometry :args="[room.width, room.wall, room.depth]" />
    <TresMeshStandardMaterial color="#3a2e24" :roughness="1" :metalness="0" />
  </TresMesh>
  <StashFloor :width="room.width" :depth="room.depth" />

  <!-- Потолок: плита + карта. Cast — не прозрачен для directional. -->
  <TresMesh :position="[0, ceilingY, 0]" :cast-shadow="true">
    <TresBoxGeometry :args="[room.width, room.wall, room.depth]" />
    <TresMeshStandardMaterial color="#2f2f2f" :roughness="1" :metalness="0" />
  </TresMesh>
  <StashCeiling :width="room.width" :depth="room.depth" :height="room.height" />

  <StashWalls :room="room" :opening="opening" :back-opening="backOpening" />

  <TresMesh
    :position="[leftX - room.wall / 2 - 1.1, 1.45, opening.z]"
    :rotation="[0, Math.PI / 2, 0]"
  >
    <TresPlaneGeometry :args="[10, 7]" />
    <TresMeshBasicMaterial color="#4a5560" />
  </TresMesh>
  <StashBrokenWindow
    src="/models/broken-window-06/scene.gltf"
    :wall-x="leftX"
    :opening="opening"
  />
  <StashWindowsill
    :src="sillSrc"
    :wall-x="innerLeftX"
    :sill-y="opening.sill + 0.04"
    :z="opening.z"
    :length="opening.width"
  />
  <TresMesh :position="[backOpening.x, 1.45, backZ - room.wall / 2 - 1.1]">
    <TresPlaneGeometry :args="[10, 7]" />
    <TresMeshBasicMaterial color="#4a5560" />
  </TresMesh>
  <StashBrokenWindow
    src="/models/broken-window-05/scene.gltf"
    facing="back"
    fit-sash
    :wall-z="backZ"
    :opening="backOpening"
  />
  <StashWindowsill
    :src="backSillSrc"
    facing="back"
    :wall-z="innerBackZ"
    :x="backOpening.x"
    :sill-y="backOpening.sill + 0.04"
    :length="backOpening.width"
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

  <StashFloorCarpet
    :src="floorCarpetSrc"
    :long="floorCarpetLong"
    :x="floorCarpetX"
    :z="floorCarpetZ"
  />

  <StashArmchair
    :inner-right-x="innerRightX"
    :inner-front-z="innerFrontZ"
    @select="goTo('armchair')"
  />

  <TresGroup :position="[lampX, 0, lampZ]">
    <StashFloorLamp :src="lampSrc" :height="lampH" />
  </TresGroup>

  <StashWallCarpet
    :src="carpetSrc"
    :long="carpetLong"
    :wall-x="innerRightX"
    :z="carpetZ"
    :room-height="room.height"
    :from-ceiling="0.40"
  />

  <StashAmmoBox
    :src="ammoSrc"
    :height="ammoH"
    :wall-x="innerLeftX"
    :z="ammoZ"
  />

  <StashWallIcon
    :src="iconSrc"
    :height="iconH"
    :wall-x="innerLeftX"
    :z="iconZ"
    :top="iconTop"
  />

  <StashCosmonautPoster
    :src="posterSrc"
    :height="posterH"
    :wall-z="innerBackZ"
    :x="posterX"
    :top="posterTop"
  />
</template>
