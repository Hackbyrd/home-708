import fs from 'node:fs/promises';
import path from 'node:path';
const file='docs/option-two-owner-furniture-production.json';
const m=JSON.parse(await fs.readFile(file,'utf8'));
for(const p of process.argv.slice(2)){
 const data=JSON.parse(await fs.readFile(p,'utf8'));
 for(const j of data.jobs||[]){
  const i=m.jobs.findIndex(x=>x.index===j.index);
  if(i>=0)m.jobs[i]={...m.jobs[i],...j};else m.jobs.push(j);
 }
}
await fs.writeFile(file,JSON.stringify(m,null,2)+'\n');
const results=await Promise.allSettled(m.jobs.filter(j=>j.status==='completed'&&j.result_url).map(async j=>{
 const q=m.requests.find(r=>r.index===j.index);
 if(!q)throw Error(`No request for ${j.index}`);
 try{await fs.access(q.file);return;}catch{ /* Download the result when no local copy exists. */ }
 const res=await fetch(j.result_url);if(!res.ok)throw Error(`${j.index}: HTTP ${res.status}`);
 await fs.mkdir(path.dirname(q.file),{recursive:true});
 await fs.writeFile(q.file,Buffer.from(await res.arrayBuffer()));
 return q.file;
}));
for(const r of results)if(r.status==='rejected'||r.value)console.log(r);
if(results.some(r=>r.status==='rejected'))process.exitCode=1;
console.log(`Saved ${m.jobs.length} job records; ${m.jobs.filter(j=>j.status==='completed').length} completed.`);
