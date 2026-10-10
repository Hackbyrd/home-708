import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root = process.cwd();
const genPath = path.join(root, 'docs/mineral-walnut-rh-generation.json');
const housePath = path.join(root, 'docs/mineral-walnut-rh-house.json');
const gen = JSON.parse(await fs.readFile(genPath, 'utf8'));
const house = JSON.parse(await fs.readFile(housePath, 'utf8'));
const assetDir = path.join(root, 'assets/render-candidates/mineral-walnut-rh');
const webDir = path.join(root, 'docs/design-review-assets/rh-house');
await fs.mkdir(assetDir, { recursive: true });
await fs.mkdir(webDir, { recursive: true });
let synced = 0;
for (const job of gen.jobs) {
  if (job.status !== 'completed' || !job.result_url) continue;
  const req = gen.requests.find(r => r.index === job.index);
  if (!req) throw new Error(`Missing request ${job.index}`);
  const file = path.join(assetDir, `${req.roomId}-r01.png`);
  try { await fs.access(file); } catch {
    const response = await fetch(job.result_url);
    if (!response.ok) throw new Error(`Download ${req.roomId}: ${response.status}`);
    await fs.writeFile(file, Buffer.from(await response.arrayBuffer()));
  }
  const webFile = `${req.roomId}-rh-r01.webp`;
  const metadata = await sharp(file).metadata();
  await sharp(file).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 89 }).toFile(path.join(webDir, webFile));
  const room = house.rooms.find(r => r.id === req.roomId);
  const old = room.render;
  room.render = { ...old, src: `../design-review-assets/rh-house/${webFile}`, jobId: job.job_id, resultUrl: job.result_url, file: path.relative(root, file), dimensions: { width: metadata.width, height: metadata.height }, status: old.jobId === job.job_id ? old.status : 'New RH furniture study · visual review pending', caption: room.renderCaption || (old.jobId === job.job_id ? old.caption : `Proposed RH furniture and supporting pieces in ${room.title.toLowerCase()}. The room envelope and approved Mineral & Walnut finishes are retained. Product geometry is illustrative; confirmed footprints and samples govern purchasing.`) };
  synced++;
}
await fs.writeFile(housePath, JSON.stringify(house, null, 2) + '\n');
console.log(`Synced ${synced} completed room studies.`);
