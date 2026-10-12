import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd(), docs=path.join(root,'docs');
const raw='assets/render-candidates/collected-mineral/r04';
const floors=JSON.parse(await fs.readFile(path.join(raw,'baseline-floors.json'),'utf8'));
const inventory=JSON.parse(await fs.readFile(path.join(docs,'current-furniture.json'),'utf8'));
const privateSpecs=JSON.parse(await fs.readFile(path.join(docs,'collected-mineral-private-specs.json'),'utf8'));
const social=JSON.parse(await fs.readFile(path.join(docs,'collected-mineral-new-social.json'),'utf8'));
const rooms=floors.flatMap(f=>f.rooms), room=id=>rooms.find(r=>r.id===id);
const url=s=>'https://708.hackbyrd.com/'+s;
const references=(id,products)=>[room(id).views[0].jobId,...(room(id).originalPhotos||[]).map(p=>url(p.src)),url(floors.find(f=>f.rooms.includes(room(id))).plan),...products.map(p=>url('current-furniture-assets/'+p+'.webp'))];
const params=(index,id,products,prompt)=>({index,params:{model:'gpt_image_2_5',count:1,resolution:'2k',quality:'high',aspect_ratio:'3:2',medias:references(id,products).map(value=>({role:'image',value})),prompt}});
const req=[params(301,'ownerbed',['modena-king','bezier-nightstand','bezier-dresser','bates-table-lamp','hadiza-rug'],privateSpecs.rooms.find(r=>r.id==='ownerbed').promptForEachExistingDayCode.OB1+' FINAL: Remove the obsolete foot bench and source dresser under the windows; ONE low eight-drawer dresser under TV only. No new custom nightstands. Match lens and room boundaries of FIRST image exactly.'),params(302,'ownercloset',['clio-vanity','blythe-stool','leaner-mirror'],privateSpecs.rooms.find(r=>r.id==='ownercloset').promptForEachExistingDayCode.WC1),params(303,'loft',['machinto-media','marble-coffee','machinto-side','arc-floor-lamp'],`REFERENCE PHOTO IMAGE EDIT ONLY. First image fixes camera and room shell. Original photo and printed plan fix openings. Change only loose furniture and subtle finishes for OPTION3 COLLECTED MINERAL. Preserve same raised tray ceiling, recessed rear southwest bar, French doors with small flank windows, west slider, east TV wall and actual room size. Neutral mushroom mineral walls, natural matte oak, quiet walnut bar, ivory sheers/privacy layers. NO blue/yellow decor. Replace source sofa and armchair with ONE owned white RH CLOUD Luxe45 group: TWO corner modules plus ONE armless = three-seat run approximately134in, and ONE separate45in ottoman front-left; do not add a second ottoman or sectional return. Final reference whole sofa photo controls geometry; owner fabric is WHITE Perennials Performance Textured Linen Weave, not beige. ONE owned Machinto brown-oak polished-stainless media console below wall TV; no new duplicate console. ONE owned low Italian Carrara marble PLINTH coffee table48W x24D centered, no legs. TWO owned Machinto ROUND18in brown-oak/SS side tables, one at each sofa end, actual small polished silver bases. ONE polished nickel ARC II floor lamp near sofa end, not black/brass. Remove old table lamp and all unowned chairs. A neutral SANANI9x12 Natural/Mink wool rug under seating, taupe/cream low-pile subtle handwoven texture, exact pattern provisional, NOT charcoal Marled Grey swatch. Existing recessed bar keeps TWO owned RH1960s ROME backless stools, polished stainless square frames and GRAPHITE textured linen padded seats (NOT white photo default). Keep terrace walkway and bar route open. Photorealistic daylight, no labels/collage/people. Same exact source camera and exterior glazing including small flank units, no invented stair elevation.`)];
req[2].params.medias.push({role:'image',value:'https://media.restorationhardware.com/is/image/rhis/prod6511684_E1684919_F_RHR?'});
await fs.writeFile(path.join(raw,'core-requests.json'),JSON.stringify(req,null,2));

const allocations={dining:['cabrera-console','round-mirror','vessel-short','vessel-tall','spiridon-chandelier'],loft:['machinto-media','machinto-side','rome-stool','arc-floor-lamp','cloud-ottoman','cloud-corner','cloud-armless','marble-coffee','sanani-rug'],ownerbed:['modena-king','bezier-nightstand','bezier-dresser','bates-table-lamp','hadiza-rug'],ownercloset:['leaner-mirror','clio-vanity','blythe-stool'],sunroom:['emery-chair','emery-armchair','maslow-table'],bed2:['modena-queen','orbiter-wall-lamp','delfina-rug'],living:['martini-side']};
const affected=new Set(['office','media','great','kitchen','dining','living','sunroom','ownerbed','retreat','ownercloset','bed2','bed3','loft','bed5','terrace']);
const asset='collected-mineral-assets';
await fs.mkdir(path.join(docs,asset),{recursive:true});
const copy=async(source,name)=>{const target=path.join(asset,name);await fs.copyFile(path.join(docs,source),path.join(docs,target));return target;};
const sourceRooms=structuredClone(rooms);
for(const floor of floors){
  floor.plan=await copy(floor.plan,`floor-${floor.number}-plan.webp`);
  floor.description += ' Collected Mineral retains this floor’s verified shell, with owned furniture allocated once and new pieces completing the remaining rooms.';
  for(const r of floor.rooms){
    r.revision='CM-R04';
    r.ownedFurniture=(allocations[r.id]||[]).map(id=>{const item=inventory.items.find(i=>i.id===id);return {...item,inventoryId:id,unitIds:Array.from({length:item.quantity},(_,i)=>`${id}-${i+1}`),sourceUrl:item.productUrl||item.url,dimensions:item.size||'Exact dimensions pending owner/site measurement',imageUrl:item.imageUrl||item.image,placement:r.id==='loft'&&id==='rome-stool'?'Two stools at retained recessed bar':`Placed in ${r.title}; product proportions and circulation require measured checks.`,fitNotes:[item.photoLimitation||'Recorded owned configuration governs; reference photography may show another size.'].filter(Boolean)};});
    r.newFurniture=(social.items||[]).filter(i=>i.room===r.id).map(i=>({...i,dimensions:i.size,imageUrl:i.image||i.sourceImageUrl,unitPrice:i.price,availability:{status:i.stockStatus,evidence:i.stockEvidence,checkedAt:i.checkedAt},placement:i.placement||i.decision||'Complete the room’s remaining furniture needs.',fitNotes:[i.fitNotes].filter(Boolean),purchaseNotes:['Purchase in phases after field measurements and current configured stock confirmation.']}));
    const spec=privateSpecs.rooms.find(x=>x.id===r.id);
    r.materials=spec?.materials||['Matte natural oak flooring with warm ivory/mineral walls; muted walnut fitted accents. No blue or yellow decorative palette.'];
    r.architectureLocks=spec?.architectureLocks||[...(r.notes||[])];
    r.measurementNotes=spec?.measurementNotes||['Confirm openings, furniture dimensions, curtain stacks, door swings and delivery access on site before buying or fabrication.'];
    r.buildOuts=[];
    r.purchaseNotes=['Install dusty work, services, floors and fixed lighting first; move owned pieces once finishes are protected, then add new furniture in phases.'];
    r.lighting={day:'Natural daylight; layered window treatments as scheduled.',night:r.nights?.[0]?.lighting||r.night?.lighting||'Layered dimmable ambient and task illumination.',cct:r.nights?.[0]?.cct||2700,circuits:r.nights?.[0]?.circuits||'Separate ambient, task and decorative circuits.'};
    const src=sourceRooms.find(x=>x.id===r.id);
    r.originalPhotos=await Promise.all((r.originalPhotos||[]).map(async(p,i)=>({...p,src:await copy(p.src,`${r.id}-original-${i+1}.webp`)})));
    for(const v of [...r.views,...(r.nights||[])]){
      const isNight=!!v.sourceCode;
      const suffix=isNight?'night':'day';
      const old=structuredClone(v);
      v.src=await copy(old.src,`${r.id}-${v.code}-${suffix}.webp`);
      v.thumb=await copy(old.thumb||old.src,`${r.id}-${v.code}-${suffix}-thumb.webp`);
      v.baseline=old;
      v.qa={approved:!affected.has(r.id),status:affected.has(r.id)?'replacement_required':'shared_envelope_preserved'};
      if(!affected.has(r.id)){v.evidence='Unchanged shared Mineral & Walnut envelope. '+(old.evidence||src.intent);v.qaNote='Existing accepted architecture and lighting retained without changing the furniture scheme. '+old.qaNote;}
    }
    r.night=r.nights?.[0];
  }
}
const design={id:'collected-mineral',number:3,name:'Collected Mineral',status:'in_preparation',revision:'CM-R04',updated:'2026-10-11',subtitle:'Warm mineral architecture, your collected RH furniture and thoughtfully chosen new pieces.',summary:'A new complete home built around all39 owned pieces: neutral mineral walls, natural oak, pale stone and restrained walnut. Brown oak and polished silver are concentrated in purposeful furniture groups; new furnishings complete the great room, office, cinema, formal dining, piano salon, guest rooms and terrace.',palette:['#dfd8cd','#f2eee5','#8b7056','#4c3e34','#a5a6a3','#4e5b45'],heroRoom:'great',inventorySummary:{types:29,units:39},globalNotes:['Owned inventory is allocated once across the home; new items are separate purchases.','All rooms have paired day/night cameras. Unchanged bathroom, entry, gym, stair and laundry views retain the approved shared Mineral & Walnut envelope.','Exact selected stock, quantity and delivery to20878 must be confirmed before purchasing; dated catalog observations are not reservations.','Renders are design studies, not manufacturer CAD or measured construction drawings.','The penthouse bedroom remains unbuilt; its views depict proposed construction.','No bedroom color accents, stair runners or Option2 blue/yellow palette. Approved stone-look wet-room materials remain.'],floors};
await fs.writeFile(path.join(docs,'collected-mineral-design.json'),JSON.stringify(design,null,2));
await fs.writeFile(path.join(docs,'collected-mineral-production.json'),JSON.stringify({revision:'CM-R04',status:'in_preparation',jobs:[]},null,2));
console.log('Prepared Option3 seed and core requests.');
