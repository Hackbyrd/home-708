import fs from 'node:fs/promises';
import sharp from 'sharp';

const raw = 'assets/render-candidates/cocoa-chrome-owned/r08';
const source = JSON.parse(await fs.readFile(`${raw}/verified-shell-floors.json`, 'utf8'));
const build = JSON.parse(await fs.readFile('docs/cocoa-chrome-owned-build-specs.json', 'utf8'));
const inventory = JSON.parse(await fs.readFile('docs/current-furniture.json', 'utf8'));
const byId = new Map(inventory.items.map(item => [item.id, item]));
const style = await fs.readFile(`${raw}/style-lock.txt`, 'utf8');
const social = await fs.readFile('docs/cocoa-chrome-owned-social-specs.json','utf8').then(JSON.parse).catch(()=>({}));
const privateSpec = await fs.readFile('docs/cocoa-chrome-owned-private-specs.json','utf8').then(JSON.parse).catch(()=>({}));
const selected = process.argv.slice(2);
const base = 'https://708.hackbyrd.com/';
const approved = await fs.readFile(`${raw}/approved-days.json`,'utf8').then(JSON.parse).catch(()=>[]);
const productIds = { dining: ['cabrera-console','round-mirror','spiridon-chandelier'], living: ['martini-side'], ownercloset: ['clio-vanity','blythe-stool','leaner-mirror'], bed2: ['modena-queen','orbiter-wall-lamp','delfina-rug'] };
const special = {
  kitchen: 'Do not duplicate the two owned Rome stools here. Show exactly FOUR NEW white upholstered seats on polished-silver frames, correct counter height. The adjacent sunroom uses the actual dark Maslow spider dining table and SIX white Emery chairs. Use TWO modest polished-silver opal globe pendants, not oversized brass rings.',
  stair2: 'Through any opening, the great room has a tailored WHITE two-cushion sofa on a polished-chrome metal base, brown-oak continuous-plinth sideboards and blue-white art. Keep the first-image camera and every tread/half-landing. No stair runner. Keep white stringers and rail geometry; pale natural oak treads and polished-silver lamp details.',
  stair3: 'Exactly THREE high paired 2×2 rectangular sash units stay at the top of the double-height wall. High windows are bare. Retain the quarter fanned turn, intermediate half-level landing and straight upper flight. No floor-level drapes in this high stair void; no stair runner.',
  ownerbath: 'Only ONE physical SOUTH dry-zone window; the apparent second window on shower glass is a REFLECTION. Closed privacy night layer belongs on that real window only. Grey-white fine-vein porcelain, smoky brown-oak vanity and polished stainless/nickel taps. No cream onyx, honey stone or gold veins. White/blue art and dark-blue towels only as small removable accents.',
  bath: 'No invented window. Keep first-image exact plan-led camera and fixture placement. All stone is quiet pale pearl-gray porcelain with fine gray veins, brown-oak cabinet and polished stainless hardware on a sealed full plinth.',
  bath4: 'WINDOWLESS compact bath. Keep exact first-image layout. Quiet white/pearl-gray fine-vein porcelain and smoky brown oak with polished silver. Never create a new tub or exterior window.',
  laundry: 'Far rectangular window and nearer arch are separate physical openings, both retained. Counter/sink LEFT, washer/dryer RIGHT. Use pearl-white upper cabinets and smoky brown-oak lower drawers with short stainless pulls, quieter silver taps. Exact wall graphic text: “Rinse and repeat..” Keep its small graphic. No unassigned hamper or fictitious furniture.',
  entry: 'Keep the full double-height volume and elegant silver/glass bulb cascade visible from both floors. Exact painted text is “Welcome Home” below the upper railing over the arch. Exact small 3D letters above the exit: “See you next time.” Keep all left/right doors light and clear glass where present. Floor matches pale neutral oak used throughout this option.',
  office: 'Two true 2×2 main window banks remain, centered in their walls. North wall is full Brown Oak library with TV/soundbar. Desk southeast faces northwest, large RECTANGULAR Brown Oak desktop with architectural solid pedestal/support, no circular desk. Gallery doors offset RIGHT; left of door wall has round window plus printer cabinet with blue-white art. Never move print cabinet to the south window wall. Supportive white office chair and two compact white/silver-frame guest chairs. No broad repeated silver drawer bands on NEW cabinets.',
  gym: 'Keep this gym completely EMPTY of equipment, furniture, benches and plants. Charcoal resilient rubber floor, warm pearl-greige washable walls, full wall mirror. Exact quote: “Surpass your limits. Right here, right now.” Preserve NW closet and bathroom/entry doors.',
};
const inputs = [];
let ordinal = 0;
for (const floor of source) for (const room of floor.rooms) {
  const index = 1100 + ordinal++;
  if (selected.length && !selected.includes(room.id)) continue;
  const view = room.views[0];
  const spec = build.rooms[room.id];
  const size = await sharp('docs/' + view.src).metadata();
  const aspect = size.height > size.width ? '2:3' : '3:2';
  const privateRoom = Array.isArray(privateSpec.rooms) ? privateSpec.rooms.find(value=>value.id===room.id) : privateSpec.rooms?.[room.id];
  const newItems = [...(social.items || []).filter(item=>(item.room || item.roomId)===room.id),...(privateRoom?.newItems || [])];
  const roomNote = social.roomNotes?.[room.id]?.placementAndRenderPrompt || privateRoom?.promptForEachExistingDayCode?.[view.code] || '';
  const adjacent = room.id==='sharedbath' ? approved.find(x=>x.room==='bed3'&&x.code==='B31')?.job_id : null;
  const medias = [view.jobId, ...(adjacent?[adjacent]:[]), ...(room.originalPhotos || []).slice(0,1).map(photo => base + photo.src), base + floor.plan,
    ...(productIds[room.id] || []).map(id => base + byId.get(id).image), ...new Set(newItems.map(item=>item.sourceImageUrl||item.imageUrl).filter(Boolean)), '89ed156e-6f21-4579-b46f-b4cb96c1f008'].slice(0,8);
  const furniture = newItems.map(item=>`${item.quantity || 1} NEW ${item.name}: ${item.size || item.dimensions || ''}; ${item.finish || ''}; ${item.fabric || ''}; ${item.color || ''}. ${item.shape||''} Reference qualification: ${item.photoMatchNote || ''}`).join('\n');
  inputs.push({ index, room: room.id, code: view.code, sourceJobId: view.jobId, params: { model:'gpt_image_2_5',count:1,resolution:'2k',quality:'high',aspect_ratio:aspect,
    medias:medias.map(value=>({role:'image',value})),prompt:style + '\n\nFIRST IMAGE alone fixes this target camera and room shape. Any additional complete room image is palette guidance ONLY; never borrow its geometry or unallocated furniture.\n\n' + spec.renderRecipe + '\n\n' + roomNote + '\n\n' + furniture + '\n\n' + (special[room.id] || '') }});
}
await fs.writeFile(`${raw}/primary-requests${selected.length ? '-initial' : ''}.json`, JSON.stringify(inputs,null,2));
console.log(JSON.stringify(inputs));
