/** Materialize reviewed Option 2 data/assets; production builds use its checked-in outputs. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { cocoaChromeReleaseErrors } from './build-cocoa-chrome-owned.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawDirectory = 'assets/render-candidates/cocoa-chrome-owned/r08';
const publicDirectory = 'cocoa-chrome-owned-assets';
const list = value => value == null ? [] : Array.isArray(value) ? value : [value];
const unique = values => [...new Set(values.filter(Boolean))];
const approved = record => record?.qa?.approved === true || record?.qa === 'approved';
const roomMap = source => new Map(Array.isArray(source?.rooms) ? source.rooms.map(room => [room.roomId || room.id, room]) : Object.entries(source?.rooms || source?.roomNotes || {}));

async function readJson(file, optional = false) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) { if (optional && error.code === 'ENOENT') return null; throw error; }
}

export function expandMaterialSpecifications(spec, finishSchema) {
  const rows = list(spec.materials).length ? list(spec.materials) : list(spec.finishRefs).map(finishId => ({ finishId }));
  return rows.map(item => {
    if (typeof item === 'string' && !finishSchema[item]) return item;
    const reference = typeof item === 'string' ? { finishId: item } : item;
    if (!reference.finishId) return structuredClone(reference);
    const finish = finishSchema[reference.finishId];
    if (!finish) throw new Error(`Unknown Cocoa & Chrome finish reference: ${reference.finishId}`);
    return {
      finishId: reference.finishId,
      surface: reference.surface || finish.surface,
      finish: reference.finish || finish.appearance,
      description: unique([reference.roomApplication, finish.stairRule, finish.hierarchy, finish.ownedException]).join(' '),
      substratePreparation: reference.substratePreparation || finish.substrate || 'The responsible trade verifies the existing substrate and selected manufacturer preparation requirements before installation.',
      installation: reference.installation || finish.approach,
      sampleApproval: reference.sampleApproval || finish.sampleApproval || 'Approve the actual material and room samples in daylight and specified artificial light before full ordering or fabrication.',
      care: reference.care || finish.care || 'Follow the selected manufacturer cleaning, maintenance and repair directions; retain product data and matching repair material.',
    };
  });
}

function normalizeFurniture(item) {
  const price = item.unitPrice || item.currentPriceOrSale || item.currentPrice || item.price;
  const unitPrice = typeof price === 'number' ? price : price?.amount != null ? { ...price, low: price.amount, high: price.amount } : price;
  const purchaseNotes = list(item.purchaseNotes).length ? [...list(item.purchaseNotes)] : ['Recheck exact finish, fabric, aggregate quantity, stock, delivery to 20878 and measured room fit before ordering.'];
  if (price?.finalSale) purchaseNotes.push('The dated offer is final sale. Confirm configuration, room fit, delivery route and retailer terms before ordering.');
  if (item.electrical) purchaseNotes.push(item.electrical);
  return {
    ...structuredClone(item), ownership: 'new', quantity: item.quantity || 1,
    dimensions: item.dimensions || item.size,
    imageUrl: (item.imageFile || item.image || item.imageUrl || item.sourceImageUrl)?.replace(/^docs\//, ''),
    url: item.url || item.productUrl || item.sourceUrl,
    unitPrice,
    availability: item.availability || { status: item.stockStatus || 'current_verification_pending', evidence: item.stockEvidence, checkedAt: item.checkedAt },
    placement: item.placement || item.role || item.reason || 'Proposed for this room; verify the exact configuration and measured fit before ordering.',
    fitNotes: list(item.fitNotes), purchaseNotes: unique(purchaseNotes),
  };
}

function productKey(item) {
  if (item.sku || item.itemNumber || item.exactConfiguration?.sku) return `sku:${item.sku || item.itemNumber || item.exactConfiguration.sku}`;
  const url = item.url || item.productUrl || item.sourceUrl;
  if (url) return [url, item.finish, item.fabric, item.color, item.size || item.dimensions].filter(Boolean).join('|');
  return item.id || [item.name, item.finish, item.fabric, item.color, item.size || item.dimensions].filter(Boolean).join('|');
}

export function distinctNewFurniture(groups) {
  const products = new Map(), ids = new Map();
  // A later authoritative source replaces the same product record; quantities are never added twice.
  for (const group of groups) for (const item of group) {
    if (item.ownership === 'owned' || item.inventoryId || item.unitIds?.length) throw new Error('Owned furniture cannot be imported into a NEW purchase schedule.');
    const key = productKey(item);
    if (!key) throw new Error('Every new furniture selection needs a stable product identity.');
    const previousKey = item.id && ids.get(item.id);
    if (previousKey && previousKey !== key) products.delete(previousKey);
    products.set(key, normalizeFurniture(item));
    if (item.id) ids.set(item.id, key);
  }
  return [...products.values()];
}

function furnitureForRoom(source, map, roomId) {
  if (!source) return null;
  const room = map.get(roomId);
  if (room && (Array.isArray(room.newFurniture) || Array.isArray(room.newItems))) return room.newFurniture || room.newItems;
  const items = list(source.items).filter(item => (item.room || item.roomId) === roomId);
  return items.length || Array.isArray(room?.newItemIds) ? items : null;
}

export function mergeCocoaRoomSpecifications(seed, specs, social = null, privateSpecs = null) {
  if (specs.optionId !== 'cocoa-chrome' || !specs.finishSchema) throw new Error('Only the Cocoa & Chrome finish schema may be merged into Option 2.');
  for (const source of [social, privateSpecs]) {
    const optionId = source?.optionId || source?.designOption?.id;
    if (optionId && optionId !== 'cocoa-chrome') throw new Error('A sibling option purchase brief cannot be merged into Cocoa & Chrome.');
  }
  const design = structuredClone(seed), specificationRooms = roomMap(specs);
  const socialRooms = roomMap(social), privateRooms = roomMap(privateSpecs);
  design.globalStandards = { designIntent: specs.designIntent, finishPalette: specs.finishSchema, tradeCoordination: specs.globalCoordination, sourcePriority: specs.sourcePriority };
  design.completionRequirements = list(specs.limitations);
  for (const room of design.floors.flatMap(floor => floor.rooms)) {
    const spec = specificationRooms.get(room.id);
    if (!spec) throw new Error(`Missing Cocoa & Chrome build specification for ${room.id}`);
    const privateRoom = privateRooms.get(room.id), socialRoom = socialRooms.get(room.id);
    room.materials = expandMaterialSpecifications(spec, specs.finishSchema || {});
    room.buildOuts = structuredClone(spec.buildOuts || spec.joinery || []);
    const customRows = [...list(spec.supportingAllowances), ...list(social?.customBuildouts).filter(item => (item.room || item.roomId) === room.id)];
    const custom = [...new Map(customRows.map(item => [item.id || item.name, item])).values()];
    if (custom.length) room.buildOuts.push(...custom.map(item => ({ ...structuredClone(item), dimensions: item.size || item.dimensions, scope: `${item.quantity || 1} proposed unit(s). ${item.scope}`, status: 'Selected custom design scope; measured drawings, material samples and contractor fabrication quote required. Not a separate retail furniture purchase.' })));
    const textiles = [...list(spec.supportingTextiles), ...list(social?.supportingTextiles).filter(item => (item.room || item.roomId) === room.id)];
    room.supportingTextiles = [...new Map(textiles.map(item => [item.id || item.name, structuredClone(item)])).values()];
    room.architectureLocks = structuredClone(spec.geometryLocks || spec.architectureLocks || []);
    room.lighting = { ...structuredClone(spec.lighting), cct: parseInt(spec.lighting?.colorTemperature) || 2700 };
    const window = spec.windowTreatments || spec.windowTreatment || {};
    room.windowTreatment = {
      ...structuredClone(window), recommendation: window.recommendation || window.specification,
      why: window.why || 'Use this room’s stated privacy and light-control conditions while preserving actual openings. Measured site sightlines determine the final treatment need.',
      day: window.day || privateRoom?.windowTreatment?.day || 'Use only the specified installed layers; adjust them for daylight and glare as shown in the approved day view. Preserve glazing specified to remain bare.',
      night: window.night || privateRoom?.windowTreatment?.night || 'Apply this room’s stated full opaque privacy or blackout coverage at night; do not cover glass explicitly specified bare or add unselected fixtures.',
      installation: window.installation || window.workroomCoordination,
    };
    room.contractorNotes = structuredClone(spec.contractorCoordination || []);
    room.contractorSequence = structuredClone(spec.contractorSequence || [
      'Survey the actual enclosure, openings, services and furniture delivery route; preserve the source geometry locks.',
      'Approve physical finish/product samples, furniture footprints, cabinet drawings, lighting locations and window-treatment support.',
      'Coordinate necessary rough services, blocking, trade inspections and substrate repairs before closing or finishing surfaces.',
      'Complete permanent floors, fitted work and room wall/ceiling finishes in the sequence agreed by the responsible trades; protect completed surfaces.',
      'Install and commission selected lighting, AV and room-specific privacy/blackout treatments.',
      'Place assigned owned furniture and verified new purchases, check circulation and complete the punch list.',
    ]);
    room.furnitureCoordination = spec.furnitureCoordination || { principle: spec.purchaseAndFabricationGate };
    room.measurementNotes = unique([...list(spec.unresolvedItems), ...list(privateRoom?.measurementNotes), ...list(socialRoom?.measurementNotes), spec.purchaseAndFabricationGate]);
    room.purchaseNotes = unique([...list(privateRoom?.purchaseNotes), ...list(socialRoom?.purchaseNotes), spec.purchaseAndFabricationGate]);
    room.avSystem = spec.avSystem || privateRoom?.avSystem || socialRoom?.avSystem || room.avSystem;
    room.intent = socialRoom?.designIntent || privateRoom?.designIntent || spec.designIntent || room.intent;
    room.notes = unique([...room.architectureLocks, 'Owned and NEW furniture remain separate. Product specifications, physical samples and measured trade drawings govern purchase and construction.']);
    const privateItems = furnitureForRoom(privateSpecs, privateRooms, room.id), socialItems = furnitureForRoom(social, socialRooms, room.id);
    if (privateItems !== null || socialItems !== null) room.newFurniture = distinctNewFurniture([privateItems || [], socialItems || []]);
    // Never merge ownedAllocations or ownedFurniture from companion briefs: the existing 39-unit allocation is authoritative.
  }
  return design;
}

function ledgerRows(value) { return Array.isArray(value) ? value : value?.jobs || value?.records || []; }
export function publicReviewNote(record, room, night = false) {
  if (record.publicQaNote) return record.publicQaNote;
  const note = record.qaNote || '';
  // Generation ledgers sometimes use compressed production shorthand; keep that out of room captions.
  const compressed = /\b(?:[A-Z][a-z]+[A-Z][A-Za-z]*|[a-z]+[A-Z]{2,}[A-Za-z]*|[A-Z]{2,}[a-z]+[A-Za-z]*|Sourcefireplace|highwindows|taskchair|plinthconsole|planroom|silverrectangularopal)\b/.test(note);
  if (!compressed) return note;
  return night
    ? `${room.title}: this paired night study was visually reviewed against the current approved ${record.sourceCode} day camera. Furniture, fixed openings and installed fixtures remain consistent; privacy applies only to the room's specified openings. Measured illumination, blackout performance and installation still require commissioning.`
    : `${room.title}: the source camera, fixed openings, assigned owned furniture, selected NEW furniture and Cocoa & Chrome finishes were visually reviewed. Exact dimensions, physical samples, fabrication details and current procurement still require verification.`;
}
export function reviewedCameraSelections(design, days, nights) {
  const dayMap = new Map(), nightMap = new Map();
  const rooms = new Map(design.floors.flatMap(floor => floor.rooms).map(room => [room.id, room]));
  for (const record of ledgerRows(days).filter(approved)) {
    const id = record.room || record.roomId, room = rooms.get(id);
    if (!room?.views.some(view => view.code === record.code)) throw new Error(`Unknown approved day camera: ${id}/${record.code}`);
    if (!record.job_id && !record.jobId || !record.file || !record.qaNote) throw new Error(`Incomplete approved day evidence: ${id}/${record.code}`);
    dayMap.set(`${id}/${record.code}`, { ...record, room: id, job_id: record.job_id || record.jobId, qa: { ...(typeof record.qa === 'object' ? record.qa : {}), approved: true } });
  }
  const latestNights = new Map();
  for (const record of ledgerRows(nights).filter(approved)) latestNights.set(`${record.room || record.roomId}/${record.sourceCode}`, record);
  for (const record of latestNights.values()) {
    const id = record.room || record.roomId, code = record.sourceCode, room = rooms.get(id);
    const day = dayMap.get(`${id}/${code}`);
    if (!room?.nights.some(view => view.sourceCode === code) || !day) throw new Error(`Approved night has no current approved day camera: ${id}/${code}`);
    if (!record.job_id && !record.jobId || !record.file || !record.qaNote) throw new Error(`Incomplete approved night evidence: ${id}/${code}`);
    if (record.sourceJobId !== day.job_id) throw new Error(`Stale or missing night source: ${id}/${code}; use exact approved day job ${day.job_id}.`);
    nightMap.set(`${id}/${code}`, { ...record, room: id, job_id: record.job_id || record.jobId, qa: { ...(typeof record.qa === 'object' ? record.qa : {}), approved: true } });
  }
  return { dayMap, nightMap };
}

export async function syncCocoaChromeOwned({ root = defaultRoot, raw = rawDirectory } = {}) {
  const docs = path.join(root, 'docs'), seedFile = path.join(docs, 'cocoa-chrome-owned-design.json');
  const seed = await readJson(seedFile), specs = await readJson(path.join(docs, 'cocoa-chrome-owned-build-specs.json'));
  const social = await readJson(path.join(docs, 'cocoa-chrome-owned-social-specs.json'), true) || await readJson(path.join(docs, 'cocoa-chrome-owned-new-social.json'), true);
  const privateSpecs = await readJson(path.join(docs, 'cocoa-chrome-owned-private-specs.json'), true);
  const days = await readJson(path.join(root, raw, 'approved-days.json'));
  const nights = await readJson(path.join(root, raw, 'approved-nights.json'), true) || [];
  const design = mergeCocoaRoomSpecifications(seed, specs, social, privateSpecs);
  const { dayMap, nightMap } = reviewedCameraSelections(design, days, nights);
  const inventory = await readJson(path.join(docs, 'current-furniture.json'));
  const jobs = [], pendingAssets = [];
  for (const room of design.floors.flatMap(floor => floor.rooms)) {
    for (const view of room.views) {
      const record = dayMap.get(`${room.id}/${view.code}`);
      if (!record) continue;
      const stem = `${publicDirectory}/${room.id}-${view.code}-r08-day`;
      const metadata = await sharp(path.resolve(root, record.file)).metadata();
      if (!metadata.width || !metadata.height) throw new Error(`Unreadable approved image: ${record.file}`);
      Object.assign(view, { jobId: record.job_id, index: record.index, file: record.file, src: `${stem}.webp`, thumb: `${stem}-thumb.webp`, qa: record.qa, qaNote: publicReviewNote(record, room), model: record.model, revision: design.revision, width: Math.min(metadata.width, 2400), height: Math.round(metadata.height * Math.min(1, 2400 / metadata.width)), evidence: record.evidence || `The ${view.code} source photograph/blueprint camera governs architecture only. This new Cocoa & Chrome edit applies the current owned allocation, selected NEW pieces and distinct finish scheme.`, evidenceType: record.evidenceType || view.evidenceType });
      pendingAssets.push({ file: path.resolve(root, record.file), stem });
      jobs.push({ ...record, qaNote: view.qaNote, code: view.code, status: 'completed', webSrc: view.src, outputFile: `docs/${view.src}` });
    }
    for (const view of room.nights || []) {
      const record = nightMap.get(`${room.id}/${view.sourceCode}`);
      if (!record) continue;
      const day = room.views.find(day => day.code === view.sourceCode), stem = `${publicDirectory}/${room.id}-${day.code}-r08-night`;
      const metadata = await sharp(path.resolve(root, record.file)).metadata();
      if (!metadata.width || !metadata.height) throw new Error(`Unreadable approved image: ${record.file}`);
      Object.assign(view, { jobId: record.job_id, index: record.index, file: record.file, src: `${stem}.webp`, thumb: `${stem}-thumb.webp`, sourceJobId: record.sourceJobId, qa: record.qa, qaNote: publicReviewNote(record, room, true), model: record.model, revision: design.revision, width: Math.min(metadata.width, 2400), height: Math.round(metadata.height * Math.min(1, 2400 / metadata.width)), evidenceType: 'Exact-source paired Cocoa & Chrome night edit', evidence: `This night edit uses the exact approved ${day.code} day job, preserving camera, architecture, products and fixtures while changing light output and the specified privacy state.`, lighting: room.lighting.night, cct: room.lighting.cct, circuits: room.lighting.controlGroups });
      pendingAssets.push({ file: path.resolve(root, record.file), stem });
      jobs.push({ ...record, qaNote: view.qaNote, code: view.code, status: 'completed', webSrc: view.src, outputFile: `docs/${view.src}` });
    }
    room.night = room.nights?.[0];
  }
  const production = { revision: design.revision, status: 'in_preparation', jobs };
  const errors = cocoaChromeReleaseErrors(design, production, inventory);
  if (!social || !privateSpecs) errors.push('Complete Cocoa & Chrome social and private NEW furniture briefs are required before publication.');
  const allReviewed = dayMap.size === 45 && nightMap.size === 45 && !errors.length;
  design.status = production.status = allReviewed ? 'complete' : 'in_preparation';
  design.syncDiagnostics = { approvedDays: dayMap.size, approvedNights: nightMap.size, sourceFiles: ['cocoa-chrome-owned-build-specs.json', ...(social ? ['Cocoa & Chrome social selections'] : []), ...(privateSpecs ? ['cocoa-chrome-owned-private-specs.json'] : [])], releaseErrors: errors };
  // Preflight all metadata and provenance before any canonical file is replaced.
  await fs.mkdir(path.join(root, 'tmp'), { recursive: true });
  const stage = await fs.mkdtemp(path.join(root, 'tmp/cocoa-sync-'));
  try {
    for (let index = 0; index < pendingAssets.length; index++) {
      const asset = pendingAssets[index];
      await sharp(asset.file).resize({ width: 2400, withoutEnlargement: true }).webp({ quality: 88, effort: 5 }).toFile(path.join(stage, `${index}.webp`));
      await sharp(asset.file).resize({ width: 680, withoutEnlargement: true }).webp({ quality: 79, effort: 5 }).toFile(path.join(stage, `${index}-thumb.webp`));
    }
    for (let index = 0; index < pendingAssets.length; index++) {
      const asset = pendingAssets[index], target = path.join(docs, asset.stem);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.rename(path.join(stage, `${index}.webp`), `${target}.webp`);
      await fs.rename(path.join(stage, `${index}-thumb.webp`), `${target}-thumb.webp`);
    }
    await fs.writeFile(seedFile, JSON.stringify(design, null, 2) + '\n');
    await fs.writeFile(path.join(docs, 'cocoa-chrome-owned-production.json'), JSON.stringify(production, null, 2) + '\n');
  } finally { await fs.rm(stage, { recursive: true, force: true }); }
  return { status: design.status, approvedDays: dayMap.size, approvedNights: nightMap.size, errors, rooms: design.floors.flatMap(floor => floor.rooms).length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--help')) {
    console.log('Usage: node scripts/sync-cocoa-chrome-owned.mjs\nMaterialize QA-approved Cocoa & Chrome day/night ledgers and merge room specifications into checked-in public data. Incomplete coverage stays in preparation. No images are generated and no pages are published.');
    process.exit(0);
  }
  const result = await syncCocoaChromeOwned();
  console.log(`Synced Cocoa & Chrome: ${result.rooms} rooms, ${result.approvedDays} approved days / ${result.approvedNights} exact nights; status ${result.status}.`);
}
