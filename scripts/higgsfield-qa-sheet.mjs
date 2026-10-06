// Inspection sheets only; generated deliverables are never resized or composited here.
import fs from 'node:fs/promises'
import process from 'node:process'
import console from 'node:console'
import { Buffer } from 'node:buffer'
import sharp from 'sharp'
const manifest = JSON.parse(await fs.readFile('docs/higgsfield-production.json', 'utf8'))
const ids = process.argv.slice(2).map(Number)
for (let start = 0; start < ids.length; start += 4) {
  const parts = []
  for (const [position, index] of ids.slice(start, start + 4).entries()) {
    const job = manifest.jobs.find((item) => item.index === index)
    if (!job?.candidate) throw new Error(`No local candidate for ${index}`)
    const left = position % 2 * 780
    const top = Math.floor(position / 2) * 550
    parts.push({ input: await sharp(job.candidate).resize(760, 510, { fit: 'inside' }).png().toBuffer(), left, top: top + 30 })
    const label = `${index} ${job.room ?? job.key} ${job.look}`
    parts.push({ input: Buffer.from(`<svg width="760" height="30"><text x="10" y="24" font-size="22" fill="white">${label}</text></svg>`), left, top })
  }
  const output = `/tmp/home708-qa-${ids[start]}.png`
  await sharp({ create: { width: 1560, height: 1100, channels: 3, background: '#222' } }).composite(parts).png().toFile(output)
  console.log(output)
}
