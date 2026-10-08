import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const file='docs/option-two-owner-furniture-production.json';
const directory='assets/render-candidates/option-two-cocoa-chrome/r05';
const study=JSON.parse(await fs.readFile('docs/owner-furniture-study-r01.json','utf8'));
const mode=process.argv[2]||'init';
const ref={drawer:'b88cedf8-8c3e-4f16-ae5c-a32d458b231e',swatch:'b9167184-d531-4b42-9b87-ab3374fcad53'};
const anchors=Object.fromEntries(study.selected.map(v=>[v.room,v]));
const image=value=>({role:'image',value});
const sourceFor=(room,slot)=>room.sourcePhotos[(slot==='b'&&['retreat','terrace'].includes(room.id))?1:0];
const evidenceFor=(room,slot)=>{
 const source=sourceFor(room,slot);
 return source?`https://708.hackbyrd.com/design-library-assets/${encodeURIComponent(path.basename(source))}`:`https://708.hackbyrd.com/design-review-assets/floor-${room.floorNumber}-${['r04','r02','r03','r03'][room.floorNumber-1]}-plan.webp`;
};
const globalStyle=`APPROVED OWNER-FURNITURE DIRECTION — match the room STYLE reference, and ACTUAL product references. Smoky dark BROWN OAK with grey/charcoal undertones and distinctive open oak grain, thick STRAIGHT rectangular carcasses and prominent broad polished STAINLESS STEEL FULL-WIDTH HORIZONTAL drawer handle strips. The actual two-drawer product is the furniture vocabulary, not just a brown color swatch. Keep drawer fronts flush and bases continuous/recessed to FLOOR, no small feet, no floating drawers. Do not substitute reddish walnut, orange teak, generic espresso, black lacquer, tiny pulls, brass or gold. New consoles/built-ins may adapt the same rectangular furniture family, but do not randomly add stone caps to the owner's actual bedside drawers. Chairs and lamps can have appropriate slender supports; the no-legs rule applies to storage furniture.
White RH CLOUD-style deeply upholstered sofa and WHITE upholstered bed frames; warm-white chairs. Light-to-medium NEUTRAL NATURAL WHITE OAK floors, matte, restrained grain/knots, clearly lighter than the dark furniture; no orange cast or gray vinyl look. Large textured ivory/stone loose rugs, all FOUR bedrooms have wood flooring and a loose rug under the bed. Preserve tiled wet floors, gym RUBBER and existing exterior deck instead of oak in those zones.
Light warm STONE/PUTTY GREIGE walls with enough depth to distinguish white furniture. Subtle SMOOTH low-contrast Roman Clay on selected DRY focal walls; no jagged trowel pattern, dramatic marble effects or plaster inside showers. Light soft-white trim/doors; original ceiling profiles. Wet/splash walls retain suitable porcelain/wipeable surfaces.
Full-height OFF-WHITE/ECRU translucent RIPPLE-FOLD SHEERS on discreet tracks, soft flowing folds and floor-skimming hems, stack clear of actual openings. Bedrooms/media have a discreet opaque/blackout layer. No dark heavy drapes, yellow drapes or shiny curtain rods.
Refined visible BLUE/WHITE artwork with slate/ink/navy blue cushions, throws, bedding or small ceramics. BUTTER YELLOW is a smaller highlight, one or two small pillows, flowers or a ceramic, never broad yellow architectural surfaces. Green from real plants. Blue and yellow are present in appropriately styled rooms, not forced into stairs/closets/shower corners. Preserve a different but coordinated personality for each bedroom.
Polished STAINLESS/SILVER lighting and hardware, opal glass, limited black for frames/TV/piano. Soft 3000K dimmable accents under clean abundant daylight; neutral white balance, no orange neon or orange ceiling. Sophisticated real model-home quality, tactile materials, restrained custom work, correct human scale. NO new architecture, windows, roof or altered plumbing. Original actual room photo governs structural evidence; previously accepted owner functional changes govern furniture and AV. No people, labels, logos, watermark or collage. Only requested wall quotes may appear.`;
const material=(s)=>s.replace(/cocoa walnut|cocoa-walnut|dark walnut|rich walnut|walnut|espresso-brown|espresso|cocoa/gi,'smoky brown oak').replace(/chrome/gi,'polished stainless/silver');

if(mode==='init'){
 try{await fs.access(file);throw Error('Production manifest already exists; resume it instead.');}catch(e){if(e.code!=='ENOENT')throw e;}
 const old=JSON.parse(await fs.readFile('docs/option-two-cocoa-chrome-production.json','utf8'));
 await fs.mkdir(directory,{recursive:true});
 await fs.mkdir('docs/design-history',{recursive:true});
 await fs.writeFile('docs/design-history/cocoa-chrome-before-owned-furniture.json',JSON.stringify(old,null,2)+'\n');
 const m={...structuredClone(old),date:'2026-10-07',revision:'cc-r02',status:'generating',interpretation:'Owner approved the three room previews using their Brown Oak / Polished Stainless Steel furniture and white RH Cloud sofa / white bed frames, and authorized this direction for all of Option 2.',globalStyle,requests:[],jobs:[],selectedViews:{},qa:[],finalSelection:[],delivery:{published:false},pendingOwnerFeedback:null,styleReferences:study.selected,ownerFurnitureBrief:'docs/owner-furniture-design-brief.json',previousProduction:'docs/design-history/cocoa-chrome-before-owned-furniture.json'};
 for(const [i,room] of m.inventory.entries()){
  room.previousViews=room.views.map((v,n)=>{
   const q=old.requests.find(q=>q.index===old.selectedViews[room.id][n?'b':'a']);
   const j=old.jobs.find(j=>j.index===q.index);
   return {...v,index:q.index,jobId:j.job_id,file:q.file,label:q.label||v.label};
  });
  room.style=material(old.roomStyle[room.id].split('COLOR AND MATERIAL CORRECTION')[0]);
  if(room.id==='great')room.style+=' Use the APPROVED great-room reference exactly: blue/white sibling artwork, substantial blue cushions and throw plus two small butter-yellow pillows. Broad steel horizontal handle strips on both dark oak consoles.';
  if(room.id==='ownerbed')room.style+=' Match approved owner bedroom: white platform, low smoky-oak headwall, broad steel drawer strips, soft blue coverlet and one yellow lumbar. Underbed LED remains required but very dim in daylight; walls should be smooth, not chevron texture.';
  if(room.id==='office')room.style+=' Match the approved office: full north TV/soundbar built-in, broad stainless strip drawers, compact printer cabinet, rectangular desk. Three joined side-window sash units, second/front two-unit grouping retained outside this view.';
  if(room.id==='retreat')room.style+=' Visible bedroom matches approved owner bedroom: white platform, blue bedding, low smoky-oak band and two blue-white artworks. Preserve BOTH corner window walls and actual exterior door.';
  room.floorDescription=room.floorNumber===2?'White seating, smoky brown oak, polished stainless and blue accents connect the entertaining rooms.':material(room.floorDescription);
  m.roomStyle[room.id]=room.style+'\nCOLOR AND MATERIAL CORRECTION — OVERRIDES ANY OLDER COSMETIC WORDING ABOVE:\n'+globalStyle;
  const index=8001+i,anchor=anchors[room.id],v=room.previousViews[0];
  const style=anchors[['ownerbed','retreat','bed2','bed3','bed5'].includes(room.id)?'ownerbed':room.id==='office'?'office':'great'];
  const q={index,room:room.id,code:v.code,phase:anchor?'approved-anchor':'hero',slot:'a',label:room.id==='great'?'Approved brown-oak and stainless direction':v.label,file:`${directory}/${room.id}-a.png`};
  if(anchor){
   await fs.copyFile(anchor.file,q.file);
   m.jobs.push({...study.jobs.find(j=>j.index===anchor.index),index,file:q.file,reusedApprovedPreview:true});
   q.sourcePreviewIndex=anchor.index;
  }else{
   q.params={model:'nano_banana_2_1',resolution:'2k',thinking_level:'high',aspect_ratio:'3:2',count:1,medias:[image(v.jobId),image(evidenceFor(room,'a')),image(style.job_id),image(ref.drawer),image(ref.swatch)],prompt:`PHOTO-IN IMAGE EDIT. IMAGE 1 is the TARGET ${room.title}, KEEP ITS EXACT CAMERA, structural geometry and owner-directed functional layout. IMAGE 2 is ${room.sourcePhotos.length?'the real model-home PHOTO: structural ground truth':'the builder floor PLAN: this room has no labeled photo'}. IMAGE 3 is the APPROVED style only; do not transplant that room's windows/fireplace/bed into this target. IMAGE 4 is the ACTUAL owner brown-oak cabinet and IMAGE 5 its finish swatch, product references only. Ignore screenshot margins/UI. Restyle image 1 around these actual owned finishes and approved room style.\n\n${globalStyle}\n\nROOM-SPECIFIC REQUIREMENTS, ALL TO RETAIN:\n${room.style}\n\nArchitecture: ${room.architectureLocks.filter(s=>!/walnut|bronze|floating|black-and-opal/i.test(s)).join(' ')}\n\nSingle coherent full-room 3:2 architectural photo of THIS target, no other room or product inset. Do not change camera to image 3. Preserve Crown neighboring townhomes/street outside. Return only the finished image.`};
  }
  m.requests.push(q);m.selectedViews[room.id]={a:index};
 }
 const baseline={};for(const p of ['docs/house-design-review.html','docs/room-design-book.json','docs/model-home.html']){baseline[p]=crypto.createHash('sha256').update(await fs.readFile(p)).digest('hex');}
 await fs.writeFile('tmp/owned-furniture-option-one-baseline.json',JSON.stringify(baseline,null,2)+'\n');
 await fs.writeFile(file,JSON.stringify(m,null,2)+'\n');
 console.log(`Prepared ${m.requests.filter(q=>q.params).length} new hero edits, retained ${m.jobs.length} approved anchors.`);
}else if(mode==='alternates'){
 const m=JSON.parse(await fs.readFile(file,'utf8'));
 for(const [i,room] of m.inventory.entries()){
  if(room.views.length<2)continue;
  const index=8101+i;if(m.requests.some(q=>q.index===index))continue;
  const v=room.previousViews[1],hero=m.jobs.find(j=>j.index===m.selectedViews[room.id].a);
  if(hero?.status!=='completed')throw Error(`Hero pending for ${room.id}`);
  const q={index,room:room.id,code:v.code,phase:'alternate',slot:'b',label:material(v.label),file:`${directory}/${room.id}-b.png`,params:{model:'nano_banana_2_1',resolution:'2k',thinking_level:'high',aspect_ratio:'3:2',count:1,medias:[image(v.jobId),image(hero.job_id),image(evidenceFor(room,'b')),image(ref.drawer),image(ref.swatch)],prompt:`PHOTO-IN IMAGE EDIT: IMAGE 1 is the exact TARGET CAMERA: ${v.label} in ${room.title}. IMAGE 2 is the APPROVED new design of the SAME room seen from the other camera; match all furniture models, drawer divisions, color, artwork and accessories to image 2 while KEEPING IMAGE 1'S distinct viewpoint and crop. Do NOT repeat image 2's wide composition. IMAGE 3 is ${room.sourcePhotos.length?'the real room photo':'builder plan'} for architecture. IMAGE 4/5 are actual owner Brown Oak / Polished Stainless references.\n\n${globalStyle}\n\nROOM REQUIREMENTS:\n${room.style}\n\nTarget composition: ${v.label}. If close detail, stay close and do not invent out-of-frame parts. If reverse view, preserve original door/wall relationships and roof direction. Do not force blue/yellow accessories into an empty gym, stair detail or shower. Gym must stay empty with CHARCOAL RUBBER, no oak/rug. Exact gym quote if visible: "Surpass your limits. Right here, right now." Entry reverse inscription above exit: "Take the road less traveled"; above arch from other direction: "Home is where the Heart is". Laundry exact quote if visible: "Rinse and repeat.." No other text. All quoted phrases apply ONLY to the named target room, not other rooms.\n\nPreserve actual apertures, tray/flat ceiling, fixed services and exterior townhomes. Architecture and viewpoint stay as image 1; styling/furniture now match image 2. Photoreal single 3:2 image, no collage.`}};
  m.requests.push(q);m.selectedViews[room.id].b=index;
 }
 await fs.writeFile(file,JSON.stringify(m,null,2)+'\n');
 console.log(`Prepared ${m.requests.filter(q=>q.phase==='alternate').length} alternate views.`);
}else throw Error(`Unknown mode ${mode}`);
