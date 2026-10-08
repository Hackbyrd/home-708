import fs from 'node:fs/promises';
import sharp from 'sharp';
const m=JSON.parse(await fs.readFile('docs/option-two-owner-furniture-production.json'));
const slot=process.argv[2]||'a';
const views=m.inventory.flatMap(r=>{const index=m.selectedViews[r.id][slot];const q=m.requests.find(q=>q.index===index);return q?[q]:[];});
await fs.mkdir('tmp/owned-qa',{recursive:true});
for(let start=0;start<views.length;start+=4){
 const group=views.slice(start,start+4),composite=[];
 for(let i=0;i<group.length;i++){
  const q=group[i];
  composite.push({input:await sharp(q.file).resize(800,536,{fit:'contain',background:'#fff'}).toBuffer(),left:i%2*800,top:Math.floor(i/2)*576});
  composite.push({input:Buffer.from(`<svg width="800" height="40"><rect width="800" height="40" fill="white"/><text x="10" y="28" font-family="Arial" font-size="23">${q.index} ${q.room} ${q.code}</text></svg>`),left:i%2*800,top:Math.floor(i/2)*576+536});
 }
 await sharp({create:{width:1600,height:Math.ceil(group.length/2)*576,channels:3,background:'#fff'}}).composite(composite).png().toFile(`tmp/owned-qa/${slot}-${start}.png`);
}
console.log(`Created ${Math.ceil(views.length/4)} sheets for ${views.length} ${slot} views.`);
