import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import console from 'node:console';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docs = path.join(root, 'docs');
const library = JSON.parse(await fs.readFile(path.join(docs, 'design-options.json'), 'utf8'));
const catalog = JSON.parse(await fs.readFile(path.join(root, 'apps/web/src/redesign-catalog.json'), 'utf8'));
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const media = path.join(docs, 'design-library-assets');
await fs.mkdir(media, { recursive: true });
const originalDir = path.join(root, 'assets/Crown Georgetown Photos');
const photoFiles = (await fs.readdir(originalDir)).filter(file => file.endsWith('.webp')).sort();
for (const file of photoFiles) await fs.copyFile(path.join(originalDir, file), path.join(media, file));
await fs.copyFile(path.join(root, 'assets/cf_city_home_with_georgetown_pkg.pdf'), path.join(media, 'georgetown-blueprint.pdf'));
for (const file of ['library.css', 'model-home.js', 'navigation.css', 'navigation.js']) await fs.copyFile(path.join(root, 'scripts/design-library', file), path.join(media, file));
const swatches = option => `<div class="swatches" aria-label="${esc(option.name)} palette">${option.palette.map(color => `<i style="background:${color}"></i>`).join('')}</div>`;
// The shared library header is added centrally by Vite for every library page.
const shell = (title, body, script = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f5f2ec"><title>${esc(title)} · Home 708</title><link rel="stylesheet" href="design-library-assets/library.css"></head><body><a class="skip" href="#main">Skip to content</a>${body}<footer class="site-footer"><span>Home 708 · Design library</span><span>Reference the option name and room when sharing feedback.</span></footer>${script}</body></html>`;
// Keep option.href pointed at the room gallery: the review builder uses it as
// its output filename. Landing pages are a separate layer of navigation.
const optionLandingHref = {
  'model-home': 'model-home.html',
  'mineral-walnut': 'mineral-walnut.html',
  'cocoa-chrome': 'cocoa-chrome-overview.html',
};
const options = library.options.map(option => {
  const href = optionLandingHref[option.id] || option.href;
  return `<article class="option-card" data-option="${esc(option.id)}"><a class="card-image" href="${esc(href)}" aria-label="Explore ${esc(option.name)}"><img src="${esc(option.hero)}" alt="${esc(option.name)} — ${esc(option.heroRoom || option.subtitle)}" width="1500" height="1000"><span class="image-label">${esc(option.label)}</span><span class="image-arrow" aria-hidden="true">→</span></a><div class="card-copy"><h2><a href="${esc(href)}">${esc(option.name)}</a></h2><p class="subtitle">${esc(option.subtitle)}</p><p class="summary">${esc(option.summary)}</p>${swatches(option)}<a class="action" href="${esc(href)}">${option.id === 'model-home' ? 'View Model Home' : 'Explore Option ' + option.number}<span aria-hidden="true">→</span></a></div></article>`;
}).join('');
await fs.writeFile(path.join(docs, 'renders.html'), shell('Designs', `<main id="main"><section class="intro designs-intro"><p class="eyebrow">The City Home · Georgetown</p><h1>Designs.</h1><p>Choose a direction to find its room renders, furniture and build details together.</p></section><section class="options" aria-label="Whole-house design options">${options}</section></main>`));

const resourceCard = ({ href, title, description, eyebrow }) => `<a class="resource-card" href="${esc(href)}">${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ''}<span class="resource-title">${esc(title)} <span aria-hidden="true">→</span></span><span class="resource-description">${esc(description)}</span></a>`;
const resourceGroup = (id, title, description, resources) => `<section class="resource-section" aria-labelledby="${esc(id)}"><div class="resource-heading"><h2 id="${esc(id)}">${esc(title)}</h2>${description ? `<p>${esc(description)}</p>` : ''}</div><div class="resource-grid resource-grid-${resources.length}">${resources.map(resourceCard).join('')}</div></section>`;
const hubBody = (option, content) => `<main id="main" class="option-hub"><nav class="option-breadcrumb" aria-label="Breadcrumb"><a href="renders.html">Designs</a><span aria-hidden="true">/</span><span aria-current="page">${esc(option.label)} · ${esc(option.name)}</span></nav><section class="option-hero"><div><p class="eyebrow">${esc(option.label)} · Whole-house design</p><h1>${esc(option.name)}</h1><p class="option-subtitle">${esc(option.subtitle)}</p><p class="option-summary">${esc(option.summary)}</p>${swatches(option)}<a class="action" href="${esc(option.href)}">View room renders <span aria-hidden="true">→</span></a><p class="hub-help">All four floors, alternate angles and room-by-room design notes.</p></div><a class="option-hero-image" href="${esc(option.href)}" aria-label="View ${esc(option.name)} room renders"><img src="${esc(option.hero)}" alt="${esc(option.name)} — ${esc(option.heroRoom || 'great room')}" width="1500" height="1000"><span>Room renders <span aria-hidden="true">→</span></span></a></section>${content}</main>`;
const mineral = library.options.find(option => option.id === 'mineral-walnut');
if (mineral) {
  const furniture = resourceGroup('furniture', 'Furniture', 'Two furnishing approaches within the same Mineral & Walnut design.', [
    { href: 'design-library-assets/collected-value-consultation.html', title: 'Collected Value', eyebrow: 'Mixed brands', description: 'Room renders and a value-focused shortlist from RH, Arhaus, Crate & Barrel and Pottery Barn research.' },
    { href: 'design-library-assets/rh-house-consultation.html', title: 'RH furniture consultation', eyebrow: 'Original RH-only version', description: 'The original room-by-room RH recommendations, furniture studies and purchase phases.' },
  ]);
  const build = resourceGroup('build-materials', 'Build & materials', 'The specifications, design decisions and budget behind this option.', [
    { href: 'room-design-book.html', title: 'Materials & build book', description: 'Room specifications, custom build-outs and the homeowner decision record.' },
    { href: 'interior-design-guide.html', title: 'Interior design guide', description: 'Materials, lighting, window treatments and the principles that keep the house cohesive.' },
    { href: 'mineral-walnut-budget.html', title: 'Cost plan', description: 'Whole-house allowances, room costs and the split between contractor work and owner purchases.' },
  ]);
  const studies = `<section class="hub-secondary" aria-labelledby="material-studies"><div><h2 id="material-studies">Material studies</h2><p>Selected stone-look finishes and remaining fireplace alternatives.</p></div><a href="mineral-walnut-stone-studies.html">Review the studies <span aria-hidden="true">→</span></a></section>`;
  await fs.writeFile(path.join(docs, optionLandingHref[mineral.id]), shell('Mineral & Walnut · Option 1', hubBody(mineral, furniture + build + studies)));
}
const cocoa = library.options.find(option => option.id === 'cocoa-chrome');
if (cocoa) {
  const build = resourceGroup('build-materials', 'Build & materials', '', [
    { href: 'cocoa-chrome-build-book.html', title: 'Materials & build book', description: 'Room specifications, cabinet designs and the decisions behind the Cocoa & Chrome scheme.' },
  ]);
  await fs.writeFile(path.join(docs, optionLandingHref[cocoa.id]), shell('Cocoa & Chrome · Option 2', hubBody(cocoa, build)));
}
const groupNames = ['Exterior & arrival', 'Floor 1 · Entry & leisure', 'Floor 2 · Main living', 'Floor 3 · Bedrooms', 'Floor 4 · Penthouse'];
const prefixes = ['first-floor-', 'second-floor-', 'third-floor-', 'fourth-floor-'];
const photos = photoFiles.map(file => {
  const id = file.replace(/\.jpg\.webp$/, '');
  const floor = prefixes.findIndex(prefix => id.startsWith(prefix));
  const slug = floor >= 0 ? id.slice(prefixes[floor].length) : id;
  return { id, src: `design-library-assets/${file}`, group: floor + 1, title: slug.replaceAll('-', ' ').replace(/^./, c => c.toUpperCase()) };
});
const model = library.options.find(o => o.id === 'model-home');
const modelBody = `<main id="main"><a class="back-link" href="renders.html">← All design options</a><section class="model-intro"><div><p class="eyebrow">Original reference · ${photos.length} unaltered photographs</p><h1>Model Home</h1><p class="lead">The house that started it all.</p><p>${esc(model.summary)}</p>${swatches(model)}<a class="text-link" href="design-library-assets/georgetown-blueprint.pdf" target="_blank" rel="noopener">View the builder blueprint ↗</a></div><img src="${esc(model.hero)}" alt="Original model-home great room" width="1500" height="1000"></section><section class="design-summary" aria-label="Original design summary"><article><h2>Classic architecture</h2><p>Detailed trim, tall windows, the open entrance gallery and curved stair establish the character of the home.</p></article><article><h2>Layered, room by room</h2><p>Warm wood, pale cabinetry, decorative wallpaper and varied textiles create the builder’s furnished scheme.</p></article><article><h2>Our fixed reference</h2><p>These are the real model-home photographs, including the white-brick exterior. The blueprint establishes layout; its brown-brick illustration is not our exterior selection.</p></article></section><div class="photo-navigation" role="group" aria-label="Photo area">${groupNames.map((name, i) => `<button type="button" data-group="${i}" aria-pressed="${i === 1}">${name}</button>`).join('')}</div><section aria-labelledby="gallery-title"><div class="section-heading"><h2 id="gallery-title"></h2><span id="photo-count" role="status" aria-live="polite"></span></div><div class="original-grid" id="photos"></div></section><p class="future-note">Every original photo is included, with alternate kitchen, retreat and terrace angles. Rooms without photographs remain documented in the plan; no generated images are substituted here.</p></main><dialog id="photo-viewer" aria-label="Original model-home photograph"><header><strong id="viewer-title"></strong><button type="button" id="close-viewer" autofocus aria-label="Close photograph">Close ✕</button></header><img id="viewer-image" alt=""><div class="viewer-controls"><button id="previous-photo" aria-label="Previous photograph">← Previous</button><span id="viewer-count"></span><button id="next-photo" aria-label="Next photograph">Next →</button></div></dialog>`;
await fs.writeFile(path.join(docs, 'model-home.html'), shell('Model Home', modelBody, `<script id="photo-data" type="application/json">${JSON.stringify({ photos, groupNames }).replaceAll('<', '\\u003c')}</script><script src="design-library-assets/model-home.js" defer></script>`));
await fs.writeFile(path.join(docs, 'explorations.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Explorations · Home 708</title></head><body><p><a href="./#/explorations">Open Explorations</a></p><script>location.replace("./#/explorations");</script></body></html>');
console.log(`Built design library: Model Home (${photos.length} original photos), ${library.options.length - 1} developed options, ${catalog.LOOKS.length} exploratory looks.`);
