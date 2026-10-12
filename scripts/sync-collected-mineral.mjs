import fs from 'node:fs/promises';
import sharp from 'sharp';

const raw='assets/render-candidates/collected-mineral/r04';
const design=JSON.parse(await fs.readFile('docs/collected-mineral-design.json','utf8'));
const specs=JSON.parse(await fs.readFile('docs/collected-mineral-build-specs.json','utf8'));
const privateSpecs=JSON.parse(await fs.readFile('docs/collected-mineral-private-specs.json','utf8'));
const social=JSON.parse(await fs.readFile('docs/collected-mineral-new-social.json','utf8'));
const approved=JSON.parse(await fs.readFile(`${raw}/approved-days.json`,'utf8'));
const nights=JSON.parse(await fs.readFile(`${raw}/approved-nights.json`,'utf8').catch(()=>'[]'));
const rooms=design.floors.flatMap(f=>f.rooms);
design.globalStandards=specs.globalStandards;
design.openDecisions=specs.openGlobalDecisions;
design.completionRequirements=specs.completionRequirements;
const publicPrice=i=>i.unitPrice||i.currentPriceOrSale||i.currentPrice;
const unitPrice=i=>{const p=publicPrice(i);return typeof p==='number'?p:p?.amount!=null?{...p,low:p.amount,high:p.amount}:p;};
for(const r of rooms){
 const s=specs.rooms[r.id];
 const p=privateSpecs.rooms.find(x=>x.id===r.id);
 r.materials=s.materials;
 r.buildOuts=s.buildOuts;
 r.architectureLocks=s.architecturalLocks;
 r.lighting={...s.lighting,cct:parseInt(s.lighting.colorTemperature)||2700,circuits:s.lighting.controlGroups.map(x=>x.name).join(' / ')};
 r.windowTreatment=s.windowTreatments;
 r.contractorSequence=s.contractorSequence;
 r.furnitureCoordination=s.furnitureCoordination;
 r.unresolvedItems=s.unresolvedItems;
 r.avSystem=s.avSystem;
 r.measurementNotes=[...s.unresolvedItems,...(p?.measurementNotes||[])];
 r.notes=[...s.architecturalLocks,'Owned and new furniture allocations are listed separately below; use actual dimensions and the detailed build book before buying or fabrication.'];
 const socialItems=social.items.filter(x=>x.room===r.id);
 const privateItems=socialItems.length?[]:(p?.newItems||[]);
 r.newFurniture=[...socialItems.map(i=>({...i,dimensions:i.size,imageUrl:i.image||i.sourceImageUrl,unitPrice:unitPrice(i),availability:{status:i.stockStatus,evidence:i.stockEvidence,checkedAt:i.checkedAt},placement:i.placement||i.role||'Complete the remaining room needs.',fitNotes:[i.fitNotes].filter(Boolean),purchaseNotes:['Buy in phases only after exact configured stock, dimensions, delivery and total quantities are confirmed.']})),...privateItems.map(i=>({...i,imageUrl:i.imageFile?.replace(/^docs\//,'')||i.imageUrl,unitPrice:unitPrice(i),placement:i.placement||i.reason||i.role||'Complete the room’s new furniture allocation.',fitNotes:Array.isArray(i.fitNotes)?i.fitNotes:[i.fitNotes].filter(Boolean),purchaseNotes:['Purchase after site measurement and aggregate quantity/delivery verification.']}))];
 r.intent=p?.designIntent||`Collected Mineral ${r.title.toLowerCase()}: retain the verified room shell and warm mineral finishes; ${r.ownedFurniture.length?'place the assigned owned pieces':'use new furniture and fitted work'} with coordinated neutral materials.`;
 r.styleIdentity={name:'Collected Mineral',rationale:'Warm mineral architecture with carefully grouped owned brown-oak/silver pieces; new neutral furnishings complete the room.'};
 r.textileNote='Neutral ivory, oatmeal and charcoal textures; real greenery and dark art frames. No new blue, yellow, pink or purple bedroom accent scheme.';
 for(const v of r.views){
  const selected=approved.find(x=>x.room===r.id&&x.code===v.code);
  if(!selected)continue;
  const stem=`collected-mineral-assets/${r.id}-${v.code}-cm-r04-day`;
  const metadata=await sharp(selected.file).metadata();
  await sharp(selected.file).resize({width:2400,withoutEnlargement:true}).webp({quality:88,effort:5}).toFile('docs/'+stem+'.webp');
  await sharp(selected.file).resize({width:680,withoutEnlargement:true}).webp({quality:79,effort:5}).toFile('docs/'+stem+'-thumb.webp');
  Object.assign(v,{id:`${v.code}-CM-R04`,jobId:selected.job_id,index:selected.index,src:stem+'.webp',thumb:stem+'-thumb.webp',file:selected.file,width:Math.min(metadata.width,2400),height:Math.round(metadata.height*Math.min(1,2400/metadata.width)),model:selected.model||'gpt_image_2_5',revision:'CM-R04',assetRevision:'cm-r04',sourceJobId:v.baseline.jobId,qa:selected.qa,evidenceType:selected.evidenceType||v.baseline.evidenceType,evidence:selected.evidence||('Room shell follows the accepted '+v.code+' reference camera and applicable original photo/blueprint. Collected Mineral furniture allocation and neutral finishes applied.'),qaNote:selected.qaNote,label:(r.views.indexOf(v)===0?'Primary':'Companion')+' view · '+r.title});
 }
 for(const n of r.nights||[]){
  const day=r.views.find(x=>x.code===n.sourceCode), selected=nights.find(x=>x.room===r.id&&x.sourceCode===day?.code);
  if(!selected)continue;
  const stem=`collected-mineral-assets/${r.id}-${day.code}-cm-r04-night`;
  const metadata=await sharp(selected.file).metadata();
  await sharp(selected.file).resize({width:2400,withoutEnlargement:true}).webp({quality:88,effort:5}).toFile('docs/'+stem+'.webp');
  await sharp(selected.file).resize({width:680,withoutEnlargement:true}).webp({quality:79,effort:5}).toFile('docs/'+stem+'-thumb.webp');
  Object.assign(n,{id:`${day.code}-CM-R04-N`,code:`${day.code}-CMN`,jobId:selected.job_id,index:selected.index,src:stem+'.webp',thumb:stem+'-thumb.webp',file:selected.file,width:Math.min(metadata.width,2400),height:Math.round(metadata.height*Math.min(1,2400/metadata.width)),model:selected.model||'gpt_image_2_5',sourceJobId:day.jobId,sourceFile:day.file,qa:selected.qa,lighting:r.lighting.night,cct:r.lighting.cct,circuits:r.lighting.circuits,revision:'CM-R04',assetRevision:'cm-r04',evidenceType:'Same-camera night edit of approved Collected Mineral day',evidence:'Night uses the exact approved '+day.code+' daytime job. Furniture, openings, fixed finishes and camera are preserved; only lighting and specified privacy layers change.',qaNote:selected.qaNote,label:'Night · '+r.title+' · '+day.code+' camera'});
 }
 r.night=r.nights?.[0];
}
await fs.writeFile('docs/collected-mineral-design.json',JSON.stringify(design,null,2));
await fs.writeFile('docs/collected-mineral-production.json',JSON.stringify({revision:'CM-R04',status:design.status,jobs:[...approved,...nights].map(x=>({...x,status:'completed'}))},null,2));
console.log(`Synced ${approved.length} new day and ${nights.length} new night cameras; publication stays ${design.status}.`);
