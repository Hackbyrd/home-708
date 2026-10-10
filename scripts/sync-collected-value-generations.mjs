/** Download Collected Value studies without changing the original RH consultation. */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const manifestPath = path.join(root, 'docs/collected-value-generation.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const rawDir = path.join(root, 'assets/render-candidates/mineral-walnut-collected-value/r01');
const webDir = path.join(root, 'docs/design-review-assets/collected-value');
const candidateDir = path.join(rawDir, 'web-candidates');
await Promise.all([fs.mkdir(rawDir, { recursive: true }), fs.mkdir(webDir, { recursive: true }), fs.mkdir(candidateDir, { recursive: true })]);

const updates = new Map();
for (const job of manifest.jobs ?? []) {
  if (job.status !== 'completed' || !job.result_url) continue;
  const request = (manifest.requests ?? []).find(item => item.index === job.index);
  const roomId = job.roomId ?? request?.roomId;
  if (!/^[a-z][a-z0-9]*$/.test(roomId ?? '') || !/^[a-zA-Z0-9-]+$/.test(job.job_id ?? '')) {
    throw new Error(`Invalid room or job identity for request ${job.index}`);
  }
  const outputFile = path.join(rawDir, `${roomId}-r01-${job.job_id}.png`);
  try {
    await fs.access(outputFile);
  } catch {
    const response = await fetch(job.result_url);
    if (!response.ok) throw new Error(`Download ${roomId}: HTTP ${response.status}`);
    await fs.writeFile(outputFile, Buffer.from(await response.arrayBuffer()));
  }
  const metadata = await sharp(outputFile).metadata();
  if (Math.max(metadata.width ?? 0, metadata.height ?? 0) < 1536) {
    throw new Error(`Study ${roomId} is below the 1536-pixel minimum: ${metadata.width} × ${metadata.height}`);
  }
  const candidateName = `${roomId}-r01-${job.job_id}.webp`;
  const candidateFile = path.join(candidateDir, candidateName);
  await sharp(outputFile).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 89 }).toFile(candidateFile);
  // A revision stays isolated from its published image until the visual QA pass approves it.
  let webSrc = null;
  if (job.qa?.approved === true) {
    const publishedName = `${roomId}-r01.webp`;
    await fs.copyFile(candidateFile, path.join(webDir, publishedName));
    webSrc = `/design-review-assets/collected-value/${publishedName}`;
  }
  updates.set(job.job_id, { roomId, outputFile: path.relative(root, outputFile), webSrc, candidateFile: path.relative(root, candidateFile), dimensions: { width: metadata.width, height: metadata.height } });
}

// Read again so completed downloads do not discard status updates saved during the run.
const latest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
for (const job of latest.jobs ?? []) {
  const update = updates.get(job.job_id);
  if (update) {
    Object.assign(job, update);
    delete job.candidateWebSrc;
  }
}
const temporaryPath = `${manifestPath}.sync.tmp`;
await fs.writeFile(temporaryPath, JSON.stringify(latest, null, 2) + '\n');
await fs.rename(temporaryPath, manifestPath);
console.log(`Synced ${updates.size} Collected Value studies; only QA-approved images were promoted.`);
