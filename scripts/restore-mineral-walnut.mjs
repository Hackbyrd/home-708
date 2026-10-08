import fs from 'node:fs/promises';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,d)=>fs.writeFile(p,JSON.stringify(d,null,2)+'\n');
const baseline=await read('docs/design-history/mineral-walnut-before-playbook.json');
const current=await read('docs/room-design-book.json');
const guide=await read('docs/interior-design-guide.json');
const library=await read('docs/design-options.json');
const night=await read('docs/mineral-walnut-night-review.json');
const production=await read('docs/mineral-walnut-purity-production.json');
const accepted=production.requests.filter(q=>q.qa?.accepted);
if(accepted.length!==3||new Set(accepted.map(q=>q.room)).size!==3)throw Error('Review three unique corrected night images before restoring the complete gallery.');
for(const [file,data] of [['room-design-book-before-purity.json',current],['interior-guide-before-purity.json',guide],['night-review-before-purity.json',night]]) {
 try{await fs.writeFile('docs/design-history/'+file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}
}
const lock={version:'MW-P02',date:'2026-10-07',option:'mineral-walnut',name:'Mineral & Walnut',basis:'Original Option 1 before the playbook crossover; retain subsequent functional requests, never Option 2 furniture assumptions.',palette:['Warm ivory and soft mushroom mineral walls','Rich walnut joinery and furniture','Natural matte oak dry-area floors','Ivory, oatmeal and charcoal textiles','Black/dark small accents','Green plants'],rules:['New furnishings are budgeted without credits for furniture already owned.','Do not import the Cocoa & Chrome material board, owned furniture photographs, polished-stainless casegoods, smoky brown-oak storage or blue/yellow accent program.','Furniture silhouettes may vary, including legs, floating construction and plinth bases where suitable. Option 2’s universal no-legs rule does not apply.','Roman Clay is selective on dry focal walls; washable matte paint elsewhere and appropriate waterproof assemblies at wet areas.','Bedrooms retain individual identities within the original palette.','Bedroom 5 is a new room to construct, not an existing finished room. Its render is proposed.'],audit:{dayViews:45,spaces:24,revertedDayViews:6,replacedNightViews:3,retainedNightViews:21,baseline:'docs/design-history/mineral-walnut-before-playbook.json',note:'Original 45 views reviewed for style continuity. Restoration retains the documented limitations of plan-led rooms and alternate cameras; it does not certify dimensions.'}};
await write('docs/mineral-walnut-design-lock.json',lock);
guide.version='MW-G02';guide.position='Original Mineral & Walnut: warm ivory and soft mushroom mineral walls, rich walnut, natural oak floors, ivory textiles, dark accents and greenery. Individual rooms share this warm modern foundation.';
guide.scope='Original 24-space / 45-view design restored. Twenty-four paired night views and practical refinements stay within the Option 1 palette. All construction dimensions and products need verification.';
guide.rules[2].text='Natural oak floors, warm mineral/ivory walls, rich walnut and restrained black accents carry across the house. Repeat these materials with different proportions and silhouettes in each room.';
guide.rules[3].text='Balance soft upholstery, rounded tables and substantial walnut storage. Use legs, plinths or floating details according to the room and practical construction needs.';
guide.palette=guide.palette.filter(([n])=>!['Brown oak','Polished steel','Smoky blue'].includes(n));
const wood=guide.materials.find(m=>m.title.startsWith('Wood + metal'));
Object.assign(wood,{title:'Walnut + dark accents',use:'Use rich walnut for selected cabinetry, consoles and the owner-suite headwall. Natural oak flooring keeps the backdrop lighter; restrained black frames and hardware provide definition.',detail:'Approve a shared walnut sample. Grain, veneer sequencing, edge details and hardware quality matter more than repeating the same furniture shape everywhere.'});
guide.materials.find(m=>m.title.startsWith('Floors:')).use='Budget replacement natural oak in connected dry spaces and all four bedrooms, with separate rugs. Keep a single coordinated undertone through circulation and adjacent rooms.';
guide.qualifications=guide.qualifications.map(([a,b])=>[a,b.replace('Keep movable seating and owned furniture;','Use well-made retail furniture;')]);
guide.phases[0].text='Measure the house, tape furniture layouts and approve a shared material board. Resolve Bedroom 5 construction, Bedroom 2 geometry, dining clearances and nighttime privacy.';
guide.phases[1].text='Assume most finishes need replacement. Coordinate Bedroom 5 partitions, flooring, wet-room systems, electrical changes and useful walnut built-ins. Retain service locations where feasible.';
guide.phases[2].text='Buy new furniture against an agreed schedule: beds and mattresses, seating, rugs, drapery and useful tables. Furnish the primary living and sleeping rooms first.';
guide.phases[3].text='Add art, plants and seasonal decoration once the core rooms work. Later purchases may be phased; they are deferred costs, not permanent savings.';
guide.checks=guide.checks.map(([id,label])=>id==='inventory'?['furniture','New furniture is measured, budgeted and allocated by room before ordering.']:[id,label]);
const changes={office:'Walnut cabinetry with varied closed doors and limited display bays. Add reachable task light, concealed cable routing and a practical printer cabinet.',great:'Keep walnut consoles, sibling neutral artwork, ivory seating, useful coffee/side tables, quiet mineral walls and a tall plant. Improve comfort and scale without changing the material palette.',ownerbed:'Walnut headwall and floating bedside pieces, new ivory upholstered platform bed, walnut dresser, layered sheer/blackout curtains and individual reading lights. Keep any decorative LEDs subtle.',bed5:'Build the proposed room first, then add a new upholstered bed and walnut storage. Retain its mushroom/charcoal identity with oak floor and a loose rug.',loft:'Use rich walnut storage, deep ivory seating, a quieter occasional table and restrained charcoal textiles. Keep a direct path to the terrace.'};
for(const r of guide.rooms){if(changes[r.id])r.improve=changes[r.id];r.visualStatus='Original Option 1 · further improvements proposed';}
const b5=guide.rooms.find(r=>r.id==='bed5');b5.keep='Proposed blueprint room footprint, flat ceiling and intended door/opening relationships; enclosure still needs construction.';b5.verify='Field-check partitions, door, closet, electrical and HVAC routing, egress and permit requirements before pricing the new room.';b5.priority='New room construction + comfort';
guide.rooms.find(r=>r.id==='kitchen').improve='Use replacement stock or semi-custom warm-ivory cabinetry with a walnut island and quiet pale counters. Keep existing service positions and coordinate the oak floor undertone.';
for(const q of accepted){
 const job=production.jobs.find(j=>j.index===q.index);if(job?.status!=='completed')throw Error('Missing completed correction '+q.index);
 const v=night.rooms[q.room];Object.assign(v,{version:'MW-P02',code:q.code,index:q.index,jobId:job.job_id,file:q.file,sourceFile:q.sourceFile,sourceCode:q.sourceCode,sourceJobId:q.sourceJobId,evidence:'Higgsfield night edit of the restored original Option 1 render, with the real model-home photograph as structural reference.',qaNote:q.qa.note});
}
night.version='MW-N02';night.revision='mw-night-r02';
const book=structuredClone(baseline);
for(const [id,r] of Object.entries(book.rooms)){
 const g=guide.rooms.find(x=>x.id===id);r.improvementPlan={version:'MW-G02',date:'2026-10-07',status:'proposed',visualStatus:g.visualStatus,mood:g.mood,improve:g.improve,verify:g.verify};
 r.lightingStudy={...current.rooms[id].lightingStudy,...night.rooms[id]};
 const lighting=current.rooms[id].schedule.find(s=>s.id===id.toUpperCase()+'-N01');if(lighting)r.schedule.push({...lighting,procurement:'Quote new fixtures, controls, wiring and installation separately; no owned-furniture or fixture credits assumed in the budget.'});
 if(id==='gym')r.schedule=r.schedule.filter(s=>!/rack|dumbbell|bench|treadmill|equipment/i.test(s.item??''));
}
book.rooms.bed5.constructionStatus='Not built. Owner confirmed 2026-10-07. Price new enclosure and service adjustments separately from finishes/furnishing.';
book.rooms.bed5.schedule.unshift({id:'B5-C01',category:'New construction',item:'Form proposed penthouse bedroom',status:'required; field survey and trade design pending',material:'Non-load-bearing partitions, insulation where specified, drywall, interior door, trim and closet enclosure.',installation:'Confirm lawful bedroom use, egress, HVAC supply/return, electrical and alarm requirements with responsible trades. No roof extension or exterior opening assumed.',dimensions:'Blueprint intent only; measured drawings govern.',procurement:'GC to quote separate room-formation line. Shared flooring/paint and furniture allowances remain separate.',revision:'MW-P02',feedbackReference:'MW-P02'});
book.brief.confirmed=book.brief.confirmed.filter(s=>!s.includes('walnut slat media wall'));
book.brief.confirmed.push('Original Option 1 palette only: warm mineral, walnut, natural oak, ivory, dark accents and plants.','Most finishes replaced; all new furniture budgeted. No Option 2 owned-furniture assumptions.','Media wall remains smooth and restrained, with TV as focal point; gym stays empty.','Bedroom 5 has not been built and must be included as new room construction.');
book.feedbackLog.push({id:'MW-P02',date:'2026-10-07',scope:'Whole Option 1 restoration and budget scope',userFeedback:'Stay pure to the original Option 1; remove Option 2 crossover. Assume most finishes need replacement, do not count existing furniture, and include new Bedroom 5 construction.',interpretation:'Restore saved original day renders and schedules, replace three affected night studies, retain useful practical guide advice in the original palette. Budget homeowner-managed design/purchasing with a GC; no interior designer or design-build fee.',status:'applied_for_review'});
book.updated='2026-10-07';book.workflow.reviewScope='Original Option 1: 24 spaces, 45 daytime views and 24 matching night views; Bedroom 5 is proposed new construction.';
const original=(await read('docs/design-history/design-options-before-playbook.json')).options.find(o=>o.id==='mineral-walnut');
const o=library.options.find(o=>o.id==='mineral-walnut');Object.assign(o,{hero:original.hero,summary:original.summary,status:'Original Mineral & Walnut · Day + night',guide:'interior-design-guide.html',budget:'mineral-walnut-budget.html'});delete o.refinementFile;
await write('docs/room-design-book.json',book);await write('docs/interior-design-guide.json',guide);await write('docs/mineral-walnut-night-review.json',night);await write('docs/design-options.json',library);
console.log('Restored original 45 views/schedules; corrected 3 night references; guide and budget scope separated from Option 2.');
