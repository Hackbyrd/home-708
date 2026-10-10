import {calculateBudget,money,range} from './budget-model.js';
const data=JSON.parse(document.querySelector('#budget-data').textContent);
const $=s=>document.querySelector(s);
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const exactRange=r=>`${money(r.low)}–${money(r.high)}`;
let active='all',result=calculateBudget(data);
function renderRooms(){
 const groups=[{id:'shared',title:'Shared costs · counted once',floor:'shared'},...data.rooms];
 $('#room-costs').innerHTML=groups.filter(r=>active==='all'||r.floor===active).map(room=>{
  const rows=result.rows.filter(r=>r.room===room.id),sum=category=>rows.filter(r=>r.category===category).reduce((s,r)=>({low:s.low+r.low,high:s.high+r.high}),{low:0,high:0});
  const construction=sum('Construction'),purchases=sum('Owner purchases'),planning=sum('Planning');
  return `<details class="room-cost" ${room.id==='shared'?'open':''}><summary><span>${esc(room.title)}</span><small>${planning.high?'Planning '+exactRange(planning)+' · ':''}Construction ${exactRange(construction)} · Purchases ${exactRange(purchases)}</small></summary>${rows.length?rows.map(r=>`<div class="cost-line"><div><p class="eyebrow">${esc(r.category)} · ${esc(r.id)}</p><h4>${esc(r.title)}</h4><p>${esc(r.note)}</p>${r.id==='flooring'?`<p><strong>Current quantity: ${result.settings.floorArea.toLocaleString()} net sf × $11–16 installed.</strong></p>`:''}</div><strong>${exactRange(r)}</strong></div>`).join(''):'<p>Costs are included in shared flooring, painting, lighting and decor; no additional dedicated room package.</p>'}</details>`;
 }).join('');
}
function update(){
 try{
 const inputs=['#floor-area','#gc-rate','#reserve-rate'];if(inputs.some(s=>$(s).value===''||!$(s).checkValidity()))throw Error('Enter valid quantities and percentages within the shown limits.');
 result=calculateBudget(data,{floorArea:Number($('#floor-area').value),gcPercent:Number($('#gc-rate').value),contingencyPercent:Number($('#reserve-rate').value),includePiano:$('#include-piano').checked});
 $('#budget-error').hidden=true;$('#export-budget').disabled=false;$('#budget-total').textContent=range(result.total);
 document.querySelectorAll('[data-total]').forEach(el=>{const [key,end]=el.dataset.total.split('-');el.textContent=money(result[key][end]);});
 document.querySelectorAll('[data-phase]').forEach(el=>el.textContent=range(result.phases[Number(el.dataset.phase)]));renderRooms();
 }catch(error){$('#budget-error').textContent=error.message;$('#budget-error').hidden=false;$('#export-budget').disabled=true;}
}
['#floor-area','#gc-rate','#reserve-rate','#include-piano'].forEach(s=>$(s).addEventListener('input',update));
document.querySelectorAll('[data-budget-floor]').forEach(el=>el.addEventListener('click',()=>{active=el.dataset.budgetFloor;document.querySelectorAll('[data-budget-floor]').forEach(b=>b.setAttribute('aria-pressed',String(b===el)));renderRooms();}));
$('#reset-budget').addEventListener('click',()=>{$('#floor-area').value=data.defaults.floorArea;$('#gc-rate').value=data.defaults.gcPercent;$('#reserve-rate').value=data.defaults.contingencyPercent;$('#include-piano').checked=true;update();});
$('#export-budget').addEventListener('click',()=>{const payload={...data,exportedAt:new Date().toISOString(),scenario:result};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='mineral-walnut-cost-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('#print-budget').addEventListener('click',()=>window.print());
let closed=[];window.addEventListener('beforeprint',()=>{active='all';renderRooms();closed=[...document.querySelectorAll('details:not([open])')];document.querySelectorAll('details').forEach(e=>e.open=true);});window.addEventListener('afterprint',()=>{closed.forEach(e=>e.open=false);document.querySelectorAll('[data-budget-floor]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.budgetFloor==='all')));});
update();
