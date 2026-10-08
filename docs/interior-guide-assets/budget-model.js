export function calculateBudget(data, settings={}) {
  const s={...data.defaults,...settings};
  for(const [key,min,max] of [['floorArea',0,10000],['gcPercent',0,50],['ownerTaxPercent',0,20],['logisticsPercent',0,30],['contingencyPercent',0,50]]) {
    if(!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw new Error('Invalid budget setting: '+key);
  }
  const rows=data.rows.filter(r=>r.id!=='piano'||s.includePiano).map(r=>({...r,low:r.id==='flooring'?s.floorArea*r.quantity.lowRate:r.low,high:r.id==='flooring'?s.floorArea*r.quantity.highRate:r.high}));
  const zero=()=>({low:0,high:0});
  const result={settings:s,rows,planning:zero(),construction:zero(),purchases:zero(),gc:zero(),tax:zero(),logistics:zero(),subtotal:zero(),reserve:zero(),total:zero(),phases:Array.from({length:5},(_,id)=>({id,...zero()}))};
  for(const r of rows)for(const end of ['low','high']){
    const amount=r[end];if(!Number.isFinite(amount)||amount<0)throw Error('Invalid line '+r.id);
    const field=r.category==='Planning'?'planning':r.category==='Construction'?'construction':'purchases';result[field][end]+=amount;
    const multiplier=r.category==='Construction'?1+s.gcPercent/100:r.category==='Owner purchases'?1+(s.ownerTaxPercent+s.logisticsPercent)/100:1;
    result.phases[r.phase][end]+=amount*multiplier*(1+s.contingencyPercent/100);
  }
  for(const end of ['low','high']){
    result.gc[end]=result.construction[end]*s.gcPercent/100;
    result.tax[end]=result.purchases[end]*s.ownerTaxPercent/100;
    result.logistics[end]=result.purchases[end]*s.logisticsPercent/100;
    result.subtotal[end]=['planning','construction','purchases','gc','tax','logistics'].reduce((n,k)=>n+result[k][end],0);
    result.reserve[end]=result.subtotal[end]*s.contingencyPercent/100;
    result.total[end]=result.subtotal[end]+result.reserve[end];
  }
  return result;
}
export const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
export const range=r=>`${money(Math.round(r.low/1000)*1000)}–${money(Math.round(r.high/1000)*1000)}`;
