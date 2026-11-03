<script setup lang="ts">
/**
 * Отдельные капли в слоте StashOutside. Один InstancedMesh на окно,
 * падение в шейдере. Unlit, без теней. Шторку этого окна не дублировать.
 */
import { useLoop } from '@tresjs/core'
import {
  FrontSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  Sphere,
  Vector3,
} from 'three'

const props = withDefaults(defineProps<{
  xMin: number
  xMax: number
  /** Если заданы, полоса на дальней глубине другая: трапеция, не прямоугольник. */
  xMinFar?: number
  xMaxFar?: number
  /** Ближе к окну, меньше по модулю. */
  zNear?: number
  /** Дальше от окна. */
  zFar?: number
  count?: number
  /** Верх падения, метры над землёй слота. */
  top?: number
  /** Длина пути вниз. */
  span?: number
  /** Множитель длины штриха. 1 — как на дальнем окне. */
  lengthScale?: number
}>(), {
  zNear: -6.2,
  zFar: -12.2,
  count: 100,
  top: 5.6,
  span: 5.2,
  lengthScale: 1,
})

const geo = new PlaneGeometry(1, 1)
const phases = new Float32Array(props.count)
const speeds = new Float32Array(props.count)
geo.setAttribute('aPhase', new InstancedBufferAttribute(phases, 1))
geo.setAttribute('aSpeed', new InstancedBufferAttribute(speeds, 1))

const xLo = Math.min(props.xMin, props.xMax, props.xMinFar ?? props.xMin, props.xMaxFar ?? props.xMax)
const xHi = Math.max(props.xMin, props.xMax, props.xMinFar ?? props.xMin, props.xMaxFar ?? props.xMax)
const cx = (xLo + xHi) / 2
const cz = (props.zNear + props.zFar) / 2
const cy = props.top - props.span / 2
geo.boundingSphere = new Sphere(
  new Vector3(cx, cy, cz),
  Math.hypot((xHi - xLo) / 2, props.span / 2, (props.zFar - props.zNear) / 2) + 1,
)

const mat = new ShaderMaterial({
  transparent: true,
  depthWrite: false,
  toneMapped: false,
  side: FrontSide,
  uniforms: {
    uTime: { value: 0 },
    uTop: { value: props.top },
    uSpan: { value: props.span },
  },
  vertexShader: `
    attribute float aPhase;
    attribute float aSpeed;
    uniform float uTime;
    uniform float uTop;
    uniform float uSpan;
    varying float vFade;
    void main() {
      float fall = uTop - fract(uTime * aSpeed + aPhase) * uSpan;
      vec4 local = instanceMatrix * vec4(position, 1.0);
      local.y += fall;
      vFade = uv.y;
      gl_Position = projectionMatrix * modelViewMatrix * local;
    }
  `,
  fragmentShader: `
    varying float vFade;
    void main() {
      float head = smoothstep(0.0, 0.35, vFade);
      float tail = smoothstep(1.0, 0.2, vFade);
      float a = head * tail * 0.46;
      if (a < 0.02) discard;
      gl_FragColor = vec4(0.58, 0.7, 0.76, a);
    }
  `,
})

const mesh = new InstancedMesh(geo, mat, props.count)
mesh.castShadow = false
mesh.receiveShadow = false
mesh.frustumCulled = true
const dummy = new Object3D()
for (let i = 0; i < props.count; i++) {
  const depth = Math.random()
  const z = props.zNear + depth * (props.zFar - props.zNear)
  const x0 = props.xMin + depth * ((props.xMinFar ?? props.xMin) - props.xMin)
  const x1 = props.xMax + depth * ((props.xMaxFar ?? props.xMax) - props.xMax)
  const x = x0 + Math.random() * (x1 - x0)
  const near = 1 - depth
  const length = (0.22 + near * 0.48) * props.lengthScale
  const thick = 0.018 + near * 0.028
  phases[i] = Math.random()
  speeds[i] = 0.55 + near * 0.6
  dummy.position.set(x, 0, z)
  dummy.scale.set(thick, length, 1)
  dummy.rotation.set(0, 0, 0)
  dummy.updateMatrix()
  mesh.setMatrixAt(i, dummy.matrix)
}
mesh.instanceMatrix.needsUpdate = true
geo.getAttribute('aPhase').needsUpdate = true
geo.getAttribute('aSpeed').needsUpdate = true

const { onBeforeRender } = useLoop()
const { off } = onBeforeRender(({ elapsed }) => {
  mat.uniforms.uTime.value = elapsed
})

onBeforeUnmount(() => {
  off()
  geo.dispose()
  mat.dispose()
  mesh.dispose()
})
</script>

<template>
  <primitive :object="mesh" />
</template>
