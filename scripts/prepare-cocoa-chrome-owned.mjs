import fs from 'node:fs/promises';

const raw = 'assets/render-candidates/cocoa-chrome-owned/r08';
const floors = JSON.parse(await fs.readFile(`${raw}/verified-shell-floors.json`, 'utf8'));
const inventory = JSON.parse(await fs.readFile('docs/current-furniture.json', 'utf8'));
const itemById = new Map(inventory.items.map(item => [item.id, item]));
const base = 'https://708.hackbyrd.com/';
export const style = `IMAGE EDIT of this actual house, never an invented generic room. The FIRST image controls only corrected architecture, camera, fixed openings and assigned owned furniture positions. Original real model-home photography and the blueprint verify its shell. Replace all inherited Mineral/Walnut finishes with COCOA & CHROME OPTION 2: smoky neutral BROWN OAK with authentic open grain; polished STAINLESS STEEL and NICKEL silver accents; WHITE upholstery; warm PEARL/light PUTTY-GREIGE walls with depth against white furniture; soft-white ceilings/doors; matte neutral pale natural WHITE OAK floors visibly lighter than dark furniture. No orange walnut, walnut headwall, gold/brass fittings, honey floor or dramatic warm mineral trowel clouds. Keep actual white glazing and ceiling profiles. Slate/ink/navy blue belongs in art and small textiles; butter-yellow is a small removable accent, never a wall. Off-white ripple-fold sheers and independent opaque layers stacked open in day. New fitted storage varies by room: discreet stainless details on grounded brown-oak bases, not repeated sample-drawer metal bands. OWNED products keep exact forms, fabrics and supports, including their authentic legs where present. Photoreal editorial interior photography, neutral daylight, believable metal reflections and textile weave. Crown townhouse exterior views. No people, labels, watermarks, new openings, added ceiling coves or enlarged rooms.`;

const core = {
  ownerbed: {
    code: 'OB1', index: 1001, products: ['modena-king', 'bezier-nightstand', 'bezier-dresser', 'bates-table-lamp'],
    prompt: `OWNERS SUITE: north-wall headboard, four west sash units, solid south TV/dresser wall and actual east door/arch positions stay. Owned MODENA PANEL KING, White Italian Textured Weave, 48-inch headboard and GREY OAK feet; TWO OPEN26 BEZIER BrownOak/PolishedSS nightstands, ONE eight-drawer LOW Bezier dresser (4rows by2) with POLISHEDSTAINLESS, TWO BATES PolishedNickel lamps, Hadiza8x10 Cream/Sand rug. These open nightstands are not sample two-drawer replicas. Keep the white bed unchanged, no extra headboard, bench or window dresser. Smooth pearl-greige headwall, no walnut wainscot or tan Roman Clay. Blue-white atmospheric art in thin silver frames above bed. White bedding, one restrained ink-blue folded throw and one small pale butter-yellow lumbar. Retain55-inchTV/soundbar over south dresser. No furniture LED retrofits or added sconces. Bezier stays smoky BrownOak, never lightNatural wood.`,
  },
  loft: {
    code: 'PL1', index: 1002, products: ['machinto-media', 'machinto-side', 'marble-coffee', 'arc-floor-lamp'],
    prompt: `PENTHOUSE: south French doors and TWO small flank windows, west wide slider, SW recessed bar, raised tray ceiling and east TV wall remain. Owned Cloud LUXE45: TWO CORNERS plus ONE ARMLESS, straight134-inch three-seat run, ONE detached45-inch ottoman at the NEAR, SCREEN-RIGHT sofa end shown in the accepted corrected PL1 camera; do not mirror it to the far-left end. White Perennials Performance TEXTURED Linen Weave, feather-wrapped. No second ottoman/sofa. ONE MACHINTO Panel Double-Door Media Console with Drawers in BrownOak/PolishedSS, TWO18-inch ROUND Machinto BrownOak/silver sides at sofa ends, ONE48x24 CARRARA marble PLINTH coffee with no legs, ONE ARC II PolishedNICKEL lamp, Sanani9x12 Natural/Mink cream/taupe rug (not wrong MarledGrey swatch), TWO ROME Graphite-seat polishedSS stools at the bar. Bar becomes smokyBrownOak with short stainless pulls, limited reeded-glass uppers and quiet pale-grey Carrara-look counter. Slate-blue pillows, ONE small butter-yellow pillow, blue-white art, green plants. Replace warm mushroom source walls with clean pearl-greige. White Cloud stays white. Do not change actual stool/lamp supports into floor plinths.`,
  },
  sunroom: {
    code: 'S1', index: 1003, products: ['maslow-table', 'emery-chair', 'emery-armchair'],
    prompt: `SUNROOM: two LEFT and three REAR sash banks with transoms/knee walls, oven/microwave tower left foreground and terrace glass door extreme RIGHT remain. Compact12ft3 by9ft3. Entire owned set: MASLOW SPIDER72-inch EspressoWALNUT top/PolishedALUMINUM spider base (named actual walnut exception, never refinish it or give it plain wood legs), FOUR EMERY WHITE Perennials Performance TexturedLinen SIDE chairs (two each long side), TWO matching EMERY TRACK ARM chairs (one each end), actual polishedSS leg frames. SIX total chairs, no Nicola substitution. Smooth pearl-greige walls, soft-white trim, bare pale neutral oak floor; no rug allocated here. Ivory ripple-fold sheers, concealed independent privacy rollers open in day. Refined polished-silver/opal LINEAR chandelier proportionate to72 table replaces the source black fixture. One low blue ceramic centerpiece with small airy pale-yellow stems; no tall arrangement obscuring chairs. Kitchen glimpse uses smokyBrownOak island/bases, ivory uppers and quiet grey/Carrara-like stone, never walnut/C1 warm quartzite.`,
  },
};

const requests = [];
for (const floor of floors) for (const room of floor.rooms) {
  const block = core[room.id];
  if (!block) continue;
  const view = room.views.find(view => view.code === block.code);
  const values = [view.jobId, ...(room.originalPhotos || []).map(photo => base + photo.src), base + floor.plan, ...block.products.map(id => base + itemById.get(id).image)].slice(0, 8);
  requests.push({ index: block.index, room: room.id, code: block.code, sourceJobId: view.jobId,
    params: { model: 'gpt_image_2_5', count: 1, resolution: '2k', quality: 'high', aspect_ratio: '3:2', medias: values.map(value => ({ role: 'image', value })), prompt: style + '\n\n' + block.prompt } });
}
await fs.writeFile(`${raw}/style-lock.txt`, style);
await fs.writeFile(`${raw}/core-requests.json`, JSON.stringify(requests, null, 2));
console.log(JSON.stringify(requests));
