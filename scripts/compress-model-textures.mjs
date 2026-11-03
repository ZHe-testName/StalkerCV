/**
 * Sketchfab часто кладёт 4K/8K. Пишем сжатые карты рядом
 * (не трогаем файл, если его держит dev-сервер), правим uri в scene.gltf.
 *
 *   node scripts/compress-model-textures.mjs [max] [png|jpeg|avif]
 *   node scripts/compress-model-textures.mjs 512 avif --in <srcTextures> --out <destTextures>
 *
 * avif — через EXT_texture_avif (Three.js GLTFLoader это умеет).
 * Сырой дамп из Загрузок в public не класть.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve('public/models')
const MAX = Number(process.argv[2]) || 1024
const FORMAT = (process.argv[3] || 'keep').toLowerCase()
const tag = MAX >= 1024 ? '1k' : String(MAX)

const pairs = []
const rest = process.argv.slice(4)
for (let i = 0; i < rest.length; i++) {
  const arg = rest[i]
  let src = null
  if (arg.startsWith('--in=')) {
    src = arg.slice(5)
  }
  else if (arg === '--in' && rest[i + 1]) {
    src = rest[++i]
  }
  else {
    continue
  }
  const next = rest[i + 1] || ''
  let dest = null
  if (next.startsWith('--out=')) {
    dest = next.slice(6)
    i += 1
  }
  else if (next === '--out' && rest[i + 2]) {
    dest = rest[i + 2]
    i += 2
  }
  if (src && dest) {
    pairs.push({ src: path.resolve(src), dest: path.resolve(dest) })
  }
}

function stripSizeTag(base) {
  return base.replace(/\.1k$/, '').replace(/\.(256|512)$/, '')
}

function destName(file, destDir) {
  const ext = FORMAT === 'avif' ? '.avif' : path.extname(file)
  let base = path.basename(file).replace(path.extname(file), '')
  base = stripSizeTag(base)
  return path.join(destDir, `${base}.${tag}${ext}`)
}

function isDataMap(name) {
  return /normal|metallic|roughness|occlusion|transmission/i.test(name)
}

async function walkFiles(dir) {
  const out = []
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      out.push(...await walkFiles(p))
    }
    else {
      out.push(p)
    }
  }
  return out
}

async function compressOne(file, dest) {
  const img = sharp(file, { limitInputPixels: false })
  const meta = await img.metadata()
  const w = meta.width || 1
  const h = meta.height || 1
  const long = Math.max(w, h)
  const scale = long > MAX ? MAX / long : 1
  const nw = Math.max(1, Math.round(w * scale))
  const nh = Math.max(1, Math.round(h * scale))
  let pipeline = img.resize(nw, nh, { kernel: 'lanczos3' })
  const outExt = path.extname(dest).toLowerCase()
  if (outExt === '.avif') {
    pipeline = pipeline.avif({
      quality: isDataMap(dest) ? 62 : 50,
      effort: 6,
      chromaSubsampling: isDataMap(dest) ? '4:4:4' : '4:2:0',
    })
  }
  else if (outExt === '.png') {
    pipeline = pipeline.png({ compressionLevel: 9 })
  }
  else {
    pipeline = pipeline.jpeg({ quality: 78, mozjpeg: true })
  }
  await pipeline.toFile(dest)
  console.log(`${path.basename(file)} ${w}x${h} → ${path.basename(dest)} ${nw}x${nh}`)
}

function patchGltfJson(json) {
  if (!json.images) {
    return false
  }
  let changed = false
  for (const img of json.images) {
    if (!img.uri) {
      continue
    }
    const name = path.posix.basename(img.uri)
    const ext = path.extname(name)
    const base = stripSizeTag(name.slice(0, -ext.length))
    const nextExt = FORMAT === 'avif' ? '.avif' : ext
    const nextUri = `textures/${base}.${tag}${nextExt}`
    if (img.uri !== nextUri) {
      img.uri = nextUri
      changed = true
    }
    if (FORMAT === 'avif' && img.mimeType !== 'image/avif') {
      img.mimeType = 'image/avif'
      changed = true
    }
  }
  if (FORMAT === 'avif') {
    const used = new Set(json.extensionsUsed || [])
    if (!used.has('EXT_texture_avif')) {
      used.add('EXT_texture_avif')
      json.extensionsUsed = [...used]
      changed = true
    }
    for (const tex of json.textures || []) {
      const src = tex.source
      if (src === undefined) {
        continue
      }
      tex.extensions = { ...tex.extensions, EXT_texture_avif: { source: src } }
      changed = true
    }
  }
  return changed
}

if (pairs.length) {
  for (const { src, dest } of pairs) {
    const images = (await walkFiles(src)).filter(f => /\.(png|jpe?g)$/i.test(f))
    for (const file of images) {
      await compressOne(file, destName(file, dest))
    }
  }
}
else {
  const files = await walkFiles(root)
  const images = files.filter(f => /\.(png|jpe?g|avif)$/i.test(f))
  for (const file of images) {
    const dest = destName(file, path.dirname(file))
    if (dest === file) {
      continue
    }
    await compressOne(file, dest)
  }
}

const gltfs = (await walkFiles(root)).filter(f => f.endsWith('scene.gltf'))
for (const gltfPath of gltfs) {
  const json = JSON.parse(await readFile(gltfPath, 'utf8'))
  if (patchGltfJson(json)) {
    await writeFile(gltfPath, `${JSON.stringify(json, null, 2)}\n`)
    console.log(`patched ${path.relative(root, gltfPath)}`)
  }
}
