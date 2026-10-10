(() => {
  const { photos, groupNames } = JSON.parse(document.getElementById('photo-data').textContent);
  const main = document.getElementById('main');
  const gallery = document.getElementById('photos');
  const gallerySection = document.getElementById('model-gallery');
  const picker = document.getElementById('floor-picker');
  const dialog = document.getElementById('photo-viewer');
  const viewerImage = document.getElementById('viewer-image');
  const buttons = [...document.querySelectorAll('[data-group]')];
  const roomOrder = [
    ['city-homes-at-crown', 'outdoor-spiral-staircase'],
    ['first-floor-entrance-gallery-and-spiral-staircase', 'first-floor-home-office', 'first-floor-media-room', 'first-floor-studio-room'],
    ['second-floor-great-room', 'second-floor-main-kitchen', 'second-floor-formal-dining', 'second-floor-sun-room', 'second-floor-spiral-staircase'],
    ['third-floor-master-bedroom', 'third-floor-master-bedroom-owners-retreat', 'third-floor-master-bedroom-bath', 'third-floor-bedroom-3', 'third-floor-shared-bath-bedroom-2-3', 'third-floor-laundry-room', 'third-floor-spiral-staircase'],
    ['fourth-floor-penthouse-loft', 'fourth-floor-penthouse-bedroom-5', 'fourth-floor-outdoor-living-terrace-and-sun-terrace'],
  ];
  const roomNames = {
    'first-floor-entrance-gallery-and-spiral-staircase': 'Entrance gallery',
    'third-floor-master-bedroom': 'Owners bedroom',
    'third-floor-master-bedroom-owners-retreat': 'Owners retreat',
    'third-floor-master-bedroom-bath': 'Owners bathroom',
    'third-floor-shared-bath-bedroom-2-3': 'Shared bathroom',
    'fourth-floor-penthouse-loft': 'Penthouse lounge',
    'fourth-floor-penthouse-bedroom-5': 'Penthouse bedroom',
    'fourth-floor-outdoor-living-terrace-and-sun-terrace': 'Roof terrace',
  };
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = [], index = 0, selected = 1, scrollToGallery = false;
  let opener = null, scrollPosition = null, previousBodyStyle = '';
  let swipeStart = null;
  const adjacentImages = new Map();
  const photoRooms = new Map();
  main.setAttribute('tabindex', '-1');
  gallerySection.setAttribute('tabindex', '-1');

  function roomsForFloor(group) {
    const grouped = new Map();
    photos.filter(photo => photo.group === group).forEach(photo => {
      const baseId = photo.id.replace(/-\d+$/, '');
      const id = photos.some(original => original.group === group && original.id === baseId) ? baseId : photo.id;
      if (!grouped.has(id)) grouped.set(id, []);
      grouped.get(id).push(photo);
    });
    return [...grouped].sort(([a], [b]) => roomOrder[group].indexOf(a) - roomOrder[group].indexOf(b)).map(([id, originals]) => {
      originals.sort((a, b) => (a.id === id ? 0 : Number(a.id.slice(id.length + 1))) - (b.id === id ? 0 : Number(b.id.slice(id.length + 1))));
      const room = { id, title: roomNames[id] || originals[0].title, photos: originals };
      originals.forEach(photo => photoRooms.set(photo.id, room));
      return room;
    });
  }

  function route() {
    const requested = location.hash.slice(1);
    if (requested === 'main' && visible.length) {
      main.focus({ preventScroll: true });
      return;
    }
    const matched = requested.match(/^floor-([1-4])(?:\/.*)?$/);
    selected = requested === 'exterior' ? 0 : matched ? Number(matched[1]) : 1;
    if (dialog.open) dialog.close();
    const rooms = roomsForFloor(selected);
    visible = rooms.flatMap(room => room.photos);
    buttons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.group) === selected)));
    document.getElementById('gallery-title').textContent = groupNames[selected];
    document.getElementById('photo-count').textContent = `${visible.length} original photographs`;
    let photoIndex = 0;
    gallery.innerHTML = rooms.map(room => `<article class="original-room" aria-labelledby="room-${esc(room.id)}"><header class="original-room-heading"><h3 id="room-${esc(room.id)}">${esc(room.title)}</h3><span>${room.photos.length === 1 ? 'Original photograph' : `${room.photos.length} original angles`}</span></header><div class="original-room-photos">${room.photos.map((photo, roomIndex) => `<figure class="original-card"><button type="button" data-photo="${photoIndex++}" aria-label="Enlarge ${esc(room.title)}${room.photos.length > 1 ? ` · view ${roomIndex + 1}` : ''}"><img src="${esc(photo.src)}" alt="${esc(room.title)} — original model home${room.photos.length > 1 ? `, view ${roomIndex + 1}` : ''}" loading="lazy" decoding="async"><span class="original-enlarge" aria-hidden="true">Enlarge ↗</span></button>${room.photos.length > 1 ? `<figcaption>View ${roomIndex + 1} of ${room.photos.length}</figcaption>` : ''}</figure>`).join('')}</div></article>`).join('');
    gallery.querySelectorAll('[data-photo]').forEach(button => button.addEventListener('click', () => openViewer(Number(button.dataset.photo), button)));
    if (scrollToGallery) {
      scrollToGallery = false;
      window.requestAnimationFrame(() => {
        gallerySection.focus({ preventScroll: true });
        gallerySection.scrollIntoView({ behavior: reduceMotion() ? 'instant' : 'smooth', block: 'start' });
      });
    }
    if (requested === 'main') main.focus({ preventScroll: true });
  }

  function openViewer(photoIndex, button) {
    index = photoIndex;
    opener = button;
    scrollPosition = { x: window.scrollX, y: window.scrollY };
    previousBodyStyle = document.body.style.cssText;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const bodyPadding = Number.parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPosition.y}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${bodyPadding + scrollbarWidth}px`;
    updateViewer();
    dialog.showModal();
    document.getElementById('close-viewer').focus({ preventScroll: true });
  }

  function updateViewer() {
    const photo = visible[index];
    const room = photoRooms.get(photo.id);
    const angle = room.photos.length > 1 ? ` · view ${room.photos.indexOf(photo) + 1}` : '';
    viewerImage.src = photo.src;
    viewerImage.alt = `${room.title}${angle} — original model-home photograph`;
    document.getElementById('viewer-title').textContent = room.title + angle;
    document.getElementById('viewer-count').textContent = `${index + 1} / ${visible.length}`;
    document.getElementById('previous-photo').disabled = index === 0;
    document.getElementById('next-photo').disabled = index === visible.length - 1;
    adjacentImages.clear();
    [visible[index - 1], visible[index + 1]].filter(Boolean).forEach(adjacent => {
      const image = new window.Image();
      image.src = adjacent.src;
      adjacentImages.set(adjacent.src, image);
    });
  }

  function step(delta) {
    if (index + delta >= 0 && index + delta < visible.length) {
      index += delta;
      updateViewer();
    }
  }

  buttons.forEach(button => button.addEventListener('click', () => {
    scrollToGallery = true;
    const hash = Number(button.dataset.group) === 0 ? '#exterior' : `#floor-${button.dataset.group}`;
    if (location.hash === hash) route();
    else location.hash = hash;
  }));
  document.getElementById('choose-floor').addEventListener('click', () => {
    picker.scrollIntoView({ behavior: reduceMotion() ? 'instant' : 'smooth', block: 'start' });
    buttons.find(button => Number(button.dataset.group) === selected)?.focus({ preventScroll: true });
  });
  document.getElementById('close-viewer').addEventListener('click', () => dialog.close());
  document.getElementById('previous-photo').addEventListener('click', () => step(-1));
  document.getElementById('next-photo').addEventListener('click', () => step(1));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
    if (event.key === 'Home') { event.preventDefault(); index = 0; updateViewer(); }
    if (event.key === 'End') { event.preventDefault(); index = visible.length - 1; updateViewer(); }
  });
  dialog.addEventListener('close', () => {
    if (!scrollPosition) return;
    document.body.style.cssText = previousBodyStyle;
    window.scrollTo({ left: scrollPosition.x, top: scrollPosition.y, behavior: 'instant' });
    scrollPosition = null;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    opener = null;
    swipeStart = null;
    adjacentImages.clear();
  });
  viewerImage.addEventListener('pointerdown', event => {
    if (event.isPrimary && event.pointerType !== 'mouse') swipeStart = { x: event.clientX, y: event.clientY };
  });
  viewerImage.addEventListener('pointerup', event => {
    if (!swipeStart) return;
    const dx = event.clientX - swipeStart.x, dy = event.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) step(dx > 0 ? -1 : 1);
  });
  viewerImage.addEventListener('pointercancel', () => { swipeStart = null; });
  window.addEventListener('hashchange', route);
  route();
})();
