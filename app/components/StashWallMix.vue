<script setup lang="ts">
/**
 * Микс: Broken Brick (1.8 м) + White Rough Plaster (1.0 м) по маске стены.
 * Белое в маске — штукатурка, чёрное — кирпич.
 */
import { useLoader } from '@tresjs/core'
import {
  ClampToEdgeWrapping,
  MeshStandardMaterial,
  NoColorSpace,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
} from 'three'

const props = withDefaults(defineProps<{
  width: number
  height: number
  maskUrl: string
  tileWidth?: number
  tileHeight?: number
  u0?: number
  v0?: number
  u1?: number
  v1?: number
}>(), {
  u0: 0,
  v0: 0,
  u1: 1,
  v1: 1,
})

const BRICK_TILE = 1.8
const PLASTER_TILE = 1.0

const { state: brickDiff } = useLoader(TextureLoader, '/textures/broken-brick/broken_brick_wall_diff.1k.avif')
const { state: brickNor } = useLoader(TextureLoader, '/textures/broken-brick/broken_brick_wall_nor_gl.1k.avif')
const { state: brickArm } = useLoader(TextureLoader, '/textures/broken-brick/broken_brick_wall_arm.1k.avif')
const { state: plasterDiff } = useLoader(TextureLoader, '/textures/white-plaster/white_rough_plaster_diff.1k.avif')
const { state: plasterNor } = useLoader(TextureLoader, '/textures/white-plaster/white_rough_plaster_nor_gl.1k.avif')
const { state: plasterRough } = useLoader(TextureLoader, '/textures/white-plaster/white_rough_plaster_rough.1k.avif')
const { state: mask } = useLoader(TextureLoader, props.maskUrl)

function prep(tex: Texture, srgb: boolean, wrap: typeof RepeatWrapping) {
  tex.wrapS = wrap
  tex.wrapT = wrap
  tex.colorSpace = srgb ? SRGBColorSpace : NoColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
}

watch(brickDiff, (tex) => {
  if (tex) {
    prep(tex, true, RepeatWrapping)
  }
}, { immediate: true })
watch(brickNor, (tex) => {
  if (tex) {
    prep(tex, false, RepeatWrapping)
  }
}, { immediate: true })
watch(brickArm, (tex) => {
  if (tex) {
    prep(tex, false, RepeatWrapping)
  }
}, { immediate: true })
watch(plasterDiff, (tex) => {
  if (tex) {
    prep(tex, true, RepeatWrapping)
  }
}, { immediate: true })
watch(plasterNor, (tex) => {
  if (tex) {
    prep(tex, false, RepeatWrapping)
  }
}, { immediate: true })
watch(plasterRough, (tex) => {
  if (tex) {
    prep(tex, false, RepeatWrapping)
  }
}, { immediate: true })
watch(mask, (tex) => {
  if (tex) {
    prep(tex, false, ClampToEdgeWrapping)
  }
}, { immediate: true })

const mixMat = shallowRef<MeshStandardMaterial | null>(null)

watch(
  [brickDiff, brickNor, brickArm, plasterDiff, plasterNor, plasterRough, mask],
  ([bd, bn, ba, pd, pn, pr, mk]) => {
    if (!bd || !bn || !ba || !pd || !pn || !pr || !mk) {
      return
    }
    const tileW = props.tileWidth ?? props.width
    const tileH = props.tileHeight ?? props.height
    const brickRep = new Vector2(tileW / BRICK_TILE, tileH / BRICK_TILE)
    const plasterRep = new Vector2(tileW / PLASTER_TILE, tileH / PLASTER_TILE)
    const mat = new MeshStandardMaterial({
      map: pd,
      normalMap: pn,
      roughnessMap: pr,
      metalness: 0,
      roughness: 1,
    })
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.brickMap = { value: bd }
      shader.uniforms.brickNor = { value: bn }
      shader.uniforms.brickArm = { value: ba }
      shader.uniforms.plasterMap = { value: pd }
      shader.uniforms.plasterNor = { value: pn }
      shader.uniforms.plasterRough = { value: pr }
      shader.uniforms.maskMap = { value: mk }
      shader.uniforms.brickRep = { value: brickRep }
      shader.uniforms.plasterRep = { value: plasterRep }
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `
          uniform sampler2D brickMap;
          uniform sampler2D brickNor;
          uniform sampler2D brickArm;
          uniform sampler2D plasterMap;
          uniform sampler2D plasterNor;
          uniform sampler2D plasterRough;
          uniform sampler2D maskMap;
          uniform vec2 brickRep;
          uniform vec2 plasterRep;
          #include <common>
          `,
        )
        .replace(
          '#include <map_fragment>',
          `
          float plasterAmt = texture2D(maskMap, vMapUv).r;
          vec4 sampledDiffuseColor = mix(
            texture2D(brickMap, vMapUv * brickRep),
            texture2D(plasterMap, vMapUv * plasterRep),
            plasterAmt
          );
          diffuseColor *= sampledDiffuseColor;
          `,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `
          float roughnessFactor = roughness;
          float plasterAmtR = texture2D(maskMap, vMapUv).r;
          float brickR = texture2D(brickArm, vMapUv * brickRep).g;
          float plasterR = texture2D(plasterRough, vMapUv * plasterRep).g;
          roughnessFactor *= mix(brickR, plasterR, plasterAmtR);
          `,
        )
        .replace(
          '#include <normal_fragment_maps>',
          `
          float plasterAmtN = texture2D(maskMap, vMapUv).r;
          vec3 brickN = texture2D(brickNor, vMapUv * brickRep).xyz * 2.0 - 1.0;
          vec3 plasterN = texture2D(plasterNor, vMapUv * plasterRep).xyz * 2.0 - 1.0;
          vec3 mapN = normalize(mix(brickN, plasterN, plasterAmtN));
          mapN.xy *= normalScale;
          normal = normalize(tbn * mapN);
          `,
        )
    }
    mat.customProgramCacheKey = () => 'stash-wall-mix'
    mixMat.value = mat
  },
  { immediate: true },
)

const geo = new PlaneGeometry(props.width, props.height)
{
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    const u = props.u0 + (pos.getX(i) / props.width + 0.5) * (props.u1 - props.u0)
    const v = props.v0 + (pos.getY(i) / props.height + 0.5) * (props.v1 - props.v0)
    uv.setXY(i, u, v)
  }
  uv.needsUpdate = true
}
</script>

<template>
  <TresMesh v-if="mixMat" :geometry="geo" :material="mixMat" />
</template>
