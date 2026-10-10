import fs from 'node:fs/promises';
const file='docs/mineral-walnut-textile-production.json';
const p=JSON.parse(await fs.readFile(file));
const w=JSON.parse(await fs.readFile('docs/mineral-walnut-window-treatments.json'));
const dayRooms=[...new Set(p.requests.filter(q=>q.scene==='day').map(q=>q.room))];
let added=0;
for(const [n,room]of dayRooms.entries()){
 if(p.requests.some(q=>q.room===room&&q.scene==='night'))continue;
 const candidates=p.requests.filter(q=>q.room===room&&q.scene==='day'&&q.qa?.accepted);
 const old=p.nightBaseline.rooms[room];
 const q=candidates.find(q=>q.code===old.sourceCode)||(room==='retreat'?candidates.find(q=>q.code==='OR2'):null);
 if(!q)continue;
 const s=w.rooms.find(r=>r.id===room),job=p.jobs.find(j=>j.index===q.index);
 let operation=s.system==='blackout'?'CLOSE every opaque blackout layer fully across each actual visible exterior window; no direct view outside through a blackout-covered window. Keep the ivory/oatmeal fabric appearance, full natural folds and the independent sheer layer nearest the glass. No daylight leaks across the glass.':s.system==='privacy'?'Lower/CLOSE all visible exterior-window and glazed exterior-door PRIVACY shades completely behind the delicate ivory sheers. Show non-see-through warm-ivory privacy fabric, not transparent open solar mesh. Keep the sheers soft and translucent in front. Leave designated HIGH transoms bare with dark outdoors.':s.system==='practical'?'Lower all actual exterior-window PRIVACY shades completely. The shower exterior window remains obscured. No full-height curtains added in a gym, kitchen, laundry or bathroom.': 'Keep high stair windows bare, showing dark outdoors.';
 if(room==='entry')operation='Keep internal clear gallery doors clear. The entrance door is outside this camera view: do not invent it or add curtains. Show the new continuous oatmeal/charcoal-bound runner on the existing stairs.';
 if(room==='media')operation+=' If interior glazed doors are actually visible, fit removable opaque warm-neutral panels ONLY over each glass leaf on the room side. Keep door handles and frame clear, do not create a curtain wall over doors.';
 if(room==='sharedbath')operation='Only in the visible ADJOINING BEDROOM, close the blackout layer across its existing window. The bathroom is windowless: do not add window treatments inside the bathroom.';
 if(room==='kitchen')operation+=' Close the new privacy shades at visible sunroom LOWER glazing too; leave its high transoms bare and dark.';
 if(room==='ownerbath')operation+=' Preserve clear INTERIOR shower enclosure glass; only the external shower-window glass is obscured.';
 const prompt=`Use case: lighting-weather and precise-object-edit. Image 1 is the approved Mineral & Walnut textile revision and EXACT edit target, ${q.code}. ${q.params.medias[1]?'Image 2 is the real model-home photograph for structural reference only.':''} Produce the identical room and camera at NIGHT, demonstrating the functional CLOSED window treatments.\nPreserve every wall/opening, furniture, artwork, material, all text, mirror reflections and the newly added treatments/runner. Do not restyle the room or import another palette. Do not add lighting fixtures, ceiling coves, windows or furniture.\nWINDOW OPERATION: ${operation}\nLIGHTING: ${old.lighting} Approximately ${old.cct} K lamp appearance, balanced architectural-photography exposure with readable material detail. Genuine nighttime outside; eliminate direct sunshine, daylight patches, luminous daylight curtains and sun in adjoining rooms/mirrors. Use only plausible existing described electric sources. High windows left uncovered show a dark townhome setting. Do not just apply a blue filter or underexpose the room. Preserve the original frame and perspective, no new images/insets, captions or watermarks. Keep any visible stair runner continuous around existing turns and landings.`;
 p.requests.push({index:24001+n,room,title:q.title,floor:q.floor,code:q.code+'-N3',scene:'night',dayIndex:q.index,sourceCode:q.code,sourceFile:q.file,sourceJobId:job.job_id,file:`assets/render-candidates/mineral-walnut-textiles/r01/${room}-night.png`,operation,lighting:old.lighting,cct:old.cct,circuits:old.circuits,params:{model:'nano_banana_2_1',aspect_ratio:room==='entry'?'2:3':'3:2',resolution:'4k',thinking_level:'high',count:1,medias:[{role:'image',value:job.job_id},...q.params.medias.slice(1,2)],prompt}});added++;
}
await fs.writeFile(file,JSON.stringify(p,null,2)+'\n');console.log(`Prepared ${added} additional night views from accepted textile edits.`);
