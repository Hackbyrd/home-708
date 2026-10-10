import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile),file='docs/mineral-walnut-material-production.json';
const p=JSON.parse(await fs.readFile(file,'utf8')),command=process.argv[2];
if(command==='record'){
 const incoming=JSON.parse(process.argv[3]);
 for(const job of incoming){const old=p.jobs.find(j=>j.index===job.index);if(old)Object.assign(old,job);else p.jobs.push(job);}
}else if(command==='download'){
 const chosen=process.argv.slice(3).map(Number);
 const jobs=p.jobs.filter(j=>j.status==='completed'&&j.result_url&&(!chosen.length||chosen.includes(j.index)));
 for(let i=0;i<jobs.length;i+=4)await Promise.all(jobs.slice(i,i+4).map(async j=>{
  const q=p.requests.find(q=>q.index===j.index);if(!q)throw Error('Unknown request '+j.index);
  await fs.mkdir(path.dirname(q.file),{recursive:true});
  if(!await fs.access(q.file).then(()=>true,()=>false)){
   await exec('curl',['-sS','-fL','-A','Mozilla/5.0','--retry','2','--connect-timeout','15','--max-time','90','-o',q.file+'.part',j.result_url]);await fs.rename(q.file+'.part',q.file);
  }
  const m=await sharp(q.file).metadata();j.dimensions={width:m.width,height:m.height};j.downloaded=true;
  if(Math.max(m.width,m.height)<1536){q.qa={accepted:false,note:'Output below required 1536 px long edge despite requested resolution.'};console.log('Rejected undersized output '+j.index);}
 }));console.log('Downloaded '+jobs.length+' images.');
}else if(command==='sheets'){
 const ids=process.argv.slice(3).map(Number);const qs=p.requests.filter(q=>p.jobs.find(j=>j.index===q.index&&j.downloaded)&&(!ids.length||ids.includes(q.index)));
 await fs.mkdir('tmp/material-update',{recursive:true});
 for(let start=0;start<qs.length;start+=4){const group=qs.slice(start,start+4),tiles=[];
  for(const [i,q]of group.entries())for(const [j,f]of [q.sourceFile,q.file].entries()){
   tiles.push({input:await sharp(f).resize(600,400,{fit:'contain',background:'#171a18'}).png().toBuffer(),left:j*600,top:i*432});
   tiles.push({input:Buffer.from(`<svg width="600" height="32"><rect width="600" height="32" fill="white"/><text x="10" y="23" font-size="18">${q.index} ${q.room} ${q.code} ${j?'EDIT':'SOURCE'}</text></svg>`),left:j*600,top:i*432+400});
  }
  const sheet=`tmp/material-update/compare-${group[0].index}.png`;await sharp({create:{width:1200,height:group.length*432,channels:3,background:'#fff'}}).composite(tiles).png().toFile(sheet);console.log(sheet);
 }
}else if(command==='qa'){
 for(const record of JSON.parse(process.argv[3])){const q=p.requests.find(q=>q.index===record.index);if(!q)throw Error('Unknown QA request');q.qa={accepted:record.accepted,note:record.note,checkedAt:new Date().toISOString()};}
}else throw Error('Commands: record JSON | download [indices] | sheets [indices] | qa JSON');
await fs.writeFile(file,JSON.stringify(p,null,2)+'\n');
