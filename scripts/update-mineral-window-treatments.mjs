import fs from 'node:fs/promises';
import {applyWindowBudget} from './design-library/window-treatments.mjs';
import {applyStairBudget} from './design-library/stair-runner.mjs';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const write=async(p,value)=>fs.writeFile(p,JSON.stringify(value,null,2)+'\n');
const schedule=await read('docs/mineral-walnut-window-treatments.json');
const book=await read('docs/room-design-book.json');
const guide=await read('docs/interior-design-guide.json');
for(const r of schedule.rooms){
  const room=book.rooms[r.id];
  if(!room)throw new Error('Unknown room: '+r.id);
  r.title=room.title;r.floor=room.floor;
  room.windowTreatment={...r,version:schedule.version};
  const id=r.id.toUpperCase()+'-WT01';
  room.schedule=room.schedule.filter(item=>item.id!==id);
  room.schedule.push({id,category:'Window treatments and privacy',item:r.recommendation,status:'proposed; measured takeoff and products pending',material:r.system==='none'?r.recommendation:schedule.palette,location:r.coverage,designTargets:`${r.why} Day: ${r.day} Night: ${r.night}`,preparation:'Label and measure each actual exterior opening; check after-dark sightlines, glazing, fixing substrate, handles, stack-back and furniture clearance. Sheers and open solar screens are not relied on for night privacy.',installation:r.installation,dimensions:'Site-measured opening and track sizes, finished drop, returns and operating clearances. No quantities or fabrication dimensions inferred from render pixels.',procurement:r.goods[1]?`Manual system allowance: goods $${r.goods[0]}–$${r.goods[1]} before tax/delivery; direct installation $${r.installationCost[0]}–$${r.installationCost[1]} before GC markup. Already included in the Option 1 cost plan. Exact material, lining, track and finished coverage to be selected.`:'No new window treatment in the base allowance; revise only after verifying a real opening or privacy requirement.',revision:schedule.version,feedbackReference:schedule.version});
  const g=guide.rooms.find(g=>g.id===r.id);g.windowTreatment={recommendation:r.recommendation,why:r.why,system:r.system};
}
// Reconcile earlier textile notes so the contractor does not receive conflicting layers.
const amend=(room,id,fields)=>Object.assign(book.rooms[room].schedule.find(x=>x.id===id),fields);
amend('office','O-T01',{material:'Warm ivory satin clear single-lite gallery doors with dark handles. Ivory sheers with independent non-see-through privacy shades on exterior windows; see OFFICE-WT01.'});
amend('media','M-T01',{material:'Ivory sheers plus fully closing ivory/oatmeal blackout-lined curtains on independent tracks; removable interior door covers for films. See MEDIA-WT01.',installation:book.rooms.media.windowTreatment.installation});
amend('gym','G-L01',{material:'Slim dark ceiling fixture and existing recessed light; cordless washable privacy roller shades under GYM-WT01.'});
amend('dining','D-T01',{item:'Ivory sheers and tall-window privacy layers',material:'Ivory linen-look sheers with independent privacy shades, discreet hardware; see DINING-WT01.',installation:book.rooms.dining.windowTreatment.installation});
amend('living','LR-T01',{item:'Front-window sheers with privacy shades',material:'Transparent ivory linen-look sheers plus a non-see-through privacy shade, included in the base; see LIVING-WT01. An open solar screen is not the evening privacy layer.'});
amend('sunroom','S-T01',{item:'Ivory sheers and independent privacy shades',material:'Transparent ivory linen-look sheers on slim tracks; independent privacy shades included in the base, coordinated by actual window bank. See SUNROOM-WT01.'});
book.updated=schedule.date;
book.feedbackLog=book.feedbackLog.filter(f=>f.id!==schedule.version);
book.feedbackLog.push({id:schedule.version,date:schedule.date,scope:'Option 1 · all 24 spaces · drapery, privacy and blackout',userFeedback:'Consider when each room needs blackout drapes and sheers versus just sheers; specify which room and why.',interpretation:'Specify independent daylight/privacy layers per room. All four bedrooms, the open owner retreat and media receive blackout. Social rooms retain ivory sheers plus discreet privacy shades; work/wet spaces use practical treatments. Windowless and high stair spaces are explicitly assessed. Replace the two generic budget allowances with room-specific supply/installation rows; preserve Option 1 visuals and palette.',status:'recommended_schedule_products_and_site_measure_pending'});
if(!guide.textileReview){guide.version='MW-G03';guide.date=schedule.date;}guide.windowTreatmentSchedule='docs/mineral-walnut-window-treatments.json';
Object.assign(guide.materials.find(m=>m.title.startsWith('Drapery:')),{use:'Sleeping and cinema spaces: sheers plus blackout. Social rooms: sheers plus a discreet privacy shade. Working/wet areas: practical shades. See the complete 24-space schedule below.',detail:'Keep ivory/oatmeal textile faces and slim dark or concealed hardware. Sheers alone are used only where privacy and light-control needs are verified absent. Full closing coverage, returns and stack-back matter more than decorative side panels.'});
const budget=applyWindowBudget(await read('docs/mineral-walnut-budget.json'),schedule);
if(budget.stairRunner)applyStairBudget(budget,budget.stairRunner);
await write('docs/mineral-walnut-window-treatments.json',schedule);
await write('docs/room-design-book.json',book);
await write('docs/interior-design-guide.json',guide);
await write('docs/mineral-walnut-budget.json',budget);
console.log('Updated 24 Option 1 room specifications and 17 room supply/installation allowances.');
