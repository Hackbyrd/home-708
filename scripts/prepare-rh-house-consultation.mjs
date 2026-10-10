import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const read = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const book = await read('docs/room-design-book.json');
const preferences = await read('docs/mineral-walnut-furniture-consultation.json');
const great = await read('docs/mineral-walnut-rh-great-room.json');
let priorHouse = null;
try { priorHouse = await read('docs/mineral-walnut-rh-house.json'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const pieces = [];
for (const file of ['docs/rh-consultation-social.json', 'docs/rh-consultation-private.json']) {
  try { const data = await read(file); pieces.push(...(Array.isArray(data) ? data : data.rooms)); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
const target = path.join(root, 'docs/design-review-assets/rh-house');
await fs.mkdir(target, { recursive: true });
const url = name => `../design-review-assets/rh-house/${name}`;
const product = p => ({ ...p, imageUrl: p.imageUrl || p.image, proposedFinish: p.proposedFinish || p.finish, planningSize: p.planningSize || p.size, reason: p.reason || p.why, priceConfigStatus: p.priceConfigStatus || p.price || 'Exact configuration and current quote pending' });
const rooms = [];
for (const room of Object.values(book.rooms)) {
  const rev = room.revisions.find(r => r.id === room.currentRevision);
  const view = room.id === 'retreat' ? (rev.views.find(v => v.code === 'OR2') || rev.views[0]) : rev.views[0];
  const fragment = pieces.find(r => r.id === room.id) || {};
  const current = `${room.id}-current.webp`;
  await sharp(path.join(root, view.file)).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 87 }).toFile(path.join(target, current));
  const photos = (room.sourceEvidence || []).filter(s => /photo/.test(s.type) && s.file && s.file.includes('Crown Georgetown Photos'));
  const photo = room.id === 'retreat' ? (photos.find(s => s.file.includes('retreat-2')) || photos[0]) : photos[0];
  let originalSrc = null;
  if (photo) { const original = `${room.id}-original.webp`; await sharp(path.join(root, photo.file)).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 87 }).toFile(path.join(target, original)); originalSrc = url(original); }
  const retaining = fragment.renderMode === 'reuse_current' || room.id === 'entry';
  const caption = room.id === 'entry' ? 'Current entrance reference retained. The compact table and ceramic lamp are supporting candidates; check lamp and separately sold shade dimensions before choosing.' : room.id === 'bath4' ? 'Plan-led Mineral & Walnut finish reference; no original room photo is available. Verify vanity, toilet, shower and entry placement against the measured plan before construction. No loose RH furniture proposed.' : fragment.renderMode === 'reuse_current' ? 'Current Mineral & Walnut reference retained because this furniture consultation does not change the room. The fitted design and room-specific functional details remain; measured plans govern construction.' : (view.evidence || 'Current Mineral & Walnut reference');
  const render = { src: url(current), currentSrc: url(current), originalSrc, status: fragment.renderStatus || (retaining ? 'Current Option 1 reference · no new furniture study' : 'Current Option 1 reference; furniture proposal pending'), caption, sourceJobId: view.jobId, sourceFile: view.file, evidenceType: view.evidenceType };
  let entry = { id: room.id, title: room.title, floor: room.floor, designSummary: '', layoutNotes: [], products: [], alternatives: [], customItems: [], purchaseNotes: [], ...fragment, architectureLocks: room.architectureLocks, windowTreatment: room.windowTreatment, render };
  if (room.id === 'great') {
    entry = { ...entry, designSummary: 'Tailored ivory Modena seating, compact shelter-arm chairs and softly contoured walnut tables, with fitted cabinets and sibling neutral art.', layoutNotes: ['Blueprint planning room: 15′1″ × 17′. Test the approximately 96″ sofa and two-chair layout before choosing current SKUs.', 'TV above the original quiet mineral fireplace; preserve both high transoms and terrace access.'], products: great.products.map(product), alternatives: great.alternatives.map(product), customItems: ['Retain the two measured fitted walnut cabinets below the transoms; catalogue sideboards are not confirmed to fit.', 'Ceramic lamp, neutral sibling artwork, plants and supplementary wool rug may be sourced at lower cost.'], purchaseNotes: ['Buy the main sofa first after a sit test and fabric sample; add the chair pair and supporting tables in later phases.', 'The finished-room RH scheme is separate from the $25,000 house-wide move-in furniture allowance.'], render: { ...render, src: '../design-review-assets/rh-great-room-study-r01.webp', status: 'RH furniture study · visually reviewed concept', caption: 'Modena sofa, 1950s shelter-arm chairs and Gael walnut tables in the actual great room. Product geometry is an illustrative interpretation, not manufacturer CAD.', jobId: great.jobId }, sources: great.products.map(p => p.url) };
  }
  entry.products = entry.products.map(product);
  entry.alternatives = entry.alternatives.map(product);
  // Preserve previously generated consultation outputs when refreshing research.
  const old = priorHouse?.rooms.find(r => r.id === room.id);
  if (old?.render?.jobId && room.id !== 'great') entry.render = { ...render, ...old.render };
  rooms.push(entry);
}
const result = { title: 'Mineral & Walnut · RH room consultations', date: '2026-10-09', status: 'Proposals for room-by-room review; nothing ordered', preferences: preferences.confirmedPreferences || preferences.preferences || [], designConstraints: preferences.designConstraints, researchScope: 'Official RH product pages and accessible collection indexes, selected by room fit and material. This is a curated house-wide shortlist, not a verified inventory of every RH SKU. Exact sizes, finishes, configured prices and delivery routes remain procurement checks.', pricingNote: 'No shopping total is approved. Keep the $25,000 minimum move-in furniture allowance separate from the long-term room schemes. Request exact configured quotes before ordering.', coverage: { roomCount: rooms.length, rhFurnitureStudies: rooms.filter(r => r.render.jobId).length, newImagesThisExpansion: rooms.filter(r => r.render.jobId && r.id !== 'great').length, retainedRoomReferences: rooms.filter(r => !r.render.jobId).length, rhProductPlacements: rooms.reduce((n, r) => n + r.products.length, 0) }, validation: priorHouse?.validation || {}, rooms };
await fs.writeFile(path.join(root, 'docs/mineral-walnut-rh-house.json'), JSON.stringify(result, null, 2) + '\n');
console.log(`Prepared ${rooms.length} room consultations; ${pieces.length} researched room fragments.`);
