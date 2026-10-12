import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import console from 'node:console';
import { buildCurrentFurniture } from './design-library/current-furniture.mjs';
import { buildCollectedMineral } from './build-collected-mineral.mjs';
import { buildCocoaChromeOwned } from './build-cocoa-chrome-owned.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docs = path.join(root, 'docs');
const savedLibrary = JSON.parse(await fs.readFile(path.join(docs, 'design-options.json'), 'utf8'));
const collectedMineral = await buildCollectedMineral({ root });
const cocoaChromeOwned = await buildCocoaChromeOwned({ root });
// A complete option is public only after all cameras, paired nights and owned units pass its release gate.
const library = { ...savedLibrary, options: savedLibrary.options.filter(option => option.id !== 'collected-mineral' || collectedMineral.ready).map(option => option.id === 'collected-mineral' ? { ...option, hero: collectedMineral.hero } : option.id === 'cocoa-chrome' && cocoaChromeOwned.ready ? { ...option, ...cocoaChromeOwned.metadata } : option) };
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
  'collected-mineral': 'collected-mineral-overview.html',
};
const options = library.options.map(option => {
  const href = optionLandingHref[option.id] || option.href;
  return `<article class="option-card" data-option="${esc(option.id)}"><a class="card-image" href="${esc(href)}" aria-label="Explore ${esc(option.name)}"><img src="${esc(option.hero)}" alt="${esc(option.name)} — ${esc(option.heroRoom || option.subtitle)}" width="1500" height="1000"><span class="image-label">${esc(option.label)}</span><span class="image-arrow" aria-hidden="true">→</span></a><div class="card-copy"><h2><a href="${esc(href)}">${esc(option.name)}</a></h2><p class="subtitle">${esc(option.subtitle)}</p><p class="summary">${esc(option.summary)}</p>${swatches(option)}<a class="action" href="${esc(href)}">${option.id === 'model-home' ? 'View Model Home' : 'Explore Option ' + option.number}<span aria-hidden="true">→</span></a></div></article>`;
}).join('');
const currentFurniture = await buildCurrentFurniture({ root, docs, shell, esc });
await fs.writeFile(path.join(docs, 'renders.html'), shell('Designs', `<main id="main"><section class="intro designs-intro"><p class="eyebrow">The City Home · Georgetown</p><h1>Designs.</h1><p>Choose a direction to find its room renders, furniture and build details together.</p><a class="designs-owned-link" href="#current-furniture">Current Furniture ↓</a></section><section class="options" aria-label="Whole-house design options">${options}</section>${currentFurniture}</main>`));

const resourceCard = ({ href, title, description, eyebrow }) => `<a class="resource-card" href="${esc(href)}">${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ''}<span class="resource-title">${esc(title)} <span aria-hidden="true">→</span></span><span class="resource-description">${esc(description)}</span></a>`;
const resourceGroup = (id, title, description, resources) => `<section class="resource-section" aria-labelledby="${esc(id)}"><div class="resource-heading"><h2 id="${esc(id)}">${esc(title)}</h2>${description ? `<p>${esc(description)}</p>` : ''}</div><div class="resource-grid resource-grid-${resources.length}">${resources.map(resourceCard).join('')}</div></section>`;
const flagshipRoomIds = ['entry', 'great', 'ownerbed', 'loft'];
const mineralMosaicRoomIds = [
  ['entry', 'office', 'media', 'gym'],
  ['great', 'kitchen', 'dining', 'living'],
  ['ownerbed', 'ownerbath', 'bed2', 'bed3'],
  ['loft', 'bed5', 'bath4', 'terrace'],
];
const mosaicRoomLabels = { gym: 'Gym', dining: 'Dining room', living: 'Living room', ownerbed: 'Owners bedroom', bed5: 'Guest bedroom' };
const mosaicImageSizes = '(max-width: 680px) calc((100vw - 41px) / 2), (max-width: 1000px) calc((100vw - 86px) / 4), (max-width: 1480px) calc((100vw - 130px) / 4), 338px';
// Saved galleries contain the approved public media paths. Their original
// generation manifests are local working files and are unavailable in CI.
async function optionFloorCards(option) {
  const galleryFile = option.href.split('#')[0];
  const html = await fs.readFile(path.join(docs, galleryFile), 'utf8');
  const embedded = html.match(/<script id="review-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!embedded) throw new Error(`Missing approved gallery data in ${galleryFile}`);
  const floors = JSON.parse(embedded[1]);
  return `<section class="floor-selector" aria-labelledby="floor-picker-title"><div class="floor-selector-heading"><h2 id="floor-picker-title">Explore by floor</h2><p>Open a floor and scroll through every room and angle.</p></div><div class="floor-card-grid">${floors.map(floor => {
    const room = floor.rooms.find(room => room.id === flagshipRoomIds[floor.number - 1]);
    const view = room?.views[0];
    if (!view?.src) throw new Error(`Missing floor ${floor.number} flagship in ${galleryFile}`);
    const image = option.id === 'mineral-walnut' ? `<span class="floor-card-image floor-card-mosaic">${mineralMosaicRoomIds[floor.number - 1].map(id => {
      const mosaicRoom = floor.rooms.find(room => room.id === id);
      const mosaicView = mosaicRoom?.views[0];
      if (!mosaicView?.src) throw new Error(`Missing floor ${floor.number} mosaic room ${id} in ${galleryFile}`);
      const label = mosaicRoomLabels[id] || mosaicRoom.title;
      const responsiveSource = mosaicView.thumb ? ` srcset="${esc(mosaicView.thumb)} 520w, ${esc(mosaicView.src)} 2000w" sizes="${esc(mosaicImageSizes)}"` : '';
      return `<span class="floor-card-tile" data-room="${esc(id)}"><img src="${esc(mosaicView.thumb || mosaicView.src)}"${responsiveSource} alt="${esc(option.name)} — ${esc(label)}" width="1500" height="1000" loading="lazy" decoding="async"><span class="floor-card-tile-label">${esc(label)}</span></span>`;
    }).join('')}</span>` : `<span class="floor-card-image"><img src="${esc(view.src)}" alt="${esc(option.name)} — ${esc(room.title)}" width="1500" height="1000" loading="lazy" decoding="async"><span class="floor-card-room">${esc(room.title)}</span></span>`;
    return `<a class="floor-card" href="${esc(galleryFile)}#floor-${floor.number}" aria-label="Explore floor ${floor.number} · ${esc(floor.title)}">${image}<span class="floor-card-copy"><span><span class="floor-card-number">Floor ${floor.number}</span><span class="floor-card-title">${esc(floor.title)}</span></span><span class="floor-card-arrow" aria-hidden="true">→</span></span></a>`;
  }).join('')}</div></section>`;
}
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
  await fs.writeFile(path.join(docs, optionLandingHref[mineral.id]), shell('Mineral & Walnut · Option 1', hubBody(mineral, await optionFloorCards(mineral) + furniture + build + studies)));
}
const cocoa = library.options.find(option => option.id === 'cocoa-chrome');
// The completed owned-furniture builder owns the new four-page Option 2 set.
// Until then, preserve the established gallery/book and their existing overview.
if (cocoa && !cocoaChromeOwned.ready) {
  const build = resourceGroup('build-materials', 'Build & materials', '', [
    { href: 'cocoa-chrome-build-book.html', title: 'Materials & build book', description: 'Room specifications, cabinet designs and the decisions behind the Cocoa & Chrome scheme.' },
  ]);
  await fs.writeFile(path.join(docs, optionLandingHref[cocoa.id]), shell('Cocoa & Chrome · Option 2', hubBody(cocoa, await optionFloorCards(cocoa) + build)));
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
const modelFlagships = [
  ['first-floor-entrance-gallery-and-spiral-staircase', 'Entrance gallery', 'Entry & leisure'],
  ['second-floor-great-room', 'Great room', 'Main living'],
  ['third-floor-master-bedroom', 'Owners bedroom', 'Bedrooms'],
  ['fourth-floor-penthouse-loft', 'Penthouse lounge', 'Penthouse & terrace'],
];
const modelFloorCards = `<section class="floor-selector" id="floor-picker" aria-labelledby="floor-picker-title"><div class="floor-selector-heading"><h2 id="floor-picker-title">Explore by floor</h2><p>Choose a floor to see its original rooms and alternate angles.</p></div><div class="floor-card-grid" role="group" aria-label="Choose a floor">${modelFlagships.map(([id, title, name], i) => {
  const photo = photos.find(photo => photo.id === id);
  if (!photo) throw new Error(`Missing original floor ${i + 1} flagship ${id}`);
  return `<button type="button" class="floor-card" data-group="${i + 1}" aria-pressed="${i === 0}" aria-controls="model-gallery"><span class="floor-card-image"><img src="${esc(photo.src)}" alt="${esc(title)} — original model home" width="1500" height="1000" loading="lazy" decoding="async"><span class="floor-card-room">${esc(title)}</span></span><span class="floor-card-copy"><span><span class="floor-card-number">Floor ${i + 1}</span><span class="floor-card-title">${esc(name)}</span></span><span class="floor-card-arrow" aria-hidden="true">→</span></span></button>`;
}).join('')}</div><button type="button" class="floor-card exterior-card" data-group="0" aria-pressed="false" aria-controls="model-gallery"><span class="floor-card-image"><img src="design-library-assets/city-homes-at-crown.jpg.webp" alt="White-brick model-home exterior" width="1500" height="1000" loading="lazy" decoding="async"></span><span class="floor-card-copy"><span><span class="floor-card-number">Original reference</span><span class="floor-card-title">Exterior & arrival</span></span><span class="floor-card-arrow" aria-hidden="true">→</span></span></button></section>`;
const modelBody = `<main id="main"><a class="back-link" href="renders.html">← All design options</a><section class="model-intro"><div><p class="eyebrow">Original reference · ${photos.length} unaltered photographs</p><h1>Model Home</h1><p class="lead">The house that started it all.</p><p>${esc(model.summary)}</p>${swatches(model)}<a class="text-link" href="design-library-assets/georgetown-blueprint.pdf" target="_blank" rel="noopener">View the builder blueprint ↗</a></div><img src="${esc(model.hero)}" alt="Original model-home great room" width="1500" height="1000"></section>${modelFloorCards}<section class="model-gallery" id="model-gallery" aria-labelledby="gallery-title"><div class="section-heading"><div><p class="eyebrow">Original model home</p><h2 id="gallery-title"></h2></div><div class="gallery-heading-tools"><span id="photo-count" role="status" aria-live="polite"></span><button type="button" id="choose-floor">Choose another floor ↑</button></div></div><div class="original-grid" id="photos"></div></section><details class="model-reference-details"><summary>About the original reference</summary><div class="design-summary"><article><h2>Classic architecture</h2><p>Detailed trim, tall windows, the open entrance gallery and curved stair establish the character of the home.</p></article><article><h2>Layered, room by room</h2><p>Warm wood, pale cabinetry, decorative wallpaper and varied textiles create the builder’s furnished scheme.</p></article><article><h2>Our fixed reference</h2><p>These are the real model-home photographs, including the white-brick exterior. The blueprint establishes layout; its brown-brick illustration is not our exterior selection.</p></article></div></details><p class="future-note">Every original photo is included, with alternate kitchen, retreat and terrace angles. Rooms without photographs remain documented in the plan; no generated images are substituted here.</p></main><dialog id="photo-viewer" aria-label="Original model-home photograph" aria-describedby="viewer-help"><header><strong id="viewer-title"></strong><button type="button" id="close-viewer" autofocus aria-label="Close photograph">Close ✕</button></header><img id="viewer-image" alt="" decoding="async" draggable="false"><div class="viewer-controls"><button type="button" id="previous-photo" aria-label="Previous photograph">← Previous</button><span id="viewer-count" aria-live="polite"></span><button type="button" id="next-photo" aria-label="Next photograph">Next →</button></div><p id="viewer-help">Use arrow keys or swipe to browse this floor.</p></dialog>`;
await fs.writeFile(path.join(docs, 'model-home.html'), shell('Model Home', modelBody, `<script id="photo-data" type="application/json">${JSON.stringify({ photos, groupNames }).replaceAll('<', '\\u003c')}</script><script src="design-library-assets/model-home.js" defer></script>`));
await fs.writeFile(path.join(docs, 'explorations.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Explorations · Home 708</title></head><body><p><a href="./#/explorations">Open Explorations</a></p><script>location.replace("./#/explorations");</script></body></html>');
console.log(`Built design library: Model Home (${photos.length} original photos), ${library.options.length - 1} developed options, ${catalog.LOOKS.length} exploratory looks.`);
