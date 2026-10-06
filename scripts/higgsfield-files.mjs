// Local file handling only. Generations are submitted through the Higgsfield API.
import { readFile, writeFile, mkdir, stat, rename, copyFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import process from 'node:process'
import console from 'node:console'
const run = promisify(execFile)

const file = 'docs/higgsfield-production.json'
const manifest = JSON.parse(await readFile(file, 'utf8'))
const command = process.argv[2]
const indexes = process.argv.slice(3).map(Number)
const jobs = manifest.jobs.filter((job) => !indexes.length || indexes.includes(job.index))
const exists = async (p) => { try { await stat(p); return true } catch { return false } }

if (command === 'download') {
  const downloads = jobs.filter((j) => j.result_url)
  const download = async (job) => {
    job.candidate = `assets/render-candidates/2026-10-06/${job.index}-${job.job_id}.png`
    if (!await exists(job.candidate)) {
      await mkdir(path.dirname(job.candidate), { recursive: true })
      await run('curl', ['-sS', '-fL', '--retry', '2', '--retry-all-errors', '--connect-timeout', '15', '--max-time', '60', '-o', `${job.candidate}.part`, job.result_url])
      await rename(`${job.candidate}.part`, job.candidate)
    }
    const image = await sharp(job.candidate).metadata()
    job.dimensions = { width: image.width, height: image.height }
    if (Math.max(image.width, image.height) < 1536) throw new Error(`Undersize output ${job.index}`)
    console.log(job.index, job.room ?? job.key, job.look, `${image.width}x${image.height}`)
  }
  for (let i = 0; i < downloads.length; i += 4) {
    await Promise.all(downloads.slice(i, i + 4).map(download))
  }
} else if (command === 'promote') {
  for (const job of jobs) {
    if (job.qaStatus !== 'approved') throw new Error(`Visual QA has not approved ${job.index}`)
    if (!job.candidate || !await exists(job.candidate)) throw new Error(`Missing candidate ${job.index}`)
    const room = job.room ?? job.key
    const base = `assets/renders/${job.floor}/${room}-${job.look}`
    for (const ext of ['png', 'jpg', 'jpeg']) {
      const previous = `${base}.${ext}`
      if (await exists(previous)) {
        const backup = `assets/renders-archive/2026-10-06/${job.floor}/${room}-${job.look}-before-${job.index}.${ext}`
        if (await exists(backup)) throw new Error(`Archive already exists: ${backup}`)
        await mkdir(path.dirname(backup), { recursive: true })
        await rename(previous, backup)
      }
    }
    job.output = `${base}.png`
    await mkdir(path.dirname(job.output), { recursive: true })
    await copyFile(job.candidate, job.output)
    job.delivered = true
    console.log(job.output)
  }
} else if (command === 'status') {
  console.log(JSON.stringify(jobs.map(({ index, room, key, look, status, qaStatus, delivered }) => ({ index, room: room ?? key, look, status, qaStatus, delivered })), null, 2))
} else {
  throw new Error('Usage: node scripts/higgsfield-files.mjs download|promote|status [indexes...]')
}
// Merge only file-handling fields, so API job-status updates are not overwritten.
const latest = JSON.parse(await readFile(file, 'utf8'))
for (const job of jobs) {
  const target = latest.jobs.find((entry) => entry.index === job.index)
  for (const field of ['candidate', 'dimensions', 'output', 'delivered']) {
    if (job[field] !== undefined) target[field] = job[field]
  }
}
await writeFile(file, JSON.stringify(latest, null, 2) + '\n')
