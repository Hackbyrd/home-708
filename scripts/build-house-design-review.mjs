import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'docs');
const library = JSON.parse(await fs.readFile(path.join(output, 'design-options.json'), 'utf8'));
const optionId = process.argv[2] || 'mineral-walnut';
const option = library.options.find(entry => entry.id === optionId);
if (!option) throw new Error(`Unknown design option: ${optionId}`);
const mediaFolder = option.review?.mediaDirectory || 'design-review-assets';
const mediaDir = path.join(output, mediaFolder);
const reviewPage = option.href.split('#')[0];
const bookPage = option.buildBook || 'room-design-book.html';
const nightManifest = option.nightFile ? JSON.parse(await fs.readFile(path.join(root, option.nightFile), 'utf8')) : null;
const runtime = await fs.readFile(path.join(root, 'scripts/design-library/house-review.js'), 'utf8');
const styles = await fs.readFile(path.join(root, 'scripts/design-library/house-review.css'), 'utf8');
const refinement = option.refinementFile ? JSON.parse(await fs.readFile(path.join(root, option.refinementFile), 'utf8')) : null;
await fs.mkdir(mediaDir, { recursive: true });
const definitions = option.review?.floors || [
  ['one', 'r04', 'Arrival & leisure', 'Matched oak, an office with integrated technology, and a calmer cinema room.'],
  ['two', 'r02', 'Gather & entertain', 'Coordinated artwork and lighting, flexible dining, and the open piano salon.'],
  ['three', 'r03', 'Rest & recharge', 'Individual bedroom personalities, oak floors and loose rugs, with refined art and lighting.'],
  ['four', 'r03', 'Penthouse & terrace', 'The mushroom guest suite now has oak flooring and a loose rug.'],
];
const floors = [];
for (const [i, [word, rev, title, description, manifestPath]] of definitions.entries()) {
  const manifest = JSON.parse(await fs.readFile(path.join(root, manifestPath || `assets/render-candidates/floor-${word}-review/${rev}/manifest.json`), 'utf8'));
  const floor = { number: i + 1, id: `floor-${i + 1}`, title, description, revision: rev, rooms: [], coverageNote: manifest.coverageNote || '' };
  const asset = async (file, name, width, quality = 84) => {
    const filename = `${floor.id}-${rev}-${name}.webp`;
    await sharp(path.join(root, file)).rotate().resize({ width, withoutEnlargement: true }).webp({ quality }).toFile(path.join(mediaDir, filename));
    return `${mediaFolder}/${filename}`;
  };
  floor.plan = await asset(manifest.planReference || 'assets/render-candidates/room-review/entry/r01/refs/entry-plan-reference.webp', 'plan', 1800, 91);
  for (const originalRoom of manifest.rooms) {
    const revised = refinement?.rooms?.[originalRoom.id];
    const room = revised ? { ...originalRoom, ...revised } : originalRoom;
    const views = [];
    for (const view of room.views) {
      views.push({ ...view, src: await asset(view.file, `${room.id}-${revised ? refinement.revision + "-" : ""}${view.code}`, 2000), thumb: await asset(view.file, `${room.id}-${revised ? refinement.revision + "-" : ""}${view.code}-thumb`, 520, 77) });
    }
    const nightSource = nightManifest?.rooms?.[room.id];
    if (nightSource && !views.some(v => v.code === nightSource.sourceCode && v.jobId === nightSource.sourceJobId)) throw new Error(`Night study for ${room.id} is based on a superseded day view; regenerate or remove it before rebuilding.`);
    const night = nightSource ? { ...nightSource, src: await asset(nightSource.file, `${room.id}-${nightManifest.revision}-night`, 2000), thumb: await asset(nightSource.file, `${room.id}-${nightManifest.revision}-night-thumb`, 520, 77) } : null;
    const originalPhotos=[];
    for(const [n,photo] of (room.originalPhotos||[]).entries()) originalPhotos.push({...photo,code:'Reference '+(n+1),src:await asset(photo.file,`${room.id}-original-${n+1}`,1800,90)});
    floor.rooms.push({ ...room, views, originalPhotos, ...(night ? { night } : {}) });
  }
  floors.push(floor);
}
let bedroomComparison = option.review?.bedroomComparison || 'bedroom-personalities-r03-preview.jpg';
if(optionId==='mineral-walnut'&&refinement){
  const layers=[];
  for(const [i,id]of ['ownerbed','bed2','bed3','bed5'].entries()){
    const room=floors.flatMap(f=>f.rooms).find(r=>r.id===id),left=(i%2)*900,top=Math.floor(i/2)*650;
    layers.push({input:await sharp(path.join(root,room.views[0].file)).resize(900,600,{fit:'contain',background:'#eee9df'}).toBuffer(),left,top});
    layers.push({input:Buffer.from(`<svg width="900" height="50"><rect width="900" height="50" fill="#eee9df"/><text x="20" y="32" font-family="sans-serif" font-size="21" fill="#272c28">${room.title.replaceAll('&','&amp;')}${id==='bed5'?' · windows outside camera view':''}</text></svg>`),left,top:top+600});
  }
  bedroomComparison=mediaFolder+'/bedroom-textiles-comparison.webp';
  await sharp({create:{width:1800,height:1300,channels:3,background:'#eee9df'}}).composite(layers).webp({quality:88}).toFile(path.join(output,bedroomComparison));
}
const data = JSON.stringify(floors).replaceAll('<', '\\u003c');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${option.name} · Option ${option.number} · Home 708</title><style>
${styles}
</style></head><body>
<a class="skip" href="#main">Skip to room photos</a>
<header class="review-intro"><div><p class="brand">Option ${option.number} · Room gallery</p><h1>${option.name}</h1><p class="header-note">Choose a floor, then scroll through its rooms, every camera angle and available night view.</p></div></header>
<nav class="floor-selection" id="floors" aria-label="Floors"><div class="floor-tabs" role="tablist" aria-label="Choose a floor">${floors.map(f=>{const labels=['Entrance gallery','Great room','Owners bedroom','Penthouse lounge'];const flagship=f.rooms[0];return `<button type="button" class="floor-tab" role="tab" id="tab-${f.id}" aria-controls="panel-${f.id}" aria-selected="false" tabindex="-1" data-floor="${f.id}"><img src="${flagship.views[0].thumb}" alt="" width="520" height="347" decoding="async"><span class="floor-card-copy"><b>Floor ${f.number}</b><span>${labels[f.number-1]}</span><small>${f.rooms.length} rooms · ${f.title}</small></span></button>`;}).join('')}</div></nav>
<main id="main"><div id="status" class="sr-only" role="status" aria-live="polite"></div>${floors.map(f=>`<section id="panel-${f.id}" role="tabpanel" aria-labelledby="tab-${f.id}" tabindex="0" hidden></section>`).join('')}<footer><span>Home 708 · Option ${option.number} · ${option.name}</span><span>Use the room name and view code when giving feedback.</span></footer></main>
<dialog id="zoom" aria-label="Enlarged floor photos"><div class="zoom-bar"><strong id="zoom-title"></strong><button type="button" id="close-zoom" autofocus aria-label="Close photo">Close ✕</button></div><div class="zoom-image-wrap"><img id="zoom-image" alt="" decoding="async"></div><div class="zoom-bottom"><button type="button" id="zoom-prev" aria-label="Previous photo">← Previous</button><span id="zoom-position" role="status" aria-live="polite"></span><button type="button" id="zoom-next" aria-label="Next photo">Next →</button></div><p id="zoom-hint"></p></dialog>
<script id="review-data" type="application/json">${data}</script><script>
const optionName=${JSON.stringify(option.name)}, bookPage=${JSON.stringify(bookPage)}, bedroomComparison=${JSON.stringify(bedroomComparison)}, floors=JSON.parse(document.getElementById('review-data').textContent);
${runtime}
</script></body></html>`;
await fs.writeFile(path.join(output, reviewPage), html);
if (optionId === 'mineral-walnut') for (const [i, [word]] of definitions.entries()) {
  await fs.writeFile(path.join(output, `floor-${word}-design-review.html`), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Home 708 · Floor ${i+1}</title></head><body><p><a id="review" href="house-design-review.html#floor-${i+1}">Open the house design review · Floor ${i+1}</a></p><script>const room=location.hash.slice(1);location.replace('house-design-review.html#floor-${i+1}'+(room&&room!=='overview'?'/'+encodeURIComponent(room):''));</script></body></html>`);
}
console.log(`Built four-floor review: ${floors.reduce((n,f)=>n+f.rooms.length,0)} spaces / ${floors.reduce((n,f)=>n+f.rooms.reduce((a,r)=>a+r.views.length,0),0)} images; ${Math.round(Buffer.byteLength(html)/1024)} KB HTML.`);
