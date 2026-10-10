import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { chromium } from '@playwright/test';
const base=process.env.NIGHT_REVIEW_BASE||'http://127.0.0.1:5173';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const production=await read('docs/mineral-walnut-architecture-production.json');
const materialProduction=await read('docs/mineral-walnut-material-production.json');
const neutralProduction=await read('docs/mineral-walnut-neutral-production.json');
const overlay=await read('docs/mineral-walnut-night-review.json');
const book=await read('docs/room-design-book.json');
const checks=[],failures=[];
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1080}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 assert.equal(Object.keys(overlay.rooms).length,24);
 assert.equal(production.requests.filter(q=>q.qa?.accepted&&q.scene==='night').length,24);
 assert.equal(production.requests.filter(q=>q.qa?.accepted&&q.scene==='day').length,45);
 for(const q of production.requests.filter(q=>q.qa?.accepted)){const j=production.jobs.find(j=>j.index===q.index);assert.equal(j.status,'completed');assert(j.downloaded);const m=await sharp(q.file).metadata();assert(Math.max(m.width,m.height)>=1536);const source=await sharp(q.sourceFile).metadata();if(q.scene==='night')assert(Math.abs(m.width/m.height-source.width/source.height)<.025,'Night camera aspect changed: '+q.index);}
 for(const [id,v] of Object.entries(overlay.rooms)){
  assert.ok(book.rooms[id].lightingStudy);
  assert.equal(book.rooms[id].schedule.filter(s=>s.id===id.toUpperCase()+'-N01').length,1);
  const meta=await sharp(v.file).metadata();assert.ok(Math.max(meta.width,meta.height)>=1536);
 }
 checks.push('24 unique accepted full-resolution nighttime images and room lighting records.');
 await page.goto(base+'/house-design-review.html#floor-2/great/compare');
 const floors=await page.locator('#review-data').evaluate(e=>JSON.parse(e.textContent));
 assert.equal(floors.flatMap(f=>f.rooms).length,24);
 assert.equal(floors.flatMap(f=>f.rooms.flatMap(r=>r.views)).length,45);
 const assets=[];
 for(const f of floors)for(const r of f.rooms){
  const current=book.rooms[r.id];
  const views=current.revisions.find(v=>v.id===current.currentRevision).views;
  assert.deepEqual(r.views.map(v=>[v.code,v.file,v.jobId]),views.map(v=>[v.code,v.file,v.jobId]));
  for(const v of r.views){const q=neutralProduction.requests.find(q=>q.index===v.index)||materialProduction.requests.find(q=>q.index===v.index)||production.requests.find(q=>q.index===v.index);assert(q.qa?.accepted);assert.equal(v.sourceJobId,q.sourceJobId);assert.equal(v.sourceFile,q.sourceFile);assert.equal(v.file,q.file);}
  const paired=r.views.find(v=>v.code===r.night.sourceCode);assert.equal(r.night.sourceJobId,paired.jobId);
  const nightSource=neutralProduction.requests.find(q=>q.index===r.night.index)||materialProduction.requests.find(q=>q.index===r.night.index)||production.requests.find(q=>q.index===r.night.index);
  assert(nightSource.qa?.accepted);assert.equal(r.night.sourceJobId,nightSource.sourceJobId);assert.equal(r.night.file,nightSource.file);
  assets.push(r.night.src,r.night.thumb,...r.views.flatMap(v=>[v.src,v.thumb]),...r.originalPhotos.map(v=>v.src));
  await page.goto(base+'/house-design-review.html#'+f.id+'/'+r.id+'/night');
  await page.locator('[data-scene="night"][aria-pressed="true"]').waitFor();
  assert.equal(await page.locator('.views figure').count(),1);
  assert.equal(await page.locator('.textile-summary').count(),1);
  assert((await page.locator('.textile-summary').textContent()).includes(r.windowTreatment.recommendation));
  assert.equal(await page.locator('.views img').getAttribute('src'),r.night.src);
  await page.getByRole('button',{name:'Compare',exact:true}).click();
  assert.equal(await page.locator('.views figure').count(),2);
  assert.deepEqual(await page.locator('.views img').evaluateAll(x=>x.map(i=>i.getAttribute('src'))),[paired.src,r.night.src]);
 }
 checks.push('All 24 room routes show the correct night image and matching day/night pair; 45 audited daytime views and generation provenance verified.');
 for(let i=0;i<assets.length;i+=8)await Promise.all(assets.slice(i,i+8).map(async a=>{const r=await page.request.get(base+'/'+a);assert.equal(r.status(),200,a);assert.match(r.headers()['content-type'],/^image\//);}));
 checks.push(assets.length+' day/night/reference image URLs respond with image assets.');
 await page.goto(base+'/house-design-review.html#floor-1/office');await page.locator('[data-originals]').click();assert.match(await page.locator('#zoom-title').textContent(),/Original model home/);await page.keyboard.press('Escape');
 await page.goto(base+'/house-design-review.html#floor-2/great/compare');
 await page.locator('[data-scene="compare"][aria-pressed="true"]').waitFor();
 await page.locator('[data-zoom="0"]').click();
 await page.keyboard.press('ArrowRight');
 assert.match(await page.locator('#zoom-title').textContent(),/Night/);
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('#zoom').evaluate(e=>e.open),false);
 assert.equal(await page.locator('[data-zoom="0"]').evaluate(e=>e===document.activeElement),true);
 await page.getByRole('button',{name:'Night',exact:true}).click();
 await page.locator('[data-next-room]').click();
 await page.locator('[data-scene="night"][aria-pressed="true"]').waitFor();
 assert.match(page.url(),/kitchen\/night$/);
 await page.locator('[data-floor="floor-4"]').click();
 await page.locator('[data-scene="night"][aria-pressed="true"]').waitFor();
 assert.match(page.url(),/floor-4\/terrace\/night$/); // Restore the last room visited on that floor.
 await page.reload();await page.locator('[data-scene="night"][aria-pressed="true"]').waitFor();
 checks.push('Zoom keyboard and focus return; night selection survives room/floor navigation and reload.');
 for(const width of [390,768,1440]){
  await page.setViewportSize({width,height:1000});
  await page.goto(base+'/house-design-review.html#floor-3/ownerbed/compare');
  await page.locator('[data-scene="compare"]').waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Gallery overflow '+width);
  await page.goto(base+'/interior-design-guide.html#night-lighting');
  assert.equal(await page.locator('.night-preview').count(),4);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Guide overflow '+width);
 }
 checks.push('Guide floor previews and gallery layouts fit 390, 768 and 1440px screens.');
 await page.goto(base+'/room-design-book.html#ownerbed');
 assert.equal(await page.locator('.night-study').count(),24);
 const links=await page.locator('.night-study a').evaluateAll(a=>a.map(e=>e.getAttribute('href')));
 assert.ok(links.every(x=>!x.includes('undefined')&&x.endsWith('/compare')));
 checks.push('Build book includes all 24 night studies, lighting notes and valid comparison routes.');
 await page.setViewportSize({width:1440,height:1080});
 await page.goto(base+'/house-design-review.html#floor-2/great/compare');
 await page.locator('.scene-toolbar').scrollIntoViewIfNeeded();
 await page.locator('.views img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 await page.screenshot({path:'docs/mineral-walnut-night-preview.png'});
 await page.setViewportSize({width:390,height:900});
 await page.goto(base+'/house-design-review.html#floor-3/ownerbed/night');
 await page.locator('.scene-toolbar').scrollIntoViewIfNeeded();
 await page.locator('.views img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 await page.screenshot({path:'docs/mineral-walnut-night-mobile-preview.png'});
 assert.deepEqual(errors,[]);
 checks.push('No page JavaScript errors; captured desktop and mobile previews.');
}catch(error){failures.push(error.stack);process.exitCode=1;}
finally{await browser.close();await fs.writeFile('docs/mineral-walnut-night-validation.json',JSON.stringify({checkedAt:new Date().toISOString(),base,checks,failures},null,2)+'\n');}
console.log(JSON.stringify({checks:checks.length,failures},null,2));
