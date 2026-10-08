// Generate the portable, printable guide from the same data used by the gallery.
import { readFile, writeFile } from 'node:fs/promises'
import console from 'node:console'
import sharp from 'sharp'

const g = JSON.parse(await readFile('apps/web/src/daylight-build.json', 'utf8'))
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const range = (a, b) => `${money(a)}–${money(b)}`
const p = (value) => `<p>${esc(value)}</p>`
const list = (items, tag = 'ul') => `<${tag}>${items.map((item) => `<li>${esc(item)}</li>`).join('')}</${tag}>`
const refs = (ids) => g.sources.filter((s) => ids.includes(s.id)).map((s) => `<a href="${esc(s.url)}">${esc(s.title)}</a>`).join(' · ')
const total = g.phases.reduce((t, phase) => [t[0] + phase.low, t[1] + phase.high], [0, 0])
const rooms = []
for (const r of g.rooms) {
  let photo = ''
  try {
    const buffer = await sharp(`assets/renders-web/${r.floor}/${r.key}-daylight.webp`).resize(900, 600, { fit: 'inside' }).webp({ quality: 78 }).toBuffer()
    photo = `<img alt="${esc(r.name)} — Daylight Modern design visualization" src="data:image/webp;base64,${buffer.toString('base64')}" />`
  } catch (error) {
    if (!String(error).includes('missing')) throw error
  }
  rooms.push(`<article class="room"><p class="eyebrow">${esc(r.floor)}</p><h3>${esc(r.name)}</h3>${photo}<p><b>Materials:</b> ${esc(r.materials)}</p><p><b>Build:</b> ${esc(r.build)}</p><p><b>Furnish and equip:</b> ${esc(r.buy)}</p><p><b>Budget choice:</b> ${esc(r.save)}</p></article>`)
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Daylight Modern — Build Guide</title><style>
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f4f1eb;color:#302f2a;font:15px/1.65 system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:50px 36px}h1,h2,h3{font-family:Georgia,serif;font-weight:400;line-height:1.2}h1{font-size:58px;margin:10px 0}h2{font-size:31px;margin:42px 0 18px;border-bottom:1px solid #cdc5b8;padding-bottom:12px}h3{font-size:24px;margin:12px 0}h4{font-size:16px;margin:10px 0}.eyebrow{text-transform:uppercase;letter-spacing:.15em;font-size:11px;color:#786649}p{margin:10px 0}a{color:#685637;text-underline-offset:3px}.lead{font-size:21px;max-width:800px}.callout{padding:22px 26px;background:#e9e2d6;border-left:4px solid #b29a72;margin:24px 0}.muted{color:#706b61;font-size:13px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}article{padding:22px;background:#fffdf8;border:1px solid #ded7cc;border-radius:10px;break-inside:avoid}.room{margin:20px 0}.room img{width:100%;max-height:450px;object-fit:contain;background:#eae5dd;margin:10px 0}.phases article{margin:14px 0}.price{font-weight:700;font-size:18px}table{width:100%;border-collapse:collapse;margin:20px 0}td,th{text-align:left;vertical-align:top;border-bottom:1px solid #d9d1c4;padding:13px}th{font-weight:600}li{margin:7px 0}nav{display:flex;flex-wrap:wrap;gap:14px;margin-top:25px}.print-note{font-size:12px;color:#6b6459}.swatches{display:flex;gap:8px;margin:20px 0}.swatches span{width:70px;height:12px;border-radius:6px}@media(max-width:700px){main{padding:28px 18px}h1{font-size:42px}.grid{grid-template-columns:1fr}table{font-size:12px}td,th{padding:8px}}@media print{body{background:white;font-size:10pt}main{max-width:none;padding:0}nav,.print-note{display:none}h1{font-size:32pt}h2{font-size:22pt;break-after:avoid}article{padding:14px}.grid{display:block}.grid article{margin:12px 0}.room img{max-height:240px}a{color:inherit}section{margin-bottom:18px}p,li{orphans:3;widows:3}@page{size:letter;margin:16mm}}
</style></head><body><main>
<header><p class="eyebrow">708 · Design and construction planning · ${esc(g.date)}</p><h1>${esc(g.title)}</h1><p class="lead">${esc(g.subtitle)}</p><div class="swatches" aria-label="Warm white, mushroom, natural oak, bronze and tobacco palette"><span style="background:#efeee5"></span><span style="background:#bcb2a3"></span><span style="background:#c5a476"></span><span style="background:#897052"></span><span style="background:#a66c40"></span></div>${p(g.intro)}<p class="print-note">Self-contained guide. Use your browser’s Print command to print or save a PDF. Images are design visualizations, not measured construction drawings.</p><nav><a href="#budget">Phased budget</a><a href="#materials">Materials</a><a href="#custom">Custom work</a><a href="#appliances">Appliances</a><a href="#rooms">19 rooms</a></nav></header>
<div class="callout"><strong>Recommended first stage: about $37–56k with contingency</strong>${p(g.recommendation)}<p class="muted">${esc(g.starter.scope)}</p></div>${p(g.renderScope)}
<section id="budget"><h2>Phased budget</h2>${p(g.budgetBasis)}<div class="phases">${g.phases.map((x) => `<article><p class="eyebrow">Phase ${esc(x.id)}</p><h3>${esc(x.name)}</h3><p class="price">${range(x.low, x.high)}</p>${p(x.scope)}${list(x.items)}</article>`).join('')}</div><table><tbody><tr><th>All six phases, before reserve</th><td>${range(...total)}</td></tr><tr><th>15% reserve</th><td>${range(total[0] * g.reserve, total[1] * g.reserve)}</td></tr><tr><th>Complete base planning allowance</th><td><b>${range(total[0] * (1 + g.reserve), total[1] * (1 + g.reserve))}</b></td></tr></tbody></table><h3>Separately priced work</h3>${list(g.exclusions)}</section>
<section><h2>Daylight and evening comfort</h2><div class="grid">${g.sunlight.map((x) => `<article><h3>${esc(x.name)}</h3>${p(x.detail)}</article>`).join('')}</div></section>
<section id="materials"><h2>Material schedule</h2><div class="grid">${g.materials.map((x) => `<article><p class="eyebrow">${esc(x.id)} · ${esc(x.where)}</p><h3>${esc(x.name)}</h3>${p(x.spec)}<p><b>Budget choice:</b> ${esc(x.budget)}</p><p class="muted">${refs(x.sourceIds)}</p></article>`).join('')}</div></section>
<section id="custom"><h2>Custom work and coordination</h2>${g.customWork.map((x) => `<article class="room"><h3>${esc(x.name)}</h3>${p(x.scope)}<p><b>Save:</b> ${esc(x.save)}</p><p><b>Confirm before ordering:</b> ${esc(x.holdPoint)}</p></article>`).join('')}<h3>Installation sequence</h3>${list(g.procurement, 'ol')}</section>
<section id="appliances"><h2>Appliance schedule</h2>${p(g.applianceBasis)}<div class="grid">${g.appliances.map((x) => `<article><p class="eyebrow">${esc(x.quantity)} · Phase ${esc(x.phase)}</p><h3>${esc(x.name)}</h3><p><b>${esc(x.model)}</b></p>${p(x.allowance)}${p(x.reason)}<p><b>Before ordering:</b> ${esc(x.check)}</p><p class="muted">${refs(x.sourceIds)}</p></article>`).join('')}</div></section>
<section id="rooms"><h2>Room-by-room build plan</h2>${rooms.join('')}</section><footer><p class="muted">Prepared for design decisions and comparable contractor proposals. Manufacturer references checked ${esc(g.date)}. Confirm actual 708 conditions before procurement.</p></footer></main></body></html>`
await writeFile('docs/daylight-modern-build-guide.html', html)
console.log(`Wrote build guide: ${g.rooms.length} rooms, ${g.materials.length} material groups, ${g.appliances.length} appliance groups.`)
