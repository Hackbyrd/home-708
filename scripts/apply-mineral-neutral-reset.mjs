import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {calculateBudget,money} from './design-library/budget-model.mjs';
const read=async f=>JSON.parse(await fs.readFile(f,'utf8'));
const write=(f,d)=>fs.writeFile(f,JSON.stringify(d,null,2)+'\n');
const file='docs/mineral-walnut-neutral-production.json',p=await read(file),m=await read('docs/mineral-walnut-material-production.json');
const accepted=p.requests.filter(r=>r.qa?.accepted),days=new Map(accepted.filter(r=>r.scene==='day').map(r=>[r.room+'/'+r.code,r])),nights=new Map(accepted.filter(r=>r.scene==='night').map(r=>[r.room,r]));
assert.equal(days.size,6);assert.equal(nights.size,4);
for(const r of accepted){const j=p.jobs.find(j=>j.index===r.index);assert.equal(j.status,'completed');assert(j.downloaded);await fs.access(r.file);}
const names=['room-design-book','interior-design-guide','mineral-walnut-night-review','design-options','mineral-walnut-design-lock','mineral-walnut-budget','mineral-walnut-design-audit','mineral-walnut-roadmap','mineral-walnut-stair-runner'];
for(const name of names){const dest=`docs/design-history/${name}-before-neutral-reset.json`;if(!await fs.access(dest).then(()=>true,()=>false))await fs.copyFile(`docs/${name}.json`,dest);}
const book=await read('docs/room-design-book.json'),guide=await read('docs/interior-design-guide.json'),library=await read('docs/design-options.json'),lock=await read('docs/mineral-walnut-design-lock.json'),budget=await read('docs/mineral-walnut-budget.json'),audit=await read('docs/mineral-walnut-design-audit.json'),roadmap=await read('docs/mineral-walnut-roadmap.json');
const oldGuide=await read('docs/design-history/interior-design-guide-before-materials.json'),oldBudget=await read('docs/design-history/mineral-walnut-budget-before-materials.json');
const review=structuredClone(p.baselineReview),night=structuredClone(p.baselineNight),restored=['ownerbed','bed2','bed3','retreat'],stairs=['entry','stair2','stair3'];
const intents={ownerbed:'Original neutral primary suite restored: ivory bedding, oatmeal textiles, charcoal details and walnut. Retain its individual headwall, platform bed and lighting.',bed2:'Original cream, ivory and walnut guest room restored with neutral bedding. Retain the corrected stair-hall headboard, shared-bathroom-wall closet and desk beside the side window.',bed3:'Original neutral window-led bedroom restored: ivory/oatmeal bedding, charcoal piping and neutral artwork. Retain all three windows and the right-wall bed.',retreat:'Neutral walnut coffee bar and seating retained; the adjoining primary bedroom again shows its original neutral bedding.',entry:'Light glazed doors, two-story chandelier and natural oak floor retained. The staircase beyond the arch has exposed oak treads and warm white risers, without a runner.',stair2:'Exposed natural oak treads, warm white risers and dark handrails. Preserve the corrected curved/fanned flight, intermediate landing, side arch, window pair and stairwell opening; no carpet runner.',stair3:'Exposed natural oak steps and warm white risers continue to the penthouse. Preserve the corrected stair curve, intermediate landing, three high windows and original guard; no carpet runner.',sharedbath:'Selected E pale limestone-look porcelain around the vanity mirror and doorway return retained. The adjoining bedroom returns to its original neutral bedding and artwork.'};
const limit='Design visualization only. Preserve the source-audited layout; verify actual dimensions, finish samples and product/installation details on site.';
for(const id of Object.keys(intents)){
 const r=book.rooms[id],previous=p.baselineBook.rooms[id],old=previous.revisions.find(x=>x.id===previous.currentRevision);
 r.itemHistory??=[];if(!r.itemHistory.some(x=>x.revision==='before-MW-NR01'))r.itemHistory.push({revision:'before-MW-NR01',schedule:structuredClone(previous.schedule)});
 let views;
 if(restored.includes(id)){
  const b=m.baselineBook.rooms[id];views=structuredClone(b.revisions.find(x=>x.id===b.currentRevision).views);
  r.schedule=structuredClone(b.schedule);r.openDesignChoices=structuredClone(b.openDesignChoices);
  night.rooms[id]=structuredClone(m.baselineNight.rooms[id]);
  const og=oldGuide.rooms.find(x=>x.id===id);Object.assign(guide.rooms.find(x=>x.id===id),structuredClone(og));
  review.rooms[id]=structuredClone(m.baselineReview.rooms[id]);
 }else views=old.views.map(v=>{
  const q=days.get(id+'/'+v.code);if(!q)return structuredClone(v);
  return {...v,id:v.id+'-NR01',index:q.index,file:q.file,jobId:p.jobs.find(j=>j.index===q.index).job_id,model:q.params.model,sourceFile:q.sourceFile,sourceJobId:q.sourceJobId,revision:'MW-NR01',evidence:intents[id]+' '+limit,qaNote:q.qa.note,label:v.label.replace(/runner/gi,'oak stair')};
 });
 r.revisions=r.revisions.filter(x=>x.id!==p.revision);r.revisions.push({id:p.revision,date:p.date,status:'visually_reviewed_homeowner_revision',reason:intents[id],manifest:file,views,qa:{status:'visually_reviewed_concepts',limitations:[limit]}});r.currentRevision=p.revision;
 r.designIntent=intents[id];r.userApproval='Homeowner requests original neutral bedrooms and no stair runners; A/C1/E stone selections and existing window-treatment decisions remain. Actual products and measured details remain open.';
 r.handoffStatus='Current homeowner direction and day/night views coordinated. Obtain measured drawings, product samples and installer quotations before fabrication.';
 r.openDesignChoices=(r.openDesignChoices||[]).filter(x=>!x.startsWith('MW-M01:'));
 const g=guide.rooms.find(x=>x.id===id);g.baseline=views[0].file;g.improve=intents[id];g.visualStatus='MW-NR01 · neutral bedrooms and exposed wood stairs';
 r.improvementPlan={...r.improvementPlan,version:'MW-NR01',improve:intents[id],visualStatus:g.visualStatus};
 if(stairs.includes(id)){
  r.schedule=r.schedule.filter(s=>!s.id.endsWith('-SR01'));
  r.schedule.push({id:id.toUpperCase()+'-STAIR-NR01',category:'Stair finish',item:'Exposed oak treads and warm white risers',status:'Homeowner selected no stair runner',material:'Natural oak treads and intermediate landings coordinated with the floor; warm white painted risers. Retain existing rail and baluster design.',location:'All three interior floor-to-floor connections, including turns and intermediate landings.',installation:'Refinish within the existing stair geometry. Contractor to inspect and repair the substrate and nosings, confirm a suitable stair finish and protect completed steps during remaining work. Do not add carpet, binding, rods or individual tread mats.',dimensions:'Verify every flight and landing in the field; no change to riser heights, tread depths or guard arrangement is proposed.',procurement:'Keep stair refinishing in its existing shared allowance. Runner supply and fitting have been removed from the active budget.',revision:'MW-NR01'});
 }
 const nq=nights.get(id);if(nq){
  const paired=views.find(v=>v.code===nq.sourceCode);assert.equal(nq.sourceJobId,paired.jobId);
  Object.assign(night.rooms[id],{id:nq.code+'-NR01',version:'MW-NR01',code:nq.code,index:nq.index,file:nq.file,jobId:p.jobs.find(j=>j.index===nq.index).job_id,model:nq.params.model,sourceCode:nq.sourceCode,sourceFile:nq.sourceFile,sourceJobId:nq.sourceJobId,evidence:'Night study of the current neutral/bare-stair day view. '+intents[id],qaNote:nq.qa.note});
 }
 r.lightingStudy={...r.lightingStudy,...structuredClone(night.rooms[id])};
 const notes=review.rooms[id].notes.filter(n=>!(/runner|dusty.rose|smoky.blue|plum throw|small.*accent/i.test(n)));
 review.rooms[id]={...review.rooms[id],revision:'MW-NR01',intent:intents[id],views,notes:[intents[id],...notes,limit]};
}
for(const r of Object.values(review.rooms))delete r.stairRunner;
review.version='MW-NR01';review.revision=p.revision;review.status='visually_reviewed_neutral_bedrooms_and_bare_stairs';review.neutralProduction=file;
night.version='MW-N06';night.revision='mw-neutral-night-r01';
const direction='MW-NR01: original neutral Mineral & Walnut bedrooms restored; no colored bedroom throws or colored artwork additions. All three interior stair connections use exposed oak treads and warm white risers without runners. Approved A/C1/E porcelain selections and room-specific window layers remain; original fireplace retained while its choice is open.';
book.brief.confirmed=book.brief.confirmed.filter(s=>!s.startsWith('MW-M01:')).map(s=>s.includes('Small bedroom accents are explicitly authorized')?'Original Option 1 palette: warm mineral, walnut, natural oak, ivory, oatmeal, charcoal and plants. Bedrooms keep their original neutral textiles and individual designs.':s);
if(!book.brief.confirmed.includes(direction))book.brief.confirmed.push(direction);
book.workflow.reviewScope='MW-NR01: 24 spaces, 45 day views and 24 night views. Neutral bedrooms restored and exposed wood stairs coordinated across day/night; A/C1/E stone updates retained.';book.updated=p.date;
for(const f of book.feedbackLog)if(f.id==='MW-M01')f.status='stone_selections_retained_bedroom_accents_superseded_by_MW_NR01';
book.feedbackLog=book.feedbackLog.filter(f=>f.id!=='MW-NR01');book.feedbackLog.push({id:'MW-NR01',date:p.date,scope:'Neutral bedrooms and uncovered stairs',userFeedback:'Remove bedroom accent colors and return to the original theme/design. Remove stair runners and return to stairs without them.',interpretation:direction,status:'implemented_in_current_images_and_schedules'});
guide.version='MW-G07';guide.scope=book.workflow.reviewScope;guide.materialReview='docs/mineral-walnut-neutral-review.json';guide.position='Warm ivory and mushroom, rich walnut, natural oak and neutral textiles define Mineral & Walnut. Selected warm stone enriches the kitchen and bathrooms. Bedrooms retain their original individual designs; exposed wood stairs connect the floors.';
guide.rules=guide.rules.filter(r=>r.id!=='MW-M01');delete guide.stairRunner;
guide.stairFinish={version:'MW-NR01',title:'Exposed oak stairs',scope:'All three interior stair connections, including intermediate landings, remain uncovered.',material:'Natural oak treads and landings, warm white painted risers, and the existing dark handrails and white balusters.',coordination:'Retain the corrected stair geometry. Complete and protect the selected wood finish during the remaining work; no carpet runner, underlay, binding or fitting is included.'};
lock.currentRefinement={version:'MW-NR01',scope:direction};lock.controlledAccents={ownerbath:'Existing purple towel and subtle artwork retained from selected Study A',bedrooms:'Original ivory, oatmeal and charcoal textiles; added plum, blue and rose withdrawn.'};
lock.rules=lock.rules.map(s=>s.replace(/ MW-M01 explicitly permits.*$/,''));lock.stairs='Exposed oak treads and warm white risers throughout interior stairs; no runner.';
budget.rows=budget.rows.filter(r=>r.scope!=='stair-runner');delete budget.stairRunner;
for(const id of ['ownerbed','bed2','bed3']){const row=budget.rows.find(r=>r.id===id+'-furniture');row.note=oldBudget.rows.find(r=>r.id===row.id).note;}
budget.assumptions=budget.assumptions.filter(s=>!s.startsWith('MW-NR01')).map(s=>s.replace(' Small bedroom accents are linen/art selections, not new build-outs.',' Bedrooms retain their original neutral linen/art selections.'));
budget.assumptions.unshift('MW-NR01: stair runner supply and specialist fitting removed; stair refinishing remains. Neutral bedroom furnishings restored. A/C1/E stone product and fabrication price differences still require measured quotes.');
for(const a of budget.alternates)if(a.id==='MW-M01')a.note=a.note.replace(' Small bedroom accents are linen/art selections, not new build-outs.',' Original neutral bedroom styling restored.');
budget.version='MW-B04';budget.visualRevision='MW-NR01; no stair-runner costs, original neutral bedrooms; stone quote differences pending.';
const total=calculateBudget(budget).total;
roadmap.budget.basis=roadmap.budget.basis.replace('$518,020–$852,799',`${money(total.low)}–${money(total.high)}`);
const runner={version:'MW-NR01',date:p.date,enabled:false,status:'Removed at homeowner request',scope:guide.stairFinish.scope,material:guide.stairFinish.material,coordination:guide.stairFinish.coordination,goods:[0,0],installationCost:[0,0],costBasis:'Runner allowances removed. Existing stair refinishing allowance retained.'};
audit.version='MW-NR01';audit.runner={decision:'No stair runner. The homeowner has selected exposed wood stairs across all floors.',reason:'Natural oak and warm white risers keep the stair visually quiet within the original Mineral & Walnut palette.',refinement:runner.material,tradeoff:'This choice removes carpet supply and specialist fitting from the scope; retain the existing stair refinishing and lighting plans.',status:'Current day/night views show exposed steps. Prior runner proposals are superseded.',cost:'Runner supply and fitting allowances removed; existing stair refinishing remains.'};
for(const id of Object.keys(intents)){const a=audit.rooms.find(r=>r.id===id);if(a){a.rendered=intents[id];if(stairs.includes(id))a.action='Confirm a coordinated physical oak finish sample and preserve all existing tread, riser, landing and guard geometry. No stair carpet is to be ordered.';}}
const replace=(o)=>{if(typeof o==='string')return o.replace('Then clean, fit functional window layers and stair runner when heavy access is finished.','Then clean and fit functional window layers. Protect the finished exposed-wood stairs through move-in.').replace('Install the runner after heavy trades and move routes are finished; maintain safe continuous stairs throughout.','Keep exposed oak treads and warm white risers; protect completed stair finishes during heavy trades and moving.');if(Array.isArray(o))return o.map(replace);if(o&&typeof o==='object')return Object.fromEntries(Object.entries(o).map(([k,v])=>[k,replace(v)]));return o;};
const option=library.options.find(o=>o.id==='mineral-walnut');option.refinementFile='docs/mineral-walnut-neutral-review.json';option.status='Mineral & Walnut · Warm stone + original neutral palette';option.hero='design-review-assets/floor-2-r02-great-mw-neutral-r01-GR1.webp';option.summary='Warm mineral walls, natural oak and rich walnut with selected pearl onyx-, quartzite- and limestone-look porcelain. Ivory, oatmeal and charcoal textiles preserve the original bedroom identities; exposed oak stairs connect the floors.';
p.status='applied_visually_reviewed';p.delivery={restoredRooms:restored,editedRooms:['entry','stair2','stair3','sharedbath'],selectedStoneRetained:['A','C1','E'],newGenerations:9,review:'docs/mineral-walnut-neutral-review.json'};
for(const [f,d]of [['docs/room-design-book.json',book],['docs/interior-design-guide.json',guide],['docs/mineral-walnut-night-review.json',night],['docs/mineral-walnut-design-lock.json',lock],['docs/mineral-walnut-budget.json',budget],['docs/design-options.json',library],['docs/mineral-walnut-neutral-review.json',review],['docs/mineral-walnut-stair-runner.json',runner],['docs/mineral-walnut-design-audit.json',audit],['docs/mineral-walnut-roadmap.json',replace(roadmap)],[file,p]])await write(f,d);
console.log('Restored original neutral bedrooms and coordinated bare stairs, retained selected stone, removed runner costs and updated current notes.');
