import fs from 'node:fs/promises';
const file='docs/mineral-walnut-architecture-production.json',p=JSON.parse(await fs.readFile(file));
for(const fix of JSON.parse(process.argv[2])){
 if(p.requests.some(q=>q.index===fix.index))throw Error('Duplicate index');
 const old=p.requests.find(q=>q.index===fix.base),job=p.jobs.find(j=>j.index===fix.base);if(!old||!job?.downloaded)throw Error('Missing base');
 old.qa={accepted:false,note:fix.reason,checkedAt:new Date().toISOString()};
 p.requests.push({...old,index:fix.index,phase:old.phase,repairOf:fix.base,qa:undefined,sourceFile:old.scene==='night'?old.sourceFile:fix.sourceFile||old.file,sourceJobId:old.scene==='night'?old.sourceJobId:fix.sourceValue||job.job_id,editingSourceFile:fix.sourceFile||old.file,editingSourceJobId:fix.sourceValue||job.job_id,file:`assets/render-candidates/mineral-walnut-architecture/r02/${old.room}-${old.code.toLowerCase()}-${old.scene}-${fix.index}.png`,params:{...old.params,medias:[{role:'image',value:fix.sourceValue||job.job_id},...(fix.medias||[]).map(value=>({role:'image',value}))],prompt:fix.prompt}});
}
await fs.writeFile(file,JSON.stringify(p,null,2)+'\n');console.log('Prepared targeted repairs.');
