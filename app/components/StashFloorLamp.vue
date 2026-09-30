<script setup lang="ts">
/**
 * Wooden Floor Lamp (Atalaya22) у правой стены. Sit на пол по высоте.
 * Point light в абажуре: в покое коротыш, на ховере/фокусе дивана — ровный HOT.
 */
import { useLoader, useLoop } from '@tresjs/core'
import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { stashFocused } from '~/composables/useStashCamera'
import { stashHovered } from '~/composables/useStashAnchor'

const props = defineProps<{
  src: string
  height: number
}>()

function sitGltfOnFloor(scene: Group, heightM: number) {
  const root = new Group()
  const model = scene.clone(true)
  const box = new Box3().setFromObject(model)
  const size = box.getSize(new Vector3())
  const center = box.getCenter(new Vector3())
  model.position.set(-center.x, -box.min.y, -center.z)
  root.add(model)
  root.scale.setScalar(heightM / (size.y || 1))
  return { root, model }
}

const { state: gltf } = useLoader(GLTFLoader, props.src)
const lampModel = shallowRef<Group | null>(null)
const shadeMats: MeshStandardMaterial[] = []

watch(gltf, (loaded) => {
  const scene = loaded?.scene
  if (!scene || lampModel.value) {
    return
  }
  const { root, model } = sitGltfOnFloor(scene, props.height)
  model.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return
    }
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const mat of materials) {
      if (!(mat instanceof MeshStandardMaterial)) {
        continue
      }
      mat.metalness = Math.min(mat.metalness, 0.35)
      mat.roughness = Math.max(mat.roughness, 0.62)
      if (mat.map) {
        mat.emissiveMap = mat.map
        mat.emissive.setRGB(1, 0.78, 0.35)
      }
      mat.needsUpdate = true
      shadeMats.push(mat)
    }
  })
  lampModel.value = root
}, { immediate: true })

const LAMP_IDLE = 0.48
const LAMP_HOT = 2.2
const SHADE_IDLE = 0.16
const SHADE_HOT = 0.42
const lampIntensity = ref(LAMP_IDLE)
let lampBase = LAMP_IDLE
/** Коротыш в покое: wait → on → (gap → on) → wait. */
type SparkPhase = 'wait' | 'on' | 'gap'
let sparkPhase: SparkPhase = 'wait'
let sparkTimer = 1.0 + Math.random() * 2.0
let sparkBurstLeft = 0
let sparkOn = false
let sparkLevel = LAMP_IDLE
let wasLit = false

function armSparkWait() {
  sparkPhase = 'wait'
  sparkOn = false
  sparkBurstLeft = 0
  sparkTimer = 0.9 + Math.random() * 3.6
}

function armSparkOn() {
  sparkPhase = 'on'
  sparkOn = true
  sparkLevel = LAMP_IDLE * (0.85 + Math.random() * 0.3)
  sparkTimer = 0.14 + Math.random() * 0.42
}

function armSparkGap() {
  sparkPhase = 'gap'
  sparkOn = false
  sparkTimer = 0.05 + Math.random() * 0.16
}

function startSparkBurst() {
  sparkBurstLeft = Math.random() < 0.45 ? 2 : 1
  armSparkOn()
}

function shadeFromIntensity(i: number) {
  if (i <= LAMP_IDLE) {
    return (i / LAMP_IDLE) * SHADE_IDLE
  }
  const u = (i - LAMP_IDLE) / (LAMP_HOT - LAMP_IDLE)
  return SHADE_IDLE + Math.min(1, u) * (SHADE_HOT - SHADE_IDLE)
}

const { onBeforeRender } = useLoop()
onBeforeRender(({ delta }) => {
  const lit = stashHovered.value === 'armchair' || stashFocused.value === 'armchair'
  const k = 1 - Math.exp(-7.2 * delta)

  if (lit) {
    if (!wasLit) {
      lampBase = lampIntensity.value
      armSparkWait()
      wasLit = true
    }
    lampBase += (LAMP_HOT - lampBase) * k
    lampIntensity.value = lampBase
  }
  else {
    if (wasLit) {
      armSparkWait()
      wasLit = false
    }

    sparkTimer -= delta
    if (sparkTimer <= 0) {
      if (sparkPhase === 'wait') {
        startSparkBurst()
      }
      else if (sparkPhase === 'on') {
        sparkBurstLeft -= 1
        if (sparkBurstLeft > 0) {
          armSparkGap()
        }
        else {
          armSparkWait()
        }
      }
      else {
        armSparkOn()
      }
    }

    lampIntensity.value = sparkOn ? sparkLevel : 0.018
  }

  const shade = shadeFromIntensity(lampIntensity.value)
  for (const mat of shadeMats) {
    mat.emissiveIntensity = shade
  }
})
</script>

<template>
  <primitive v-if="lampModel" :object="lampModel" />
  <TresPointLight
    :position="[0, height * 0.86, 0]"
    color="#ffc85a"
    :intensity="lampIntensity"
    :distance="2.6"
    :decay="2"
  />
</template>
