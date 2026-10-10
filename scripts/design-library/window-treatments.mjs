import {money} from './budget-model.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const exactRange=pair=>`${money(pair[0])}–${money(pair[1])}`;
const systems={blackout:'Sheers + blackout',privacy:'Sheers + privacy shade',practical:'Practical privacy treatment',none:'No covering in base'};
const floors=[['first-floor','Floor 1'],['second-floor','Floor 2'],['third-floor','Floor 3'],['penthouse','Floor 4']];

export function windowTotals(schedule){
  return schedule.rooms.reduce((totals,r)=>{
    for(const key of ['goods','installationCost'])r[key].forEach((value,i)=>totals[key][i]+=value);
    return totals;
  },{goods:[0,0],installationCost:[0,0]});
}

// Replace the old house-wide placeholders, never add a second curtain allowance.
export function applyWindowBudget(data,schedule){
  data.rows=data.rows.filter(r=>!['drapes','drape-install'].includes(r.id)&&r.scope!=='window-treatment');
  for(const r of schedule.rooms){
    for(const [key,category,phase,suffix]of [['goods','Owner purchases',4,'supply'],['installationCost','Construction',3,'install']]){
      if(!r[key][1])continue;
      data.rows.push({id:`${r.id}-window-${suffix}`,room:r.id,category,phase,scope:'window-treatment',title:`${r.title} · window treatments ${suffix==='supply'?'and hardware':'installation'}`,low:r[key][0],high:r[key][1],note:suffix==='supply'?`${r.recommendation}. ${r.coverage} Why: ${r.why} Planning allowance before tax/delivery; installation separate.`:`${r.installation} Direct installation allowance before GC markup; fabric and hardware are in owner purchases.`});
    }
  }
  data.version='MW-B02';data.date=schedule.date;data.marketReferenceDate??='2026-10-07';
  data.windowTreatments=schedule;
  data.assumptions=data.assumptions.filter(x=>!/26 window|Window-treatment allowances/.test(x));
  data.assumptions.push('Window-treatment allowances are assigned to 17 spaces in MW-W01; all 24 spaces have a recommendation. They are room allowances, not a measured opening count. Manual tracks, cordless shades and retail/semi-custom fabrics; no new ceiling pockets. About 40 lighting/control points and 100 ft of LED remain scope placeholders.');
  data.methodology=data.methodology.map(x=>x.startsWith('Furniture rows exclude')?'Furniture rows exclude decorative lights, drapery, art/plants, AV and appliances. Window-treatment goods and installation now have separate room rows; other house-wide purchases remain shared. Baths include plumbing fixtures and mirrors but exclude decorative lights. Flooring and ordinary dry-area paint are counted once in shared rows.':x);
  return data;
}

export function windowTreatmentSection(schedule){
  const totals=windowTotals(schedule);
  return `<section id="window-treatments" class="window-schedule"><div class="section-heading"><p class="eyebrow">Drapery &amp; privacy / ${esc(schedule.version)}</p><h2>The right layer.<br>In the right room.</h2><p>${esc(schedule.summary)}</p></div><div class="window-key">${Object.entries(systems).map(([key,label])=>`<span class="window-tag ${key}">${esc(label)}</span>`).join('')}</div><div class="callout"><h3>One palette; different functions.</h3><p>${esc(schedule.palette)}</p><p>${esc(schedule.renderNote)}</p></div><div class="window-rules">${schedule.rules.map(r=>`<article><h3>${esc(r.title)}</h3><p>${esc(r.text)}</p></article>`).join('')}</div><div class="window-allowance"><h3>Window-treatment allowance · already included in the cost plan</h3><p><strong>${exactRange(totals.goods)}</strong> fabrics, shades, tracks and hardware · <strong>${exactRange(totals.installationCost)}</strong> direct installation.</p><p class="small">Our planning allowances, not supplier quotes. GC markup applies to installation; owner-goods tax, logistics and project contingency are added by the cost plan. The same room rows appear in the budget—do not add this schedule again. Exact openings, widths and quantities require a site measure. Motors, rebuilt pockets, replacement glass, specialty arch systems and unconfirmed high-window treatments require separate quotes.</p><a href="mineral-walnut-budget.html#rooms">See room costs and project total →</a></div><nav class="window-floor-nav" aria-label="Window treatments by floor">${floors.map(([id,title])=>`<a href="#windows-${id}">${title}</a>`).join('')}</nav>${floors.map(([id,title])=>`<div class="window-floor" id="windows-${id}"><h3>${title}</h3><div class="window-grid">${schedule.rooms.filter(r=>r.floor===id).map(r=>`<article class="window-room" id="window-${esc(r.id)}" data-window-system="${r.system}"><p class="window-tag ${r.system}">${esc(systems[r.system])}</p><h4>${esc(r.title)}</h4><p class="window-recommendation">${esc(r.recommendation)}</p><p><strong>Why:</strong> ${esc(r.why)}</p><p><strong>Where:</strong> ${esc(r.coverage)}</p><details><summary>Day, night &amp; installation</summary><dl><dt>Day</dt><dd>${esc(r.day)}</dd><dt>Night</dt><dd>${esc(r.night)}</dd><dt>Installer scope</dt><dd>${esc(r.installation)}</dd></dl></details><p class="window-price">${r.goods[1]?`Goods ${exactRange(r.goods)}<br>Installation ${exactRange(r.installationCost)}`:'No new window-treatment cost in base.'}</p><a href="room-design-book.html#${esc(r.id)}">Room build notes →</a></article>`).join('')}</div></div>`).join('')}<div class="window-sources"><h3>Performance references</h3><p class="small">Checked ${esc(schedule.date)}. Room recommendations and prices are our design judgments and allowances.</p>${schedule.sources.map(s=>`<p><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)} ↗</a><br><span class="small">${esc(s.note)}</span></p>`).join('')}</div></section>`;
}
