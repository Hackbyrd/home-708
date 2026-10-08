import fs from 'node:fs/promises';
import sharp from 'sharp';
const m=JSON.parse(await fs.readFile('docs/option-two-owner-furniture-production.json'));
const phase=process.argv[2]||'cabinet-variety-main';
const views=m.requests.filter(q=>q.phase===phase&&m.jobs.find(j=>j.index===q.index)?.status==='completed');
await fs.mkdir('tmp/cabinet-qa',{recursive:true});
for(let start=0;start<views.length;start+=4){
 const group=views.slice(start,start+4),layers=[];
 for(const [i,q]of group.entries()){
  layers.push({input:await sharp(q.file).resize(900,600,{fit:'contain',background:'white'}).toBuffer(),left:i%2*900,top:Math.floor(i/2)*640});
  layers.push({input:Buffer.from(`<svg width="900" height="40"><rect width="900" height="40" fill="white"/><text x="10" y="28" font-family="Arial" font-size="23">${q.index} ${q.room} ${q.code}</text></svg>`),left:i%2*900,top:Math.floor(i/2)*640+600});
 }
 await sharp({create:{width:1800,height:Math.ceil(group.length/2)*640,channels:3,background:'white'}}).composite(layers).png().toFile(`tmp/cabinet-qa/${phase}-${start}.png`);
}
console.log(`${views.length} views prepared in ${Math.ceil(views.length/4)} contact sheets.`);
