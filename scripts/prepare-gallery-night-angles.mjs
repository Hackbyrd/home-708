// Prepare lighting-only edits. This script never submits API jobs or modifies approved views.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'docs/gallery-night-angles-production.json');
const readJson = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const approvedFloors = async file => {
  const html = await fs.readFile(path.join(root, file), 'utf8');
  const match = html.match(/<script id="review-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error(`Approved review data missing: ${file}`);
  const floors = JSON.parse(match[1]);
  if (!Array.isArray(floors) || floors.length !== 4) throw new Error(`Unexpected floor inventory: ${file}`);
  return floors;
};

const palettes = {
  'mineral-walnut': 'Keep original Option 1: warm ivory/soft mushroom mineral walls, natural matte oak floors, rich walnut, ivory/oatmeal/charcoal textiles, dark small accents and green plants. Preserve the APPROVED selected A/C1/E stone/porcelain exactly where seen. Neutral bedrooms retain their actual original textiles and artwork; do not add purple, blue, pink or yellow bedroom accents. Preserve any existing subtle owner-bath towel/art accent in its source. No Cocoa & Chrome brown-oak/stainless furniture assumptions or blue/yellow restyling. Exposed oak stairs and warm-white risers stay bare, with NO stair runners.',
};

function windowOperation(room, schedule, option) {
  const treatment = room.windowTreatment ?? schedule;
  if (!treatment) throw new Error(`Window schedule missing for ${room.id}`);
  const common = 'Operate ONLY existing window-treatment layers actually depicted by the exact source. Preserve fabric color, folds, tracks, coverage and curtain position except the specified closure. Do not install a missing blackout layer, invent a shade/track, add ceiling pockets, or drape an internal door. High stair windows and high transoms remain bare and show dark outdoors. Internal clear-glass doors remain clear. Existing exterior glazing positions/counts never change.';
  const systems = {
    blackout: 'Close the actual existing opaque blackout panels/roller at visible exterior windows for sleeping; retain the independent sheer layer nearest glass. Covered windows must not glow like daylight or show a transparent outside scene.',
    privacy: 'Close/lower actual existing opaque privacy shades behind existing open sheers at visible exterior windows or exterior glazed doors. Retain bare high transoms. Do not represent a sheer alone as opaque nighttime privacy.',
    practical: 'Close actual existing practical privacy rollers or Roman shades at visible exterior glazing. Do not add full-height drapes to kitchen, gym, laundry or bathrooms. Keep interior shower glass clear; existing external shower-window obscuration remains.',
    none: 'No new curtain or shade. Actual uncovered glazing shows genuine dark outdoors.',
  };
  let operation = systems[treatment.system];
  if (!operation) throw new Error(`Unknown window system ${treatment.system}: ${room.id}`);
  if (room.id === 'entry') operation = 'If the real exterior front door is actually visible and its existing privacy solution is depicted, lower that existing layer without covering the inscription. If not visible or no existing shade is depicted, add nothing. Internal clear gallery doors remain clear; no gallery drapes.';
  if (room.id === 'sharedbath') operation = 'This bathroom remains windowless. Only in an actually visible/reflected adjoining bedroom, close its existing blackout layer; do not add any window treatment inside this bathroom.';
  if (room.id === 'kitchen') operation += ' Visible adjoining sunroom lower glazing follows its existing privacy-layer closure; its high transoms remain bare.';
  return {
    system: treatment.system,
    recommendation: treatment.recommendation,
    coverage: treatment.coverage,
    why: treatment.why,
    night: treatment.night,
    provenance: room.windowTreatment ? 'Approved room windowTreatment' : 'MW-W01 functional privacy schedule; Cocoa source materials retained',
    operation: `${common} ${operation} ${option === 'cocoa-chrome' ? 'Borrow privacy FUNCTION only from the schedule; keep Cocoa & Chrome curtain/metal/fabric materials exactly as source.' : ''}`.trim(),
  };
}

const options = [
  ['mineral-walnut', 'Mineral & Walnut', 'docs/house-design-review.html'],
];
const night = await readJson('docs/mineral-walnut-night-review.json');
const windows = await readJson('docs/mineral-walnut-window-treatments.json');
// Read instruction sources as an explicit preparation prerequisite. Later room revisions win.
for (const file of ['docs/higgsfield-handoff.md', 'docs/render-audit.md']) {
  if (!(await fs.readFile(path.join(root, file), 'utf8')).trim()) throw new Error(`Empty source: ${file}`);
}
const requests = [];
const inventory = [];
const existingNights = [];
for (const [option, name, file] of options) {
  const floors = await approvedFloors(file);
  for (const floor of floors) for (const room of floor.rooms) {
    const baseline = night.rooms[room.id];
    if (!baseline?.lighting) throw new Error(`Missing lighting baseline: ${room.id}`);
    const schedule = windows.rooms.find(entry => entry.id === room.id);
    const treatment = windowOperation(room, schedule, option);
    const currentNights = [...(room.nights ?? []), ...(room.night ? [room.night] : [])];
    for (const existing of currentNights) {
      const day = room.views.find(view => view.code === existing.sourceCode);
      if (!day || existing.sourceJobId !== day.jobId || existing.sourceFile !== day.file) {
        throw new Error(`Existing night is not paired to current source: ${option}/${room.id}/${existing.code}`);
      }
      existingNights.push({ option, floor: floor.id, room: room.id, code: existing.code, sourceCode: existing.sourceCode, sourceFile: existing.sourceFile, sourceJobId: existing.sourceJobId, jobId: existing.jobId, file: existing.file });
    }
    for (const view of room.views) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(view.jobId ?? '')) throw new Error(`Missing canonical image UUID: ${option}/${room.id}/${view.code}`);
      inventory.push({ option, floor: floor.id, room: room.id, code: view.code, sourceFile: view.file, sourceJobId: view.jobId });
      if (currentNights.some(existing => existing.sourceCode === view.code)) continue;
      const dimensions = await sharp(path.join(root, view.file)).metadata();
      if (!dimensions.width || !dimensions.height) throw new Error(`Unreadable exact day file: ${view.file}`);
      const aspect = dimensions.width > dimensions.height ? '3:2' : '2:3';
      const targetRatio = dimensions.width > dimensions.height ? 1.5 : 2 / 3;
      if (Math.abs(dimensions.width / dimensions.height / targetRatio - 1) > 0.035) throw new Error(`Unexpected source aspect ratio: ${view.file}`);
      const lighting = baseline.lighting;
      const index = 51001 + requests.length;
      const code = `${view.code}-GN01`;
      const prompt = `IMAGE EDIT — lighting/weather only. Image 1 is the EXACT approved ${name} ${room.title} DAYTIME image, ${view.code}; output this identical camera at NIGHT. This is a single-image edit, never text-to-image.\n\nSTRUCTURE/COMPOSITION LOCK: Keep the exact camera location, lens, framing, perspective, every wall, window, door, mullion, stair quarter-turn/halfway landing/open well, ceiling, room size, fixed services, and ALL furniture/art/plants/accessories. Do not borrow another room's camera. Preserve current source-audited architecture and inherited plan-led/alternate-angle limitations rather than attempting a redesign. Preserve every visible inscription verbatim, artwork subject, TV/soundbar/speaker location, cabinet silhouette, countertop, rug, floor, upholstery and finish. No new fixture, opening, cove, furniture, object, logo, caption, watermark or inset. Do not crop or create a collage.\n\nEXACT OPTION PALETTE: ${palettes[option]}\n\nNIGHT WINDOW OPERATION: ${treatment.operation}\n\nROOM LIGHTING INTENT: ${lighting} Approximately ${baseline.cct} K electric-source appearance. This room-level lighting intent is shared by all its angles; it is NOT permission to add a fixture missing from this particular source or import another option's lamp/pendant geometry. Light from existing off-camera sources is allowed only when consistent with this same room. Use plausible inverse falloff, soft shadows and accurate reflections in mirrors, glazing, porcelain and polished metal.\n\nNIGHT PHOTOGRAPHY: True dark Crown/Gaithersburg townhouse exterior where visible: same nearby townhomes/rooflines/urban streetscape as source, restrained neighboring window lights, no countryside, ocean, fantasy stars or skyline. Eliminate direct sunlight, daylight patches and sunlit adjoining rooms/reflections. Keep materials readable with balanced photographic exposure and white balance: warm ivory stays ivory, white upholstery stays white, dark wood retains grain, chrome remains silver and accent colors remain themselves. No global orange/sepia/blue filter, excessive glow, glare bloom or crushed-black room. No people or pets. Preserve source aspect ${aspect} at 4K. Lighting intent visualization, not a measured illuminance simulation.`;
      requests.push({
        index, option, optionName: name, floor: floor.id, room: room.id, title: room.title,
        code, sourceCode: view.code, sourceFile: view.file, sourceJobId: view.jobId,
        sourceUrl: `https://708.hackbyrd.com/${view.src.split('/').map(encodeURIComponent).join('/')}`,
        sourceDimensions: { width: dimensions.width, height: dimensions.height },
        sourceEvidence: { type: view.evidenceType, evidence: view.evidence, qaNote: view.qaNote },
        scene: baseline.scene,
        lighting, cct: baseline.cct, circuits: baseline.circuits,
        circuitsNote: 'Existing room lighting/control intent only; do not add a fixture or circuit absent from the approved source.',
        windowTreatment: treatment,
        file: `assets/render-candidates/gallery-night-angles/r01/${option}/${room.id}-${view.code.toLowerCase()}-night.png`,
        params: { model: 'nano_banana_2_1', aspect_ratio: aspect, resolution: '4k', thinking_level: 'high', count: 1, medias: [{ role: 'image', value: view.jobId }], prompt },
      });
    }
  }
}

const countFor = option => requests.filter(request => request.option === option).length;
if (inventory.length !== 45 || countFor('mineral-walnut') !== 21 || existingNights.length !== 24) {
  throw new Error('Unexpected approved inventory; inspect coverage before preparing a different batch.');
}
const sourceSignature = createHash('sha256').update(JSON.stringify({ inventory, existingNights, requests })).digest('hex');
const oldText = await fs.readFile(output, 'utf8').catch(error => {
  if (error.code === 'ENOENT') return null;
  throw error;
});
if (oldText) {
  const old = JSON.parse(oldText);
  if (old.jobs?.length || old.requests?.some(request => request.jobId || request.job_id || request.submittedAt || request.status === 'submitted') || old.status !== 'prepared') {
    throw new Error('Refusing to overwrite submitted/in-progress/approved jobs. Preserve this manifest and prepare a new revision deliberately.');
  }
  if (old.sourceSignature !== sourceSignature || JSON.stringify(old.requests) !== JSON.stringify(requests)) {
    throw new Error('Existing prepared manifest differs from current sources. Review the difference before replacing a prepared batch.');
  }
  console.log(`Already prepared; unchanged: ${requests.length} lighting-only image edits.`);
} else {
  const manifest = {
    version: 'GALLERY-N01', created: new Date().toISOString(), status: 'prepared', sourceSignature,
    scope: 'Mineral & Walnut only: complete paired nighttime coverage for all 45 approved day angles. Retain its 24 current nights and prepare only the 21 missing alternate-angle nights. Cocoa & Chrome is outside this batch.',
    instructions: ['docs/higgsfield-handoff.md', 'docs/render-audit.md', 'docs/mineral-walnut-night-review.json', 'docs/mineral-walnut-window-treatments.json'],
    approvedSources: options.map(([option, name, file]) => ({ option, name, file })),
    coverage: { dayViews: 45, retainedNightViews: 24, newNightRequests: 21, 'mineral-walnut': { dayViews: 45, retainedNights: 24, requests: 21 } },
    existingNights, requests, jobs: [],
    qa: {
      status: 'pending',
      required: [
        'Compare every result with its exact approved daytime source; camera, framing, geometry, objects, colors and inscriptions must match.',
        'Confirm exact sourceCode/sourceFile/sourceJobId provenance; reject changed viewpoints or reused unrelated night angles.',
        'Preserve Mineral & Walnut selected A/C1/E stone, original neutral bedrooms and bare oak stairs; do not import Cocoa & Chrome finishes or accents.',
        'Only existing treatment layers may close; flag a source without the specified privacy/blackout hardware rather than inventing it.',
        'True night in all visible adjoining rooms, windows and reflections; no daylight patches, new fixtures, excessive glow or global color filter.',
        'Reject new windows, moved doors, ceiling/stair changes, mirror contradictions, landscape fantasy, changed art/text or undersized/invalid image outputs.',
        'Night concepts retain existing source inference limits; they are not dimension verification, construction elevations or lighting calculations.',
      ],
    },
  };
  await fs.writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  console.log(`Prepared ${requests.length} Mineral & Walnut lighting-only image edits. No jobs submitted.`);
}
