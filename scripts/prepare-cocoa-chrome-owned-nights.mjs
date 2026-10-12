import fs from 'node:fs/promises';
import sharp from 'sharp';

const raw = 'assets/render-candidates/cocoa-chrome-owned/r08';
const approved = JSON.parse(await fs.readFile(`${raw}/approved-days.json`, 'utf8'));
const specs = JSON.parse(await fs.readFile('docs/cocoa-chrome-owned-build-specs.json', 'utf8'));
const already = await fs.readFile(`${raw}/approved-nights.json`, 'utf8').then(JSON.parse).catch(()=>[]);
const submitted = await fs.readFile(`${raw}/night-submitted.json`, 'utf8').then(JSON.parse).catch(()=>[]);
const selected = process.argv.slice(2);
const rules = {
 ownerbed:'Close the independent opaque BLACKOUT panels completely across ALL FOUR west window openings, from ceiling track down to floor, overlapping so no real sash glass is visible. Keep the separate internal east vestibule transom clear and bare.',
 retreat:'This is connected to the sleeping suite. Close opaque blackout coverings completely over all THREE west and TWO south real sash openings, from top casing/track to actual sill or floor as appropriate. Never leave the upper sash row exposed as a transom.',
 bed2:'Close opaque blackout coverings fully across both the side window and paired front bank, top casing to sill or floor. The upper sash rows are part of the covered windows, not exempt high transoms.',
 bed3:'Close blackout completely over the TWO narrow windows beside the headboard and the paired front bank. Cover every upper and lower sash to sill/floor. Bed and furniture stay unchanged.',
 bed5:'Close independent opaque BLACKOUT coverings fully across both real EAST window openings, top case/track to sill or floor. Preserve source camera and bed orientation, including reverse cameras with headboard behind the photographer.',
 sunroom:'Lower separate opaque privacy shades from the TOP OF EACH MAIN sash opening all the way to the actual window sill, covering every upper/lower main sash. The SEPARATE thin high horizontal transoms above these main openings remain bare with dark night sky. Close opaque privacy layer on actual terrace glass door as well. Do not extend shades over knee walls or create new windows.',
 office:'Lower opaque privacy/glare shades from the true TOP of each TWO-unit main window bank to its sill, covering ALL upper/lower sashes. The main upper row is NOT a high transom exemption. Small circular portico-side window remains bare. Reflection and glass-door neighboring spaces must read night.',
 gym:'Lower opaque privacy rollers from the true top casing to the sill across every actual main window, no exposed upper sash. Keep entire room empty and the closet/entry/bath doors unchanged.',
 media:'Close genuine opaque BLACKOUT shades completely over the ONE actual paired window bank top case through all sashes to sill. Sofa wall remains solid. Keep clear internal west gallery doors clear; do not add opaque door curtains.',
 kitchen:'Fully lower wipeable opaque privacy shade over the actual counter window to its sill. Adjacent sunroom main sash openings and actual glass terrace door receive fully closed opaque privacy layers, but its SEPARATE high transoms remain bare.',
 great:'Close independent opaque privacy curtain or shade completely over the entire actual full-height terrace slider/doors, from its true top casing or ceiling track to the floor. Cover ALL main glass, not just the lower half. The TWO SEPARATE high horizontal windows flanking the fireplace remain BARE with believable dark night sky. Keep two real high windows, same art and media/fireplace faces.',
 loft:'Close a full-height independent opaque privacy curtain across the ENTIRE WEST wide slider from its true TOP casing or ceiling track down to FLOOR. There is NO separate high transom above this WEST slider: cover every bit of its upper and lower glass, no invented uncovered strip. SOUTH Juliet French doors close fully with their independent opaque layer. EACH of TWO small south flank windows gets its own opaque shade top casing to actual sill, both upper/lower sashes fully covered. Bar window closes fully to its sill. Keep ONE owned ottoman and actual media-console wood plinth.',
 laundry:'Close both laundry openings fully. For the nearer ARCHED window, use a single opaque privacy shade mounted ABOVE THE ARCH down to actual sill, including the complete curved head and lower sash. Far RECTANGULAR window closes from its true top casing to sill. No half-height blind, no outside sky showing through an arch.',
 ownerbath:'Close opaque privacy shade completely over the ONE real south dry-zone window, top casing through every sash to sill. Shower glass shows its accurate covered REFLECTION only; never add a second physical window. Preserve wet materials and fittings.',
 stair2:'High stair glazing remains bare with believable dark night outside. Any great-room glimpse uses night-closed lower privacy layers; no new curtain on solid walls, no stair runner.',
 stair3:'The THREE high 2x2 window units remain BARE; dark realistic exterior. Keep every pane, artwork, stair tread and half-landing, no runner or new strip lights.',
 entry:'High round/stair windows remain bare with dark night outside. Clear INTERNAL gallery doors remain clear and adjoining rooms read nighttime; do not cover these doors with fabric. Keep same cascade bulb count and quote placement.',
 dining:'Close opaque privacy layers fully across real lower living/dining window banks, including tall lower arches top-to-sill. The SEPARATE SMALL HIGH arch stays bare and dark. Keep the direct living connection open. Owned Spiridon, Cabrera and round mirror remain identical.',
 living:'Close privacy layers fully across both actual east sash banks, including upper sash rows, and show the adjacent formal dining lower windows closed. Its SEPARATE small high arch remains bare. Keep direct room connection and baby-grand position.',
 sharedbath:'Windowless bathroom itself stays windowless. Through the doorway and mirror, Bedroom3 must retain the SAME Cocoa white bed/dark-oak furnishings and show its two headboard-flank and paired-front windows fully closed for night privacy.',
 ownercloset:'Windowless room: preserve furnishings and finishes, no invented window or drape.',
 bath:'Windowless room: no added curtain or window; existing fixtures and reflections stay.',
 bath4:'Windowless room: no added curtain or window; preserve all fixture positions and wet-floor tile.',
 terrace:'Exterior terrace at true dusk/night with dark sky. Turn on only existing pictured string lights and existing specified outdoor lights; no new firepit or invented fireplace flame. Interior glass glimpses read night. Same furniture, deck openings, roof and guardrails.',
};
const requests=[];
for(const day of approved){
 if(selected.length && !selected.includes(day.room))continue;
 if(already.some(n=>n.sourceJobId===day.job_id)||submitted.some(n=>n.sourceJobId===day.job_id))continue;
 const size=await sharp(day.file).metadata();
 requests.push({index:5000+day.index,room:day.room,code:day.code,sourceJobId:day.job_id,sourceIndex:day.index,params:{model:'gpt_image_2_5',count:1,resolution:'2k',quality:'high',aspect_ratio:size.height>size.width?'2:3':'3:2',medias:[{role:'image',value:day.job_id}],prompt:`EDIT ONLY THE PROVIDED ACCEPTED DAYTIME CAMERA INTO THE SAME ROOM AT NIGHT. This is Option 2 Cocoa & Chrome. Keep exact geometry, crop, furniture placement/count, actual owned product forms, smoky brown oak and polished stainless/nickel silver, white upholstery, blue/yellow accent locations and pale flooring. No redesign, no added wall lamp, floor lamp, cove, strip, cabinetry or furniture. Only change lighting, outside sky and the position of ALREADY specified independent opaque window layers. ${rules[day.room]||''}\n\nUse physically plausible warm residential illumination (2700K decorative / 3000K task), remain bright enough to see design and keep metal silver rather than brass. Activate only light fixtures already visible in day; do not generate glowing floors or rugs. Preserve art, literal quotes and their material. Correct mirror/TV/clear-door reflections for the SAME night and opaque-covering state. No daytime sunshine, blue neon, crushed black shadows, people, labels or watermarks. Room controls: ${specs.rooms[day.room].lighting.night}`}});
}
await fs.writeFile(`${raw}/night-next-requests.json`,JSON.stringify(requests,null,2));
console.log(JSON.stringify(requests));
