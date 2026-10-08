import fs from 'node:fs/promises';
import sharp from 'sharp';
const manifest = JSON.parse(await fs.readFile('docs/option-two-stone-linen-production.json','utf8'));
const phase = process.argv[2] || 'hero';
await fs.mkdir('tmp/stone-linen-qa', {recursive:true});
for (const floor of [1,2,3,4]) {
 const requests=manifest.requests.filter(r=>r.phase===phase && manifest.inventory.find(i=>i.id===r.room).floorNumber===floor);
 const tiles=[];
 for (const [i,r] of requests.entries()) {
  try {await fs.access(r.file);} catch {continue;}
  const img=await sharp(r.file).resize(640,427,{fit:'contain',background:'#ebe7e0'}).png().toBuffer();
  const label=Buffer.from(`<svg width="640" height="40"><rect width="100%" height="100%" fill="white"/><text x="10" y="28" font-family="Arial" font-size="22">${r.index} · ${r.room} · ${r.code}</text></svg>`);
  tiles.push({input:img,left:i%2*640,top:Math.floor(i/2)*467},{input:label,left:i%2*640,top:Math.floor(i/2)*467+427});
 }
 if(tiles.length)await sharp({create:{width:1280,height:Math.ceil(requests.length/2)*467,channels:3,background:'#fff'}}).composite(tiles).png().toFile(`tmp/stone-linen-qa/${phase}-floor-${floor}.png`);
}
