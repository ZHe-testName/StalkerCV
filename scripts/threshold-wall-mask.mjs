/**
 * Порог серой маски: белое = штукатурка, чёрное = кирпич.
 * Доля — штукатурка (0.60 = 60%).
 *
 * node scripts/threshold-wall-mask.mjs back 0.60
 */
import path from 'node:path'
import sharp from 'sharp'

const name = process.argv[2]
const plasterShare = Number(process.argv[3])

if (!name || !(plasterShare > 0 && plasterShare < 1)) {
  console.error('usage: node scripts/threshold-wall-mask.mjs <left|back|right> <0..1 plaster share>')
  process.exit(1)
}

const src = path.resolve('public/textures/wall-masks', `${name}.png`)
const dest = path.resolve(
  'public/textures/wall-masks',
  `${name}.${Math.round(plasterShare * 100)}.png`,
)

const { data, info } = await sharp(src).grayscale().raw().toBuffer({ resolveWithObject: true })
const hist = new Array(256).fill(0)
for (let i = 0; i < data.length; i++) {
  hist[data[i]]++
}

const wantWhite = Math.round(data.length * plasterShare)
let acc = 0
let threshold = 0
for (let v = 255; v >= 0; v--) {
  acc += hist[v]
  if (acc >= wantWhite) {
    threshold = v
    break
  }
}

const out = Buffer.alloc(data.length)
let white = 0
for (let i = 0; i < data.length; i++) {
  const on = data[i] >= threshold ? 255 : 0
  out[i] = on
  if (on) {
    white++
  }
}

await sharp(out, {
  raw: { width: info.width, height: info.height, channels: 1 },
}).png({ compressionLevel: 9 }).toFile(dest)

console.log(
  `${path.basename(dest)} ${info.width}x${info.height} threshold ${threshold} plaster ${(white / data.length * 100).toFixed(1)}%`,
)
