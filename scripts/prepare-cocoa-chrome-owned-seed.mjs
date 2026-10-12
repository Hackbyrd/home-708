import fs from 'node:fs/promises';
import sharp from 'sharp';

const raw = 'assets/render-candidates/cocoa-chrome-owned/r08';
const source = JSON.parse(await fs.readFile(`${raw}/verified-shell-floors.json`, 'utf8'));
const allocations = JSON.parse(await fs.readFile(`${raw}/allocation-plan.json`, 'utf8')).ownedAllocations;
const media = 'cocoa-chrome-owned-assets';
await fs.mkdir(`docs/${media}`, { recursive: true });
const descriptions = [
  'A pearl-greige arrival, smoky brown-oak office and quiet cinema, with polished-silver details and restrained blue artwork.',
  'White upholstered seating, brown oak and polished silver coordinate the main level. The owned Maslow and six Emery chairs belong in the sunroom; the formal dining room retains a larger separate table and an open connection to the piano salon.',
  'Owned white Modena beds and brown-oak/stainless storage form the private suites. New coordinated guest-room pieces, pale neutral oak floors, loose rugs and quiet grey/Carrara bathroom surfaces complete the floor.',
  'The owned Cloud, Carrara plinth and brown-oak/silver collection anchor the lounge. A new guest bedroom and coordinated outdoor furnishings complete the Cocoa & Chrome palette.',
];
const floors = [];
for (const floor of source) {
  const plan = `${media}/floor-${floor.number}-plan.webp`;
  await fs.copyFile('docs/' + floor.plan, 'docs/' + plan);
  const out = { number: floor.number, id: floor.id, title: floor.title, description: descriptions[floor.number - 1], revision: 'CC-OWN-R08', plan,
    coverageNote: 'Corrected model-home and blueprint openings, stair landings and room connections govern this floor. Alternate cameras interpret the plan; verify actual dimensions, occupied furniture clearances and curtain stackback before procurement or fabrication.', rooms: [] };
  for (const room of floor.rooms) {
    const originals = [];
    for (const [i, photo] of (room.originalPhotos || []).entries()) {
      const src = `${media}/${room.id}-original-${i + 1}.webp`;
      await sharp('docs/' + photo.src).webp({ quality: 90 }).toFile('docs/' + src);
      originals.push({ ...photo, src });
    }
    const views = room.views.map(view => ({ code: view.code, id: `${view.code}-CC-OWN-R08`, index: null, jobId: null,
      label: `${room.views.indexOf(view) ? 'Companion' : 'Primary'} view · ${room.title}`, src: `${media}/${room.id}-${view.code}-r08-day.webp`, thumb: `${media}/${room.id}-${view.code}-r08-day-thumb.webp`,
      evidenceType: view.evidenceType, evidence: 'Pending new Cocoa & Chrome reference-image edit of this corrected room camera.', qaNote: 'Pending visual review; exact dimensions and product fit require a site survey.',
      geometrySource: { jobId: view.jobId, src: view.src, file: view.file, evidenceType: view.evidenceType, evidence: view.evidence }, qa: { approved: false, status: 'awaiting_new_option_two_image' } }));
    const nights = views.map(view => ({ sourceCode: view.code, sourceJobId: null, code: `${view.code}-CCN`, id: `${view.code}-CC-OWN-R08-N`, jobId: null,
      label: `Night · ${room.title} · ${view.code} camera`, src: `${media}/${room.id}-${view.code}-r08-night.webp`, thumb: `${media}/${room.id}-${view.code}-r08-night-thumb.webp`,
      evidenceType: 'Exact-source paired night edit', evidence: 'Pending approved daytime image.', qaNote: 'Pending furniture, opening, camera and privacy comparison.', qa: { approved: false, status: 'awaiting_approved_day_source' } }));
    out.rooms.push({ id: room.id, title: room.title, revision: 'CC-OWN-R08', intent: `Cocoa & Chrome ${room.title.toLowerCase()} with actual owned furniture and coordinated new supporting pieces.`,
      views, nights, originalPhotos: originals, ownedFurniture: structuredClone(allocations[room.id] || []), newFurniture: [], materials: [], buildOuts: [], lighting: {}, windowTreatment: {},
      architectureBasis: { principle: 'Actual house photos and latest confirmed blueprint interpretation govern geometry. Prior styles are geometry references only; all Option 2 finishes and styling are newly specified.', limitation: 'Design visualization, not measured construction documents. Bedroom 5 remains unbuilt.' },
      notes: ['Owned product specifications override default catalog-photo finishes. New cabinets vary in form; actual owned furniture is retained, including its authentic supports.'],
      measurementNotes: ['Confirm all actual openings, furniture dimensions, pathways, services and material samples before ordering or fabrication.'] });
  }
  floors.push(out);
}
const design = { id: 'cocoa-chrome', number: 2, name: 'Cocoa & Chrome', styleId: 'cocoa-chrome', status: 'in_preparation', revision: 'CC-OWN-R08', updated: '2026-10-12',
  styleContract: { wood: 'brown oak', metal: 'polished stainless steel', accents: ['blue', 'butter yellow'], cabinetBase: 'continuous plinth; no exposed legs', ownedExceptions: 'Actual owned chairs, tables, beds, lamps and other pieces retain their authentic supports. The owned Maslow Espresso Walnut table, Carrara plinth, charcoal concrete Cabrera and Frost/Pewter Clio keep their recorded materials.' },
  subtitle: 'Your actual RH collection, smoky brown oak, polished silver and a tailored pearl-and-blue palette.',
  summary: 'A complete Cocoa & Chrome home using every owned piece once. Pearl/greige walls and pale neutral oak give the white upholstery contrast; brown oak, polished stainless and nickel bring definition, with restrained blue and small butter-yellow accents. New furniture and varied fitted work complete the remaining rooms.',
  palette: ['#c8c4bd', '#f3f1eb', '#50443d', '#c4c7c9', '#365b7b', '#e2cc83'], heroRoom: 'great', inventorySummary: { types: 29, units: 39 }, floors,
  globalNotes: ['Only Option 2 is redesigned; Options 1 and 3 remain separate and unchanged.', 'Every owned unit is assigned once; added furniture is separately labelled.', 'All 45 cameras require newly approved Cocoa & Chrome day and same-source night images.', 'Catalog photographs can show another finish or size; homeowner SKU, configuration and quantities control.', 'Exact physical dimensions, material samples, aggregate quantities, stock and delivery must be verified before purchasing.', 'Bedroom 5 is proposed and unbuilt. Actual terrace exterior stair and fireplace conditions require confirmation.', 'The visible release badge uses the website semver only.'] };
await fs.writeFile('docs/cocoa-chrome-owned-design.json', JSON.stringify(design, null, 2));
await fs.writeFile('docs/cocoa-chrome-owned-production.json', JSON.stringify({ revision: 'CC-OWN-R08', status: 'in_preparation', jobs: [] }, null, 2));
console.log('Prepared private Option 2 seed: 24 rooms, 45 day/night slots, 29 owned types and 39 units. Existing pages stay public until release QA passes.');
