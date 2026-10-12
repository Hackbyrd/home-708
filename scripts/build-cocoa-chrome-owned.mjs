/** Build Option 2 only when its complete, individually allocated scheme passes the release gate. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { releaseErrors as sharedReleaseErrors } from './build-collected-mineral.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['cocoa-chrome.html', 'cocoa-chrome-overview.html', 'cocoa-chrome-build-book.html', 'cocoa-chrome-furniture.html'];
const mosaicIds = [['entry', 'office', 'media', 'gym'], ['great', 'kitchen', 'dining', 'living'], ['ownerbed', 'ownerbath', 'bed2', 'bed3'], ['loft', 'bed5', 'bath4', 'terrace']];
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const list = value => value == null ? [] : Array.isArray(value) ? value : [value];
const text = value => typeof value === 'string' ? value : value?.description || value?.note || value?.reason || value?.name || '';
const notes = (values, className = 'cm-note-list') => list(values).length ? `<ul class="${className}">${list(values).map(value => `<li>${esc(text(value))}</li>`).join('')}</ul>` : '';
const link = (url, label, external = false) => url ? `<a href="${esc(url)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${esc(label)}${external ? ' ↗' : ''}</a>` : '';
const nightViews = room => room.nights || (room.night ? [room.night] : []);
const productDisplayName = piece => String(piece.name || piece.inventoryId || '').replace(/\bstocked\s+/gi, '').trim();
const availabilityLabels = {
  in_stock: 'In stock shown in the dated check',
  in_stock_observed: 'In stock shown in the dated configuration check; reconfirm before ordering',
  stocked_fabric_delivery_pending: 'Stocked fabric shown; exact unit and ZIP delivery not confirmed',
  not_a_stocked_retail_claim: 'Fabrication or retail-match concept; quote and measured selection required',
  in_stock_unit_verified_combined_quantity_pending: 'Single unit shown in stock; complete quantity pending',
  in_stock_configuration_verified: 'Selected configuration shown in stock',
  in_stock_combined_quantity_verified: 'Complete selected quantity shown in stock',
  current_verification_pending: 'Current stock verification pending',
  near_term_delivery_quoted_stock_unconfirmed: 'Near-term delivery quoted; stock not confirmed',
  near_term_delivery_quote_special_order: 'Near-term special-order delivery quoted; not confirmed in stock',
  official_page_in_stock_zip_quantity_pending: 'Official page shows stock; ZIP and total quantity pending',
  custom_quote_required: 'Custom fabrication quote required',
  unverified_current: 'Current stock not verified',
  unverified_configured_stock: 'Exact configuration and stock not verified',
  active_official_family_configuration_stock_pending: 'Official product family active; chosen configuration and stock not verified',
  ready_to_ship: 'Near-term shipping quoted',
  unverified: 'Stock verification pending',
  out_of_stock: 'Out of stock',
  special_order: 'Special order',
};

/** Share the allocation/pair rules, but require this option's identity, palette and public media. */
export function cocoaChromeReleaseErrors(design, production, inventory) {
  const errors = [];
  if (design.id !== 'cocoa-chrome' || design.number !== 2 || design.name !== 'Cocoa & Chrome' || design.styleId !== 'cocoa-chrome') errors.push('Option 2 must identify the Cocoa & Chrome style; sibling-option branding is not allowed.');
  const contract = design.styleContract || {};
  const normalized = value => String(value || '').toLowerCase().trim();
  if (normalized(contract.wood) !== 'brown oak' || normalized(contract.metal) !== 'polished stainless steel') errors.push('Cocoa & Chrome requires brown oak and polished stainless steel; a walnut/mineral or alternate metal style contract cannot ship.');
  const accents = list(contract.accents).map(normalized);
  if (!accents.includes('blue') || !accents.includes('butter yellow')) errors.push('Cocoa & Chrome requires its restrained blue and butter-yellow accents.');
  if (!/plinth/.test(normalized(contract.cabinetBase)) || !/no exposed legs/.test(normalized(contract.cabinetBase))) errors.push('Cocoa & Chrome storage must specify a continuous plinth with no exposed legs.');
  const validation = structuredClone(design);
  const jobIds = new Set(), imagePaths = new Set();
  for (const room of design.floors?.flatMap(floor => floor.rooms || []) || []) {
    if (!list(room.materials).length) errors.push(`${room.id}: room-specific material specifications are required for the full build book.`);
    if (!room.lighting?.day || !room.lighting?.night) errors.push(`${room.id}: day and night lighting specifications are required.`);
    if (!room.windowTreatment?.recommendation || !room.windowTreatment?.why) errors.push(`${room.id}: specify window treatment or no-treatment recommendation and its reason.`);
    if (!list(room.contractorSequence).length) errors.push(`${room.id}: contractor sequence is required.`);
  }
  for (const room of validation.floors?.flatMap(floor => floor.rooms || []) || []) for (const view of [...(room.views || []), ...nightViews(room)]) {
    const source = view.src?.replace(/^\//, '');
    if (view.jobId) {
      if (jobIds.has(view.jobId)) errors.push(`${room.id}/${view.code}: every Cocoa day/night camera requires its own generation job.`);
      jobIds.add(view.jobId);
    }
    if (source) {
      if (imagePaths.has(source)) errors.push(`${room.id}/${view.code}: every Cocoa day/night camera requires its own public image.`);
      imagePaths.add(source);
      if (source.includes('\\') || path.posix.normalize(source) !== source) errors.push(`${room.id}/${view.code}: the public image path must be normalized within the Cocoa namespace.`);
    }
    if (!source?.startsWith('cocoa-chrome-owned-assets/')) errors.push(`${room.id}/${view.code}: final Option 2 media must use cocoa-chrome-owned-assets, never another option's image.`);
    else view.src = source.replace('cocoa-chrome-owned-assets/', 'collected-mineral-assets/');
  }
  return [...errors, ...sharedReleaseErrors(validation, production, inventory)];
}

function itemCard(item, owned, inventoryById) {
  const original = owned ? inventoryById.get(item.inventoryId || item.id) : null;
  const piece = { ...original, ...item };
  const quantity = piece.unitIds?.length || piece.quantity || 1;
  const photo = piece.imageUrl || piece.image;
  const price = piece.unitPrice;
  const exactPrice = typeof price === 'number' ? price : price?.low === price?.high ? price?.low : null;
  const availability = piece.availability;
  const availabilityCode = typeof availability === 'string' ? availability : availability?.status || piece.stockStatus;
  const status = availabilityLabels[availabilityCode] || (availabilityCode ? String(availabilityCode).replaceAll('_', ' ') : 'Current stock verification pending');
  const stockEvidence = typeof availability === 'object' ? availability?.evidence || availability?.note || piece.stockEvidence : piece.stockEvidence;
  const availabilityDate = availability?.checkedAt || piece.checkedAt;
  const displayName = owned ? piece.name || piece.inventoryId : productDisplayName(piece);
  const unitText = piece.unitIds?.length ? `<p class="cm-unit-ids">Allocated units: ${piece.unitIds.map(esc).join(' · ')}</p>` : '';
  const photoLimitation = piece.photoLimitation || piece.photoMatchNote || piece.matchNote;
  const placement = /^[a-z]+(?:_[a-z]+){2,}$/.test(piece.placement || '') ? 'Proposed for this room; current stock and measured fit require confirmation.' : piece.placement || piece.reason;
  const priceEvidence = piece.currentPriceOrSale || piece.currentPrice || piece.unitPrice;
  const priceKind = priceEvidence?.kind;
  const priceLabel = priceKind === 'member_sale' ? 'Last observed RH member sale' : priceKind === 'sale' || priceKind === 'clearance' ? 'Last observed sale' : 'Last observed price';
  const priceDate = priceEvidence?.verifiedAt || priceEvidence?.checkedAt;
  return `<article class="cm-furniture-card" data-furniture-kind="${owned ? 'owned' : 'new'}"><div class="cm-product-image">${photo ? `<img src="${esc(photo)}" alt="${esc(displayName)} · ${owned ? 'owned reference' : 'new product reference'}" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : '<span>Product photograph not supplied</span>'}</div><div class="cm-furniture-copy"><p class="cm-eyebrow">${owned ? 'OWNED · keep & place' : 'NEW · complete the room'} · Qty ${quantity}</p><h4>${esc(displayName)}</h4><p>${esc(placement)}</p><dl>${[['Finish', piece.finish], ['Upholstery', [piece.fabric, piece.color].filter(Boolean).join(' · ')], ['Dimensions', piece.dimensions || piece.size], ['Supplier', piece.brand || (owned ? 'RH · owned inventory' : '')]].filter(([, value]) => value).map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>${!owned && exactPrice != null ? `<p class="cm-price">${priceLabel}: $${Number(exactPrice).toLocaleString('en-US')} each${priceDate ? ' · ' + esc(priceDate) : ''} · tax and delivery extra</p>` : ''}${!owned ? `<p class="cm-stock"><strong>Availability:</strong> ${esc(status)}${availabilityDate ? ' · Checked ' + esc(availabilityDate) : ''}</p>${stockEvidence ? `<details class="cm-details"><summary>Dated availability evidence</summary>${gcValue(stockEvidence)}</details>` : ''}` : ''}${unitText}${notes(piece.fitNotes)}${notes(piece.purchaseNotes)}${photoLimitation ? `<p class="cm-qualification">${esc(photoLimitation)}</p>` : ''}${link(piece.url || piece.sourceUrl || piece.productUrl, owned ? 'Owned product reference' : 'View at supplier', true)}${owned ? link('/current-furniture.html#' + (piece.inventoryId || piece.id), 'View recorded inventory') : ''}</div></article>`;
}

function floorMosaic(floor, target, button = false) {
  const images = mosaicIds[floor.number - 1].map(id => {
    const room = floor.rooms.find(room => room.id === id), view = room.views[0];
    return `<span class="cm-mosaic-tile"><img src="${esc(view.thumb || view.src)}" alt="${esc(room.title)} · Cocoa & Chrome" width="520" height="347" loading="lazy" decoding="async"><span>${esc(room.title)}</span></span>`;
  }).join('');
  const body = `<span class="cm-floor-mosaic">${images}</span><span class="floor-card-copy"><b>Floor ${floor.number}</b><span>${esc(floor.title)}</span><small>${floor.rooms.length} spaces · ${floor.rooms.reduce((total, room) => total + room.views.length, 0)} day/night pairs</small></span>`;
  const label = `Floor ${floor.number} · ${esc(floor.title)}`;
  return button ? `<button type="button" class="floor-tab" role="tab" id="tab-${floor.id}" aria-label="${label}" aria-controls="panel-${floor.id}" aria-selected="false" tabindex="-1" data-floor="${floor.id}">${body}</button>` : `<a class="cm-floor-card" aria-label="${label}" href="${target}#${floor.id}">${body}</a>`;
}

function shell(title, body, script = '', galleryCss = '', enhancements = '') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="home-708-option-status" content="complete"><meta name="home-708-option-id" content="cocoa-chrome-owned"><title>${esc(title)} · Option 2 · Home 708</title><link rel="stylesheet" href="/design-library-assets/library.css"><link rel="stylesheet" href="/design-library-assets/cocoa-chrome-owned.css">${galleryCss ? `<style>${galleryCss}</style>` : ''}</head><body class="cm-page cc-page"><a class="skip" href="#main">Skip to content</a>${body}<footer class="cm-footer"><span>Home 708 · Option 2 · Cocoa & Chrome</span><span>Product photographs, selected configurations and measured plans govern purchasing and construction.</span></footer>${enhancements ? `<script>${enhancements}</script>` : ''}${script}</body></html>`;
}

const optionNavigation = active => `<nav class="cm-option-navigation" aria-label="Option 2 pages">${[['overview', 'cocoa-chrome-overview.html', 'Overview'], ['renders', 'cocoa-chrome.html', 'Room renders'], ['furniture', 'cocoa-chrome-furniture.html', 'Furniture'], ['build', 'cocoa-chrome-build-book.html', 'Materials & build book']].map(([id, href, label]) => `<a href="/${href}"${active === id ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
const floorLinks = floors => `<nav class="cm-floor-links" aria-label="Jump to floor">${floors.map(floor => `<a href="#${floor.id}">Floor ${floor.number} · ${esc(floor.title)}</a>`).join('')}</nav>`;
const roomLinks = floor => `<nav class="cm-room-links" aria-label="Rooms on Floor ${floor.number}">${floor.rooms.map(room => `<a href="#${room.id}">${esc(room.title)}</a>`).join('')}</nav>`;
const roomFuture = room => room.id === 'bed5' ? '<p class="cm-unbuilt"><strong>Unbuilt future room.</strong> Complete permitted construction and measure the finished room before ordering or installing its furniture.</p>' : room.id === 'bath4' ? '<p class="cm-qualification">Plan-led bathroom concept: confirm measured openings, fixture placement, waterproofing and services before construction.</p>' : '';
function supportingScope(room, includeFitted = false) {
  const items = [...list(room.supportingTextiles), ...(includeFitted ? list(room.buildOuts).filter(item => item?.ownership?.startsWith('new')) : [])];
  if (!items.length) return '';
  return `<details class="cm-details" data-furniture-kind="new"><summary>${includeFitted ? 'New custom & supporting allowances' : 'New supporting textile allowances'}</summary><p>These illustrated concepts require a separate quote or an exact retail selection. Prices and stock are unconfirmed.</p><ul class="cm-note-list">${items.map(item => `<li><strong>${esc(item.name)} · Qty ${item.quantity || 1}</strong><p>${esc(item.scope)}</p>${item.finish ? `<p>${esc(item.finish)}</p>` : ''}${item.dimensions || item.size ? `<p>${esc(item.dimensions || item.size)}</p>` : ''}</li>`).join('')}</ul></details>`;
}

function gcValue(value) {
  if (value == null || value === '') return '';
  if (Array.isArray(value)) return `<ul class="cm-note-list">${value.map(item => `<li>${typeof item === 'object' ? gcValue(item) : esc(item)}</li>`).join('')}</ul>`;
  if (typeof value === 'object') return `<dl class="cm-gc-fields">${Object.entries(value).map(([key, entry]) => `<div><dt>${esc(key.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' '))}</dt><dd>${gcValue(entry)}</dd></div>`).join('')}</dl>`;
  return `<p>${esc(value)}</p>`;
}
function gcField(label, value) {
  return value == null || value === '' || Array.isArray(value) && !value.length ? '' : `<div class="cm-gc-field"><h5>${esc(label)}</h5>${gcValue(value)}</div>`;
}
function gcMaterial(material) {
  if (typeof material === 'string') return `<p>${esc(material)}</p>`;
  return `<section class="cm-gc-item"><h4>${esc(material.surface || material.area || material.name || 'Finish specification')}</h4>${gcField('Selected finish', material.finish || material.name)}${gcField('Design intent', material.description)}${gcField('Substrate preparation', material.substratePreparation)}${gcField('Installation', material.installation)}${gcField('Sample approval', material.sampleApproval)}${gcField('Care & repair', material.care)}${link(material.sourceUrl, 'Material reference', true)}</section>`;
}
function gcBuildOut(item) {
  if (typeof item === 'string') return `<p>${esc(item)}</p>`;
  return `<section class="cm-gc-item"><h4>${esc(item.name || 'Fitted work')}</h4>${gcField('Scope', item.scope || item.description)}${gcField('Planning dimensions', item.dimensions || item.planningSize)}${gcField('Materials', item.material)}${gcField('Trade coordination', item.contractorCoordination)}${gcField('Measurements to confirm', item.measurementNotes)}${gcField('Status', item.status)}</section>`;
}
function gcLighting(room) {
  const lighting = room.lighting;
  if (!lighting) {
    const night = nightViews(room)[0];
    return night ? gcField('Night lighting', night.lighting) + gcField('Separate controls', night.circuits) + gcField('Proposed lamp color', night.cct ? `${night.cct} K` : '') : '<p>Confirm room lighting and control schedule with the electrician.</p>';
  }
  return gcField('Day', lighting.day) + gcField('Night', lighting.night) + gcField('Lamp color', lighting.colorTemperature || (lighting.cct ? `${lighting.cct} K` : '')) + gcField('Color quality', lighting.colorQuality) + gcField('Separate controls', lighting.controlGroups || lighting.circuits) + gcField('Electrical coordination', lighting.electricalCoordination) + gcField('After-dark commissioning', lighting.commissioning);
}
function gcWindows(room) {
  const value = room.windowTreatment || room.windowTreatments;
  return value ? [['Recommendation', 'recommendation'], ['Coverage', 'coverage'], ['Why this system', 'why'], ['Day', 'day'], ['Night', 'night'], ['Track, lining & installation', 'installation']].map(([label, key]) => gcField(label, value[key])).join('') : '<p>Room window-treatment specification is pending. Verify actual glazing and privacy needs before selecting or pricing a system.</p>';
}
function gcRoom(room, floor, design) {
  const materials = list(room.materials).length ? list(room.materials).map(gcMaterial).join('') : notes(design.materials || ['Warm taupe walls, matte oak flooring, brown-oak fitted storage on continuous plinths and polished stainless accents; approve the Cocoa & Chrome room samples before installation.']);
  const buildOuts = list(room.buildOuts).length ? list(room.buildOuts).map(gcBuildOut).join('') : '<p>No additional custom build-out is scheduled in this room. Confirm retained fixtures and serviceability.</p>';
  return `<article class="cm-build-room" id="${room.id}"><div class="cm-room-schedule-heading"><div><h3>${esc(room.title)}</h3><p>${esc(room.intent)}</p>${roomFuture(room)}<p>${link('cocoa-chrome.html#' + floor.id + '/' + room.id, 'View room renders')} · ${link('cocoa-chrome-furniture.html#' + room.id, 'Owned & new furniture')}</p></div><a href="cocoa-chrome.html#${floor.id}/${room.id}"><img src="${esc(room.views[0].thumb || room.views[0].src)}" alt="Cocoa & Chrome · ${esc(room.title)}" loading="lazy"></a></div><div class="cm-build-grid"><details class="cm-details"><summary>Materials, preparation & finish care</summary>${materials}</details><details class="cm-details"><summary>Custom build-outs & trade coordination</summary>${buildOuts}${supportingScope(room)}${notes(room.contractorNotes)}</details><details class="cm-details"><summary>Lighting, controls & commissioning</summary>${gcLighting(room)}</details><details class="cm-details"><summary>Window treatments</summary>${gcWindows(room)}</details><details class="cm-details"><summary>Measurements, open decisions & source audit</summary>${notes(room.measurementNotes)}${gcField('Open room decisions', room.unresolvedItems)}${gcField('Source qualification', room.architectureBasis?.limitation)}${notes(room.notes)}${[...room.views, ...nightViews(room)].map(view => `<p><strong>${esc(view.code)}:</strong> ${esc(view.evidenceType)}. ${esc(view.evidence)} ${esc(view.qaNote)}</p>`).join('')}</details><details class="cm-details"><summary>Contractor sequence & furniture installation</summary>${room.contractorSequence?.length ? `<ol class="cm-note-list">${room.contractorSequence.map(step => `<li>${esc(text(step))}</li>`).join('')}</ol>` : ''}${gcField('Furniture coordination', room.furnitureCoordination?.principle)}<p>${room.ownedFurniture.length} owned furniture allocations · ${room.newFurniture.length} new product selections. ${link('cocoa-chrome-furniture.html#' + room.id, 'Open the full furniture schedule')}</p>${notes(room.purchaseNotes)}</details>${room.avSystem ? `<details class="cm-details"><summary>AV system & equipment coordination</summary>${gcValue(room.avSystem)}</details>` : ''}</div></article>`;
}

export async function buildCocoaChromeOwned({ root = defaultRoot, preview = false } = {}) {
  const docs = path.join(root, 'docs');
  let design;
  try { design = JSON.parse(await fs.readFile(path.join(docs, 'cocoa-chrome-owned-design.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return { ready: false, reason: 'Option 2 preparation has not started.' }; throw error; }
  if (design.status !== 'complete' && !preview) return { ready: false, reason: 'Option 2 remains in preparation.' };
  const inventory = JSON.parse(await fs.readFile(path.join(docs, 'current-furniture.json'), 'utf8'));
  const production = JSON.parse(await fs.readFile(path.join(docs, 'cocoa-chrome-owned-production.json'), 'utf8'));
  const errors = cocoaChromeReleaseErrors(design, production, inventory);
  if (errors.length && !preview) throw new Error('Option 2 release gate failed:\n' + errors.join('\n'));
  const inventoryById = new Map(inventory.items.map(item => [item.id, item]));
  const floors = structuredClone(design.floors);
  const rooms = floors.flatMap(floor => floor.rooms);
  if (!preview) for (const floor of floors) {
    const productPhotos = floor.rooms.flatMap(room => [...(room.ownedFurniture || []).map(item => ({ ...inventoryById.get(item.inventoryId || item.id), ...item })), ...(room.newFurniture || [])].map(item => item.imageUrl || item.image).filter(Boolean));
    for (const source of [floor.plan, ...floor.rooms.flatMap(room => [...room.views, ...nightViews(room), ...(room.originalPhotos || [])].flatMap(view => [view.src, view.thumb]).filter(Boolean)), ...productPhotos]) {
      if (!source || /^(?:https?:)?\/\//.test(source)) continue;
      const resolved = path.resolve(docs, source.replace(/^\//, ''));
      if (!resolved.startsWith(docs + path.sep)) throw new Error('Option 2 public media path escapes docs: ' + source);
      await fs.access(resolved);
    }
  }
  for (const room of rooms) {
    room.ownedFurniture ||= [];
    room.newFurniture ||= [];
    room.notes = [...(room.notes || []), ...list(room.architectureLocks).map(text), ...list(room.measurementNotes).map(text), ...room.ownedFurniture.map(item => `OWNED: ${item.name || inventoryById.get(item.inventoryId)?.name || item.inventoryId} · ${item.unitIds?.length || item.quantity || 1} unit(s). ${item.placement || ''}`), ...room.newFurniture.map(item => `NEW: ${productDisplayName(item)} · ${item.quantity || 1} unit(s). ${item.placement || ''}`)];
  }
  const output = preview ? path.join(root, 'tmp/cocoa-chrome-preview') : docs;
  await fs.mkdir(output, { recursive: true });
  await fs.mkdir(path.join(docs, 'design-library-assets'), { recursive: true });
  await fs.copyFile(path.join(root, 'scripts/design-library/cocoa-chrome-owned.css'), path.join(docs, 'design-library-assets/cocoa-chrome-owned.css'));
  await fs.copyFile(path.join(root, 'scripts/design-library/collected-mineral.css'), path.join(docs, 'design-library-assets/owned-furniture-shared.css'));
  const styles = await fs.readFile(path.join(root, 'scripts/design-library/house-review.css'), 'utf8');
  const enhancements = await fs.readFile(path.join(root, 'scripts/design-library/cocoa-chrome-owned.js'), 'utf8');
  let runtime = await fs.readFile(path.join(root, 'scripts/design-library/house-review.js'), 'utf8');
  runtime = runtime.replace("${bed ? '<button", "${bed && bedroomComparison ? '<button");
  runtime = runtime.replace('<div class="note-actions"><a href=', '<div class="note-actions"><a href="cocoa-chrome-furniture.html#${esc(room.id)}">${esc(room.title)} · owned &amp; new furniture ↗</a><a href=');
  const bedroomComparison = design.bedroomComparison || '';
  const gallery = `<header class="review-intro"><div><p class="brand">Option 2 · complete room gallery</p><h1>Cocoa & Chrome</h1><p class="header-note">Brown oak, polished stainless, ivory upholstery and restrained blue and butter-yellow accents, built around all your owned pieces. Every camera has matching day and night views.</p>${optionNavigation('renders')}</div></header><nav class="floor-selection" id="floors" aria-label="Floors"><div class="floor-tabs" role="tablist" aria-label="Choose a floor">${floors.map(floor => floorMosaic(floor, '', true)).join('')}</div></nav><main id="main"><div id="status" class="sr-only" role="status" aria-live="polite"></div>${floors.map(floor => `<section id="panel-${floor.id}" role="tabpanel" aria-labelledby="tab-${floor.id}" tabindex="0" hidden></section>`).join('')}</main><dialog id="zoom" aria-label="Enlarged floor photos" aria-labelledby="zoom-title" aria-describedby="zoom-hint"><div class="zoom-bar"><strong id="zoom-title"></strong><button type="button" id="close-zoom" autofocus aria-label="Close photo">Close ✕</button></div><div class="zoom-image-wrap"><img id="zoom-image" alt="" decoding="async" draggable="false"></div><div class="zoom-bottom"><button type="button" id="zoom-prev" aria-label="Previous photo">← Previous</button><span id="zoom-position" role="status" aria-live="polite"></span><button type="button" id="zoom-next" aria-label="Next photo">Next →</button></div><p id="zoom-hint"></p></dialog>`;
  const script = `<script id="review-data" type="application/json">${JSON.stringify(floors).replaceAll('<', '\\u003c')}</script><script>const optionName="Cocoa & Chrome",bookPage="cocoa-chrome-build-book.html",bedroomComparison=${JSON.stringify(bedroomComparison)},floors=JSON.parse(document.getElementById('review-data').textContent);\n${runtime}</script>`;
  await fs.writeFile(path.join(output, pages[0]), shell('Cocoa & Chrome · room renders', gallery, script, styles, enhancements));
  const firstGreat = rooms.find(room => room.id === 'great').views[0];
  const hero = design.hero || firstGreat.src;
  const ownedCount = rooms.reduce((total, room) => total + room.ownedFurniture.reduce((sum, item) => sum + (item.unitIds?.length || item.quantity || 1), 0), 0);
  const newCount = rooms.reduce((total, room) => total + room.newFurniture.reduce((sum, item) => sum + (item.quantity || 1), 0), 0);
  const overview = `<main id="main" class="cm-content"><section class="cm-hero"><div><p class="cm-eyebrow">Option 2 · a complete owned-furniture design</p><h1>Cocoa & Chrome</h1><p class="cm-lead">${esc(design.subtitle || 'Warm taupe walls, brown oak and polished stainless, built around the pieces you own.')}</p><p>${esc(design.summary)}</p><div class="cm-palette" aria-label="Cocoa & Chrome palette">${(design.palette || ['#c7beb2', '#f2efe7', '#4a403b', '#c4c7c9', '#244b77', '#e5cd78']).map(color => `<span style="background:${esc(color)}"></span>`).join('')}</div><a class="cm-action" href="cocoa-chrome.html#floor-2/great">Explore the rooms →</a></div><a href="cocoa-chrome.html#floor-2/great"><img src="${esc(hero)}" alt="Cocoa & Chrome · great room" width="1500" height="1000"></a></section>${optionNavigation('overview')}<section class="cm-coverage"><span><strong>24</strong> spaces</span><span><strong>45</strong> day/night pairs</span><span><strong>29</strong> owned furniture types</span><span><strong>${ownedCount}</strong> individually allocated owned units</span><span><strong>${newCount}</strong> new pieces in the schedule</span></section><section class="cm-section"><h2>Explore by floor</h2><p>Choose a floor, then scroll through every room and matching camera.</p><div class="cm-floor-grid">${floors.map(floor => floorMosaic(floor, 'cocoa-chrome.html')).join('')}</div></section><section class="cm-resource-grid"><a class="cm-resource" href="cocoa-chrome.html"><p class="cm-eyebrow">90 room images</p><h2>Room renders →</h2><p>All angles, day and night, with original photographs and blueprint references.</p></a><a class="cm-resource" href="cocoa-chrome-furniture.html"><p class="cm-eyebrow">Keep & complete</p><h2>Furniture →</h2><p>Every owned unit allocated once, plus the new pieces that complete each room.</p></a><a class="cm-resource" href="cocoa-chrome-build-book.html"><p class="cm-eyebrow">Contractor briefing</p><h2>Materials & build book →</h2><p>Room finishes, custom work, lighting, window treatments and measured checks.</p></a></section><details class="cm-details"><summary>Design principles & source qualifications</summary>${notes(design.globalNotes)}<p>Photographed cameras follow the real model home. Alternate angles and rooms without photographs interpret the blueprint. Renders illustrate furniture and material intentions; exact specifications, comfort, installation and clearances require site measurement. Bedroom 5 is unbuilt.</p><p>The Mineral & Walnut and Collected Mineral options remain separate.</p></details></main>`;
  await fs.writeFile(path.join(output, pages[1]), shell('Cocoa & Chrome · overview', overview, '', '', enhancements));
  const furniture = `<main id="main" class="cm-content"><header class="cm-page-heading"><p class="cm-eyebrow">Option 2 · owned & new furniture</p><h1>A place for every piece.</h1><p>All 29 owned inventory types and ${ownedCount} units appear in the allocation. New pieces fill the remaining needs and stay clearly labelled.</p></header>${optionNavigation('furniture')}<div class="cm-furniture-filter" role="group" aria-label="Furniture selection"><button type="button" data-cm-kind="all" aria-pressed="true">All pieces</button><button type="button" data-cm-kind="owned" aria-pressed="false">Owned</button><button type="button" data-cm-kind="new" aria-pressed="false">New to buy</button></div>${floorLinks(floors)}${floors.map(floor => `<section class="cm-section" id="${floor.id}"><header><p class="cm-eyebrow">Floor ${floor.number}</p><h2>${esc(floor.title)}</h2></header>${roomLinks(floor)}${floor.rooms.map(room => `<article class="cm-room-schedule" id="${room.id}"><div class="cm-room-schedule-heading"><div><h3>${esc(room.title)}</h3><p>${esc(room.intent)}</p>${roomFuture(room)}<p>${link('cocoa-chrome.html#' + floor.id + '/' + room.id, 'View all room renders')} · ${link('cocoa-chrome-build-book.html#' + room.id, 'Build details')}</p></div><a href="cocoa-chrome.html#${floor.id}/${room.id}"><img src="${esc(room.views[0].thumb || room.views[0].src)}" alt="Cocoa & Chrome · ${esc(room.title)}" loading="lazy" decoding="async"></a></div><div class="cm-furniture-grid">${room.ownedFurniture.map(item => itemCard(item, true, inventoryById)).join('')}${room.newFurniture.map(item => itemCard(item, false, inventoryById)).join('')}${!room.ownedFurniture.length && !room.newFurniture.length ? '<p class="cm-qualification">This space is completed through fixed finishes, lighting and fitted work; no loose furniture is scheduled.</p>' : ''}</div>${supportingScope(room, true)}<details class="cm-details"><summary>Placement, fit & purchase notes</summary>${notes(room.measurementNotes)}${notes(room.purchaseNotes)}</details></article>`).join('')}</section>`).join('')}<details class="cm-details"><summary>Purchase qualifications</summary><p>Owned pieces are not new purchases. Product photographs can show another size or finish; the recorded inventory takes precedence. New product availability and configured prices are dated observations, not reservations. Confirm stock, complete quantities, lead times, return conditions and delivery access before ordering. These illustrations are not manufacturer CAD or a measured furniture layout.</p></details></main>`;
  const filter = `<script>document.querySelectorAll('[data-cm-kind]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-cm-kind]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));document.querySelectorAll('[data-furniture-kind]').forEach(card=>card.hidden=button.dataset.cmKind!=='all'&&card.dataset.furnitureKind!==button.dataset.cmKind)}));</script>`;
  await fs.writeFile(path.join(output, pages[3]), shell('Cocoa & Chrome · furniture', furniture, filter, '', enhancements));
  const buildBook = `<main id="main" class="cm-content"><header class="cm-page-heading"><p class="cm-eyebrow">Option 2 · general contractor briefing</p><h1>Materials & build book.</h1><p>Preserve the existing house envelope. Coordinate finishes, services and fitted work around the complete furniture allocation.</p></header>${optionNavigation('build')}<details class="cm-details"><summary>Before pricing or construction</summary>${notes(design.globalNotes)}<p>Confirm room measurements, every opening, stair landings, blocking, circuits, ventilation and product samples before quoting. Stone-look porcelain, paint systems and custom cabinetry require substrate and installation specifications from the contractor. Renders do not authorize structural or service changes. Bedroom 5 requires new-room construction.</p></details>${design.globalStandards ? `<details class="cm-details"><summary>Whole-house standards & finish boundaries</summary>${gcValue(design.globalStandards)}</details>` : ''}${design.openGlobalDecisions ? `<details class="cm-details"><summary>Open whole-house decisions</summary>${notes(design.openGlobalDecisions)}</details>` : ''}${design.completionRequirements ? `<details class="cm-details"><summary>Before the scheme becomes a construction specification</summary>${notes(design.completionRequirements)}</details>` : ''}${floorLinks(floors)}${floors.map(floor => `<section class="cm-section" id="${floor.id}"><header><p class="cm-eyebrow">Floor ${floor.number}</p><h2>${esc(floor.title)}</h2></header>${roomLinks(floor)}${floor.rooms.map(room => gcRoom(room, floor, design)).join('')}</section>`).join('')}</main>`;
  await fs.writeFile(path.join(output, pages[2]), shell('Cocoa & Chrome · materials & build book', buildBook, '', '', enhancements));
  if (preview) for (const filename of pages) {
    const filenamePath = path.join(output, filename);
    const html = await fs.readFile(filenamePath, 'utf8');
    await fs.writeFile(filenamePath, html.replace('content="complete"', 'content="private-preview"').replace('<main id="main"', '<p class="cm-unbuilt">PRIVATE PREVIEW · not a completed design option</p><main id="main"'));
  }
  return { ready: !preview && !errors.length, errors, pages, hero, metadata: { subtitle: design.subtitle, summary: design.summary, palette: design.palette, hero, status: 'Complete Cocoa & Chrome design · owned & new furniture', tags: ['24 spaces · 45 day/night pairs', '29 owned types · 39 allocated units', 'Brown oak · stainless · blue & butter yellow'], furniture: 'cocoa-chrome-furniture.html', overview: 'cocoa-chrome-overview.html', buildBook: 'cocoa-chrome-build-book.html', review: { mediaDirectory: 'cocoa-chrome-owned-assets' } }, roomCount: rooms.length, pairCount: rooms.reduce((sum, room) => sum + room.views.length, 0), ownedUnits: ownedCount, newUnits: newCount };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildCocoaChromeOwned({ preview: process.argv.includes('--preview') });
  console.log(result.ready ? `Built Option 2: ${result.roomCount} rooms / ${result.pairCount} day/night pairs / ${result.ownedUnits} owned units / ${result.newUnits} new pieces.` : `Option 2 not public: ${result.reason || result.errors.join('; ')}`);
}
