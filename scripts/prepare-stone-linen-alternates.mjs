import fs from 'node:fs/promises';
import path from 'node:path';
const file='docs/option-two-stone-linen-production.json';
const m=JSON.parse(await fs.readFile(file,'utf8'));
for(const [i,room] of m.inventory.entries()){
 if(room.views.length<2)continue;
 const view=room.views[1],heroIndex=m.selectedViews[room.id].a;
 const hero=m.jobs.find(j=>j.index===heroIndex);
 if(hero?.status!=='completed')throw new Error(`Hero not ready: ${room.id}`);
 const index=5101+i;
 if(m.requests.some(r=>r.index===index))continue;
 const source=room.sourcePhotos[1]||room.sourcePhotos[0];
 const medias=[{role:'image',value:view.jobId},{role:'image',value:hero.job_id}];
 if(source)medias.push({role:'image',value:`https://708.hackbyrd.com/design-library-assets/${encodeURIComponent(path.basename(source))}`});
 const prompt=`EDIT IMAGE 1, the established alternate ${room.title} view labeled "${view.label}". Preserve its camera, room layout and architecture. IMAGE 2 is the NEW STONE & LINEN HERO of THIS SAME ROOM: match its furniture, joinery, finishes, lights, window dressings and artwork precisely from this other viewing angle. ${source?'IMAGE 3 is the REAL SOURCE PHOTOGRAPH of this room: it controls real openings and fixed architecture.':'This is a PLAN-LED concept with no actual room photograph; do not invent more openings or room area.'} Do not simply repeat image 2 camera. Do not revert to the old decor in image 1. If image 1 is a detail view, preserve that detail crop rather than inventing a full reverse room.\n\n${m.globalStyle}\n\nROOM REQUIREMENTS:\n${room.style}\n\nKeep the exact window/door count and positions visible from image 1 camera, known original ceiling/crown and practical room proportions. No new windows, ceiling coves, fireplaces, relocated stairs or reversed room plan. Adjacent spaces visible through openings must match Stone & Linen neutral oak floors and soft ivory textiles; no old carpet or four-poster bed. Do not add fixed blue or green walls. No people, logos, signatures or text other than the expressly required inscriptions. Preserve the two views as one coherent design.`;
 m.requests.push({index,room:room.id,code:view.code,phase:'alternate',file:`assets/render-candidates/option-two-stone-linen/r01/${room.id}-b.png`,sourceView:view,heroIndex,params:{model:'nano_banana_2_1',resolution:'2k',thinking_level:'high',aspect_ratio:'3:2',count:1,medias,prompt}});
}
await fs.writeFile(file,JSON.stringify(m,null,2)+'\n');
console.log('Prepared',m.requests.filter(r=>r.phase==='alternate').length,'alternate views.');
