// Build web-sized copies of the redesign renders.
//
// Reads the full-size originals from assets/renders/<floor>/<room>-<look>.(png|jpg)
// (kept out of git; they live only on the local machine) and writes
// assets/renders-web/<floor>/<room>-<look>.webp at max 1600 px on the long edge,
// quality 80. The web app imports only the renders-web copies.
//
// Usage: npm run build:renders   (incremental: skips outputs newer than their source)

import console from 'node:console'
import { mkdir, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

const SRC = 'assets/renders'
const OUT = 'assets/renders-web'
const MAX_EDGE = 1600
const QUALITY = 80
const CONCURRENCY = 8

async function fresh(outFile, srcMtime) {
  try {
    return (await stat(outFile)).mtimeMs >= srcMtime
  } catch {
    return false
  }
}

const floors = (await readdir(SRC, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

let written = 0
let skipped = 0
let bytes = 0
const jobs = []

for (const floor of floors) {
  await mkdir(path.join(OUT, floor), { recursive: true })
  const files = (await readdir(path.join(SRC, floor))).filter((file) => /\.(png|jpe?g)$/i.test(file))
  for (const file of files) {
    const src = path.join(SRC, floor, file)
    const out = path.join(OUT, floor, file.replace(/\.(png|jpe?g)$/i, '.webp'))
    jobs.push(async () => {
      const srcStat = await stat(src)
      if (await fresh(out, srcStat.mtimeMs)) {
        skipped += 1
        return
      }
      await sharp(src)
        .rotate()
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(out)
      written += 1
      bytes += (await stat(out)).size
    })
  }
}

for (let i = 0; i < jobs.length; i += CONCURRENCY) {
  await Promise.all(jobs.slice(i, i + CONCURRENCY).map((job) => job()))
}

console.log(`renders-web: ${written} written, ${skipped} up to date, ${jobs.length} total`)
if (written) console.log(`new output: ${(bytes / 1024 / 1024).toFixed(1)} MB (${Math.round(bytes / written / 1024)} KB avg)`)
if (!jobs.length) {
  console.error(`No sources found under ${SRC}/ — put the full-size renders there first.`)
  process.exit(1)
}
