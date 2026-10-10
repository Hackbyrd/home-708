/* global floors, bookPage, optionName, bedroomComparison, Image -- review data and browser image preloader */
const tabs = [...document.querySelectorAll('[data-floor]')];
const dialog = document.getElementById('zoom');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let currentFloor, floorPhotos = [], zoomPhotos = [], zoomIndex = 0, zoomTrigger, previousOverflow, touchStart;

function roomPhotos(room) {
  return room.views.flatMap(view => {
    const day = { ...view, roomTitle: room.title, roomId: room.id, kind: 'Day' };
    return room.night?.sourceCode === view.code
      ? [day, { ...room.night, roomTitle: room.title, roomId: room.id, kind: 'Night' }]
      : [day];
  });
}
function photoFigure(photo, index) {
  return `<figure id="view-${esc(photo.roomId)}-${esc(photo.code)}"><button type="button" class="image-button" data-zoom="${index}" aria-label="Enlarge ${esc(photo.roomTitle)} — ${esc(photo.code)} · ${esc(photo.kind)}"><img src="${esc(photo.src)}" alt="${esc(photo.roomTitle)} — ${esc(photo.label)}" width="2000" height="1333" loading="${index < 2 ? 'eager' : 'lazy'}" decoding="async"><span class="enlarge" aria-hidden="true">View full image ↗</span></button><figcaption class="photo-label"><span class="view-code">${esc(photo.code)}</span><span class="view-caption">${esc(photo.label)}</span><span class="view-kind ${photo.kind === 'Night' ? 'night' : ''}">${esc(photo.kind)}</span></figcaption></figure>`;
}
function photoRows(photos, offset) {
  const rows = [];
  for (let index = 0; index < photos.length;) {
    // Keep matching cameras together; the remaining angles follow in order.
    const pairedNight = photos[index + 1]?.kind === 'Night';
    const nextStartsPair = photos[index + 2]?.kind === 'Night';
    const count = pairedNight || (!nextStartsPair && photos[index + 1]) ? 2 : 1;
    const row = photos.slice(index, index + count);
    rows.push(`<div class="view-pair ${row.length === 1 ? 'single' : ''}">${row.map((photo, position) => photoFigure(photo, offset + index + position)).join('')}</div>`);
    index += count;
  }
  return rows.join('');
}
function roomDetails(room) {
  const w = room.windowTreatment, n = room.night;
  const bed = ['ownerbed', 'bed2', 'bed3', 'bed5'].includes(room.id);
  return `<details class="room-notes"><summary>Room details, materials &amp; lighting</summary><div class="notes"><section><h4>Design intent</h4><p>${esc(room.intent)}</p><ul>${(room.notes || []).map(note => `<li>${esc(note)}</li>`).join('')}</ul>${w ? `<div class="textile-summary"><h4>Window treatments</h4><p><strong>${esc(w.recommendation)}</strong></p><p><strong>Day:</strong> ${esc(w.day)}</p><p><strong>Night:</strong> ${esc(w.night)}</p><p>${esc(w.why)}</p><p>${esc(w.coverage)}</p>${room.textileNote ? `<p>${esc(room.textileNote)}</p>` : ''}</div>` : ''}${n ? `<div class="lighting-intent"><h4>Night lighting</h4><p>${esc(n.scene)}</p><p>${esc(n.lighting)}</p><dl><dt>Proposed lamp color</dt><dd>Approximately ${esc(n.cct)} K</dd><dt>Separate controls</dt><dd>${esc(n.circuits)}</dd></dl></div>` : '<p class="coverage">No approved nighttime render is available for this room yet.</p>'}</section><section><h4>Camera &amp; source notes</h4>${[...room.views, ...(n ? [n] : [])].map(view => `<p><strong>${esc(view.code)}:</strong> ${esc(view.evidence)} ${esc(view.qaNote || '')}</p>`).join('')}<div class="note-actions"><a href="${esc(bookPage)}#${esc(room.id)}">${esc(room.title)} · materials &amp; build notes ↗</a>${room.originalPhotos?.length ? `<button type="button" class="quiet-button" data-originals="${esc(room.id)}">Original model photos ↗</button>` : ''}${bed ? '<button type="button" class="quiet-button" data-compare-bedrooms>Compare the four bedrooms ↗</button>' : ''}</div></section></div></details>`;
}
function renderFloor(floor) {
  currentFloor = floor;
  floorPhotos = floor.rooms.flatMap(roomPhotos);
  tabs.forEach(tab => {
    const active = tab.dataset.floor === floor.id;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll('[role="tabpanel"]').forEach(panel => {
    panel.hidden = panel.id !== 'panel-' + floor.id;
    if (panel.hidden) panel.innerHTML = '';
  });
  const panel = document.getElementById('panel-' + floor.id);
  const nightCount = floor.rooms.filter(room => room.night).length;
  let offset = 0;
  const rooms = floor.rooms.map(room => {
    const photos = roomPhotos(room);
    const markup = `<article class="room-detail" id="room-${esc(room.id)}" aria-labelledby="heading-${esc(room.id)}"><div class="room-title-row"><h3 id="heading-${esc(room.id)}">${esc(room.title)}</h3><span class="room-count">${room.views.length} day ${room.views.length === 1 ? 'angle' : 'angles'}${room.night ? ' · 1 night view' : ''}</span></div><div class="room-gallery">${photoRows(photos, offset)}</div>${roomDetails(room)}</article>`;
    offset += photos.length;
    return markup;
  }).join('');
  const next = floors.find(entry => entry.number === floor.number + 1);
  panel.innerHTML = `<div class="floor-heading" id="floor-heading"><div><p class="kicker">Floor ${floor.number} · ${floor.rooms.length} rooms · ${floorPhotos.length} photos</p><h2>${esc(floor.title)}</h2><p class="subline">Scroll through every room. Open any image to browse all ${floorPhotos.length} photos on this floor.</p></div><button type="button" class="plan-button" data-plan>Floor plan ↗</button></div><nav class="room-jump-nav" aria-label="Rooms on floor ${floor.number}"><a href="#floors">Floors ↑</a>${floor.rooms.map(room => `<a href="#${floor.id}/${esc(room.id)}">${esc(room.title)}</a>`).join('')}</nav>${!nightCount ? '<p class="coverage">Daytime angles are shown below. Nighttime renders for this option have not been created yet.</p>' : ''}${rooms}<nav class="floor-end" aria-label="Continue browsing">${next ? `<a class="quiet-button" href="#${next.id}">Continue to Floor ${next.number} →</a>` : '<p>You’ve reached the end of Floor 4.</p>'}<a href="#floors">Choose another floor ↑</a></nav><details class="room-notes floor-source-notes"><summary>Floor coverage &amp; measurement notes</summary><div class="notes"><p>${esc(floor.description)} ${esc(floor.coverageNote)}</p><p>These are design proposals. Photo-based views follow the model home; alternate cameras interpret the plan and photos. Exact openings and build dimensions require site measurement. Plan-led rooms include Bath #3, the living room, Bedroom 2, the owners closet and penthouse bathroom. Bedroom 5 is unbuilt.</p></div></details>`;
  panel.querySelectorAll('[data-zoom]').forEach(button => button.addEventListener('click', () => openZoom(floorPhotos, Number(button.dataset.zoom), button)));
  panel.querySelector('[data-plan]').addEventListener('click', event => openZoom([{ src: floor.plan, label: 'Floor ' + floor.number + ' · builder plan', code: 'Plan', kind: 'Blueprint' }], 0, event.currentTarget));
  panel.querySelectorAll('[data-originals]').forEach(button => button.addEventListener('click', () => {
    const room = floor.rooms.find(entry => entry.id === button.dataset.originals);
    openZoom(room.originalPhotos.map(photo => ({ ...photo, roomTitle: room.title, kind: 'Original' })), 0, button);
  }));
  panel.querySelectorAll('[data-compare-bedrooms]').forEach(button => button.addEventListener('click', () => openZoom([{ src: bedroomComparison, label: 'Four bedroom identities · oak floors and rugs', code: 'Comparison', kind: 'Study' }], 0, button)));
  panel.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
    if (location.hash === link.getAttribute('href')) { event.preventDefault(); route(); }
  }));
  document.getElementById('status').textContent = `Floor ${floor.number}: ${floor.rooms.length} rooms, ${floorPhotos.length} photos`;
  document.title = 'Floor ' + floor.number + ' · ' + optionName + ' · Home 708';
}
function route(initial = false) {
  if (dialog.open) dialog.close();
  const parts = location.hash.slice(1).split('/');
  if (parts[0] === 'main') {
    if (!currentFloor) renderFloor(floors[0]);
    const panel = document.getElementById('panel-' + currentFloor.id);
    panel.scrollIntoView({ block: 'start' });
    panel.focus({ preventScroll: true });
    return;
  }
  if (parts[0] === 'floors') {
    if (!currentFloor) renderFloor(floors[0]);
    document.getElementById('floors').scrollIntoView({ block: 'start' });
    if (!initial) tabs.find(tab => tab.dataset.floor === currentFloor.id)?.focus({ preventScroll: true });
    return;
  }
  const floor = floors.find(entry => entry.id === parts[0]) || floors[0];
  if (currentFloor?.id !== floor.id) renderFloor(floor);
  const room = floor.rooms.find(entry => entry.id === parts[1]);
  if (room) {
    const code = parts[2] === 'night' ? room.night?.code : parts[2] === 'compare' ? room.night?.sourceCode : null;
    const photo = code ? document.getElementById(`view-${room.id}-${code}`) : null;
    (photo || document.getElementById('room-' + room.id)).scrollIntoView({ block: 'start' });
    if (!initial) {
      const focusTarget = photo?.querySelector('button') || document.getElementById('heading-' + room.id);
      if (focusTarget.tagName === 'H3') focusTarget.tabIndex = -1;
      focusTarget.focus({ preventScroll: true });
    }
  } else if (!initial || parts[0] === floor.id) {
    document.getElementById('floor-heading').scrollIntoView({ block: 'start' });
  }
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => {
    const hash = '#' + tab.dataset.floor;
    if (location.hash === hash) route();
    else location.hash = hash;
  });
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); tabs[next].click(); tabs[next].focus({ preventScroll: true }); }
  });
});
function openZoom(photos, index, trigger) {
  zoomTrigger = trigger; zoomPhotos = photos; zoomIndex = index;
  previousOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  updateZoom(); dialog.showModal();
}
function updateZoom() {
  const photo = zoomPhotos[zoomIndex];
  document.getElementById('zoom-title').textContent = [photo.roomTitle, photo.code, photo.kind].filter(Boolean).join(' · ');
  const image = document.getElementById('zoom-image');
  image.src = photo.src;
  image.alt = [photo.roomTitle, photo.label].filter(Boolean).join(' — ');
  document.getElementById('zoom-position').textContent = `${zoomIndex + 1} / ${zoomPhotos.length}`;
  document.getElementById('zoom-prev').disabled = zoomIndex === 0;
  document.getElementById('zoom-next').disabled = zoomIndex === zoomPhotos.length - 1;
  document.getElementById('zoom-hint').textContent = zoomPhotos === floorPhotos ? `All photos on Floor ${currentFloor.number} · Swipe or use ← →` : 'Swipe or use ← →';
  // Load only adjacent full-size photos, keeping long galleries lightweight.
  [zoomPhotos[zoomIndex - 1], zoomPhotos[zoomIndex + 1]].filter(Boolean).forEach(adjacent => { const preload = new Image(); preload.src = adjacent.src; });
}
function stepZoom(delta) {
  const next = zoomIndex + delta;
  if (next >= 0 && next < zoomPhotos.length) { zoomIndex = next; updateZoom(); }
}
document.getElementById('close-zoom').addEventListener('click', () => dialog.close());
document.getElementById('zoom-prev').addEventListener('click', () => stepZoom(-1));
document.getElementById('zoom-next').addEventListener('click', () => stepZoom(1));
dialog.addEventListener('close', () => {
  document.body.style.overflow = previousOverflow || '';
  if (zoomTrigger?.isConnected) zoomTrigger.focus({ preventScroll: true });
});
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight') { event.preventDefault(); stepZoom(1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); stepZoom(-1); }
  if (event.key === 'Home') { event.preventDefault(); zoomIndex = 0; updateZoom(); }
  if (event.key === 'End') { event.preventDefault(); zoomIndex = zoomPhotos.length - 1; updateZoom(); }
});
const imageWrap = document.querySelector('.zoom-image-wrap');
imageWrap.addEventListener('touchstart', event => {
  touchStart = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
}, { passive: true });
imageWrap.addEventListener('touchend', event => {
  if (!touchStart || !event.changedTouches.length) return;
  const dx = event.changedTouches[0].clientX - touchStart.x, dy = event.changedTouches[0].clientY - touchStart.y;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) stepZoom(dx < 0 ? 1 : -1);
  touchStart = null;
}, { passive: true });
imageWrap.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });
window.addEventListener('hashchange', () => route());
route(true);
