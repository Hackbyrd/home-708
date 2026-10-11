// Promote only individually reviewed Mineral & Walnut nighttime edits.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const production = await read('docs/gallery-night-angles-production.json');
const html = await fs.readFile(path.join(root, 'docs/house-design-review.html'), 'utf8');
const floors = JSON.parse(html.match(/<script id="review-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const primary = await read('docs/mineral-walnut-night-review.json');
const accepted = production.requests.filter(request => request.qa?.accepted === true);
if (production.qa.status !== 'visually_reviewed' || accepted.length !== 21) throw new Error('Require visual approval of exactly 21 new night angles.');
const rooms = {};
const coverage = new Set();
for (const request of accepted) {
  if (request.option !== 'mineral-walnut') throw new Error('Only Mineral & Walnut can be promoted.');
  const room = floors.find(floor => floor.id === request.floor)?.rooms.find(room => room.id === request.room);
  const day = room?.views.find(view => view.code === request.sourceCode);
  if (!day || day.jobId !== request.sourceJobId || day.file !== request.sourceFile) throw new Error(`Superseded source for ${request.index}.`);
  const key = `${request.room}/${request.sourceCode}`;
  if (coverage.has(key) || primary.rooms[request.room]?.sourceCode === request.sourceCode) throw new Error(`Duplicate night camera: ${key}.`);
  coverage.add(key);
  const job = production.jobs.find(job => job.index === request.index);
  if (job?.status !== 'completed' || job.candidate !== request.file) throw new Error(`Missing completed candidate ${request.index}.`);
  const { width, height, format } = await sharp(path.join(root, request.file)).metadata();
  if (format !== 'png' || Math.min(width, height) < 1536 || Math.abs(width / height / (request.sourceDimensions.width / request.sourceDimensions.height) - 1) > 0.035) throw new Error(`Invalid image ${request.index}.`);
  (rooms[request.room] ??= { views: [] }).views.push({
    id: `${request.code}-MW-GN02`, version: 'MW-GN02', code: request.code,
    index: request.index, jobId: job.job_id, model: request.params.model, file: request.file,
    sourceCode: request.sourceCode, sourceFile: request.sourceFile, sourceJobId: request.sourceJobId,
    label: `Night · ${request.title} · ${request.sourceCode} camera`, scene: request.scene,
    cct: request.cct, circuits: request.circuits, lighting: request.lighting,
    evidenceType: 'Same-camera night edit of approved daytime angle',
    evidence: `Higgsfield image edit paired with approved ${request.sourceCode}. Camera, layout, furnishings and selected Mineral & Walnut surfaces visually checked against that exact daytime source. ${request.sourceEvidence.evidence || ''}`,
    qaNote: `${request.qa.note} ${request.sourceEvidence.qaNote || ''} Brightness, glare, color and fabric opacity are illustrative; verify fixtures, samples and dimming on site.`,
    width, height,
  });
}
for (const floor of floors) for (const room of floor.rooms) for (const day of room.views) {
  const existing = primary.rooms[room.id];
  if (existing?.sourceCode === day.code) {
    if (existing.sourceJobId !== day.jobId || existing.sourceFile !== day.file) throw new Error(`Superseded primary night ${room.id}.`);
  } else if (!coverage.has(`${room.id}/${day.code}`)) throw new Error(`Missing night for ${room.id}/${day.code}.`);
}
const manifest = {
  revision: 'mw-angle-nights-r01', version: 'MW-GN02', status: 'visually_reviewed_lighting_concepts',
  scope: 'Mineral & Walnut only: 21 additional night cameras; 24 existing primary night renders retained.',
  reviewed: production.qa.reviewed, rooms,
};
await fs.writeFile(path.join(root, 'docs/mineral-walnut-night-angles-review.json'), JSON.stringify(manifest, null, 2) + '\n');
const library = await read('docs/design-options.json');
const option = library.options.find(option => option.id === 'mineral-walnut');
option.nightAnglesFile = 'docs/mineral-walnut-night-angles-review.json';
option.tags[0] = '24 spaces · 45 day/night pairs';
await fs.writeFile(path.join(root, 'docs/design-options.json'), JSON.stringify(library, null, 2) + '\n');
console.log('Promoted 21 reviewed night angles; all 45 daytime cameras now have a matching night.');
