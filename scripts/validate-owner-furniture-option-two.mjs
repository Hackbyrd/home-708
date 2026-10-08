import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const m=JSON.parse(await fs.readFile('docs/option-two-owner-furniture-production.json'));
const book=JSON.parse(await fs.readFile('docs/cocoa-chrome-build-book.json'));
const library=JSON.parse(await fs.readFile('docs/design-options.json'));
const baseline=JSON.parse(await fs.readFile('tmp/owned-furniture-option-one-baseline.json'));
const errors=[],checks=[];
for(const [file,before] of Object.entries(baseline)){
 const same=hash(await fs.readFile(file))===before;
 checks.push({file,unchanged:same});if(!same)errors.push(`Unrelated baseline changed: ${file}`);
}
const views=Object.values(book.rooms).flatMap(r=>r.revisions.find(v=>v.id===r.currentRevision).views);
if(Object.keys(book.rooms).length!==24||views.length!==45)errors.push('Expected 24 spaces and 45 selected views');
const seen=new Set();
for(const v of views){
 const request=m.requests.find(q=>q.index===v.index),job=m.jobs.find(j=>j.index===v.index);
 if(!request||job?.status!=='completed')errors.push(`Unfinished selection ${v.index}`);
 if(!v.file.startsWith(`${m.outputDirectory}/`))errors.push(`Stale image ${v.file}`);
 const bytes=await fs.readFile(v.file),meta=await sharp(bytes).metadata(),digest=hash(bytes);
 if(seen.has(digest))errors.push(`Duplicate render ${v.index}`);seen.add(digest);
 if(meta.width<1536||meta.height<1024)errors.push(`Undersized ${v.index}`);
}
const option=library.options.find(o=>o.number===2);
if(!option||!/polished[- ]stainless/.test(option.summary)||!option.hero.includes(m.revision))errors.push('Stale Option 2 catalog');
for(const room of Object.values(book.rooms)){
 if(room.currentRevision!==m.revision)errors.push(`Old room revision ${room.id}`);
 if(!room.sourceEvidence.some(s=>s.type==='owner_furniture'))errors.push(`Missing owned furniture evidence ${room.id}`);
}
const html=await fs.readFile('docs/cocoa-chrome.html','utf8');
const floors=JSON.parse(html.match(/<script id="review-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const refs=floors.flatMap(f=>[f.plan,...f.rooms.flatMap(r=>r.views.flatMap(v=>[v.src,v.thumb]))]);
for(const rel of refs){await fs.access(path.join('docs',rel));if(!rel.includes(m.revision))errors.push(`Stale gallery asset ${rel}`);}
if(m.cabinetDesignFile){
 const designs=JSON.parse(await fs.readFile(m.cabinetDesignFile));
 for(const [id,d]of Object.entries(designs.rooms)){
  if(!book.rooms[id].designIntent.includes(d.name))errors.push(`Missing individual cabinet design: ${id}`);
  if(!book.rooms[id].schedule.some(s=>s.item==='Shared materials, individual cabinet designs'))errors.push(`Missing shared-material specification: ${id}`);
 }
 if(!book.feedbackLog.some(f=>f.id==='CC-003'))errors.push('Latest cabinet feedback is missing');
}
const currentText=Object.values(book.rooms).flatMap(r=>[r.designIntent,...r.schedule.map(s=>s.material)]).join('\n');
if(/\bwalnut\b|\bespresso\b/i.test(currentText))errors.push('Old species remains in current room specification');
const result={date:new Date().toISOString(),rooms:Object.keys(book.rooms).length,views:views.length,galleryAssets:refs.length,scheduleEntries:Object.values(book.rooms).reduce((n,r)=>n+r.schedule.length,0),baselineChecks:checks,errors};
await fs.writeFile('docs/owner-furniture-option-two-validation.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
