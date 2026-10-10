const buttons=[...document.querySelectorAll('[data-panel]')];
const panels=[...document.querySelectorAll('.plan-panel')];
function showPanel(id){
  if(!panels.some(p=>p.id===id))id='before';
  panels.forEach(p=>{p.hidden=p.id!==id;});
  buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.panel===id)));
}
buttons.forEach(b=>b.addEventListener('click',()=>{history.replaceState(null,'','#'+b.dataset.panel);showPanel(b.dataset.panel);}));
window.addEventListener('hashchange',()=>showPanel(location.hash.slice(1)));
showPanel(location.hash.slice(1));
document.querySelector('#print-plan').addEventListener('click',()=>window.print());
let printState;
window.addEventListener('beforeprint',()=>{
  printState={panel:buttons.find(b=>b.getAttribute('aria-pressed')==='true')?.dataset.panel,details:[...document.querySelectorAll('details')].map(d=>d.open)};
  panels.forEach(p=>{p.hidden=false;});
  document.querySelectorAll('details').forEach(d=>{d.open=true;});
});
window.addEventListener('afterprint',()=>{
  if(!printState)return;
  showPanel(printState.panel);
  document.querySelectorAll('details').forEach((d,i)=>{d.open=printState.details[i];});
  printState=null;
});
