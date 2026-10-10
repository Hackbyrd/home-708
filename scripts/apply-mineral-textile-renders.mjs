import fs from 'node:fs/promises';
import sharp from 'sharp';
import {applyStairBudget} from './design-library/stair-runner.mjs';
const read=async f=>JSON.parse(await fs.readFile(f,'utf8'));
const write=async(f,d)=>fs.writeFile(f,JSON.stringify(d,null,2)+'\n');
const p=await read('docs/mineral-walnut-textile-production.json');
const book=await read('docs/room-design-book.json');
const baseline=await read('docs/design-history/mineral-walnut-before-textiles.json');
const night=await read('docs/design-history/mineral-walnut-night-before-textiles.json');
const guide=await read('docs/interior-design-guide.json');
const windows=await read('docs/mineral-walnut-window-treatments.json');
const runner=await read('docs/mineral-walnut-stair-runner.json');
const library=await read('docs/design-options.json');
const accepted=p.requests.filter(q=>q.qa?.accepted);
const days=new Map(accepted.filter(q=>q.scene==='day').map(q=>[q.room+'/'+q.code,q]));
const nights=new Map(accepted.filter(q=>q.scene==='night').map(q=>[q.room,q]));
if(days.size!==34||nights.size!==19)throw Error(`Expected 34 accepted day edits / 19 night edits; have ${days.size} / ${nights.size}`);
for(const q of [...days.values(),...nights.values()]){
 const j=p.jobs.find(j=>j.index===q.index);if(j?.status!=='completed'||!j.downloaded)throw Error('Incomplete '+q.index);
 const m=await sharp(q.file).metadata();if(Math.max(m.width,m.height)<1536)throw Error('Undersize '+q.index);
}
const preserved={media:'M2 faces the internal clear doors, which remain uncovered during daytime. Exterior blackout curtains are outside this angle.',bath:'Windowless room; no curtain or stair change applies.',dining:'D2 shows the high arched window that remains bare; tall-window layers are shown in D1.',retreat:'OR1 faces the bar and open bedroom connection; the retreat window layers are shown in OR2.',ownercloset:'Windowless closet; no curtain or stair change applies.',bed5:'Both existing cameras face the blank headboard wall; exterior glazing and its specified sheer/blackout layers are outside these views. Window placement must be confirmed for the unbuilt room.',bath4:'Windowless plan-led bathroom; no curtain or stair change applies.',terrace:'Outdoor terrace. Interior window treatments are shown in the adjoining rooms; no outdoor drapes are proposed.'};
const review={version:'MW-T01',revision:'mw-textiles-r01',status:'visually_reviewed_concepts',rooms:{}};
const coverage=[];
for(const [id,r]of Object.entries(book.rooms)){
 const base=baseline.rooms[id],old=base.revisions.find(v=>v.id===base.currentRevision);
 const w=windows.rooms.find(w=>w.id===id);
 const updatedViews=old.views.map(v=>{
  const q=days.get(id+'/'+v.code);
  coverage.push({room:id,code:v.code,status:q?'updated':'retained',reason:q?'Textile-only Higgsfield edit; visual QA passed.':preserved[id]||'No relevant visible change.',...(q?{index:q.index}:{})});
  if(!q)return {...v,qaNote:(v.qaNote||'')+' '+(preserved[id]||'')};
  return {...v,id:v.id+'-MWT01',index:q.index,jobId:p.jobs.find(j=>j.index===q.index).job_id,file:q.file,model:q.params.model,sourceFile:q.sourceFile,sourceJobId:q.sourceJobId,revision:'MW-T01',evidence:'Higgsfield image edit of the approved '+v.code+' design; only stair runner and/or visible window treatment layers updated. '+v.evidence,qaNote:'Open/daytime treatment demonstration. Original camera and room arrangement retained; textile fabrication, fixing details and final dimensions require site measurements. '+(q.room==='entry'?'Entrance shade is provisional; verify privacy need.':'')};
 });
 const hasEdit=updatedViews.some(v=>v.revision==='MW-T01');
 if(hasEdit){
  r.revisions=r.revisions.filter(v=>v.id!=='mw-textiles-r01');
  r.revisions.push({id:'mw-textiles-r01',date:'2026-10-08',status:'proposed_for_review',reason:'Show the specified sheer/privacy/blackout systems and the continuous oatmeal/charcoal stair runner in the approved Option 1 interiors.',manifest:'docs/mineral-walnut-textile-production.json',views:updatedViews,qa:{status:'visually_reviewed_concepts',limitations:old.qa?.limitations||[]}});
  r.currentRevision='mw-textiles-r01';
 }
 const q=nights.get(id);
 if(q){
  const day=days.get(id+'/'+q.sourceCode);const j=p.jobs.find(j=>j.index===q.index);
  if(q.sourceJobId!==p.jobs.find(j=>j.index===day.index).job_id)throw Error('Mismatched night source '+id);
  Object.assign(night.rooms[id],{id:q.code+'-MWT01',version:'MW-T01',code:q.code,index:q.index,jobId:j.job_id,file:q.file,model:q.params.model,sourceCode:q.sourceCode,sourceFile:q.sourceFile,sourceJobId:q.sourceJobId,label:'Night · '+(w.system==='blackout'?'Blackout closed':w.system==='privacy'||w.system==='practical'?'Privacy layers closed':'Runner and evening light'),scene:w.system==='blackout'?'Blackout / evening mode':w.system==='privacy'||w.system==='practical'?'Privacy / evening mode':'Evening circulation',evidence:'Night edit of the visually reviewed '+q.sourceCode+' textile revision. Same camera, with the specified visible privacy/blackout layers closed.',qaNote:'Window-treatment operation and electric-light mood are illustrative, not a measured blackout or lighting performance test. Actual gaps, sightlines, fabric opacity and installation must be checked on site.'});
 }else{
  night.rooms[id].qaNote='Existing night view retained. '+(preserved[id]||'No relevant visible textile change.')+' Lighting is illustrative; verify actual products and light levels on site.';
 }
 r.lightingStudy={...r.lightingStudy,...night.rooms[id]};
 if(r.lightingStudy.lightingNotes)r.lightingStudy.lightingNotes=r.lightingStudy.lightingNotes.map(n=>n.replace('Curtains stay open for comparison; select separate nighttime privacy layers where needed.','').trim()).concat(night.rooms[id].qaNote);
 r.windowTreatment={...w,version:windows.version};
 const notes=[r.designIntent,'Window treatment: '+w.recommendation,'Why: '+w.why];
 const stair=['entry','stair2','stair3'].includes(id);
 if(stair){
  notes.push('Matching oatmeal/taupe runner with narrow charcoal edging on all interior floor-to-floor flights and their intermediate landings, with exposed wood margins.');
  const sid=id.toUpperCase()+'-SR01';r.schedule=r.schedule.filter(s=>s.id!==sid);
  r.schedule.push({id:sid,category:'Stair runner',item:'Continuous runner through floors 1–4',status:runner.status,material:runner.material,location:runner.scope,installation:runner.installation,preparation:runner.coordination,dimensions:runner.dimensions,procurement:runner.costBasis+' The whole-stair supply and fitting lines are counted once under shared costs, not once per room.',source:runner.source,revision:'MW-T01',feedbackReference:'MW-T01'});
 }
 review.rooms[id]={revision:hasEdit?'MW-T01':old.id,views:updatedViews,notes,windowTreatment:{...w,version:windows.version},textileNote:preserved[id]||'Visible treatments updated in the images; day and night demonstrate their different operating states.',...(stair?{stairRunner:runner}:{})};
 const g=guide.rooms.find(g=>g.id===id);
 g.originalBaseline??=g.baseline;g.baseline=updatedViews[0].file;g.visualStatus=hasEdit?'MW-T01 · textiles updated; Option 1 palette retained':'Current Option 1 · no visible textile change';
 if(stair){g.improve='Continuous oatmeal/taupe stair runner with narrow charcoal edging and balanced exposed-wood margins. Retain existing stair geometry and coordinate across all three floor-to-floor connections.';g.verify=runner.dimensions;}
}
night.version='MW-N03';night.revision='mw-textiles-night-r01';
book.updated='2026-10-08';book.workflow.reviewScope='Option 1: 24 spaces / 45 daytime views / 24 night views. MW-T01 updates 34 day views and 19 night views for runners and functional window treatments.';
book.feedbackLog=book.feedbackLog.filter(f=>f.id!=='MW-T01');book.feedbackLog.push({id:'MW-T01',date:'2026-10-08',scope:'Option 1 images, stair runners and window treatments',userFeedback:'Update the images to show stair runners and which rooms have sheers, blackout drapes or sheers alone.',interpretation:'Add the continuous oatmeal/taupe runner with narrow charcoal edging through interior floors 1–4. Render room-specific daylight/open and evening/closed window treatments; preserve all unrelated approved finishes, architecture and furniture. Retain windowless and off-camera views with explicit coverage notes.',status:'rendered_for_review_materials_and_measured_installation_pending'});
guide.version='MW-G04';guide.date='2026-10-08';guide.textileReview='docs/mineral-walnut-textile-review.json';guide.stairRunner=runner;guide.scope='Current 24-space / 45-view Mineral & Walnut design with 24 paired night views. Stair runners and room-specific window treatments are illustrated in MW-T01; off-camera openings remain documented in the room schedule.';
windows.renderNote='MW-T01 updates visible window treatments in the day and night images: daylight shows open/partly raised layers; night shows privacy or blackout closed where visible. Windowless rooms and views with openings outside the camera frame are retained and labeled, including Bedroom 5. Images illustrate appearance, not measured privacy or blackout performance.';
const budget=await read('docs/mineral-walnut-budget.json');budget.windowTreatments=windows;applyStairBudget(budget,runner);
const option=library.options.find(o=>o.id==='mineral-walnut');option.refinementFile='docs/mineral-walnut-textile-review.json';option.status='Mineral & Walnut · Stair runners + layered drapery';option.hero='design-review-assets/floor-2-r02-great-mw-textiles-r01-GR1.webp';
p.status='visually_reviewed';p.coverage=coverage;p.delivery={dayEdits:days.size,nightEdits:nights.size,retainedDayViews:45-days.size,retainedNightViews:24-nights.size,review:'docs/mineral-walnut-textile-review.json'};
const lock=await read('docs/mineral-walnut-design-lock.json');lock.currentRefinement={version:'MW-T01',scope:'Stair runners and functional window-treatment layers only; original Option 1 palette, furniture and architecture retained.',dayEdits:34,nightEdits:19};
for(const [f,d]of [['docs/room-design-book.json',book],['docs/interior-design-guide.json',guide],['docs/mineral-walnut-night-review.json',night],['docs/mineral-walnut-window-treatments.json',windows],['docs/mineral-walnut-budget.json',budget],['docs/design-options.json',library],['docs/mineral-walnut-design-lock.json',lock],['docs/mineral-walnut-textile-review.json',review],['docs/mineral-walnut-textile-production.json',p]])await write(f,d);
console.log('Applied 34 day / 19 night textile edits, room notes, stair scope and nonduplicated budget allowances.');
