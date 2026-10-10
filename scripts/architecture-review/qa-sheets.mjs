import fs from 'node:fs/promises';import sharp from 'sharp';
const p=JSON.parse(await fs.readFile('docs/mineral-walnut-architecture-production.json'));
const ids=process.argv.slice(2).map(Number);const qs=p.requests.filter(q=>(!ids.length||ids.includes(q.index))&&p.jobs.find(j=>j.index===q.index&&j.downloaded));
await fs.mkdir('tmp/architecture-qa',{recursive:true});
for(let i=0;i<qs.length;i+=3){const group=qs.slice(i,i+3),cs=[];for(const [n,q]of group.entries()){
const room=p.baselineBook.rooms[q.room];let ref=room.sourceEvidence.find(s=>s.file?.includes('Crown Georgetown Photos'))?.file;
if(q.room==='retreat'&&q.code==='OR2')ref='assets/Crown Georgetown Photos/third-floor-master-bedroom-owners-retreat-2.jpg.webp';
if(!ref)ref=room.sourceEvidence.find(s=>s.type==='blueprint')?.preview;
for(const [col,f]of [ref,q.sourceFile,q.file].entries()){const left=col*700,top=n*500;cs.push({input:await sharp(f).resize(700,468,{fit:'contain',background:'#202020'}).png().toBuffer(),left,top});cs.push({input:Buffer.from(`<svg width="700" height="32"><rect width="700" height="32" fill="white"/><text x="10" y="23" font-size="20">${q.index} ${q.room} ${q.code} ${['ORIGINAL / PLAN','BEFORE','CANDIDATE'][col]}</text></svg>`),left,top:top+468});}}
const file=`tmp/architecture-qa/audit-${group[0].index}.jpg`;await sharp({create:{width:2100,height:500*group.length,channels:3,background:'#fff'}}).composite(cs).jpeg({quality:92}).toFile(file);console.log(file);
}
