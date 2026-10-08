import fs from 'node:fs/promises';
import sharp from 'sharp';
const p=JSON.parse(await fs.readFile('docs/mineral-walnut-night-production.json'));
for(let start=0;start<p.requests.length;start+=4){
 const tiles=[];const rooms=p.requests.slice(start,start+4);
 for(const [i,q] of rooms.entries())for(const [j,file] of [q.sourceFile,q.file].entries()){
  const img=await sharp(file).resize(600,400,{fit:'contain',background:'#161b1a'}).png().toBuffer();
  const label=Buffer.from(`<svg width="600" height="36"><rect width="600" height="36" fill="#fff"/><text x="12" y="25" font-size="20">${q.index} · ${q.room} · ${j?'NIGHT':'DAY'}</text></svg>`);
  tiles.push({input:img,left:j*600,top:i*436},{input:label,left:j*600,top:i*436+400});
 }
 await sharp({create:{width:1200,height:rooms.length*436,channels:3,background:'#fff'}}).composite(tiles).png().toFile(`tmp/night-qa-${start}.png`);
}
console.log('Created six day/night QA sheets.');
