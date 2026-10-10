/* global floors, bookPage, optionName, bedroomComparison -- injected by the review-page builder */
const tabs=[...document.querySelectorAll('[data-floor]')], dialog=document.getElementById('zoom');
const selectedRooms=new Map();
let sceneMode='day',zoomViews=[],zoomIndex=0,focusRoom=false,zoomTrigger;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function route(){
 const parts=location.hash.slice(1).split('/');
 const floor=floors.find(f=>f.id===parts[0])||floors[0];
 const room=floor.rooms.find(r=>r.id===parts[1])||floor.rooms.find(r=>r.id===selectedRooms.get(floor.id))||floor.rooms[0];
 sceneMode=['day','night','compare'].includes(parts[2])?parts[2]:'day';
 if(!room.night)sceneMode='day';
 render(floor,room);
}
function navigate(floor,room,focus=false,mode=sceneMode){
 focusRoom=focus;
 const hash='#'+floor.id+'/'+room.id+(mode!=='day'?'/'+mode:'');
 if(location.hash===hash){sceneMode=mode;render(floor,room);}else location.hash=hash;
}
function viewFigure(v,i,room){return `<figure><button type="button" class="image-button" data-zoom="${i}" aria-label="Enlarge ${esc(v.code+' '+v.label)}"><img src="${esc(v.src)}" alt="${esc(room.title+' — '+v.label)}" width="2000" height="1333" decoding="async"><span class="enlarge" aria-hidden="true">Enlarge ↗</span></button><figcaption><div class="view-title"><b>${esc(v.code)}</b><strong>${esc(v.label)}</strong></div><p class="evidence">${esc(v.evidenceType)}</p></figcaption></figure>`;}
function textileSummary(room){
 const w=room.windowTreatment;if(!w)return '';
 const states=sceneMode==='compare'?`<strong>Day:</strong> ${esc(w.day)} <strong>Night:</strong> ${esc(w.night)}`:esc(sceneMode==='night'?w.night:w.day);
 return `<aside class="textile-summary" aria-label="Window treatments"><p class="kicker">Window treatments</p><strong>${esc(w.recommendation)}</strong><p>${states}</p><details><summary>Why this treatment &amp; what is visible</summary><p>${esc(w.why)}</p><p>${esc(w.coverage)}</p><p>${esc(room.textileNote)}</p><a href="interior-design-guide.html#window-${esc(room.id)}">Room specification →</a></details>${room.stairRunner?`<p class="runner-note"><strong>Stair runner:</strong> Oatmeal with narrow matching tonal edging, continuing through floors 1–4 and their intermediate landings. Wood remains visible at both sides; main-floor hallways stay uncovered. <a href="interior-design-guide.html#stair-runner">Material &amp; fitting notes →</a></p>`:''}</aside>`;
}
function render(floor,room){
 selectedRooms.set(floor.id,room.id);
 tabs.forEach(t=>{const on=t.dataset.floor===floor.id;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;});
 document.querySelectorAll('[role=tabpanel]').forEach(p=>{p.hidden=p.id!=='panel-'+floor.id;if(p.hidden)p.innerHTML='';});
 const panel=document.getElementById('panel-'+floor.id),ri=floor.rooms.indexOf(room);
 const night=room.night,paired=night?room.views.find(v=>v.code===night.sourceCode):null;
 const displayed=sceneMode==='night'&&night?[night]:sceneMode==='compare'&&paired?[{...paired,label:'Day · '+paired.label},night]:room.views;
 const nightCount=floor.rooms.filter(r=>r.night).length;
 panel.innerHTML=`<div class="floor-heading"><div><p class="kicker">Floor ${floor.number} · ${floor.rooms.length} spaces · ${floor.rooms.reduce((n,r)=>n+r.views.length,0)} day views${nightCount?' + '+nightCount+' night views':''}</p><h2>${esc(floor.title)}</h2><p class="subline">${esc(floor.description)}</p></div><button type="button" class="plan-button" data-plan>View floor plan ↗</button></div>
 ${floor.coverageNote?`<p class="coverage">${esc(floor.coverageNote)}</p>`:''}
 <div class="room-grid ${floor.rooms.length<=5?'few':''}" aria-label="Rooms on floor ${floor.number}">${floor.rooms.map(r=>`<button type="button" class="room-card" data-room="${esc(r.id)}" aria-pressed="${r.id===room.id}"><img src="${esc(sceneMode!=='day'&&r.night?r.night.thumb:r.views[0].thumb)}" alt="" width="520" height="347"><span class="name">${esc(r.title)}</span><small>${r.views.length} day${r.night?' + night':''}</small></button>`).join('')}</div>
 <article class="room-detail"><div class="room-title-row"><div><p class="kicker">${esc(room.revision)} · Proposed for review</p><h3>${esc(room.title)}</h3></div><div class="room-nav"><button type="button" data-prev-room aria-label="Previous room" ${ri===0?'disabled':''}>‹</button><span class="position">${ri+1} / ${floor.rooms.length}</span><button type="button" data-next-room aria-label="Next room" ${ri===floor.rooms.length-1?'disabled':''}>›</button></div></div><p class="intent">${esc(room.intent)}</p>
 ${night?`<div class="scene-toolbar"><div class="scene-buttons" role="group" aria-label="Lighting view">${[['day','Day'],['night','Night'],['compare','Compare']].map(([mode,label])=>`<button type="button" data-scene="${mode}" aria-pressed="${sceneMode===mode}">${label}</button>`).join('')}</div><p>${sceneMode==='compare'?'Same camera · daytime and nighttime lighting':sceneMode==='night'?esc(night.scene)+' · Nighttime lighting study':'All daytime angles · one matching night study per room'}</p></div>`:''}
 ${textileSummary(room)}
 <div class="views ${displayed.length===1?'single':''}">${displayed.map((v,i)=>viewFigure(v,i,room)).join('')}</div>
 ${night&&sceneMode!=='day'?`<aside class="lighting-intent"><p class="kicker">${esc(night.version)} · Lighting intent</p><h4>${esc(night.scene)}</h4><p>${esc(night.lighting)}</p><dl><dt>Proposed lamp color</dt><dd>Approximately ${night.cct} K</dd><dt>Separate controls to plan</dt><dd>${esc(night.circuits)}</dd></dl><p class="lighting-limit">${esc(night.qaNote)}</p></aside>`:''}
 <div class="room-footer"><span>Click an image to enlarge. Arrow keys switch enlarged views. ${room.originalPhotos?.length?'<button type="button" class="quiet-button" data-originals>Original model photos ↗</button>':''}</span><a href="${esc(bookPage)}#${esc(room.id)}">${esc(room.title)} · materials & build notes ↗</a></div><details><summary>Design details & source notes</summary><div class="notes"><ul>${room.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul><div>${[...room.views,...(night?[night]:[])].map(v=>`<p><strong>${esc(v.code)}:</strong> ${esc(v.evidence)} ${esc(v.qaNote||'')}</p>`).join('')}</div></div></details></article>`;
 panel.querySelectorAll('[data-room]').forEach(b=>b.onclick=()=>navigate(floor,floor.rooms.find(r=>r.id===b.dataset.room),true));
 panel.querySelectorAll('[data-scene]').forEach(b=>b.onclick=()=>{
   const mode=b.dataset.scene;
   history.replaceState(null,'','#'+floor.id+'/'+room.id+(mode!=='day'?'/'+mode:''));
   sceneMode=mode;render(floor,room);
   panel.querySelector(`[data-scene="${mode}"]`).focus({preventScroll:true});
 });
 panel.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>openZoom(displayed,Number(b.dataset.zoom),b));
 panel.querySelector('[data-plan]').onclick=e=>openZoom([{src:floor.plan,label:'Floor '+floor.number+' · builder plan',code:'Plan'}],0,e.currentTarget);
 if(room.originalPhotos?.length)panel.querySelector('[data-originals]').onclick=e=>openZoom(room.originalPhotos,0,e.currentTarget);
 panel.querySelector('[data-prev-room]').onclick=()=>navigate(floor,floor.rooms[ri-1],true);
 panel.querySelector('[data-next-room]').onclick=()=>navigate(floor,floor.rooms[ri+1],true);
 document.getElementById('status').textContent='Floor '+floor.number+': '+room.title+', '+sceneMode+', '+displayed.length+' views';
 document.title='Floor '+floor.number+' · '+room.title+' · '+(sceneMode==='day'?'':sceneMode+' · ')+optionName+' · Home 708';
 if(focusRoom){const detail=panel.querySelector('.room-detail');detail.scrollIntoView({block:'start'});const heading=detail.querySelector('h3');heading.tabIndex=-1;heading.focus({preventScroll:true});focusRoom=false;}
}
tabs.forEach((t,i)=>{
 t.onclick=()=>{const f=floors[i];navigate(f,f.rooms.find(r=>r.id===selectedRooms.get(f.id))||f.rooms[0]);window.scrollTo({top:0,behavior:'instant'});};
 t.onkeydown=e=>{let n;if(e.key==='ArrowRight')n=(i+1)%tabs.length;if(e.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;if(e.key==='Home')n=0;if(e.key==='End')n=tabs.length-1;if(n!==undefined){e.preventDefault();tabs[n].focus();tabs[n].click();}};
});
function openZoom(views,index,trigger){zoomTrigger=trigger;zoomViews=views;zoomIndex=index;updateZoom();dialog.showModal();}
function updateZoom(){const v=zoomViews[zoomIndex];document.getElementById('zoom-title').textContent=v.code+' · '+v.label;const img=document.getElementById('zoom-image');img.src=v.src;img.alt=v.label;document.getElementById('zoom-position').textContent=(zoomIndex+1)+' / '+zoomViews.length;document.getElementById('zoom-prev').disabled=zoomIndex===0;document.getElementById('zoom-next').disabled=zoomIndex===zoomViews.length-1;}
document.getElementById('compare-bedrooms').onclick=e=>openZoom([{src:bedroomComparison,label:'Four bedroom identities · oak floors and rugs',code:'Comparison'}],0,e.currentTarget);
document.getElementById('close-zoom').onclick=()=>dialog.close();
document.getElementById('zoom-prev').onclick=()=>{if(zoomIndex>0){zoomIndex--;updateZoom();}};
document.getElementById('zoom-next').onclick=()=>{if(zoomIndex<zoomViews.length-1){zoomIndex++;updateZoom();}};
dialog.addEventListener('close',()=>{if(zoomTrigger?.isConnected)zoomTrigger.focus({preventScroll:true});});
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'&&zoomIndex<zoomViews.length-1){e.preventDefault();zoomIndex++;updateZoom();}if(e.key==='ArrowLeft'&&zoomIndex>0){e.preventDefault();zoomIndex--;updateZoom();}});
window.addEventListener('hashchange',route);route();
