import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {calculateBudget} from './design-library/budget-model.mjs';
const read=async p=>JSON.parse(await fs.readFile(p));
const data=await read('docs/mineral-walnut-budget.json'),original=await read('docs/design-history/mineral-walnut-before-playbook.json'),book=await read('docs/room-design-book.json'),guide=await read('docs/interior-design-guide.json');
const baseline=calculateBudget(data),checks=[];
assert.equal(new Set(data.rows.map(r=>r.id)).size,data.rows.length);
assert.equal(data.rooms.length,24);assert.equal(data.rows.find(r=>r.id==='bed5-build').low,12000);
assert(!data.rows.some(r=>/owned.*credit|designer.*fee/i.test(r.title)));
for(const end of ['low','high'])assert(Math.abs(baseline.phases.reduce((n,p)=>n+p[end],0)-baseline.total[end])<.01);
assert.equal(baseline.construction.low,251000);assert.equal(baseline.purchases.low,122400);
assert(Math.abs(baseline.total.low-508373.6)<.01);assert(Math.abs(baseline.total.high-835203.6)<.01);
const without=calculateBudget(data,{includePiano:false}),larger=calculateBudget(data,{floorArea:3100});
assert(Math.abs(baseline.total.low-without.total.low-12000*1.11*1.15)<.01);
assert(Math.abs(larger.total.low-baseline.total.low-100*11*1.2*1.15)<.01);
assert.throws(()=>calculateBudget(data,{floorArea:NaN}));assert.throws(()=>calculateBudget(data,{gcPercent:-1}));
checks.push('51 unique lines, confirmed Bedroom 5 construction, exact totals, phase reconciliation, piano/floor adjustments and input validation.');
assert(!guide.palette.some(([label])=>/brown oak|steel|blue/i.test(label)));
assert(!/brown.oak|polished.stainless|smoky.blue|owned white bed/i.test(JSON.stringify(guide)));
for(const [room,id] of [['great','GR-M01'],['ownerbed','OB-U01'],['dining','D-J01']])assert.deepEqual(book.rooms[room].schedule.find(x=>x.id===id),original.rooms[room].schedule.find(x=>x.id===id));
assert.match(book.rooms.bed5.constructionStatus,/Not built/);
const options=await read('docs/design-options.json'),previousOptions=await read('docs/design-history/design-options-before-playbook.json');
assert.deepEqual(options.options.find(x=>x.id==='cocoa-chrome'),previousOptions.options.find(x=>x.id==='cocoa-chrome'));
assert(!options.options.find(x=>x.id==='mineral-walnut').refinementFile);
checks.push('Original Option 1 palette and three affected material schedules restored; Option 2 unchanged.');
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1040}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const base=process.env.REVIEW_BASE||'http://127.0.0.1:5173';
try {
 let response=await page.goto(base+'/mineral-walnut-budget.html',{waitUntil:'networkidle'});assert.equal(response.status(),200);
 await page.locator('.room-cost').first().waitFor();assert.equal(await page.locator('.room-cost').count(),25);
 assert.match(await page.locator('#budget-total').textContent(),/508,000/);
 await page.locator('#floor-area').fill('3100');assert.equal(await page.locator('[data-total="construction-low"]').textContent(),'$252,100');
 await page.locator('#floor-area').fill('');assert.equal(await page.locator('#export-budget').isDisabled(),true);assert.equal(await page.locator('#budget-error').isVisible(),true);
 await page.locator('#reset-budget').click();await page.locator('#include-piano').uncheck();assert.equal(await page.locator('[data-total="purchases-low"]').textContent(),'$110,400');
 await page.locator('[data-budget-floor="penthouse"]').click();assert.equal(await page.locator('.room-cost').count(),4);
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export-budget').click()]);const exported=JSON.parse(await fs.readFile(await download.path()));assert.equal(exported.scenario.settings.includePiano,false);assert.equal(exported.scenario.rows.some(r=>r.id==='piano'),false);
 await page.locator('#reset-budget').click();await page.locator('[data-budget-floor="all"]').click();
 checks.push('Cost page controls, validation, floor filters and exported scenario match the displayed arithmetic.');
 const links=await page.locator('a[href],link[href],script[src]').evaluateAll(els=>els.map(e=>e.getAttribute('href')||e.getAttribute('src')).filter(v=>v&&!v.startsWith('http')&&!v.startsWith('#')));
 for(const link of links){const r=await page.request.get(new URL(link,base+'/mineral-walnut-budget.html').href);assert.equal(r.status(),200,link);}
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:1000});await page.goto(base+'/mineral-walnut-budget.html',{waitUntil:'networkidle'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Budget overflow '+width);if(width!==768)await page.screenshot({path:`docs/mineral-walnut-budget-${width===390?'mobile':'desktop'}-preview.png`});}
 checks.push('Local cost-page links resolve; no horizontal page overflow at 390/768/1440px.');
 await page.goto(base+'/interior-design-guide.html',{waitUntil:'networkidle'});const g=JSON.parse(await page.locator('#guide-data').textContent());assert.equal(g.studies.length,3);assert.equal(g.studies.flatMap(s=>s.views).length,3);assert.equal(await page.locator('.room-plan').count(),24);
 await page.locator('#study-room').selectOption('dining');await page.locator('input[value="before"]').check();assert.match(await page.locator('#study-image').getAttribute('src'),/original-day/);await page.locator('input[value="after"]').check();assert.match(await page.locator('#study-image').getAttribute('src'),/original-night/);
 await page.locator('[data-floor-filter="3"]').click();assert.equal(await page.locator('.room-plan:visible').count(),9);await page.locator('#room-search').fill('laundry');assert.equal(await page.locator('.room-plan:visible').count(),1);
 await page.locator('#table-length').selectOption('84');assert.equal(await page.locator('#end-gap').textContent(),'37.5 in');
 assert.equal(await page.locator('a[href="mineral-walnut-budget.html"]').count()>0,true);
 checks.push('Guide uses restored day/night studies, retains room filtering and measured-clearance tool, and links the budget.');
 await page.goto(base+'/house-design-review.html#floor-2/great/compare',{waitUntil:'networkidle'});const floors=JSON.parse(await page.locator('#review-data').textContent());let count=0;
 for(const r of floors.flatMap(f=>f.rooms)){const b=original.rooms[r.id],old=b.revisions.find(v=>v.id===b.currentRevision).views;assert.deepEqual(r.views.map(v=>[v.code,v.file,v.jobId]),old.map(v=>[v.code,v.file,v.jobId]));assert.equal(r.night.sourceJobId,r.views[0].jobId);count+=r.views.length;}
 assert.equal(count,45);assert.equal(floors.flatMap(f=>f.rooms).length,24);assert.equal(errors.length,0,errors.join('\n'));
 await page.screenshot({path:'docs/mineral-walnut-restored-preview.png'});
 checks.push('All 45 original day assets and all 24 matching night sources verified; no browser errors.');
 await fs.writeFile('docs/mineral-walnut-cost-style-validation.json',JSON.stringify({date:new Date().toISOString(),checks,failures:[]},null,2)+'\n');console.log(checks.join('\n'));
} finally {await browser.close();}
