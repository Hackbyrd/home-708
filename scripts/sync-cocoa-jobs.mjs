import fs from 'node:fs/promises';
const p='docs/option-two-cocoa-chrome-production.json',m=JSON.parse(await fs.readFile(p));
for(const f of process.argv.slice(2)){
 const d=JSON.parse(await fs.readFile(f));
 for(const j of d.jobs||[]){const at=m.jobs.findIndex(x=>x.index===j.index);if(at>=0)m.jobs[at]={...m.jobs[at],...j};else m.jobs.push(j);}
}
await fs.writeFile(p,JSON.stringify(m,null,2)+'\n');
const results=await Promise.allSettled(m.jobs.filter(j=>j.status==='completed'&&j.result_url).map(async j=>{
 const q=m.requests.find(r=>r.index===j.index);try{await fs.access(q.file);return;}catch{ /* Download the result when no local copy exists. */ }
 const r=await fetch(j.result_url);if(!r.ok)throw Error(`${j.index} HTTP ${r.status}`);await fs.writeFile(q.file,Buffer.from(await r.arrayBuffer()));return q.file;
}));
console.log(results.filter(x=>x.status==='rejected'||x.value));
