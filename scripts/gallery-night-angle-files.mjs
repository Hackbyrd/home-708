// Local delivery/QA helpers only. Job submission, approval and promotion stay separate.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestFile = path.join(root, 'docs/gallery-night-angles-production.json');
const command = process.argv[2];
const indexes = process.argv.slice(3).map(value => Number(value));
if (!['download', 'contact-sheets'].includes(command) || indexes.some(index => !Number.isSafeInteger(index))) {
  throw new Error('Usage: node scripts/gallery-night-angle-files.mjs download|contact-sheets [indexes...]');
}
const readManifest = async () => JSON.parse(await fs.readFile(manifestFile, 'utf8'));
const manifest = await readManifest();
if (manifest.requests.some(request => request.option !== 'mineral-walnut')) throw new Error('This helper is scoped to Mineral & Walnut only.');
const requests = new Map(manifest.requests.map(request => [request.index, request]));
for (const index of indexes) if (!requests.has(index)) throw new Error(`Unknown request ${index}`);
const jobs = manifest.jobs.filter(job => job.status === 'completed' && job.result_url && (!indexes.length || indexes.includes(job.index)));
const exists = async file => fs.access(file).then(() => true, () => false);
const localPath = file => {
  const resolved = path.resolve(root, file);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error(`File escapes repository: ${file}`);
  return resolved;
};

async function validate(request, file) {
  const metadata = await sharp(file).metadata();
  const { width, height, format } = metadata;
  if (!width || !height || Math.max(width, height) < 1536 || format !== 'png') throw new Error(`Invalid/undersized PNG for ${request.index}`);
  const sourceAspect = request.sourceDimensions.width / request.sourceDimensions.height;
  if (Math.abs(width / height / sourceAspect - 1) > 0.035) throw new Error(`Aspect changed for ${request.index}: ${width}x${height}`);
  return { width, height };
}

if (command === 'download') {
  const downloaded = [];
  // Small bounded groups; download arguments are passed directly, never through a shell.
  const download = async job => {
    const request = requests.get(job.index);
    if (!request) throw new Error(`Job has no request: ${job.index}`);
    const url = new URL(job.result_url);
    if (url.protocol !== 'https:') throw new Error(`Non-HTTPS result URL for ${job.index}`);
    const target = localPath(request.file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    if (!await exists(target)) {
      const temporary = `${target}.${job.job_id}.${process.pid}.part`;
      try {
        await run('curl', ['--silent', '--show-error', '--fail', '--location', '--proto', '=https', '--proto-redir', '=https', '--retry', '2', '--retry-all-errors', '--connect-timeout', '15', '--max-time', '120', '--output', temporary, job.result_url]);
        const dimensions = await validate(request, temporary);
        await fs.rename(temporary, target);
        downloaded.push({ index: job.index, job_id: job.job_id, candidate: request.file, dimensions });
      } catch (error) {
        await fs.rm(temporary, { force: true });
        throw error;
      }
    } else {
      downloaded.push({ index: job.index, job_id: job.job_id, candidate: request.file, dimensions: await validate(request, target) });
    }
    console.log(`Downloaded ${job.index} ${request.room}/${request.sourceCode}`);
  };
  for (let start = 0; start < jobs.length; start += 3) {
    const results = await Promise.allSettled(jobs.slice(start, start + 3).map(download));
    // Persist successful file metadata even when a peer download failed.
    const latest = await readManifest();
    for (const entry of downloaded) {
      const target = latest.jobs.find(job => job.index === entry.index && job.job_id === entry.job_id);
      if (!target) throw new Error(`Job identity changed during download: ${entry.index}`);
      target.candidate = entry.candidate;
      target.dimensions = entry.dimensions;
    }
    await fs.writeFile(manifestFile, `${JSON.stringify(latest, null, 2)}\n`);
    const failure = results.find(result => result.status === 'rejected');
    if (failure) throw failure.reason;
  }
  console.log(`${downloaded.length} completed candidates available; no approval or promotion performed.`);
} else {
  const folder = path.join(root, 'tmp/gallery-night-qa');
  await fs.mkdir(folder, { recursive: true });
  const pairs = [];
  for (const job of jobs) {
    const request = requests.get(job.index);
    if (!request) throw new Error(`Job has no request: ${job.index}`);
    if (!await exists(localPath(request.file))) continue;
    await validate(request, localPath(request.file));
    if (!await exists(localPath(request.sourceFile))) throw new Error(`Missing exact day source for ${job.index}`);
    pairs.push({ request, job });
  }
  pairs.sort((a, b) => a.request.index - b.request.index);
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
  const image = file => sharp(file).resize(700, 466, { fit: 'contain', background: '#f0eee9' }).png().toBuffer();
  const map = [];
  const pairHeight = 528;
  for (let start = 0; start < pairs.length; start += 2) {
    const group = pairs.slice(start, start + 2);
    const page = Math.floor(start / 2) + 1;
    const overlays = [];
    const labels = [];
    for (const [row, { request, job }] of group.entries()) {
      const top = row * pairHeight;
      const [day, night] = await Promise.all([image(localPath(request.sourceFile)), image(localPath(request.file))]);
      overlays.push({ input: day, left: 0, top: top + 62 }, { input: night, left: 700, top: top + 62 });
      labels.push(`<text x="18" y="${top + 25}" font-size="20" font-weight="600">${request.index} · ${esc(request.title)} · ${esc(request.sourceCode)}</text><text x="18" y="${top + 50}" font-size="16">Exact approved daytime source</text><text x="718" y="${top + 50}" font-size="16">Night edit · ${esc(request.code)}</text>`);
      map.push({ page, row, index: request.index, room: request.room, title: request.title, sourceCode: request.sourceCode, code: request.code, sourceFile: request.sourceFile, candidate: request.file, job_id: job.job_id, sourceDimensions: request.sourceDimensions, candidateDimensions: job.dimensions });
    }
    overlays.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="${group.length * pairHeight}"><g font-family="Arial, sans-serif" fill="#202020">${labels.join('')}</g></svg>`), left: 0, top: 0 });
    const file = path.join(folder, `sheet-${String(page).padStart(2, '0')}.jpg`);
    await sharp({ create: { width: 1400, height: group.length * pairHeight, channels: 3, background: '#f0eee9' } }).composite(overlays).jpeg({ quality: 94 }).toFile(file);
    console.log(path.relative(root, file));
  }
  await fs.writeFile(path.join(folder, 'index.json'), `${JSON.stringify({ version: 'GALLERY-N01', generated: new Date().toISOString(), pairs: map, pending: manifest.requests.filter(request => !pairs.some(pair => pair.request.index === request.index)).map(request => request.index), note: 'QA contact sheets only. No candidates are approved or promoted by this helper.' }, null, 2)}\n`);
  console.log(`Built ${Math.ceil(pairs.length / 2)} sheets for ${pairs.length} completed day/night pairs.`);
}
