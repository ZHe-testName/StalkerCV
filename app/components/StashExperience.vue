<script setup lang="ts">
/**
 * Graybox схрона.
 *
 * Three.js: Y — вверх, камера по умолчанию смотрит в −Z.
 * Открытая сторона (четвёртая стена) — +Z, там стоим мы.
 * Размеры в метрах. Позиция меша — центр бокса, не угол.
 */
import { BoxGeometry, DirectionalLight, Mesh, MeshStandardMaterial } from 'three'
import { useLoop } from '@tresjs/core'

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

// Имя/роль: простенок дальняя стена между левым углом и окном (canvas + stashCopy).
const titlePierR = backOpening.x - backOpening.width / 2
const titleW = 1.55 * 2 * 1.2
const titleH = 0.52 * 2 * 1.2
const titleX = (innerLeftX + titlePierR) / 2 - 0.40
const titleY = 1.78 + 0.30
// Влево по Z (на стене) = +Z.
const titleRoll = (12 * Math.PI) / 180

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
const ambientIntensity = 0.3
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
  // Свет и кастеры статичны — не гоняем depth-pass каждый кадр.
  light.shadow.autoUpdate = false
  light.shadow.needsUpdate = true
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

/** После подгрузки моделей — несколько кадров bake теней, потом карты заморожены. */
const { filesReady } = useStashBootLoad()
const sceneOpen = inject<Ref<boolean>>('stashSceneOpen', ref(false))
let shadowBakeLeft = 0
function requestShadowBake(frames = 16) {
  shadowBakeLeft = Math.max(shadowBakeLeft, frames)
}
watch(filesReady, (ready) => {
  if (ready) {
    requestShadowBake(16)
  }
}, { immediate: true })
watch(sceneOpen, (open) => {
  if (open) {
    requestShadowBake(8)
  }
})

const { onBeforeRender } = useLoop()
onBeforeRender(() => {
  if (shadowBakeLeft <= 0) {
    return
  }
  sunLeft.shadow.needsUpdate = true
  shadowBakeLeft -= 1
})

// Потолок-окклюдер: cast в конструкторе (Tres :cast-shadow на плите иногда не цеплялся к bake).
const ceilingSlab = new Mesh(
  new BoxGeometry(room.width, room.wall, room.depth),
  new MeshStandardMaterial({ color: '#2f2f2f', roughness: 1, metalness: 0 }),
)
ceilingSlab.position.set(0, ceilingY, 0)
ceilingSlab.castShadow = true
ceilingSlab.receiveShadow = false
</script>

<template>
  <TresPerspectiveCamera
    :position="position"
    :look-at="lookAt"
    :fov="56"
    :near="0.1"
    :far="80"
  />

  <TresAmbientLight :color="sunColor" :intensity="ambientIntensity" />
  <primitive :object="sunLeft" />
  <primitive :object="sunLeft.target" />

  <!-- Пол: тонкий бокс, верхняя грань на y = 0 -->
  <TresMesh :position="[0, floorY, 0]" :receive-shadow="true">
    <TresBoxGeometry :args="[room.width, room.wall, room.depth]" />
    <TresMeshStandardMaterial color="#3a2e24" :roughness="1" :metalness="0" />
  </TresMesh>
  <StashFloor :width="room.width" :depth="room.depth" />

  <!-- Потолок: окклюдер + карта (оба кастят — свет сверху не льёт мимо проёмов). -->
  <primitive :object="ceilingSlab" />
  <StashCeiling :width="room.width" :depth="room.depth" :height="room.height" />

  <StashWalls :room="room" :opening="opening" :back-opening="backOpening" />

  <StashOutside
    facing="left"
    :wall-at="-(room.width / 2)"
    :opening-at="opening.z"
    ground-src="/textures/forrest-ground/forrest_ground_01_diff.512.avif"
    :ground-tile="5"
  >
    <!-- Пропы: StashOutsideProp. Локально −Z наружу, +X вправо из окна, y = 0 земля.
         Видимый конус кадра 0: 5 м → X 2.2..5.3 | 10 м → X 6.9..11.9 | 20 м → X 14.4..23.1.
         Прямо перед окном (X≈0) с кадра 0 не видно — камера смотрит сбоку. -->
  </StashOutside>
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
  <StashOutside
    facing="back"
    :wall-at="-(room.depth / 2)"
    :opening-at="backOpening.x"
    :drop="1.1"
    ground-src="/textures/forrest-ground/forrest_ground_01_diff.512.avif"
    :ground-tile="5"
  >
    <!-- Пропы: StashOutsideProp. Те же локальные оси.
         Видимый конус кадра 0: 5 м → X 0.0..2.8 | 10 м → X 0.6..5.0 | 20 м → X 1.8..9.2. -->
    <StashOutsideProp
      src="/models/stalker-house/scene.gltf"
      :height="8"
      :x="1.8"
      :z="-20"
      :yaw="-190"
      :tint="0.85"
    />
    <StashOutsideProp
      src="/models/rose-bush/scene.gltf"
      :height="2.1"
      :x="4"
      :z="-11.3"
      :yaw="35"
      :tint="0.92"
      :sink="0.08"
      :alpha-test="0.4"
    />
    <StashOutsideProp
      src="/models/dry-bush/scene.gltf"
      :height="2.6"
      :x="5.5"
      :z="-7.8"
      :yaw="-40"
      :tint="0.92"
      :sink="0.05"
      :alpha-test="0.5"
    />
    <StashOutsideGrass
      key="grass-shift-2"
      src="/models/autumn-lowpoly-grass/scene.gltf"
      :count="28"
      :x-min="0.5"
      :x-max="9.5"
    />
    <StashOutsideProp
      src="/models/mountain-trees/broadleaf-a/scene.gltf"
      :height="12"
      :x="16.2"
      :y="0.46"
      :z="-47.5"
      :yaw="80"
      :tint="0.78"
      :sink="0.2"
      :alpha-test="0.5"
    />
    <StashOutsideProp
      src="/models/mountain-trees/pine-bare/scene.gltf"
      :height="10.3"
      :x="17.28"
      :y="0.41"
      :z="-47.72"
      :yaw="123"
      :tint="0.78"
      :sink="0.2"
      :alpha-test="0.5"
    />
    <StashOutsideProp
      src="/models/mountain-trees/aspen-b/scene.gltf"
      :height="9.6"
      :x="19.02"
      :y="0.39"
      :z="-47.23"
      :yaw="-109"
      :tint="0.78"
      :sink="0.2"
      :alpha-test="0.5"
    />
    <StashOutsideProp
      src="/models/mountain-trees/pine-bare-b/scene.gltf"
      :height="11.4"
      :x="22.02"
      :y="0.26"
      :z="-47.42"
      :yaw="142"
      :tint="0.78"
      :sink="0.2"
      :alpha-test="0.5"
    />
    <StashOutsideProp
      src="/models/mountain-trees/pine-a/scene.gltf"
      :height="9.4"
      :x="21.96"
      :y="0.36"
      :z="-45.63"
      :yaw="-13"
      :tint="0.78"
      :sink="0.2"
      :alpha-test="0.5"
    />
    <StashOutsideProp
      src="/models/mountain-trees/pine-b/scene.gltf"
      :height="9.4"
      :x="20.66"
      :y="0.51"
      :z="-44.59"
      :yaw="-118"
      :tint="0.78"
      :sink="0.2"
      :alpha-test="0.5"
    />
    <StashOutsideProp
      src="/models/mountain-trees/aspen-b/scene.gltf"
      :height="9.9"
      :x="23.2"
      :y="0.26"
      :z="-46.5"
      :yaw="-35"
      :tint="0.78"
      :sink="0.2"
      :alpha-test="0.5"
    />
    <StashOutsideProp
      src="/models/mountain-trees/aspen/scene.gltf"
      :height="10.3"
      :x="24.5"
      :y="0.24"
      :z="-45.8"
      :yaw="-140"
      :tint="0.78"
      :sink="0.2"
      :alpha-test="0.5"
    />
  </StashOutside>
  <!-- Мир. 1.5 от половины родного. Бок к окну в 4 м от наружной левой грани. -->
  <StashOutsideProp
    src="/models/abounded-house/scene.gltf"
    :height="3.0375"
    :x="-11.063"
    :z="-5.68"
    :yaw="180"
    :tint="1"
  />
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

  <StashWallTitle
    :wall-z="innerBackZ"
    :x="titleX"
    :y="titleY"
    :width="titleW"
    :height="titleH"
    :roll="titleRoll"
  />
</template>
