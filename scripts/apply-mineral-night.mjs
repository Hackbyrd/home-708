import fs from 'node:fs/promises';
if (await fs.access('docs/mineral-walnut-design-lock.json').then(()=>true,()=>false)) throw Error('Historical MW-N01 workflow is superseded. Use current original Option 1 day sources and docs/mineral-walnut-night-review.json.');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,d)=>fs.writeFile(p,JSON.stringify(d,null,2)+'\n');
const p=await read('docs/mineral-walnut-night-production.json');
const book=await read('docs/room-design-book.json'),library=await read('docs/design-options.json');
const selected=p.requests.filter(q=>q.qa?.accepted===true);
if(selected.length!==24||new Set(selected.map(q=>q.room)).size!==24)throw Error('Require 24 unique visually accepted room studies.');
const output={revision:'mw-night-r01',version:'MW-N01',status:'lighting_concepts_for_review',rooms:{}};
const general='Lighting-intent image, not a measured brightness or electrical simulation. Fixture positions, output, beam angles, color, dimming compatibility and controls need specification and an on-site night mock-up. Curtains stay open for comparison; select separate nighttime privacy layers where needed.';
for(const q of selected){
 const job=p.jobs.find(j=>j.index===q.index);
 if(job?.status!=='completed')throw Error('Unfinished job '+q.index);
 await fs.access(q.file);
 const extra=q.room==='retreat'?' Adjoining bedroom details carry forward the older source and must be coordinated with current OB views.':q.room==='bed2'?' The inherited west-door/closet relationship is still unverified.':q.room==='great'?' Fireplace and TV clearances remain subject to their installation requirements.':q.room==='gym'?' Ceiling downlight locations are illustrative proposed positions, not a record of installed fixtures.':'';
 const view={id:q.code+'-MWN01',version:'MW-N01',code:q.code,index:q.index,jobId:job.job_id,model:q.params.model,file:q.file,sourceCode:q.sourceCode,sourceFile:q.sourceFile,sourceJobId:q.sourceJobId,label:'Night · '+q.scene,scene:q.scene,cct:q.cct,circuits:q.circuits,lighting:q.lighting,evidenceType:q.sourceEvidence.includes('Plan')||q.sourceEvidence.includes('Blueprint')?'Night edit of plan-led concept':'Night edit of current room concept',evidence:'Same-view Higgsfield image edit of '+q.sourceCode+'. The daytime design and its source limitations remain the baseline.',qaNote:general+extra};
 output.rooms[q.room]=view;
 const r=book.rooms[q.room];
 r.lightingStudy={...view,status:'proposed',lightingNotes:[q.lighting,'Proposed lamp-color target: approximately '+q.cct+' K. Digital images cannot specify or verify the actual lamp color.','Plan separate control groups: '+q.circuits+'.','Select actual fixtures and diffusion; check output, glare, dimmer/driver compatibility and service access before closing walls. Test a sample at night with the room finishes.',...(q.room==='ownerbed'?['Keep the underbed and floating bedside LEDs on a separately dimmable circuit, with accessible drivers and no visible diode points.']:[]),general+extra]};
 r.schedule=r.schedule.filter(s=>s.id!==q.room.toUpperCase()+'-N01');
 r.schedule.push({id:q.room.toUpperCase()+'-N01',category:'Lighting and controls',item:q.scene+' · nighttime lighting intent',status:'proposed; fixtures and settings unselected',material:q.lighting,designTargets:'Approximate '+q.cct+' K appearance; assess physical lamp/finish samples. '+q.circuits+'.',installation:'Coordinate fixture positions, circuit/control grouping, AV reflection and dimmer/driver compatibility with the electrical contractor. Keep concealed-light drivers accessible; mock up and tune after dark before finalizing.',dimensions:'Final fixture locations, output and beam spread from measured room and product data. Render brightness is illustrative.',procurement:'Price retained fixtures with lamp/control upgrades first, then any proposed new fittings, wiring and installation separately.',revision:'MW-N01',feedbackReference:'MW-N01'});
}
book.feedbackLog=book.feedbackLog.filter(f=>f.id!=='MW-N01');
book.feedbackLog.push({id:'MW-N01',date:'2026-10-07',scope:'Option 1 · nighttime lighting for all 24 spaces',userFeedback:'Add nighttime renders for each room so the lighting can be reviewed.',interpretation:'Add one matching nighttime edit per room, preserving the current daytime views. Add Day / Night / Compare controls and document the intended lighting layers and control groups. Night images show design mood, not verified lighting levels or construction specifications.',status:'proposed_for_review'});
book.workflow.reviewScope='All four floors: 45 existing daytime views, 24 paired nighttime lighting studies and the 24-space refinement plan';
library.options.find(o=>o.id==='mineral-walnut').nightFile='docs/mineral-walnut-night-review.json';
p.status='visually_reviewed';p.qa={status:'accepted_for_concept_review',selectedIndices:selected.map(q=>q.index),rejectedIndices:p.requests.filter(q=>q.qa?.accepted===false).map(q=>q.index),scope:'All 24 day/night pairs visually compared for opening/layout continuity, furniture, plausible light sources, removed daylight and readable night lighting.',limitations:[general,'Retreat retains the older adjoining bedroom; Bedroom 2 retains the disclosed layout uncertainty.','Ceiling-light location/count in generated views is illustrative and must be coordinated on measured plans.']};
await write('docs/mineral-walnut-night-review.json',output);await write('docs/room-design-book.json',book);await write('docs/design-options.json',library);await write('docs/mineral-walnut-night-production.json',p);
console.log('Applied 24 lighting studies without replacing daytime revisions.');
